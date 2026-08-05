#!/usr/bin/env node
// Despliega los 5 workflows de Aurivo en una instancia de n8n vía su API REST:
// sustituye los placeholders REEMPLAZA_CON_... con valores reales, crea los
// workflows en el orden correcto y conecta los sub-workflows automáticamente
// (sin tener que abrir cada nodo "Tool"/"Execute Workflow" y reseleccionarlo a mano).
//
// Uso:
//   1. cp scripts/aurivo.config.example.json scripts/aurivo.config.json
//   2. Rellena scripts/aurivo.config.json (URL + API key de n8n, placeholders, credenciales)
//   3. node scripts/deploy-aurivo.mjs scripts/aurivo.config.json

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function usage() {
  console.log(`
Uso: node scripts/deploy-aurivo.mjs <ruta-a-config.json>

Antes de correr esto:
  1. cp scripts/aurivo.config.example.json scripts/aurivo.config.json
  2. Rellena n8nBaseUrl, n8nApiKey y los valores en "placeholders" de tu config.json
     (n8nApiKey se genera en n8n: Settings -> n8n API -> Create an API key)
  3. (Opcional) Si ya creaste las credenciales en n8n, pega sus IDs en "credentialIds"
     para que los workflows queden con la credencial ya seleccionada.
  4. node scripts/deploy-aurivo.mjs scripts/aurivo.config.json
`);
}

const CONFIG_PATH = process.argv[2];
if (!CONFIG_PATH) {
  usage();
  process.exit(1);
}

const config = JSON.parse(
  await readFile(path.resolve(process.cwd(), CONFIG_PATH), "utf8")
);

const {
  n8nBaseUrl,
  n8nApiKey,
  placeholders = {},
  credentialIds = {},
  activateAfterImport = false,
} = config;

if (!n8nBaseUrl || !n8nApiKey || n8nApiKey.startsWith("REEMPLAZA_")) {
  console.error(
    "Falta n8nBaseUrl o n8nApiKey (o sigue con el valor de ejemplo) en el archivo de config."
  );
  process.exit(1);
}

const BASE = n8nBaseUrl.replace(/\/+$/, "");
const API = `${BASE}/api/v1`;

const missingPlaceholders = Object.entries(placeholders)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missingPlaceholders.length) {
  console.warn(
    `Aviso: estos placeholders quedaron vacíos y se importarán tal cual (edítalos luego en n8n):\n  - ${missingPlaceholders.join(
      "\n  - "
    )}\n`
  );
}

function applyPlaceholders(rawJsonText) {
  let out = rawJsonText;
  for (const [token, value] of Object.entries(placeholders)) {
    if (!value) continue;
    // El valor se re-escapa como contenido de string JSON antes de reemplazar,
    // para que comillas/backslashes en el valor no rompan el JSON resultante.
    const escaped = JSON.stringify(String(value)).slice(1, -1);
    out = out.split(token).join(escaped);
  }
  return out;
}

function applyCredentials(workflow) {
  for (const node of workflow.nodes || []) {
    if (!node.credentials) continue;
    for (const [credType, credValue] of Object.entries(node.credentials)) {
      const realId = credentialIds[credType];
      if (realId) credValue.id = realId;
    }
    // El webhookId de ejemplo no es válido para registrar el webhook real en Meta.
    if (node.type === "n8n-nodes-base.whatsAppTrigger") {
      node.webhookId = randomUUID();
    }
  }
  return workflow;
}

async function loadWorkflow(filename) {
  const raw = await readFile(path.join(ROOT, "workflows", filename), "utf8");
  const workflow = JSON.parse(applyPlaceholders(raw));
  return applyCredentials(workflow);
}

function toCreatePayload(workflow) {
  // La API de n8n solo acepta name/nodes/connections/settings al crear
  // (active, id, etc. son de solo lectura o se manejan aparte).
  return {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: workflow.settings || { executionOrder: "v1" },
  };
}

async function createWorkflow(workflow) {
  const res = await fetch(`${API}/workflows`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-N8N-API-KEY": n8nApiKey },
    body: JSON.stringify(toCreatePayload(workflow)),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `No se pudo crear "${workflow.name}" (HTTP ${res.status}): ${body}`
    );
  }
  return res.json();
}

async function setActive(id, name, active) {
  const res = await fetch(`${API}/workflows/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-N8N-API-KEY": n8nApiKey },
    body: JSON.stringify({ active }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.warn(
      `  ⚠️  No se pudo activar "${name}" automáticamente (revisa credenciales/triggers y actívalo a mano en n8n): ${body}`
    );
    return false;
  }
  console.log(`  ✅ Activado: ${name}`);
  return true;
}

function findNode(workflow, nodeId) {
  const node = workflow.nodes.find((n) => n.id === nodeId);
  if (!node) throw new Error(`No se encontró el nodo ${nodeId} en ${workflow.name}`);
  return node;
}

const editorUrl = (id) => `${BASE}/workflow/${id}`;

console.log(`Desplegando Aurivo en ${BASE} ...\n`);

const wf02 = await loadWorkflow("02-aurivo-herramientas-cliente.json");
const wf03 = await loadWorkflow("03-aurivo-herramientas-ceo.json");
const wf01 = await loadWorkflow("01-aurivo-router-principal.json");
const wf04 = await loadWorkflow("04-aurivo-prospeccion-automatica.json");
const wf05 = await loadWorkflow("05-aurivo-reporte-semanal.json");

console.log('1/5 Creando "Aurivo - Herramientas Cliente" ...');
const created02 = await createWorkflow(wf02);
console.log(`     -> ${editorUrl(created02.id)}`);

console.log('2/5 Creando "Aurivo - Herramientas CEO" ...');
const created03 = await createWorkflow(wf03);
console.log(`     -> ${editorUrl(created03.id)}`);

// Conecta los sub-workflows automáticamente: nada que reseleccionar a mano en n8n.
findNode(wf01, "tool-herramientas-ceo").parameters.workflowId.value = String(created03.id);
findNode(wf01, "tool-herramientas-cliente").parameters.workflowId.value = String(created02.id);
findNode(wf04, "exec-buscar-prospectos").parameters.workflowId.value = String(created03.id);

console.log('3/5 Creando "Aurivo - Router Principal (WhatsApp)" ...');
const created01 = await createWorkflow(wf01);
console.log(`     -> ${editorUrl(created01.id)}`);

console.log('4/5 Creando "Aurivo - Prospección Automática (Autónoma)" ...');
const created04 = await createWorkflow(wf04);
console.log(`     -> ${editorUrl(created04.id)}`);

console.log('5/5 Creando "Aurivo - Reporte Semanal Automático" ...');
const created05 = await createWorkflow(wf05);
console.log(`     -> ${editorUrl(created05.id)}`);

console.log("\nListo. Workflows creados:");
console.log(`  - Herramientas Cliente:        ${editorUrl(created02.id)}`);
console.log(`  - Herramientas CEO:            ${editorUrl(created03.id)}`);
console.log(`  - Router Principal (WhatsApp): ${editorUrl(created01.id)}`);
console.log(`  - Prospección Automática:      ${editorUrl(created04.id)}`);
console.log(`  - Reporte Semanal:             ${editorUrl(created05.id)}`);

if (activateAfterImport) {
  console.log("\nActivando workflows con trigger propio...");
  await setActive(created01.id, "Router Principal (WhatsApp)", true);
  await setActive(created04.id, "Prospección Automática", true);
  await setActive(created05.id, "Reporte Semanal", true);
} else {
  console.log(
    '\nNo se activaron automáticamente (activateAfterImport=false en tu config). Actívalos desde n8n una vez que confirmes credenciales, la Google Sheet y la pestaña "Busquedas".'
  );
}

console.log(`
Esto sí sigue siendo manual, a propósito (por seguridad no se automatiza):
  - Crear las credenciales en n8n (WhatsApp Business Cloud, Google Gemini, Google Sheets,
    Google Calendar, Gmail) si no pasaste sus IDs en "credentialIds".
  - Confirmar el payload real del WhatsApp Trigger con un mensaje de prueba
    (los nombres de campo pueden variar según tu versión del nodo).
  - Crear la Google Sheet con las pestañas "Leads" y "Busquedas" (ver docs/).
  - Tener tu plantilla de WhatsApp aprobada por Meta para el primer contacto en frío.
`);

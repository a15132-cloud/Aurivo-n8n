# Guía paso a paso: importar Aurivo en n8n

Sigue este orden exacto. Son 5 archivos y al final solo 3 clics de "reconectar".

## 1. Importa los 4 workflows de apoyo (en cualquier orden entre ellos)

Para cada uno: en n8n, botón **+ Add workflow** (o el ⋮ del workflow que ya tienes abierto) → **Import from File** → selecciona el archivo → **Save**.

- `02-aurivo-herramientas-cliente.json`
- `03-aurivo-herramientas-ceo.json`
- `04-aurivo-prospeccion-automatica.json`
- `05-aurivo-reporte-semanal.json`

Al terminar, en tu lista de workflows de n8n deberías ver 4 nuevos, con esos nombres.

## 2. Importa el router principal

- `01-aurivo-router-principal.json` — impórtalo en el workflow que ya tenías abierto (`https://abnersmartinez.app.n8n.cloud/...`), o como uno nuevo si prefieres.

## 3. Pon tu número de WhatsApp como CEO (una sola vez, cópialo 4 veces)

Tu número debe ir **solo con dígitos** (código de país + número, sin `+`, sin espacios, sin guiones). Ejemplo: si tu número es +52 1 33 1234 5678, escribe `5213312345678` (ajusta según cómo lo mande tu proveedor de WhatsApp — puedes confirmarlo mandándote un mensaje de prueba y viendo qué formato llega en `messages[0].from`).

Reemplaza `REEMPLAZA_CON_NUMERO_CEO_SOLO_DIGITOS` por ese número en:

| Workflow | Nodo | Para qué |
|---|---|---|
| `01` | `Preparar Datos del Mensaje` | Decide si quien escribe es el CEO o un cliente |
| `01` | `Config Notificación CEO` | A quién avisar cuando se cierra un cliente nuevo |
| `02` | `Config` | A quién avisar cuando el agente de cliente necesita ayuda humana |
| `05` | `Config` | A quién mandarle el reporte semanal |

## 4. Las 3 reconexiones (esto es lo que faltaba antes)

Abre `01 - Router Principal`:

1. Doble clic en el nodo **"Tool: Herramientas CEO"** → campo **Workflow** → de la lista, elige el workflow que se llama **"Aurivo - Herramientas CEO"** (el que importaste en el paso 1). Guarda.
2. Doble clic en el nodo **"Tool: Herramientas Cliente"** → campo **Workflow** → elige **"Aurivo - Herramientas Cliente"**. Guarda.

Abre `04 - Prospección Automática`:

3. Doble clic en el nodo **"Ejecutar Búsqueda de Prospectos"** → campo **Workflow** → elige **"Aurivo - Herramientas CEO"**. Guarda.

Eso es todo — no hay una cuarta reconexión.

## 5. Antes de activar nada

Todavía te faltan por rellenar (están documentados con detalle en `README.md` y `docs/apis-y-plantillas-checklist.md`):

- Credenciales de n8n: WhatsApp Business Cloud, Google Gemini, Google Sheets, Google Calendar, Gmail.
- Tu Google Sheet de leads con las columnas exactas (`docs/leads-sheet-template.md`) y su Spreadsheet ID pegado en los nodos `Config`.
- API keys de Google Places y Google Custom Search (`docs/apis-y-plantillas-checklist.md`).
- Tu plantilla de WhatsApp aprobada por Meta para el primer contacto.

Sin esto activado, los workflows importan y quedan bien conectados, pero no van a poder mandar mensajes reales — eso ya no depende de mí, depende de que actives esas cuentas/API.

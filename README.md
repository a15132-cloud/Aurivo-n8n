# Aurivo — Agente de IA en n8n para pymes (Fases 1-3)

Aurivo atiende WhatsApp de un negocio con Gemini como cerebro (AI Agent node de n8n), separando dos roles:

- **Número del negocio**: cualquiera que le escriba es atendido en modo "vendedor/soporte" (califica leads, agenda citas, registra todo en Google Sheets, escala a un humano si no está seguro).
- **Número del CEO**: es el mismo número de WhatsApp del negocio, pero Aurivo **filtra por el número del remitente**. Si quien escribe es el CEO, entra en "modo comando" (status, reportes, órdenes libres, buscar prospectos, analizar competencia) y además recibe avisos proactivos sin pedirlos (lead nuevo cerrado, reporte semanal).

Además, **de forma autónoma** (sin que nadie le pida nada), Aurivo sale a buscar negocios nuevos todos los días por Google Places/Maps, los enriquece con Google Custom Search, y les manda primer contacto por WhatsApp (plantilla aprobada) o email.

## Qué se construyó: 5 archivos, ya conectados entre sí

| # | Archivo | Workflow | Qué hace |
|---|---|---|---|
| 01 | `01-aurivo-router-principal.json` | **Router Principal (WhatsApp)** | Recibe todos los mensajes, decide CEO vs. cliente, corre el AI Agent correspondiente (Gemini + memoria), responde por WhatsApp. Segundo trigger: vigila la Sheet de leads y avisa proactivamente al CEO cuando se cierra un cliente. |
| 02 | `02-aurivo-herramientas-cliente.json` | **Herramientas Cliente** | Una sola "caja de herramientas" para el agente de atención al cliente: registrar/actualizar lead, agendar cita, escalar a un humano. Un `Switch` interno decide cuál acción correr según el parámetro `accion` que manda el agente. |
| 03 | `03-aurivo-herramientas-ceo.json` | **Herramientas CEO** | La caja de herramientas del agente del CEO: consultar estadísticas, generar reporte/Excel, buscar prospectos (Google Places + Custom Search), analizar competencia. También la reutiliza el workflow 04. |
| 04 | `04-aurivo-prospeccion-automatica.json` | **Prospección Automática (Autónoma)** | Todos los días a las 10am lee la pestaña `Busquedas`, llama al workflow 03 (accion=buscar_prospectos) por cada búsqueda activa, y manda el primer contacto: plantilla de WhatsApp si hay teléfono, email por Gmail si hay correo. Así es como Aurivo "busca clientes por su cuenta". |
| 05 | `05-aurivo-reporte-semanal.json` | **Reporte Semanal Automático** | Cada lunes 9am compara esta semana vs. la anterior y se lo manda al CEO sin que lo pida. |

**Por qué solo 3 reconexiones y no 7 u 8**: antes tenía un sub-workflow por cada acción (registrar lead, agendar cita, buscar prospectos...), lo que significaba ir a 7 nodos distintos a re-seleccionar el sub-workflow correcto después de importar. Ahora agrupé todas las acciones del cliente en un solo sub-workflow (`02`) y todas las del CEO en otro (`03`), cada uno con un `Switch` interno — así solo hay que reconectar **3 veces en total** (ver pasos abajo), no 7.

`workflows/aurivo-completo.json` empaqueta los 5 en un solo archivo (array) — es una **copia de referencia/backup**, no la uses para importar desde el editor web (ver advertencia abajo).

📋 **Guía paso a paso con todos los clics exactos:** `docs/importar-paso-a-paso.md`

## Opción A: desplegar con un solo comando (recomendado)

`scripts/deploy-aurivo.mjs` crea los 5 workflows directo en tu n8n vía su API REST, sustituye todos los placeholders `REEMPLAZA_CON_...` por tus datos reales, y conecta los 3 sub-workflows automáticamente — **cero reconexión manual**.

```bash
cp scripts/aurivo.config.example.json scripts/aurivo.config.json
# Edita scripts/aurivo.config.json: URL de tu n8n, tu API key, y tus valores reales
node scripts/deploy-aurivo.mjs scripts/aurivo.config.json
```

Necesitas:

- Tu API key de n8n (en n8n: **Settings → n8n API → Create an API key**). En n8n Cloud esto requiere plan con API habilitada.
- Node.js 18+ (ya viene con `fetch` nativo, no instala nada).
- Opcional pero recomendado: crea antes las 5 credenciales en n8n (WhatsApp Business Cloud x2, Google Gemini, Google Sheets, Google Calendar, Gmail) y pega sus IDs en el bloque `credentialIds` del config — así los workflows quedan con la credencial ya seleccionada, no solo importados.

Lo único que el script deja para ti a propósito (por seguridad, no se automatiza): crear esas credenciales, crear la Google Sheet con las pestañas `Leads`/`Busquedas`, y tu plantilla de WhatsApp aprobada por Meta.

Si prefieres no usar la API (o tu plan de n8n no la tiene habilitada), usa la Opción B.

## Opción B: importar a mano desde el editor web

⚠️ El botón **Import from File** del editor web de n8n solo acepta **un workflow a la vez** (un objeto JSON con `nodes`/`connections` en la raíz). Si le das un archivo con varios workflows (como `aurivo-completo.json`) te va a dar error. Por eso hay que importar los 5 archivos **uno por uno**.

1. Importa `02-aurivo-herramientas-cliente.json` y `03-aurivo-herramientas-ceo.json` (crea un workflow nuevo → *Import from File*, o pega el contenido con *Import from Clipboard*). Anota o ubica estos dos en tu lista de workflows.
2. Importa `04-aurivo-prospeccion-automatica.json` y `05-aurivo-reporte-semanal.json`.
3. Importa `01-aurivo-router-principal.json` — este es el que va en el workflow que compartiste (`https://abnersmartinez.app.n8n.cloud/...`).
4. Abre `01 - Router Principal`. Tiene 2 nodos de herramienta: **"Tool: Herramientas CEO"** y **"Tool: Herramientas Cliente"**. En cada uno, campo **Workflow**, selecciona de la lista el workflow real que se creó al importar (`03` y `02` respectivamente) — esto reemplaza los placeholders `REEMPLAZA_CON_ID_DEL_WORKFLOW_0X`.
5. Abre `04 - Prospección Automática`, nodo **"Ejecutar Búsqueda de Prospectos"**, y selecciona ahí el workflow `03 - Herramientas CEO`.

Eso es todo — **3 reconexiones**, no 8. No pude hacer esta parte por ti porque esta sesión no tiene un conector/credencial a tu instancia de n8n Cloud.

## Credenciales que necesitas crear en n8n antes de activar

| Credencial n8n | Tipo | Para qué |
|---|---|---|
| WhatsApp Business Cloud (número del negocio) | `WhatsApp Trigger API` + `WhatsApp API` | Recibir y enviar mensajes, incluyendo plantillas de primer contacto. |
| Google Gemini (AI Studio) | `Google Gemini(PaLM) Api` | El cerebro de los AI Agents. API key de https://aistudio.google.com/apikey. |
| Google Sheets | `Google Sheets OAuth2 API` | Leads, estadísticas, reportes, búsquedas configuradas. |
| Google Calendar | `Google Calendar OAuth2 API` | Agendar citas. |
| Gmail | `Gmail OAuth2 API` | Canal alterno de primer contacto (workflow 04). |

Google Places API y Google Custom Search API **no usan credencial de n8n** — son API keys que se pegan directo como texto en los nodos `Config` de los workflows 03/04 (ver `docs/apis-y-plantillas-checklist.md`).

## Placeholders que debes reemplazar

Con la Opción A (`scripts/deploy-aurivo.mjs`) todos estos se rellenan solos desde tu `aurivo.config.json`. Si importas a mano (Opción B), edítalos tú en cada nodo `Config`:

- `REEMPLAZA_CON_NOMBRE_DEL_NEGOCIO` — nombre del negocio, lo usa el system prompt de los AI Agents y los mensajes de primer contacto (workflows 01, 04, 05).
- `REEMPLAZA_CON_NUMERO_CEO_SOLO_DIGITOS` — número de WhatsApp personal del CEO, solo dígitos (workflows 01, 02, 05).
- `REEMPLAZA_CON_TU_SPREADSHEET_ID` — ID de tu Google Sheet de leads/búsquedas (ver `docs/leads-sheet-template.md` y `docs/busquedas-sheet-template.md`).
- `REEMPLAZA_CON_TU_CALENDAR_ID` — ID del Google Calendar (workflow 02).
- `REEMPLAZA_CON_PHONE_NUMBER_ID` — Phone Number ID de WhatsApp Business Cloud API (nodos de envío en 01, 02, 04, 05).
- `REEMPLAZA_CON_TU_GOOGLE_PLACES_API_KEY`, `REEMPLAZA_CON_TU_GOOGLE_CUSTOM_SEARCH_API_KEY`, `REEMPLAZA_CON_TU_SEARCH_ENGINE_ID_CX` — ver `docs/apis-y-plantillas-checklist.md` (workflow 03).
- `REEMPLAZA_CON_NOMBRE_PLANTILLA_APROBADA` — nombre de tu plantilla de WhatsApp aprobada por Meta para mensajes fríos (workflow 04).
- `REPLACE_ME` en bloques `credentials` — selecciona la credencial real desde el dropdown de n8n; no hace falta editar el JSON.
- `REEMPLAZA_CON_ID_DEL_WORKFLOW_0X` — ver paso 4-5 de importación arriba (solo 3 lugares ahora).

## Cosas que debes verificar tú dentro de n8n (no pude probarlas en vivo)

Esta sesión no tiene acceso a tu instancia de n8n para ejecutar/probar los workflows, así que los construí siguiendo la estructura estándar de los nodos, pero estos puntos dependen de la versión exacta de tus nodos:

1. **Payload del `WhatsApp Trigger`**: verifica `$json.messages[0].from`, `.text.body`, `$json.contacts[0].profile.name` con un mensaje de prueba real.
2. **Parámetros del nodo `WhatsApp`** al enviar (`phoneNumberId`, `recipientPhoneNumber`, `textBody`) y, sobre todo, **el bloque `template`** en el workflow 04 (mensajes fríos).
3. **Operación `read` del nodo Google Sheets** al leer filas — confirma que corresponde a "Get row(s) in sheet" en tu versión.
4. **Nodo `Switch`** en los workflows 02 y 03: usa el modo "rules" con 3 y 4 salidas respectivamente. Si tu versión de n8n renderiza el Switch distinto, confirma que las conexiones de salida (por índice: 0, 1, 2...) coinciden con el orden de las reglas.
5. **Operador `notEmpty`** en el IF "¿Tiene Email?" del workflow 04 — si no coincide, n8n lo marca en rojo y solo hay que reseleccionarlo.
6. **Places API / Custom Search**: son llamadas HTTP genéricas (`n8n-nodes-base.httpRequest`), no nodos dedicados — confirma que tu proyecto de Google Cloud tiene facturación activa o las requests van a fallar después del cupo gratuito.

## Roadmap (lo único que falta: Fase 4)

Este entregable cubre **Fases 1, 2 y 3** completas: atención al cliente + modo comando del CEO, prospección activa autónoma vía Google Places/Custom Search, primer contacto por WhatsApp (plantilla) y email, análisis de competencia, reporte semanal automático, y fallback humano.

Lo que queda es la **Fase 4**: onboarding wizard, plantillas por industria, y multi-tenant real (un workflow parametrizado para varias pymes, cada una con su propio número/Sheet/memoria). Es una pieza de naturaleza distinta — requiere definir cómo quieres el formulario de alta y cómo separar los datos entre negocios — así que la dejé fuera de este build hasta que me confirmes que la quieres y cómo.

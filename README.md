# Aurivo — Agente de IA en n8n para pymes (Fases 1-3)

Aurivo atiende WhatsApp de un negocio con Gemini como cerebro (AI Agent node de n8n), separando dos roles:

- **Número del negocio**: cualquiera que le escriba es atendido en modo "vendedor/soporte" (califica leads, agenda citas, registra todo en Google Sheets, escala a un humano si no está seguro).
- **Número del CEO**: es el mismo número de WhatsApp del negocio, pero Aurivo **filtra por el número del remitente**. Si quien escribe es el CEO, entra en "modo comando" (status, reportes, órdenes libres, buscar prospectos, analizar competencia) y además recibe avisos proactivos sin pedirlos (lead nuevo cerrado, reporte semanal).

Además, **de forma autónoma** (sin que nadie le pida nada), Aurivo sale a buscar negocios nuevos todos los días por Google Places/Maps, los enriquece con Google Custom Search, y les manda primer contacto por WhatsApp (plantilla aprobada) o email.

> Arquitectura confirmada contigo: un solo WhatsApp Business number + filtro por remitente (no dos números WABA separados). Reportes se generan como Google Sheets nuevas bajo demanda, no todo en un solo Excel.

## Qué se construyó

**10 workflows de n8n**, cada uno exportable/importable como JSON individual en `workflows/`, y también empaquetados juntos en **`workflows/aurivo-completo.json`** (un solo archivo, array con los 10) para importar todo de un jalón.

| # | Archivo | Workflow | Rol | Fase |
|---|---|---|---|---|
| 01 | `01-aurivo-router-principal.json` | **Router Principal (WhatsApp)** | Recibe todos los mensajes, decide CEO vs. cliente, corre el AI Agent correspondiente (Gemini + memoria), responde por WhatsApp. Segundo trigger: vigila la Sheet de leads y avisa proactivamente al CEO cuando se cierra un cliente. | 1 |
| 02 | `02-aurivo-tool-registrar-lead.json` | **Tool: Registrar Lead** | El agente de cliente la usa para escribir/actualizar la fila del lead. | 1 |
| 03 | `03-aurivo-tool-agendar-cita.json` | **Tool: Agendar Cita** | Crea el evento en Google Calendar cuando un lead confirma día/hora. | 1 |
| 04 | `04-aurivo-tool-consultar-estadisticas.json` | **Tool: Consultar Estadísticas de Leads** | El agente del CEO la usa para responder preguntas de status. | 1 |
| 05 | `05-aurivo-tool-generar-reporte.json` | **Tool: Generar Reporte (Excel/Sheet)** | Crea una Google Sheet nueva con los leads filtrados que pidió el CEO y devuelve el link. | 1 |
| 06 | `06-aurivo-tool-buscar-prospectos.json` | **Tool: Buscar Prospectos** | Busca negocios por giro+zona en Google Places, enriquece con Google Custom Search (email/sitio), y los registra como `prospecto`. La usa el agente del CEO ("busca negocios de X en Y") **y** el workflow 07 (automático). | 2 |
| 07 | `07-aurivo-prospeccion-automatica.json` | **Prospección Automática (Autónoma)** | Todos los días a las 10am lee la pestaña `Busquedas`, llama al 06 por cada búsqueda activa, y manda el primer contacto: plantilla de WhatsApp (mensaje frío) si hay teléfono, email por Gmail si hay correo. Así es como Aurivo "busca clientes por su cuenta". | 2 |
| 08 | `08-aurivo-tool-analizar-competencia.json` | **Tool: Analizar Competencia** | El agente del CEO la usa para comparar competidores de un giro/zona vía Google Places (rating, reseñas, precio, sitio web) — no redes sociales. | 3 |
| 09 | `09-aurivo-reporte-semanal.json` | **Reporte Semanal Automático** | Cada lunes 9am compara esta semana vs. la anterior (leads nuevos, clientes conseguidos, tasa de conversión) y se lo manda al CEO sin que lo pida. | 3 |
| 10 | `10-aurivo-tool-escalar-humano.json` | **Tool: Escalar a Humano** | El agente de cliente la usa cuando no está seguro de una respuesta o el cliente pide hablar con una persona: avisa al CEO por WhatsApp en vez de improvisar. | 3 |

Los agentes del CEO y de atención al cliente son **agentes separados** (system prompt, memoria y herramientas distintas), ambos corriendo dentro del workflow router (01).

## Por qué son varios workflows y no uno solo

n8n solo permite que un AI Agent llame a otro workflow como *tool* si ese workflow existe como una entidad separada (Execute Workflow / "Call n8n Workflow Tool"). Por eso cada acción (registrar lead, agendar cita, buscar prospectos, analizar competencia, escalar a humano...) vive en su propio sub-workflow: así el agente decide *cuándo* usarla según la conversación, en vez de que sea un flujo lineal fijo. El archivo `workflows/aurivo-completo.json` los empaqueta todos en un solo JSON (array) para que la importación sea un solo paso, pero n8n los sigue creando como workflows separados.

## Cómo importarlos a tu n8n

1. Entra a tu instancia de n8n Cloud (el workflow que compartiste: `https://abnersmartinez.app.n8n.cloud/...`).
2. Importa `workflows/aurivo-completo.json` con **Import from File** — esto crea los 10 workflows de un jalón. (Si prefieres uno por uno, importa primero el `02` al `10`, y al final el `01`.)
3. Abre el workflow `01 - Router Principal` y en cada nodo `Tool: ...` (son 7: Consultar_Estadisticas, Generar_Reporte, Buscar_Prospectos, Analizar_Competencia, Registrar_Lead, Agendar_Cita, Escalar_Humano) selecciona en el campo **Workflow** el sub-workflow real que se creó al importar (reemplaza los placeholders `REEMPLAZA_CON_ID_DEL_WORKFLOW_0X`, ya que n8n asigna el ID al importar).
4. Haz lo mismo en el workflow `07 - Prospección Automática`, nodo **"Ejecutar Búsqueda de Prospectos"** (apunta al workflow `06`).

No pude crear/editar el workflow directamente en tu instancia de n8n Cloud porque esta sesión no tiene un conector/credencial de n8n — por eso el entregable son estos JSON para importar manualmente.

## Credenciales que necesitas crear en n8n antes de activar

| Credencial n8n | Tipo | Para qué |
|---|---|---|
| WhatsApp Business Cloud (número del negocio) | `WhatsApp Trigger API` + `WhatsApp API` | Recibir y enviar mensajes, incluyendo plantillas de primer contacto. |
| Google Gemini (AI Studio) | `Google Gemini(PaLM) Api` | El cerebro de los AI Agents. API key de https://aistudio.google.com/apikey. |
| Google Sheets | `Google Sheets OAuth2 API` | Leads, estadísticas, reportes, búsquedas configuradas. |
| Google Calendar | `Google Calendar OAuth2 API` | Agendar citas. |
| Gmail | `Gmail OAuth2 API` | Canal alterno de primer contacto (workflow 07). |

Google Places API y Google Custom Search API **no usan credencial de n8n** — son API keys que se pegan directo como texto en los nodos `Config` de los workflows 06/07/08 (ver `docs/apis-y-plantillas-checklist.md`).

## Placeholders que debes reemplazar

- `REEMPLAZA_CON_NUMERO_CEO_SOLO_DIGITOS` — número de WhatsApp personal del CEO, solo dígitos (workflows 01 y 09/10).
- `REEMPLAZA_CON_TU_SPREADSHEET_ID` — ID de tu Google Sheet de leads/búsquedas (ver `docs/leads-sheet-template.md` y `docs/busquedas-sheet-template.md`).
- `REEMPLAZA_CON_TU_CALENDAR_ID` — ID del Google Calendar (workflow 03).
- `REEMPLAZA_CON_PHONE_NUMBER_ID` — Phone Number ID de WhatsApp Business Cloud API (nodos de envío).
- `REEMPLAZA_CON_TU_GOOGLE_PLACES_API_KEY`, `REEMPLAZA_CON_TU_GOOGLE_CUSTOM_SEARCH_API_KEY`, `REEMPLAZA_CON_TU_SEARCH_ENGINE_ID_CX` — ver `docs/apis-y-plantillas-checklist.md`.
- `REEMPLAZA_CON_NOMBRE_PLANTILLA_APROBADA` — nombre de tu plantilla de WhatsApp aprobada por Meta para mensajes fríos (workflow 07).
- `REPLACE_ME` en bloques `credentials` — selecciona la credencial real desde el dropdown de n8n; no hace falta editar el JSON.
- `REEMPLAZA_CON_ID_DEL_WORKFLOW_0X` — ver paso 3-4 de importación arriba.

## Cosas que debes verificar tú dentro de n8n (no pude probarlas en vivo)

Esta sesión no tiene acceso a tu instancia de n8n para ejecutar/probar los workflows, así que los construí siguiendo la estructura estándar de los nodos, pero estos puntos dependen de la versión exacta de tus nodos:

1. **Payload del `WhatsApp Trigger`**: verifica `$json.messages[0].from`, `.text.body`, `$json.contacts[0].profile.name` con un mensaje de prueba real.
2. **Parámetros del nodo `WhatsApp`** al enviar (`phoneNumberId`, `recipientPhoneNumber`, `textBody`) y, sobre todo, **el bloque `template`** en el workflow 07 (mensajes fríos) — la forma de armar variables de plantilla varía entre versiones del nodo.
3. **Operación `read` del nodo Google Sheets** al leer filas — confirma que corresponde a "Get row(s) in sheet" en tu versión.
4. **Operador `notEmpty`** en el IF "¿Tiene Email?" del workflow 07 — si no coincide, n8n lo marca en rojo y solo hay que reseleccionarlo.
5. **Places API / Custom Search**: son llamadas HTTP genéricas (`n8n-nodes-base.httpRequest`), no nodos dedicados — confirma que tu proyecto de Google Cloud tiene facturación activa o las requests van a fallar después del cupo gratuito.

## Roadmap (lo único que falta: Fase 4)

Este entregable cubre **Fases 1, 2 y 3** completas: atención al cliente + modo comando del CEO, prospección activa autónoma vía Google Places/Custom Search, primer contacto por WhatsApp (plantilla) y email, análisis de competencia, reporte semanal automático, y fallback humano.

Lo que queda es la **Fase 4**: onboarding wizard, plantillas por industria, y multi-tenant real (un workflow parametrizado para varias pymes, cada una con su propio número/Sheet/memoria). Es una pieza de naturaleza distinta — requiere definir cómo quieres el formulario de alta y cómo separar los datos entre negocios — así que la dejé fuera de este build hasta que me confirmes que la quieres y cómo.

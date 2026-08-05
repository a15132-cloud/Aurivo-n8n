# Aurivo — Agente de IA en n8n para pymes (Fase 1 MVP)

Aurivo atiende WhatsApp de un negocio con Gemini como cerebro (AI Agent node de n8n), separando dos roles:

- **Número del negocio**: cualquiera que le escriba es atendido en modo "vendedor/soporte" (califica leads, agenda citas, registra todo en Google Sheets).
- **Número del CEO**: es el mismo número de WhatsApp del negocio, pero Aurivo **filtra por el número del remitente**. Si quien escribe es el CEO, entra en "modo comando" (status, reportes, órdenes libres) y además recibe avisos proactivos sin pedirlos (ej. cuando se cierra un cliente nuevo).

> Esta arquitectura (un solo WhatsApp Business number + filtro por remitente) fue confirmada contigo antes de construir el workflow — es lo que dice literalmente el brief ("filtrar por número de origen") y evita tener que aprobar dos números de WhatsApp Business distintos en Meta.

## Qué se construyó (Fase 1)

5 workflows de n8n, exportables/importables como JSON:

| Archivo | Workflow | Rol |
|---|---|---|
| `workflows/01-aurivo-router-principal.json` | **Aurivo - Router Principal (WhatsApp)** | El workflow principal. Recibe todos los mensajes de WhatsApp, decide CEO vs. cliente, corre el AI Agent correspondiente (Gemini + memoria de conversación), responde por WhatsApp, y vigila la Sheet de leads para avisar proactivamente al CEO cuando se cierra un cliente. |
| `workflows/02-aurivo-tool-registrar-lead.json` | **Aurivo - Tool: Registrar Lead** | Sub-workflow invocado como *tool* por el AI Agent de atención al cliente. Escribe/actualiza la fila del lead en la Sheet maestra. |
| `workflows/03-aurivo-tool-agendar-cita.json` | **Aurivo - Tool: Agendar Cita** | Sub-workflow *tool*. Crea el evento en Google Calendar cuando un lead confirma día/hora. |
| `workflows/04-aurivo-tool-consultar-estadisticas.json` | **Aurivo - Tool: Consultar Estadísticas de Leads** | Sub-workflow *tool* del agente del CEO. Lee la Sheet maestra y calcula totales/por etapa/por periodo para responder preguntas de status. |
| `workflows/05-aurivo-tool-generar-reporte.json` | **Aurivo - Tool: Generar Reporte (Excel/Sheet)** | Sub-workflow *tool* del agente del CEO. Crea una Google Sheet **nueva** (exportable a Excel desde Sheets) con los leads filtrados según lo que pidió el CEO, y devuelve el link. Así, tal como pediste, no todo vive en un solo Excel — cada vez que el CEO pide un reporte se genera uno nuevo con lo que pidió; la Sheet `Leads` sigue siendo la base de datos interna. |

El AI Agent del CEO y el de atención al cliente son **agentes separados** (system prompt, memoria y herramientas distintas), aunque ambos corren dentro del mismo workflow router.

## Por qué son 5 workflows y no uno solo

n8n solo permite que un AI Agent llame a otro workflow como *tool* si ese workflow existe como una entidad separada (Execute Workflow / "Call n8n Workflow Tool"). Por eso las acciones (registrar lead, agendar cita, consultar estadísticas, generar reporte) están en sub-workflows propios: así el agente decide *cuándo* usarlas según la conversación, en vez de que sea un flujo lineal fijo.

## Cómo importarlos a tu n8n

1. Entra a tu instancia de n8n Cloud (el workflow que compartiste: `https://abnersmartinez.app.n8n.cloud/...`).
2. Importa **primero los 4 sub-workflows** (`02` a `05`) — Menú → *Import from File* (o pega el JSON con *Import from Clipboard*) — para que existan y tengan un ID asignado por n8n.
3. Importa `01-aurivo-router-principal.json` (puede ser directamente en el workflow vacío que ya tienes abierto, pegando el JSON).
4. En el workflow `01`, abre cada nodo `Tool: ...` (son 4: Registrar_Lead, Agendar_Cita, Consultar_Estadisticas, Generar_Reporte) y en el campo **Workflow** selecciona de la lista el sub-workflow real que importaste en el paso 2 (esto reemplaza los placeholders `REEMPLAZA_CON_ID_DEL_WORKFLOW_0X`, ya que el ID lo asigna n8n al importar y no se puede conocer de antemano).

No pude crear/editar el workflow directamente en tu instancia de n8n Cloud porque esta sesión no tiene un conector/credencial de n8n — por eso el entregable son estos JSON para importar manualmente. Si me das acceso (API key de n8n, por ejemplo vía un conector de n8n), puedo subirlos directamente la próxima vez.

## Credenciales que necesitas crear en n8n antes de activar

| Credencial n8n | Tipo | Para qué |
|---|---|---|
| WhatsApp Business Cloud (número del negocio) | `WhatsApp Trigger API` + `WhatsApp API` | Recibir y enviar mensajes. Requiere: Access Token, Phone Number ID, y el Verify Token que configures en el webhook de Meta. |
| Google Gemini (AI Studio) | `Google Gemini(PaLM) Api` | El cerebro del AI Agent. API key de https://aistudio.google.com/apikey (confirmaste esta opción sobre Vertex AI). |
| Google Sheets | `Google Sheets OAuth2 API` | Registro de leads, lectura de estadísticas, generación de reportes. |
| Google Calendar | `Google Calendar OAuth2 API` | Agendar citas de leads calificados. |

## Placeholders que debes reemplazar

Busca estos strings dentro de los 5 JSON (o directo en la UI de n8n después de importar) y reemplázalos con tus datos reales:

- `REEMPLAZA_CON_NUMERO_CEO_SOLO_DIGITOS` — el número de WhatsApp personal del CEO, **solo dígitos** (código de país + número, sin `+` ni espacios — así es como WhatsApp manda el campo `from`). Aparece en 2 nodos `Config` del workflow `01`.
- `REEMPLAZA_CON_TU_SPREADSHEET_ID` — el ID de tu Google Sheet de leads (ver `docs/leads-sheet-template.md` para la plantilla exacta de columnas). Aparece en varios nodos `Config`/`Google Sheets` en los 5 workflows.
- `REEMPLAZA_CON_TU_CALENDAR_ID` — el ID del Google Calendar donde se agendan citas (workflow `03`).
- `REEMPLAZA_CON_PHONE_NUMBER_ID` — el Phone Number ID de tu WhatsApp Business Cloud API (workflow `01`, nodos de envío).
- `REPLACE_ME` en bloques `credentials` — ahí simplemente selecciona la credencial real desde el dropdown de n8n; no hace falta editar el JSON.
- `REEMPLAZA_CON_ID_DEL_WORKFLOW_0X` — ver paso 4 de importación arriba.

## Cosas que debes verificar tú dentro de n8n (no pude probarlas en vivo)

Esta sesión no tiene acceso a tu instancia de n8n para ejecutar/probar el workflow, así que lo construí siguiendo la estructura estándar de los nodos de n8n, pero hay 3 puntos que dependen de la versión exacta de tus nodos y debes confirmar tras importar:

1. **Forma del payload del `WhatsApp Trigger`**: el nodo `Preparar Datos del Mensaje` asume que el mensaje llega en `$json.messages[0].from`, `$json.messages[0].text.body`, `$json.contacts[0].profile.name`, etc. Manda un mensaje de prueba, usa "Listen for Test Event" en n8n, y ajusta esas expresiones si tu versión del nodo expone los campos distinto.
2. **Parámetros del nodo `WhatsApp` (enviar mensaje)**: revisa que `phoneNumberId`, `recipientPhoneNumber` y `textBody` sean los nombres de campo correctos en tu versión del nodo; si cambiaron, el editor de n8n te lo va a señalar en rojo al abrir el nodo.
3. **Operación del nodo Google Sheets** ("Leer Leads" en los workflows 04 y 05): quedó como `read`; confirma en el dropdown que corresponde a "Get row(s) in sheet" en tu versión.

## Roadmap (Fases 2-4, no incluidas todavía)

Este entregable cubre solo la **Fase 1** que pediste para empezar. Cuando quieras seguimos con:

- **Fase 2**: prospección activa vía Google Places API + Google Custom Search API, primer contacto con plantillas aprobadas por Meta, canal alterno por Gmail.
- **Fase 3**: análisis de competencia (Places/Search, no redes sociales), reporte semanal automático (Schedule Trigger) al CEO, fallback humano si Aurivo tiene baja confianza.
- **Fase 4**: onboarding wizard, plantillas por industria, multi-tenant (un workflow parametrizado por pyme).

Y, como pediste desde el inicio, antes de construir cada fase seguiré preguntando sobre credenciales/estructura de datos en vez de asumir.

# Checklist de APIs y plantillas para Fase 2-3 (prospección, competencia, email)

Todo lo nuevo (buscar clientes por su cuenta, analizar competencia, mandar el primer contacto, mandar correos) depende de que actives estas piezas fuera de n8n. Sin esto, los workflows importan bien pero no van a poder ejecutarse.

## 1. Google Places API (acceso a Google Maps)

1. En Google Cloud Console, activa **Places API** (la clásica/legacy, que es la que usan los workflows `06`, `07` y `08` vía `maps.googleapis.com/maps/api/place/...`).
2. Crea una API key y restríngela (por API, y si puedes por IP) para evitar abusos.
3. Pega esa key donde diga `REEMPLAZA_CON_TU_GOOGLE_PLACES_API_KEY` en los workflows `06` y `08`.
4. Ojo con el costo: cada búsqueda (`Text Search`) + cada detalle (`Place Details`) es una llamada facturable. Con la pestaña `Busquedas` puedes controlar cuántas corridas automáticas al día se hacen.

## 2. Google Custom Search API (el "acceso a internet" de Aurivo, vía API oficial)

1. Crea un **Programmable Search Engine** en https://programmablesearchengine.google.com/ (puedes configurarlo para buscar en toda la web).
2. Copia su **Search Engine ID (cx)**.
3. En Google Cloud Console activa **Custom Search API** y saca una API key.
4. Pega ambos donde dice `REEMPLAZA_CON_TU_GOOGLE_CUSTOM_SEARCH_API_KEY` y `REEMPLAZA_CON_TU_SEARCH_ENGINE_ID_CX` en el workflow `06`.
5. Esto es lo que usa Aurivo para intentar encontrar el email/sitio público de un prospecto — sigue siendo 100% vía API oficial, no scraping.

## 3. Plantilla de WhatsApp para primer contacto (mensaje frío)

Meta **obliga** a que cualquier primer mensaje a alguien que nunca te ha escrito use una plantilla pre-aprobada — no puedes mandar texto libre como primer contacto.

1. Entra a Meta Business Manager → WhatsApp Manager → Plantillas de mensajes.
2. Crea una plantilla de categoría "Marketing" o "Utility" (ej. presentación breve del negocio + invitación a responder). Espera la aprobación de Meta (puede tardar horas).
3. En el workflow `07`, nodo **"Config Plantilla WhatsApp"**, pon el nombre exacto de la plantilla aprobada en `plantilla_nombre` y el idioma (ej. `es_MX`) en `plantilla_idioma`.
4. En el nodo **"Primer Contacto WhatsApp (Plantilla)"**, revisa el campo `template.components`: si tu plantilla tiene variables (ej. `{{1}}` para el nombre del negocio), tienes que llenarlas ahí siguiendo el formato que pida tu versión del nodo WhatsApp de n8n.

## 4. Gmail (canal alterno de primer contacto)

1. Crea la credencial `Gmail OAuth2` en n8n (conecta la cuenta de Gmail que va a mandar los correos).
2. No hay más configuración: el workflow `07` ya arma el asunto y el cuerpo del correo usando `business_name`.

## 5. Qué revisar tú mismo (no lo pude probar en vivo)

- Que el operador de las condiciones `IF` para "¿Tiene Email?" (`notEmpty`) sea el que tu versión de n8n espera — si el nodo lo marca en rojo al abrirlo, solo hay que reseleccionar "is not empty" desde el dropdown.
- Que el campo `template` del nodo WhatsApp exista tal cual en tu versión (algunas versiones usan un sub-panel distinto para plantillas) — revísalo la primera vez que actives el workflow `07`.
- Cuotas: activa facturación en el proyecto de Google Cloud para Places y Custom Search; sin tarjeta ligada las requests fallan silenciosamente después del cupo gratuito.

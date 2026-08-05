# Plantilla de la Google Sheet "Leads"

Crea una Google Sheet nueva (o usa una existente) con **una pestaña llamada `Leads`** y estas columnas exactas en la fila 1 (los nombres deben coincidir tal cual, en minúsculas y sin acentos, porque los workflows los referencian así):

| nombre_negocio | email | telefono | ubicacion | etapa | fecha_contacto | notas |
|---|---|---|---|---|---|---|

Notas sobre cada columna:

- **telefono**: se usa como columna de coincidencia (`matchingColumns`) al hacer *append or update*, así que debe quedar exactamente como llega de WhatsApp (dígitos, sin `+` ni espacios). Es la clave única del lead.
- **etapa**: usa siempre estos tres valores exactos (respetando mayúscula inicial en "Cliente"): `contactado`, `interesado`, `Cliente`. El disparador proactivo al CEO (`Google Sheets Trigger - Leads Actualizados` en el workflow principal) compara contra el texto literal `Cliente`.
- **fecha_contacto**: se llena automáticamente (ISO 8601) cada vez que el workflow "Tool: Registrar Lead" escribe/actualiza la fila.

Pasos:

1. Crea la hoja con esas columnas.
2. Copia su **Spreadsheet ID** (la parte de la URL entre `/d/` y `/edit`).
3. Pégalo en cada nodo `Config` de los 5 workflows donde dice `REEMPLAZA_CON_TU_SPREADSHEET_ID` (ver checklist en el README principal).

# Plantilla de la pestaña "Busquedas"

Vive en el **mismo Google Sheet** que la pestaña `Leads` (mismo Spreadsheet ID). Es la lista de búsquedas que la prospección automática (`07-aurivo-prospeccion-automatica.json`) corre todos los días a las 10am, y controla en qué gira/zona Aurivo busca clientes por su cuenta.

Crea una pestaña llamada **`Busquedas`** con estas columnas en la fila 1:

| giro | zona | cantidad | activa |
|---|---|---|---|

Ejemplo:

| giro | zona | cantidad | activa |
|---|---|---|---|
| dentistas | Guadalajara centro | 15 | si |
| talleres mecánicos | Zapopan | 10 | si |
| gimnasios | Monterrey San Pedro | 10 | no |

- **giro**: el tipo de negocio a buscar (se usa tal cual en la búsqueda de Google Places, ej. "dentistas", "restaurantes de mariscos").
- **zona**: ciudad, colonia o área.
- **cantidad**: cuántos resultados tomar de esa búsqueda (recomendado 10-20 para no gastar de más en llamadas a la API).
- **activa**: escribe exactamente `si` para que la fila corra en el próximo ciclo automático, o `no` para pausarla sin borrarla.

El CEO también puede pedirle a Aurivo por WhatsApp "busca negocios de X en la zona Y" y se ejecuta al momento (herramienta `Buscar_Prospectos`), sin necesidad de tocar esta pestaña — esta pestaña es solo para las búsquedas que quieres que corran **solas, todos los días**.

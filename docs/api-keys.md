# Claves de API y fuentes de datos

Radar Comercial solo usa fuentes legales: OpenStreetMap, las APIs oficiales de Google y Meta, y lo que cargas a mano o por CSV. Nunca hace scraping. Todas las claves van en `.env`, nunca en el código ni en Git.

| Fuente                                   | Clave                                                        | Costo                                    | Qué trae                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| OpenStreetMap (Overpass)                 | No necesita                                                  | Gratis                                   | Negocios con nombre, categoría, ubicación y a veces teléfono, web e Instagram; vías principales; límites municipales |
| Google Places API (New)                  | `GOOGLE_PLACES_API_KEY`                                      | Pago por uso, con crédito mensual gratis | Calificación y número de reseñas                                                                                     |
| Instagram Graph API (Business Discovery) | `META_APP_ID`, `META_ACCESS_TOKEN`, `IG_BUSINESS_ACCOUNT_ID` | Gratis, con límite de llamadas           | Seguidores, publicaciones, reels, engagement, bio y link                                                             |

## 1. OpenStreetMap: no necesitas clave

```bash
pnpm ingest:osm --dry-run              # muestra lo que importaría en Mérida, sin escribir
pnpm ingest:osm                        # importa negocios y marca los que están en vía principal
pnpm ingest:osm --boundaries           # además carga los límites de los 23 municipios
pnpm ingest:osm --municipality=libertador --limit=100
```

- Usa el servidor público `https://overpass-api.de`. Es compartido: no lo ejecutes en bucle. Para cambiar de servidor pon `OVERPASS_URL` en `.env`.
- Los datos son © colaboradores de OpenStreetMap, licencia ODbL. La app muestra la atribución en el mapa.
- Si un negocio ya existe (mismo Instagram, teléfono o nombre parecido a menos de 100 m), no se duplica: se vincula y solo se llenan los datos que faltaban.
- Puedes trabajar sin internet con una respuesta guardada: `pnpm ingest:osm --from-file=respuesta.json`.

## 2. Google Places API (New)

1. Entra en [console.cloud.google.com](https://console.cloud.google.com/) con tu cuenta de Google y crea un proyecto, por ejemplo `radar-comercial`.
2. Ve a **Facturación** y asocia una cuenta de facturación. Google exige tarjeta, pero cada mes incluye un crédito gratis que alcanza para miles de consultas.
3. Ve a **APIs y servicios > Biblioteca**, busca **Places API (New)** y pulsa **Habilitar**. Ojo: es la versión _New_, no la antigua "Places API".
4. Ve a **APIs y servicios > Credenciales > Crear credenciales > Clave de API**.
5. Pulsa **Editar clave** y, en **Restricciones de API**, elige **Restringir clave** y marca solo **Places API (New)**. Si la usarás desde un servidor fijo, agrega también su IP en **Restricciones de aplicación**.
6. Copia la clave en `.env`:

   ```
   GOOGLE_PLACES_API_KEY=AIza...
   ```

7. Recomendado: en **Facturación > Presupuestos y alertas**, crea un presupuesto de USD 10 con aviso al 50 % y 90 %.

Uso:

```bash
pnpm ingest:google --dry-run --limit=10   # muestra las búsquedas sin gastar
pnpm ingest:google --limit=50             # busca cada negocio y guarda calificación y reseñas
pnpm ingest:google --refresh              # vuelve a medir los que ya tienen place ID
```

- Solo acepta una coincidencia si el nombre se parece y está a menos de 300 m.
- Pide el mínimo de campos (`FieldMask`) para pagar la tarifa más baja.
- Los negocios DEMO no se consultan.
- **Términos de Google:** solo el _place ID_ se puede guardar sin límite. Por eso el worker borra las mediciones de Google con más de 30 días. Ejecútalo al menos una vez al mes para que la reputación no quede en "Sin dato".

## 3. Instagram Graph API (Business Discovery)

Business Discovery lee las métricas públicas de **otras** cuentas de empresa o creador a través de **tu** cuenta profesional. Las cuentas personales o privadas no se pueden leer: esas van a **Más > Revisión manual**.

### 3.1 Prepara tu Instagram

1. En la app de Instagram: **Configuración > Tipo de cuenta y herramientas > Cambiar a cuenta profesional** y elige **Empresa** (o Creador).
2. Crea una **Página de Facebook** para tu marca, si no tienes una.
3. Vincula Instagram con la Página: en Facebook, **Página > Configuración > Cuentas vinculadas > Instagram > Conectar**.

### 3.2 Crea la app en Meta

1. Entra en [developers.facebook.com](https://developers.facebook.com/) e inicia sesión con el Facebook que administra la Página.
2. **Mis apps > Crear app**. Elige el caso de uso para administrar mensajes y contenido de Instagram, o tipo **Empresa** si te lo pregunta.
3. Copia el **ID de la app** (en **Configuración de la app > Básica**):

   ```
   META_APP_ID=1234567890
   ```

4. En el panel de la app, agrega el producto **Instagram Graph API** (o "API de Instagram con inicio de sesión de Facebook").

### 3.3 Obtén el token

1. Abre el [Explorador de la API Graph](https://developers.facebook.com/tools/explorer/) y elige tu app.
2. En **Permisos** agrega: `instagram_basic`, `pages_show_list`, `pages_read_engagement` y `business_management`.
3. Pulsa **Generate Access Token** y acepta. Ese token dura 1 hora.
4. Cámbialo por uno de **larga duración (60 días)** con esta URL en el navegador (reemplaza los valores):

   ```
   https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=META_APP_ID&client_secret=CLAVE_SECRETA_DE_LA_APP&fb_exchange_token=TOKEN_CORTO
   ```

   La clave secreta está en **Configuración de la app > Básica**. No la compartas ni la subas a Git.

5. Copia el `access_token` de la respuesta:

   ```
   META_ACCESS_TOKEN=EAAG...
   ```

   Pon un recordatorio para renovarlo antes de 60 días (repite los pasos 1 a 5).

### 3.4 Obtén tu IG_BUSINESS_ACCOUNT_ID

En el Explorador, con tu token, consulta:

```
me/accounts?fields=name,instagram_business_account
```

Copia el `id` dentro de `instagram_business_account`:

```
IG_BUSINESS_ACCOUNT_ID=17841400000000000
```

### 3.5 Uso

```bash
pnpm ingest:instagram --dry-run                 # lista las cuentas que mediría
pnpm ingest:instagram --limit=50                # mide 50 cuentas
pnpm ingest:instagram --municipality=libertador
pnpm ingest:instagram --stale-days=7            # salta las medidas en los últimos 7 días (por defecto)
pnpm ingest:instagram --delay-ms=2000           # pausa entre llamadas
```

- Meta permite unas 200 llamadas por hora. Si se alcanza el límite, la corrida se detiene sola y la siguiente sigue donde quedó.
- Cada medición crea un registro nuevo con fuente y fecha, así ves el historial en la ficha.
- Si el token vence, el worker se detiene y te avisa.

## Cada cuánto ejecutar

| Worker                         | Frecuencia sugerida                                      |
| ------------------------------ | -------------------------------------------------------- |
| `pnpm ingest:osm`              | Una vez por mes                                          |
| `pnpm ingest:instagram`        | Una vez por semana                                       |
| `pnpm ingest:google --refresh` | Una vez por mes (obligatorio por los términos de Google) |

Todos aceptan `--dry-run`, reintentan solos ante errores de red, `429` y `5xx`, y dejan registro en la tabla `ingestion_runs`.

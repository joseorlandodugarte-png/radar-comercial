# Radar Comercial Venezuela

Directorio y CRM para prospectar negocios físicos por **estado > municipio > sector**. Cada negocio tiene su Instagram, contacto, ubicación en el mapa y métricas de redes, con dos puntajes que explican quién necesita ayuda: **Salud digital** y **Oportunidad**. Empieza por Mérida.

> Desde el teléfono: eliges un municipio, tocas **Rojo** y ves quién necesita ayuda con sus redes; un toque más y le escribes por WhatsApp con un mensaje ya redactado.

## Instalación en 5 pasos

Necesitas [Node.js 20+](https://nodejs.org), [pnpm](https://pnpm.io/installation) y [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
# 1. Descarga el código
git clone <url-del-repositorio> radar-comercial && cd radar-comercial

# 2. Instala las dependencias
pnpm install

# 3. Crea tu archivo de configuración (las claves de API son opcionales para empezar)
cp .env.example .env

# 4. Levanta PostgreSQL con PostGIS
docker compose up -d

# 5. Crea las tablas, carga Mérida con 60 negocios DEMO y abre la app
pnpm db:setup && pnpm dev
```

Abre <http://localhost:3000>. Para verla en tu teléfono, conéctalo a la misma red Wi-Fi y entra a `http://IP-DE-TU-PC:3000`.

Los 60 negocios de ejemplo son **ficticios** y llevan la etiqueta **DEMO**: sirven para probar la app sin claves. Para cargar negocios reales, sigue [docs/api-keys.md](docs/api-keys.md).

## Qué trae

| Sección               | Para qué sirve                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Inicio**            | Resumen del municipio elegido: semáforo, mejores oportunidades, seguimientos pendientes                                 |
| **Explorar**          | Estado > municipio > sector, con filtros que quedan en el enlace y vistas de tarjetas, tabla y mapa                     |
| **Mapa**              | Todos los negocios con agrupaciones coloreadas por el semáforo dominante                                                |
| **Ficha del negocio** | WhatsApp con mensaje listo, llamada, cómo llegar, redes, historial de métricas, desglose de puntajes, notas y contactos |
| **Pipeline**          | Kanban Nuevo > Contactado > Respondió > Reunión > Propuesta > Ganado / Perdido, con fecha de próxima acción             |
| **Agregar**           | Pega un enlace de Instagram o Google Maps, o usa tu ubicación                                                           |
| **Más**               | Importar y exportar CSV o Excel (detecta duplicados), revisión manual, cómo se calculan los puntajes                    |

**Datos:** cada métrica guarda su fuente y fecha; si falta, la app muestra "Sin dato" y no inventa nada. Solo se usan fuentes legales: OpenStreetMap, Google Places API, Instagram Graph API (Business Discovery) y carga manual o CSV.

**Puntajes:** los pesos y umbrales están en [`config/scoring.ts`](config/scoring.ts) y los mensajes de WhatsApp en [`config/messages.ts`](config/messages.ts). Después de cambiarlos, ejecuta `pnpm scores:recompute`.

## Comandos

| Comando                           | Qué hace                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`                        | App en modo desarrollo                                                         |
| `pnpm db:setup`                   | Migraciones y datos iniciales (se puede repetir sin duplicar)                  |
| `pnpm db:seed --reset`            | Vuelve a crear los negocios DEMO                                               |
| `pnpm scores:recompute`           | Recalcula todos los puntajes                                                   |
| `pnpm ingest:osm --dry-run`       | Muestra qué negocios traería de OpenStreetMap (quita `--dry-run` para guardar) |
| `pnpm ingest:google --dry-run`    | Reputación desde Google Places (necesita clave)                                |
| `pnpm ingest:instagram --dry-run` | Métricas de Instagram (necesita token de Meta)                                 |

## Pruebas

```bash
pnpm check          # lint + tipos + 90 pruebas unitarias
pnpm build          # compila para producción
pnpm e2e            # prueba de punta a punta en móvil y escritorio (requiere pnpm build y la base con datos DEMO)
```

La prueba E2E recorre: Explorar > Mérida > Libertador > Rojo > Restaurantes > abrir la ficha > mover a **Contactado** > verlo en el Pipeline. Si ya usas tu propio Chromium, indícalo con `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/ruta/a/chromium`; si no, instala el de Playwright con `pnpm exec playwright install chromium`.

No corras `pnpm dev` y `pnpm build` al mismo tiempo: ambos escriben en la carpeta `.next`.

## Estructura

```
config/            pesos de puntajes y plantillas de mensajes
drizzle/           migraciones SQL
scripts/seed/      estados, municipios, categorías y negocios DEMO
scripts/ingest/    workers de OSM, Google Places e Instagram
src/app/           páginas (Next.js App Router)
src/components/    interfaz
src/db/            esquema Drizzle + PostGIS y consultas
src/lib/scoring/   cálculo de Salud digital, Oportunidad, semáforo y servicios
src/server/        acciones del servidor
tests/             pruebas unitarias y E2E
```

Stack: Next.js 15, TypeScript, Tailwind CSS 4, shadcn/ui, Drizzle ORM, PostgreSQL 16 + PostGIS, MapLibre, Vitest y Playwright.

## Hoja de ruta

1. **Datos reales de Mérida:** correr `ingest:osm --boundaries`, luego Google e Instagram; completar a mano lo que falte desde **Más > Revisión manual**.
2. **Táchira y Trujillo:** los 24 estados ya están cargados; falta la lista de municipios de cada uno y correr los workers con `--state=tachira` o `--state=trujillo`.
3. **Todo el país.**
4. **Informe PDF por prospecto** con su diagnóstico y propuesta, para enviar por WhatsApp.
5. **App instalable (PWA)** con uso sin conexión en la calle.

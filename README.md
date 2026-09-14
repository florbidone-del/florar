# Florar - Taller de Cerámica

App de gestión del taller: turnos, cambios, pagos y avisos. Migrada del prototipo original
(`legacy/taller-ceramica.html`, un solo archivo pensado para correr dentro de un artefacto de
Claude.ai) a una aplicación real y propia:

- **Next.js 16** (App Router, TypeScript) — frontend y backend en el mismo proyecto.
- **Prisma** + **Postgres** (pensado para Vercel Postgres / Neon) como base de datos real.
- **Server Actions** de Next.js para todas las escrituras (reemplazan el viejo `window.storage`):
  cada acción valida la sesión y los datos en el servidor antes de tocar la base.
- **Rutas API** (`/api/mp/*`) para Mercado Pago (Checkout Pro + webhook), porque eso sí necesita
  URLs públicas reales.
- PWA instalable (`manifest.json` + íconos).

El archivo original y el backend de referencia de Mercado Pago quedaron en `legacy/` solo como
documentación histórica — no se usan en la app nueva.

## Cómo está organizado

```
prisma/schema.prisma       Modelo de datos (ver más abajo)
src/lib/domain.ts          Lógica de negocio pura (fechas, turnos, ocupación) — portada 1:1 del HTML original
src/lib/snapshot.ts        Carga los datos de Postgres a un "snapshot" en memoria para esa lógica
src/lib/session.ts         Sesión (cookie firmada) de alumno o profe/dueña
src/lib/actions/*.ts       Server Actions: todas las escrituras (alta de alumnos, cambios de turno, etc.)
src/lib/views/*.ts         Arma los datos que necesita cada pantalla a partir del snapshot
src/app/api/mp/*           Rutas HTTP de Mercado Pago (generar link, webhook, estado)
src/app/**/page.tsx        Páginas (alumno, profe, landing)
src/components/**          Componentes de UI (calendarios, modales, formularios)
```

### Modelo de datos

Cada tabla de Postgres corresponde a una de las estructuras del `state` del HTML original
(`config`, `holidays`, `students`, `admins`, etc.), con dos simplificaciones a propósito:

- **`ScheduleChange`** fusiona lo que antes eran `overrides` + `extraBookings` (dos objetos que
  siempre se escribían juntos para representar el mismo hecho: un cambio de turno de un alumno).
- **`Payment`** fusiona `paidMonths` (del alumno) con la base aparte que tenía el viejo backend de
  Mercado Pago (`mp-backend/db.json`) — ahora "pagado a mano" y "confirmado por webhook" escriben
  al mismo lugar, que es justo lo que permite el cobro automático.

## Desarrollo local

Necesitás Node 18.18+ (se probó con Node 22) y una base Postgres accesible (puede ser la misma
base de Vercel Postgres que uses en producción, o una local).

```bash
npm install
cp .env.example .env      # completá DATABASE_URL y SESSION_SECRET como mínimo
npx prisma migrate dev    # crea las tablas
npm run dev               # http://localhost:3000
```

La primera vez que entrás a `/profe`, como no hay ninguna cuenta creada todavía, te deja crear la
cuenta de **dueño/a**. Con esa cuenta creás las cuentas de **profe** (la dueña no ve nada
operativo del taller, solo gestiona el equipo). Los alumnos no se autorregistran: los da de alta
una profe desde su panel.

Sin `MP_ACCESS_TOKEN` configurado, el botón de pago cae automáticamente al link manual de Mercado
Pago (general o del alumno) si hay uno cargado en Configuración — la app funciona igual, solo que
sin confirmación automática.

## Desplegar a producción (GitHub + Vercel + Postgres)

1. **Repo en GitHub**: ya está creado y con el código pusheado en
   [github.com/jsantiago00/florar](https://github.com/jsantiago00/florar) (privado). Cada
   `git push` a `main` desde acá en adelante actualiza ese repo.
2. **Importar en Vercel**: entrá a [vercel.com/new](https://vercel.com/new), elegí "Import Git
   Repository" y seleccioná `jsantiago00/florar`. Framework Preset: Next.js (lo detecta solo). Con
   esto queda el deploy automático en cada push.
3. **Crear la base de datos**: en el dashboard del proyecto en Vercel, pestaña **Storage** → **Create
   Database** → **Postgres** (Neon). Al crearla, Vercel agrega sola la variable `DATABASE_URL` (y
   alguna variante como `POSTGRES_URL`) a las Environment Variables del proyecto — si usa un
   nombre distinto a `DATABASE_URL`, copiá su valor a una variable `DATABASE_URL` para que Prisma
   la encuentre.
4. **Variables de entorno**: en **Settings → Environment Variables**, cargá (para Production y
   Preview):
   - `DATABASE_URL` (si no la puso Vercel automáticamente con ese nombre exacto)
   - `SESSION_SECRET` — un string random largo (`openssl rand -base64 32`)
   - `MP_ACCESS_TOKEN` — Access Token privado de Mercado Pago (producción)
   - `MP_WEBHOOK_SECRET` — firma secreta del webhook (Mercado Pago → Tus integraciones → Webhooks)
   - `APP_URL` — la URL pública del deploy, ej. `https://florar.vercel.app` (sin barra final)
5. **Correr las migraciones contra la base real**: con `DATABASE_URL` apuntando a la base de
   Vercel Postgres (podés copiarla a tu `.env` local temporalmente, o usar `vercel env pull`),
   corré:
   ```bash
   npx prisma migrate deploy
   ```
   Esto crea las tablas en la base de producción. Hacelo de nuevo cada vez que cambie
   `prisma/schema.prisma`.
6. **Configurar el webhook de Mercado Pago**: en tu cuenta de Mercado Pago → Tus integraciones →
   tu app → Webhooks, cargá la URL `https://TU-DOMINIO/api/mp/webhook` y suscribite al evento
   `payment`. Copiá la firma secreta a `MP_WEBHOOK_SECRET`.
7. **Redeploy**: si agregaste o cambiaste variables de entorno después del primer deploy, hacé un
   redeploy desde Vercel para que las tome (Deployments → ⋯ → Redeploy).

Después de esto, cada `git push` a `main` dispara un deploy nuevo automáticamente.

## Variables de entorno

| Variable | Obligatoria | Para qué |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión a Postgres |
| `SESSION_SECRET` | Sí | Firma las cookies de sesión |
| `MP_ACCESS_TOKEN` | No* | Generar links de cobro (Checkout Pro) y confirmar pagos |
| `MP_WEBHOOK_SECRET` | No* | Validar que el webhook viene realmente de Mercado Pago |
| `APP_URL` | No | URL pública para armar los links de vuelta de MP; si falta, se infiere del request |

\* Sin `MP_ACCESS_TOKEN` el cobro automático queda deshabilitado y el botón de pago usa el link
manual configurado (si hay uno). `MP_WEBHOOK_SECRET` es opcional pero fuertemente recomendada en
producción.

## PWA

`public/manifest.json` ya declara nombre, colores de marca e ícono. El ícono actual sale del
favicon embebido en el HTML original (~190×190px) — funciona, pero para el mejor puntaje de
instalabilidad conviene en algún momento generar íconos 192×192 y 512×512 "de verdad" (por ejemplo
con [realfavicongenerator.net](https://realfavicongenerator.net)) y reemplazar
`public/icons/icon-190.jpg`.

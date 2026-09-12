# Servidor de cobros — Mercado Pago

Este es el paso siguiente para tener cobro y confirmación automática. No se puede meter dentro
de la app HTML de Claude porque necesita guardar un Access Token privado de Mercado Pago, y ese
token nunca debe estar en código que corre en el navegador de un alumno (cualquiera podría verlo
y usarlo para cobrar en tu nombre).

## Qué hace

- `POST /api/generar-link`: dado un alumno, un monto y un mes, crea un link de pago de Mercado
  Pago y lo devuelve.
- `POST /api/webhook`: Mercado Pago le avisa a este endpoint cuando el estado de un pago cambia.
  Si quedó aprobado, lo guarda como pagado — sin que nadie tenga que confirmarlo a mano.
- `GET /api/estado/:studentId/:mes`: para consultar si un alumno ya pagó tal mes.

Guarda todo en un archivo `db.json` simple. Para un taller esto alcanza; si en algún momento
crece mucho, se reemplaza por una base de datos real sin tocar el resto del código.

## Cómo ponerlo en marcha

1. `npm install`
2. Copiá `.env.example` a `.env` y completá:
   - `MP_ACCESS_TOKEN`: te lo da Mercado Pago en *Tus integraciones → tu aplicación →
     Credenciales de producción*.
   - `BASE_URL`: la URL pública donde vas a alojar este servidor (ver paso 3).
3. Subilo a un hosting con HTTPS público — Render, Railway o Fly.io tienen planes gratuitos o
   muy baratos y andan bien para esto. (No hace falta nada más potente que eso.)
4. En el panel de Mercado Pago, configurá la URL de Webhooks apuntando a
   `https://tu-servidor/api/webhook`, evento "Pagos".
5. Probalo primero con las credenciales de **prueba** de Mercado Pago antes de pasar a producción.

## Cómo se conecta con la app del taller

Ahora mismo la app (el HTML que abren los alumnos) guarda todo en el almacenamiento de Claude,
que vive dentro del navegador de cada persona que abre el link — este servidor no tiene forma de
escribir ahí directamente. Para que la confirmación de pago sea automática de punta a punta hay
dos caminos:

- **Camino corto:** la app, en vez de mostrar "pagó/no pagó" solo con su propio almacenamiento,
  hace un `fetch` a `GET /api/estado/:studentId/:mes` de este servidor para saber si ya pagó, y
  usa ese dato en el banner de deuda. Es un cambio chico en la app.
- **Camino de fondo (recomendado a mediano plazo):** migrar toda la app a un hosting propio con
  una base de datos real, y que este mismo servidor sea el que guarda alumnos, turnos y pagos —
  ahí todo queda en un solo lugar, sin depender del almacenamiento del navegador.

Cuando quieras dar ese paso, avisame y lo armamos juntos.

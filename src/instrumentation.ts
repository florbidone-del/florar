// Next.js corre esto una sola vez al arrancar cada instancia del servidor (incluidas las
// funciones serverless de Vercel, que por defecto están en UTC). Fijamos acá la zona horaria
// del taller para que "hoy" en toda la app coincida con la hora real de Argentina.
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = "America/Argentina/Buenos_Aires";
  }
}

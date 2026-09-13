// Vercel corre las funciones en UTC por defecto y no deja setear la variable de entorno
// "TZ" (nombre reservado) desde el dashboard. Esto es lo que hace que "hoy" coincida con
// el horario real del taller (Argentina) en vez de adelantarse de noche.
process.env.TZ = "America/Argentina/Buenos_Aires";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;

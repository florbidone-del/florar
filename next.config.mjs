/** @type {import('next').NextConfig} */
const nextConfig = {
  // Las fotos del CeramiBlog viajan como data URL en base64 dentro del body de la Server Action;
  // el límite por defecto (1mb) se queda corto para eso.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;

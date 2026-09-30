const MAX_DIMENSION = 1100;
const JPEG_QUALITY = 0.82;

/** Redimensiona una imagen en el navegador (nunca sube más de MAX_DIMENSION px de lado) y la
 *  devuelve como data URL en JPEG, para no mandar fotos de varios MB al servidor. Se usa tanto
 *  para las fotos de CeramiBlog/bitácora como para las que se mandan por el chat. */
export function resizeToDataUrl(
  file: File,
  { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY }: { maxDimension?: number; quality?: number } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      img.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

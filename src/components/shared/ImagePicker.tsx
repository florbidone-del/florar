"use client";

const MAX_DIMENSION = 1100;
const JPEG_QUALITY = 0.82;

/** Redimensiona la imagen en el navegador (nunca sube más de MAX_DIMENSION px de lado) y la
 *  devuelve como data URL en JPEG, para no mandar fotos de varios MB al servidor. */
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => {
      img.onerror = () => reject(new Error("El archivo no es una imagen válida."));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo procesar la imagen."));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ImagePicker({
  value,
  onChange,
  label = "Foto (opcional)",
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
}) {
  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      onChange(await resizeToDataUrl(file));
    } catch {
      onChange(null);
    }
  }

  return (
    <div className="field" style={{ marginTop: 10 }}>
      <label>{label}</label>
      {value ? (
        <div style={{ marginTop: 6 }}>
          <img src={value} alt="" className="image-picker-preview" />
          <button type="button" className="ghost" style={{ marginTop: 8 }} onClick={() => onChange(null)}>
            Quitar foto
          </button>
        </div>
      ) : (
        <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0])} />
      )}
    </div>
  );
}

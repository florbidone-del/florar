import "server-only";
import { put, del } from "@vercel/blob";

/** Sube una foto (data URL en base64, ya redimensionada por el navegador) a Vercel Blob y
 *  devuelve su URL pública — así la base de datos solo guarda un link corto en vez del archivo
 *  entero, que es lo que más pesaba del almacenamiento. */
export async function uploadImageDataUrl(dataUrl: string, pathPrefix: string): Promise<string> {
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error("Formato de imagen inválido.");
  const [, type, base64] = match;
  const ext = type === "jpeg" ? "jpg" : type;
  const buffer = Buffer.from(base64, "base64");
  const filename = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const blob = await put(filename, buffer, { access: "public", contentType: `image/${type}` });
  return blob.url;
}

/** Copia una foto ya subida a Vercel Blob bajo un archivo nuevo — se usa al "destacar" una
 *  publicación de la bitácora en el CeramiBlog, para que cada post tenga su propio archivo y
 *  borrar uno (ej: al limpiar fotos viejas) no rompa la imagen del otro. */
export async function duplicateBlobImage(url: string, pathPrefix: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("No se pudo copiar la imagen.");
  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const ext = contentType.split("/")[1] || "jpg";
  const filename = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const blob = await put(filename, Buffer.from(arrayBuffer), { access: "public", contentType });
  return blob.url;
}

/** Borra una foto de Vercel Blob a partir de su URL — no hace nada si el valor no es una URL de
 *  Blob (por ejemplo, si es una data URL vieja de antes de esta migración) y no falla si ya no
 *  existe, para no bloquear el borrado del post por eso. */
export async function deleteBlobImage(imageData: string | null | undefined): Promise<void> {
  if (!imageData || !imageData.startsWith("http")) return;
  try {
    await del(imageData);
  } catch {
    // ya no existe, o el borrado falló — no es motivo para frenar el resto de la operación.
  }
}

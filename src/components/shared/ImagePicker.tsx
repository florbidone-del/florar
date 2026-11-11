"use client";

import { useState } from "react";
import { resizeToDataUrl } from "@/lib/resizeImage";
import { MAX_POST_IMAGES } from "@/lib/postImages";

/** Selector de fotos de un post: hasta MAX_POST_IMAGES, en el orden en que se eligen (así salen
 *  después en el carrusel). Cada una se achica en el navegador antes de guardarse en el estado. */
export function ImagePicker({
  value,
  onChange,
  label = `Fotos (opcional, hasta ${MAX_POST_IMAGES})`,
}: {
  value: string[];
  onChange: (dataUrls: string[]) => void;
  label?: string;
}) {
  const [error, setError] = useState("");
  const remaining = MAX_POST_IMAGES - value.length;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const picked = Array.from(files);
    const results = await Promise.allSettled(picked.slice(0, remaining).map((f) => resizeToDataUrl(f)));
    const added = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (added.length < results.length) setError("Alguna de las fotos no se pudo leer.");
    else if (picked.length > remaining) setError(`Se pueden subir hasta ${MAX_POST_IMAGES} fotos por publicación.`);
    else setError("");
    onChange([...value, ...added]);
  }

  return (
    <div className="field" style={{ marginTop: 10 }}>
      <label>{label}</label>
      {value.length > 0 && (
        <div className="image-picker-list">
          {value.map((src, i) => (
            <div className="image-picker-item" key={i}>
              <img src={src} alt="" />
              <button
                type="button"
                className="image-picker-remove"
                aria-label={`Quitar foto ${i + 1}`}
                title="Quitar foto"
                onClick={() => {
                  setError("");
                  onChange(value.filter((_, j) => j !== i));
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {remaining > 0 && (
        <input
          // La key cambia con cada foto agregada/quitada para que el input se vacíe y se pueda
          // volver a elegir el mismo archivo.
          key={value.length}
          type="file"
          accept="image/*"
          multiple
          style={value.length > 0 ? { marginTop: 8 } : undefined}
          onChange={(e) => handleFiles(e.target.files)}
        />
      )}
      {error && <p className="err">{error}</p>}
    </div>
  );
}

"use client";

import { resizeToDataUrl } from "@/lib/resizeImage";

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

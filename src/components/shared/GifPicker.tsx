"use client";

import { useEffect, useRef, useState } from "react";
import { GifSearch } from "@/components/shared/GifSearch";

/** Botón que abre un buscador de GIFs (vía Giphy, sin subir nada nuestro) — igual estructura que
 *  el EmojiPicker: mide la posición real para abrir a izquierda o derecha según haya lugar. */
export function GifPicker({ onPick }: { onPick: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelWidth = 260;

  useEffect(() => {
    if (!open || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setAlignRight(rect.left + panelWidth > window.innerWidth - 8);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="gif-picker" ref={ref}>
      <button type="button" className="ghost small" onClick={() => setOpen((v) => !v)}>
        GIF
      </button>
      {open && (
        <div className={`gif-picker-panel ${alignRight ? "align-right" : ""}`}>
          <GifSearch
            onPick={(url) => {
              onPick(url);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

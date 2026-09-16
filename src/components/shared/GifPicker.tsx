"use client";

import { useEffect, useRef, useState } from "react";

type Gif = { id: string; preview: string; url: string };

/** Botón que abre un buscador de GIFs (vía Giphy, sin subir nada nuestro) — igual estructura que
 *  el EmojiPicker: mide la posición real para abrir a izquierda o derecha según haya lugar. */
export function GifPicker({ onPick }: { onPick: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
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

  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => search(query), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open]);

  async function search(q: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/gifs/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudieron cargar los GIFs.");
        setGifs([]);
        return;
      }
      setGifs(data.gifs || []);
    } catch {
      setError("No se pudieron cargar los GIFs.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gif-picker" ref={ref}>
      <button type="button" className="ghost small" onClick={() => setOpen((v) => !v)}>
        GIF
      </button>
      {open && (
        <div className={`gif-picker-panel ${alignRight ? "align-right" : ""}`}>
          <input
            autoFocus
            placeholder="Buscar GIF…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading && <p className="muted gif-picker-status">Buscando…</p>}
          {error && <p className="err gif-picker-status">{error}</p>}
          {!loading && !error && gifs.length === 0 && (
            <p className="muted gif-picker-status">Sin resultados.</p>
          )}
          <div className="gif-picker-grid">
            {gifs.map((g) => (
              <button
                type="button"
                key={g.id}
                className="gif-picker-item"
                onClick={() => {
                  onPick(g.url);
                  setOpen(false);
                }}
              >
                <img src={g.preview} alt="" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

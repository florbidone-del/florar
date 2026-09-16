"use client";

import { useEffect, useState } from "react";

type Gif = { id: string; preview: string; url: string };

/** Buscador de GIFs en sí (input + grilla), sin el botón ni el panel flotante que lo abre — para
 *  poder reusarlo tanto en el GifPicker de siempre como en el menú "+" del chat. */
export function GifSearch({ onPick, autoFocus = true }: { onPick: (url: string) => void; autoFocus?: boolean }) {
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = setTimeout(() => search(query), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

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
    <>
      <input autoFocus={autoFocus} placeholder="Buscar GIF…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {loading && <p className="muted gif-picker-status">Buscando…</p>}
      {error && <p className="err gif-picker-status">{error}</p>}
      {!loading && !error && gifs.length === 0 && <p className="muted gif-picker-status">Sin resultados.</p>}
      <div className="gif-picker-grid">
        {gifs.map((g) => (
          <button type="button" key={g.id} className="gif-picker-item" onClick={() => onPick(g.url)}>
            <img src={g.preview} alt="" />
          </button>
        ))}
      </div>
    </>
  );
}

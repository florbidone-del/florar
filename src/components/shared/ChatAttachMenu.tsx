"use client";

import { useEffect, useRef, useState } from "react";
import { EmojiGrid } from "@/components/shared/EmojiGrid";
import { GifSearch } from "@/components/shared/GifSearch";

type View = "menu" | "emoji" | "gif";
const PANEL_WIDTH = 240;

/** Botón "+" del chat que agrupa emoji, foto y GIF en un solo menú, en vez de tres botones
 *  sueltos en la fila de escribir. Elegir un emoji no cierra el panel (se pueden mandar varios
 *  seguidos); elegir una foto o un GIF sí, porque son de una sola vez. */
export function ChatAttachMenu({
  onPickEmoji,
  onPickGif,
  onPickPhoto,
}: {
  onPickEmoji: (emoji: string) => void;
  onPickGif: (url: string) => void;
  onPickPhoto: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setView("menu");
      return;
    }
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setAlignRight(rect.left + PANEL_WIDTH > window.innerWidth - 8);
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
    <div className="chat-attach" ref={ref}>
      <button type="button" className="ghost chat-attach-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "×" : "+"}
      </button>
      {open && (
        <div className={`chat-attach-panel ${alignRight ? "align-right" : ""}`}>
          {view === "menu" && (
            <div className="chat-attach-menu-list">
              <button type="button" className="chat-attach-menu-item" onClick={() => setView("emoji")}>
                😊 Emoji
              </button>
              <button
                type="button"
                className="chat-attach-menu-item"
                onClick={() => {
                  onPickPhoto();
                  setOpen(false);
                }}
              >
                📷 Foto
              </button>
              <button type="button" className="chat-attach-menu-item" onClick={() => setView("gif")}>
                🎞️ GIF
              </button>
            </div>
          )}
          {view === "emoji" && (
            <>
              <button type="button" className="ghost small chat-attach-back" onClick={() => setView("menu")}>
                ← volver
              </button>
              <EmojiGrid onPick={onPickEmoji} />
            </>
          )}
          {view === "gif" && (
            <>
              <button type="button" className="ghost small chat-attach-back" onClick={() => setView("menu")}>
                ← volver
              </button>
              <GifSearch
                onPick={(url) => {
                  onPickGif(url);
                  setOpen(false);
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

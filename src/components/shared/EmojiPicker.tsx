"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const EMOJIS = [
  "😀", "😊", "😍", "🥰", "😂", "😅", "🤔", "😉", "😎", "🙌",
  "👏", "👍", "🙏", "💪", "✨", "🔥", "🎉", "❤️", "💜", "🧡",
  "🏺", "🎨", "🖌️", "🧑‍🎨", "🌸", "🌿", "☀️", "🌙", "⭐", "✅",
  "❌", "⏰", "📅", "💬", "📸", "👋", "🥲", "😴", "🫶", "🤝",
  "😇", "🤩", "🥳", "🤗", "😌", "🙃", "😬", "🤷", "🙋", "👀",
  "💥", "💦", "🌟", "🌺", "🌻", "🍃", "🐣", "🦋", "🌈", "❄️",
  "🧉", "☕", "🍰", "🍫", "🎂", "🍓", "🎈", "🎁", "🏆", "📌",
  "🔔", "💯", "🪴", "🕯️", "🧵", "🧱", "🪵", "🐶", "🐱", "🐝",
  "🙈", "🙉", "🙊", "💫", "🌊", "🍀", "🌼", "🌷", "🧺", "🖼️",
];

const PANEL_WIDTH = 210;

/** Botón que abre un panel simple con emojis frecuentes — para no depender del teclado nativo
 *  del sistema operativo. `onPick` agrega el emoji elegido al texto que maneje quien lo use.
 *  El panel se abre hacia la izquierda o la derecha según haya lugar, midiendo la posición real
 *  del botón — así funciona sin importar dónde caiga en su fila (por eso, no un lado fijo). */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !ref.current) return;
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
    <div className="emoji-picker" ref={ref}>
      <button type="button" className="ghost small" onClick={() => setOpen((v) => !v)}>
        😊
      </button>
      {open && (
        <div className={`emoji-picker-panel ${alignRight ? "align-right" : ""}`}>
          {EMOJIS.map((e) => (
            <button
              type="button"
              key={e}
              className="emoji-picker-item"
              onClick={() => {
                onPick(e);
                setOpen(false);
              }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

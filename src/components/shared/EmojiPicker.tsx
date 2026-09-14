"use client";

import { useEffect, useRef, useState } from "react";

const EMOJIS = [
  "😀", "😊", "😍", "🥰", "😂", "😅", "🤔", "😉", "😎", "🙌",
  "👏", "👍", "🙏", "💪", "✨", "🔥", "🎉", "❤️", "💜", "🧡",
  "🏺", "🎨", "🖌️", "🧑‍🎨", "🌸", "🌿", "☀️", "🌙", "⭐", "✅",
  "❌", "⏰", "📅", "💬", "📸", "👋", "🥲", "😴", "🫶", "🤝",
];

/** Botón que abre un panel simple con emojis frecuentes — para no depender del teclado nativo
 *  del sistema operativo. `onPick` agrega el emoji elegido al texto que maneje quien lo use. */
export function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
        <div className="emoji-picker-panel">
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

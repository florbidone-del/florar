"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EmojiGrid } from "@/components/shared/EmojiGrid";

const PANEL_WIDTH = 210;

/** Botón que abre un panel simple con emojis frecuentes — para no depender del teclado nativo
 *  del sistema operativo. `onPick` agrega el emoji elegido al texto que maneje quien lo use.
 *  El panel se abre hacia la izquierda o la derecha según haya lugar, midiendo la posición real
 *  del botón — así funciona sin importar dónde caiga en su fila (por eso, no un lado fijo).
 *  `targetRef`, si se pasa, vuelve a enfocar ese input/textarea después de elegir un emoji — si
 *  no, el foco queda en el botón de emoji y cosas como "Enter para enviar" dejan de andar. */
export function EmojiPicker({
  onPick,
  targetRef,
}: {
  onPick: (emoji: string) => void;
  targetRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}) {
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
          <EmojiGrid
            onPick={(e) => {
              onPick(e);
              targetRef?.current?.focus();
            }}
          />
        </div>
      )}
    </div>
  );
}

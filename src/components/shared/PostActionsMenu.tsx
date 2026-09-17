"use client";

import { useEffect, useRef, useState } from "react";
import { MoreIcon } from "@/components/shared/Icons";

/** Menú "⋮" con las acciones de moderación de un post — reemplaza la fila de botones sueltos. */
export function PostActionsMenu({
  items,
  disabled,
  overlay,
}: {
  items: { label: string; onClick: () => void; danger?: boolean }[];
  disabled?: boolean;
  /** Para cuando va apoyado sobre una foto: botón más grande y con fondo, en vez del ghost chico. */
  overlay?: boolean;
}) {
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

  if (items.length === 0) return null;

  return (
    <div className="post-menu" ref={ref}>
      <button
        type="button"
        className={overlay ? "post-menu-toggle post-menu-toggle-solid" : "ghost post-menu-toggle"}
        aria-label="Más opciones"
        title="Más opciones"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreIcon size={overlay ? 20 : 18} />
      </button>
      {open && (
        <div className="post-menu-panel">
          {items.map((it) => (
            <button
              type="button"
              key={it.label}
              className={`post-menu-item ${it.danger ? "danger" : ""}`}
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

/** Un botón "+ Nueva X" que revela una card con el formulario al tocarlo — el estado de
 *  abierto/cerrado lo maneja quien lo usa, para poder cerrarlo también al publicar. */
export function NewItemCard({
  label,
  open,
  onOpen,
  children,
}: {
  label: string;
  open: boolean;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  if (!open) {
    return (
      <button type="button" className="ghost block new-toggle" onClick={onOpen}>
        + {label}
      </button>
    );
  }
  return <div className="card">{children}</div>;
}

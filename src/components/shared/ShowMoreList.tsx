"use client";

import { useState, type ReactNode } from "react";

/** Lista que solo muestra los primeros `initialCount` items, con un botón para desplegar el
 *  resto — así una pestaña con muchos avisos/feriados/etc. no se vuelve interminable. */
export function ShowMoreList<T>({
  items,
  initialCount = 3,
  itemLabelPlural = "elementos",
  emptyMessage = "No hay nada para mostrar.",
  renderItem,
}: {
  items: T[];
  initialCount?: number;
  itemLabelPlural?: string;
  emptyMessage?: string;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return <p className="muted">{emptyMessage}</p>;

  const visible = expanded ? items : items.slice(0, initialCount);
  const hidden = items.length - visible.length;

  return (
    <>
      {visible.map(renderItem)}
      {hidden > 0 && (
        <button type="button" className="ghost block" style={{ marginTop: 8 }} onClick={() => setExpanded(true)}>
          Mostrar {hidden} {itemLabelPlural} más
        </button>
      )}
      {expanded && items.length > initialCount && (
        <button type="button" className="ghost block" style={{ marginTop: 8 }} onClick={() => setExpanded(false)}>
          Mostrar menos
        </button>
      )}
    </>
  );
}

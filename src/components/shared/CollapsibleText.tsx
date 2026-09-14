"use client";

import { useState, type ReactNode } from "react";

const DEFAULT_LIMIT = 220;

/** Corta un texto largo y agrega "ver más" / "ver menos" — para que una descripción larga no
 *  se coma la pantalla en una lista. `render` permite envolver el texto ya cortado (ej. Linkify). */
export function CollapsibleText({
  text,
  limit = DEFAULT_LIMIT,
  render,
}: {
  text: string;
  limit?: number;
  render?: (t: string) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const wrap = render || ((t: string) => t);

  if (text.length <= limit) return <>{wrap(text)}</>;

  const shown = expanded ? text : `${text.slice(0, limit).trimEnd()}…`;

  return (
    <>
      {wrap(shown)}
      <button
        type="button"
        className="ghost small"
        style={{ marginTop: 6, display: "block" }}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "ver menos" : "ver más"}
      </button>
    </>
  );
}

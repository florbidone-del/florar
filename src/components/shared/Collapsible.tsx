"use client";

import { useState } from "react";

export function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card collapsible">
      <button type="button" className="collapsible-header" onClick={() => setOpen((v) => !v)}>
        <h3>{title}</h3>
        <span className={`collapsible-chevron ${open ? "open" : ""}`}>▾</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}

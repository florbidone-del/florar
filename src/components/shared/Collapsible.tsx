"use client";

import { useEffect, useState } from "react";

export function Collapsible({
  title,
  defaultOpen = false,
  children,
  id,
  forceOpen,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  id?: string;
  forceOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <div id={id} className="card collapsible">
      <button type="button" className="collapsible-header" onClick={() => setOpen((v) => !v)}>
        <h3>{title}</h3>
        <span className={`collapsible-chevron ${open ? "open" : ""}`}>▾</span>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}

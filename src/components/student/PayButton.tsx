"use client";

import { useState } from "react";

export function PayButton({ fallbackLink }: { fallbackLink: string | null }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/mp/generar-link", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.init_point) {
        window.location.href = data.init_point;
        return;
      }
      if (fallbackLink) {
        window.open(fallbackLink, "_blank", "noopener");
      } else {
        setError(data.error || "No se pudo generar el link de pago.");
      }
    } catch {
      if (fallbackLink) window.open(fallbackLink, "_blank", "noopener");
      else setError("No se pudo generar el link de pago.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mp-btn">
      <button className="primary block" disabled={pending} onClick={handleClick}>
        {pending ? "Generando link…" : "Pagar con Mercado Pago"}
      </button>
      {error && <p className="err">{error}</p>}
    </div>
  );
}

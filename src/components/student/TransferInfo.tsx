"use client";

import { useState } from "react";

/** Alias / CBU / titular para transferir, cada uno con su botón de copiar (en el celular es
 *  mucho más fácil que tipear 22 dígitos). */
export function TransferInfo({
  transfer,
}: {
  transfer: { alias: string | null; cbu: string | null; holder: string | null };
}) {
  return (
    <div className="transfer-info">
      {transfer.alias && <CopyRow label="Alias" value={transfer.alias} />}
      {transfer.cbu && <CopyRow label="CBU / CVU" value={transfer.cbu} />}
      {transfer.holder && <div className="transfer-holder">Titular: {transfer.holder}</div>}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin permiso de portapapeles (algunos navegadores viejos): queda el texto para copiar a mano.
    }
  }

  return (
    <div className="copy-row">
      <div className="copy-row-text">
        <span className="copy-row-label">{label}</span>
        <span className="copy-row-value">{value}</span>
      </div>
      <button type="button" className={`ghost small ${copied ? "copied" : ""}`} onClick={copy}>
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

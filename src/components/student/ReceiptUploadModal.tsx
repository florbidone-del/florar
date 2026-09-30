"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { TransferInfo } from "@/components/student/TransferInfo";
import { resizeToDataUrl } from "@/lib/resizeImage";
import { submitPaymentReceiptAction } from "@/lib/actions/receipts";

// Un comprobante tiene letra chica: se achica menos que las fotos del blog para que se siga leyendo.
const RECEIPT_MAX_DIMENSION = 1800;
const MAX_PDF_BYTES = 2.5 * 1024 * 1024;

type Picked = { dataUrl: string; isPdf: boolean; name: string };

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/** "Ya transferí": el/la estudiante sube la foto/captura (o el PDF del banco) de su transferencia.
 *  Al mandarlo queda en revisión y tiene acceso provisorio al calendario. */
export function ReceiptUploadModal({
  remaining,
  defaultAmount,
  transfer,
  replacing,
  onClose,
  onDone,
}: {
  remaining: string;
  defaultAmount: number;
  transfer: { alias: string | null; cbu: string | null; holder: string | null } | null;
  replacing: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [file, setFile] = useState<Picked | null>(null);
  const [reading, setReading] = useState(false);
  const [amount, setAmount] = useState(defaultAmount > 0 ? String(defaultAmount) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleFile(f: File | undefined) {
    if (!f) return;
    setError("");
    setReading(true);
    try {
      if (f.type === "application/pdf") {
        if (f.size > MAX_PDF_BYTES) throw new Error("El PDF es muy pesado (máximo 2,5 MB). Probá con una captura de pantalla.");
        setFile({ dataUrl: await readAsDataUrl(f), isPdf: true, name: f.name });
      } else {
        const dataUrl = await resizeToDataUrl(f, { maxDimension: RECEIPT_MAX_DIMENSION, quality: 0.85 });
        setFile({ dataUrl, isPdf: false, name: f.name });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
    } finally {
      setReading(false);
    }
  }

  async function send() {
    if (!file) return setError("Elegí la foto o el PDF del comprobante.");
    if (!(Number(amount) > 0)) return setError("Poné el monto que transferiste.");
    setError("");
    setSending(true);
    const res = await submitPaymentReceiptAction({ fileData: file.dataUrl, amount: Number(amount), note });
    setSending(false);
    if ("error" in res && res.error) return setError(res.error);
    setSent(true);
  }

  if (sent) {
    return (
      <Modal onClose={onDone}>
        <div className="receipt-success">
          <div className="receipt-success-icon" aria-hidden>✓</div>
          <h3>¡Comprobante enviado!</h3>
          <p className="muted">
            La profe lo va a revisar y te avisamos cuando quede confirmado. Mientras tanto, ya podés usar
            el calendario normalmente.
          </p>
          <button className="primary block" onClick={onDone}>
            Listo
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h3>{replacing ? "Cambiar comprobante" : "Subir comprobante"}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Te falta pagar <strong>{remaining}</strong> este mes. Subí la captura o el PDF de la transferencia y
        la profe lo confirma.
      </p>

      {transfer && (
        <details className="transfer-details">
          <summary>¿Todavía no transferiste? Ver alias y CBU</summary>
          <TransferInfo transfer={transfer} />
        </details>
      )}

      <input
        id="receipt-file"
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {file ? (
        <div className="receipt-preview">
          {file.isPdf ? (
            <div className="receipt-pdf-tile">
              <span className="receipt-pdf-badge">PDF</span>
              <span className="receipt-pdf-name">{file.name}</span>
            </div>
          ) : (
            <img src={file.dataUrl} alt="Vista previa del comprobante" />
          )}
          <label htmlFor="receipt-file" className="receipt-change">
            Cambiar archivo
          </label>
        </div>
      ) : (
        <label htmlFor="receipt-file" className={`receipt-drop ${reading ? "busy" : ""}`}>
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 16V4" />
            <path d="M7 9l5-5 5 5" />
            <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
          </svg>
          <strong>{reading ? "Procesando…" : "Tocá para elegir el comprobante"}</strong>
          <span>Foto, captura de pantalla o PDF del banco</span>
        </label>
      )}

      <label htmlFor="receipt-amount">Monto que transferiste</label>
      <input
        id="receipt-amount"
        type="number"
        inputMode="numeric"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <label htmlFor="receipt-note">Comentario (opcional)</label>
      <input
        id="receipt-note"
        placeholder="Ej: la mandé desde la cuenta de mi mamá"
        value={note}
        maxLength={200}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && <p className="err">{error}</p>}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="ghost block" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary block" disabled={sending || reading || !file} onClick={send}>
          {sending ? "Enviando…" : "Enviar comprobante"}
        </button>
      </div>
    </Modal>
  );
}

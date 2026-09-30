"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { money, MESES } from "@/lib/domain";
import type { ReceiptDTO } from "@/lib/views/admin";
import { approvePaymentReceiptAction, rejectPaymentReceiptAction } from "@/lib/actions/receipts";
import { Modal } from "@/components/shared/Modal";
import { Collapsible } from "@/components/shared/Collapsible";

const REJECT_REASONS = [
  "No me llegó la transferencia",
  "No se ve bien el comprobante",
  "El monto no coincide",
  "Es de otro mes",
];

function fileUrl(id: string) {
  return `/api/comprobantes/${id}`;
}

/** "hoy 14:32", "ayer 09:10" o "3 de octubre" — para ver de un vistazo qué tan viejo es. */
function when(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const hhmm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const dayDiff = Math.round(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400000
  );
  if (dayDiff === 0) return `hoy ${hhmm}`;
  if (dayDiff === 1) return `ayer ${hhmm}`;
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function monthLabel(monthKey: string) {
  return MESES[Number(monthKey.slice(5, 7)) - 1];
}

/** Pestaña de la profe principal para revisar los comprobantes de transferencia que suben los/las
 *  estudiantes: los pendientes arriba (con la foto a la vista y aprobar/rechazar a un toque) y un
 *  historial corto de lo ya revisado. */
export function ReceiptsTab({ receipts }: { receipts: ReceiptDTO[] }) {
  const router = useRouter();
  const pending = receipts.filter((r) => r.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const reviewed = receipts
    .filter((r) => r.status !== "pending")
    .sort((a, b) => (b.reviewedAt || "").localeCompare(a.reviewedAt || ""));
  const [viewing, setViewing] = useState<ReceiptDTO | null>(null);
  const [approving, setApproving] = useState<ReceiptDTO | null>(null);
  const [rejecting, setRejecting] = useState<ReceiptDTO | null>(null);

  function done() {
    setApproving(null);
    setRejecting(null);
    setViewing(null);
    router.refresh();
  }

  return (
    <>
      <div className="card">
        <div className="receipts-header">
          <h3 style={{ margin: 0 }}>Comprobantes para revisar</h3>
          {pending.length > 0 && <span className="count-pill">{pending.length}</span>}
        </div>
        {pending.length === 0 ? (
          <div className="receipts-empty">
            <div className="receipts-empty-icon" aria-hidden>✓</div>
            <p>No hay comprobantes pendientes.</p>
            <p className="muted">Cuando alguien suba uno, te aparece acá (y te llega una notificación si las activaste).</p>
          </div>
        ) : (
          <p className="hint" style={{ marginTop: 6 }}>
            Mientras están acá, esos/as estudiantes tienen acceso provisorio al calendario. Revisá que la
            plata haya entrado y confirmá o rechazá.
          </p>
        )}
        {pending.map((r) => (
          <ReceiptCard
            key={r.id}
            receipt={r}
            onView={() => setViewing(r)}
            onApprove={() => setApproving(r)}
            onReject={() => setRejecting(r)}
          />
        ))}
      </div>

      {reviewed.length > 0 && (
        <Collapsible title={`Revisados recientemente (${reviewed.length})`}>
          {reviewed.map((r) => (
            <div className="list-item" key={r.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{r.studentName}</div>
                <div className="muted">
                  {money(r.amount)} · cuota de {monthLabel(r.monthKey)} · {r.reviewedAt ? when(r.reviewedAt) : ""}
                  {r.reviewedBy ? ` · ${r.reviewedBy}` : ""}
                </div>
                <span className={`tag ${r.status === "approved" ? "ok" : "warn"}`}>
                  {r.status === "approved" ? "aprobado" : "rechazado"}
                </span>
                {r.rejectReason && <div className="muted receipt-reason">“{r.rejectReason}”</div>}
              </div>
              <button className="ghost small" onClick={() => (r.isPdf ? window.open(fileUrl(r.id), "_blank") : setViewing(r))}>
                Ver
              </button>
            </div>
          ))}
        </Collapsible>
      )}

      {viewing && (
        <Modal onClose={() => setViewing(null)}>
          <h3>{viewing.studentName}</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            {money(viewing.amount)} · subido {when(viewing.createdAt)}
          </p>
          <img className="receipt-full" src={fileUrl(viewing.id)} alt={`Comprobante de ${viewing.studentName}`} />
          <a href={fileUrl(viewing.id)} target="_blank" rel="noopener" className="hint" style={{ display: "block", marginTop: 8 }}>
            Abrir en tamaño completo
          </a>
          {viewing.status === "pending" ? (
            <div className="row" style={{ marginTop: 16 }}>
              <button className="danger block" onClick={() => { setRejecting(viewing); setViewing(null); }}>
                Rechazar
              </button>
              <button className="primary block" onClick={() => { setApproving(viewing); setViewing(null); }}>
                Aprobar
              </button>
            </div>
          ) : (
            <button className="ghost block" style={{ marginTop: 16 }} onClick={() => setViewing(null)}>
              Cerrar
            </button>
          )}
        </Modal>
      )}
      {approving && <ApproveModal receipt={approving} onClose={() => setApproving(null)} onDone={done} />}
      {rejecting && <RejectModal receipt={rejecting} onClose={() => setRejecting(null)} onDone={done} />}
    </>
  );
}

function ReceiptCard({
  receipt: r,
  onView,
  onApprove,
  onReject,
}: {
  receipt: ReceiptDTO;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const remaining = r.feeDue !== null && r.alreadyPaid !== null ? Math.max(0, r.feeDue - r.alreadyPaid) : null;
  const covers = remaining === null || r.amount >= remaining;

  return (
    <div className="receipt-card">
      {r.isPdf ? (
        <a className="receipt-thumb pdf" href={fileUrl(r.id)} target="_blank" rel="noopener" aria-label="Abrir PDF">
          PDF
        </a>
      ) : (
        <button type="button" className="receipt-thumb" onClick={onView} aria-label="Ver comprobante">
          <img src={fileUrl(r.id)} alt="" loading="lazy" />
        </button>
      )}
      <div className="receipt-body">
        <div className="receipt-top">
          <strong>{r.studentName}</strong>
          <span className="muted receipt-when">{when(r.createdAt)}</span>
        </div>
        <div className="muted">{r.turnoLabel}</div>
        <div className="receipt-amount">
          {money(r.amount)}
          {remaining !== null && (
            <span className={`tag ${covers ? "ok" : "partial"}`}>
              {covers ? "cubre la cuota" : `faltarían ${money(remaining - r.amount)}`}
            </span>
          )}
        </div>
        {r.note && <div className="receipt-note">“{r.note}”</div>}
        <div className="receipt-actions">
          <button className="ghost small" onClick={onReject}>
            Rechazar
          </button>
          <button className="primary small" onClick={onApprove}>
            Aprobar
          </button>
        </div>
      </div>
    </div>
  );
}

function ApproveModal({
  receipt,
  onClose,
  onDone,
}: {
  receipt: ReceiptDTO;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(receipt.amount));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setPending(true);
    const res = await approvePaymentReceiptAction(receipt.id, Number(amount));
    setPending(false);
    if ("error" in res && res.error) return setError(res.error);
    onDone();
  }

  return (
    <Modal onClose={onClose}>
      <h3>Aprobar comprobante — {receipt.studentName}</h3>
      <label htmlFor="approve-amount">Monto que entró</label>
      <input id="approve-amount" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <p className="hint">
        Se registra como pago de la cuota de {monthLabel(receipt.monthKey)}
        {receipt.alreadyPaid ? `, sumado a los ${money(receipt.alreadyPaid)} que ya había pagado` : ""}. Si en
        tu cuenta entró otro monto, corregilo acá.
      </p>
      {error && <p className="err">{error}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="ghost block" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary block" disabled={pending || !(Number(amount) > 0)} onClick={confirm}>
          {pending ? "Guardando…" : "Aprobar"}
        </button>
      </div>
    </Modal>
  );
}

function RejectModal({
  receipt,
  onClose,
  onDone,
}: {
  receipt: ReceiptDTO;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setPending(true);
    const res = await rejectPaymentReceiptAction(receipt.id, reason);
    setPending(false);
    if ("error" in res && res.error) return setError(res.error);
    onDone();
  }

  return (
    <Modal onClose={onClose}>
      <h3>Rechazar comprobante — {receipt.studentName}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        Le va a aparecer el motivo para que suba otro o pague por Mercado Pago.
      </p>
      <div className="chip-row">
        {REJECT_REASONS.map((r) => (
          <div key={r} className={`chip ${reason === r ? "selected" : ""}`} onClick={() => setReason(r)}>
            {r}
          </div>
        ))}
      </div>
      <label htmlFor="reject-reason">Motivo</label>
      <input
        id="reject-reason"
        placeholder="Elegí uno de arriba o escribilo"
        value={reason}
        maxLength={160}
        onChange={(e) => setReason(e.target.value)}
      />
      {error && <p className="err">{error}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="ghost block" onClick={onClose}>
          Cancelar
        </button>
        <button className="danger block" disabled={pending || !reason.trim()} onClick={confirm}>
          {pending ? "Guardando…" : "Rechazar"}
        </button>
      </div>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/shared/Modal";
import {
  capacityForSlot,
  capitalize,
  fmtLong,
  isHoliday,
  parseISO,
  profeAccountsUsernames,
  profeForDateSlot,
  profeForSlot,
  slotById,
  slotOccupancy,
  slotRoster,
  slotsForDate,
  sortSlots,
  todayISO,
  type RosterEntry,
} from "@/lib/domain";
import type { AdminBundle } from "@/lib/views/admin";
import { profeMoveStudentAction, setSubstitutionAction } from "@/lib/actions/schedule";

export function OccupancyModal({
  date,
  slotId,
  bundle,
  canMove,
  onClose,
}: {
  date: string;
  slotId: string;
  bundle: AdminBundle;
  /** La profe principal puede mover a un/a estudiante a otro turno desde acá. */
  canMove: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const snap = bundle.snapshot;
  const slot = slotById(snap, date, slotId);
  const roster = slotRoster(snap, date, slotId);
  const profes = profeAccountsUsernames(bundle.admins);
  const currentProfe = profeForDateSlot(snap, date, slotId);
  const regularProfe = profeForSlot(snap, parseISO(date).getDay(), slotId);
  const capacity = capacityForSlot(snap, parseISO(date).getDay(), slotId);
  const [pending, setPending] = useState(false);
  const [moving, setMoving] = useState<RosterEntry | null>(null);
  const showMove = canMove && date >= todayISO();

  async function handleChange(value: string) {
    setPending(true);
    await setSubstitutionAction({ date, slotId, newProfe: value || null });
    setPending(false);
    onClose();
    router.refresh();
  }

  if (moving) {
    return (
      <MoveStudentModal
        entry={moving}
        fromDate={date}
        fromSlotId={slotId}
        bundle={bundle}
        onCancel={() => setMoving(null)}
        onDone={() => {
          onClose();
          router.refresh();
        }}
      />
    );
  }

  return (
    <Modal onClose={onClose}>
      <h3>{fmtLong(date)}</h3>
      <div className="occupancy-meta">
        <span className="occupancy-time">{slot ? `${slot.start}–${slot.end}` : ""}</span>
        <span className="muted">
          {roster.length}/{capacity} ocupados
        </span>
      </div>
      <div style={{ marginTop: 10 }}>
        {roster.length === 0 ? (
          <p className="muted">Nadie anotado todavía.</p>
        ) : (
          roster.map((r, i) => (
            <div className="roster-item" key={i}>
              <span className="roster-index">{i + 1}</span>
              <span className="roster-name">{r.name}</span>
              {r.kind !== "fijo" && (
                <span className="muted" style={{ fontSize: "0.75rem" }}>
                  {r.kind === "extra" ? "clase extra" : "por cambio"}
                </span>
              )}
              {showMove && (
                <button
                  type="button"
                  className="ghost small"
                  style={{ marginLeft: "auto" }}
                  onClick={() => setMoving(r)}
                >
                  mover
                </button>
              )}
            </div>
          ))
        )}
      </div>
      {profes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <label>
            Profe de este turno, solo para este día
            {currentProfe && currentProfe !== regularProfe ? " (suplente)" : ""}
          </label>
          <select
            defaultValue={currentProfe || ""}
            disabled={pending}
            onChange={(e) => handleChange(e.target.value)}
          >
            <option value="">
              — usar el profe habitual{regularProfe ? ` (${capitalize(regularProfe)})` : " (sin asignar)"} —
            </option>
            {profes.map((p) => (
              <option value={p} key={p}>
                {capitalize(p)}
              </option>
            ))}
          </select>
        </div>
      )}
      <button className="ghost block" style={{ marginTop: 14 }} onClick={onClose}>
        Cerrar
      </button>
    </Modal>
  );
}

/** La profe principal elige a qué día/turno pasar a un/a estudiante: sin anticipación mínima ni
 *  tope de cambios, solo hace falta que el turno tenga cupo. */
function MoveStudentModal({
  entry,
  fromDate,
  fromSlotId,
  bundle,
  onCancel,
  onDone,
}: {
  entry: RosterEntry;
  fromDate: string;
  fromSlotId: string;
  bundle: AdminBundle;
  onCancel: () => void;
  onDone: () => void;
}) {
  const snap = bundle.snapshot;
  const today = todayISO();
  const fromSlot = slotById(snap, fromDate, fromSlotId);
  const [targetDate, setTargetDate] = useState(fromDate);
  const [targetSlot, setTargetSlot] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(targetDate) && targetDate >= today;
  const holiday = validDate ? isHoliday(snap, targetDate) : null;
  const slots = validDate && !holiday ? sortSlots(slotsForDate(snap, targetDate)) : [];
  const chosen = slots.find((s) => s.id === targetSlot);

  async function confirm() {
    if (!targetSlot) return;
    setError("");
    setPending(true);
    const res = await profeMoveStudentAction({
      studentId: entry.studentId,
      fromDate,
      fromSlotId,
      targetDate,
      targetSlotId: targetSlot,
    });
    setPending(false);
    if ("error" in res) {
      setError(res.error!);
      return;
    }
    onDone();
  }

  return (
    <Modal onClose={onCancel}>
      <h3>Mover a {entry.name}</h3>
      <div className="banner" style={{ background: "var(--ok-bg)", borderColor: "var(--glaze)" }}>
        <strong>Ahora está en</strong>
        {fmtLong(fromDate)} · {fromSlot?.start}–{fromSlot?.end}
      </div>
      <p className="muted">
        Sin anticipación mínima ni tope de cambios — solo tiene que haber lugar.
        {entry.kind === "fijo" && " Queda registrado como su cambio del mes."}
      </p>
      <div className="step-label">1. Elegí el día</div>
      <input
        type="date"
        value={targetDate}
        min={today}
        onChange={(e) => {
          setTargetDate(e.target.value);
          setTargetSlot(null);
        }}
        style={{ marginBottom: 14 }}
      />
      <div className="step-label">2. Elegí el horario</div>
      <div>
        {!validDate ? (
          <p className="muted">Elegí un día de hoy en adelante.</p>
        ) : holiday ? (
          <p className="muted">Ese día es feriado.</p>
        ) : slots.length === 0 ? (
          <p className="muted">No hay turnos ese día.</p>
        ) : (
          slots.map((s) => {
            const occ = slotOccupancy(snap, targetDate, s.id, entry.studentId).length;
            const cap = capacityForSlot(snap, parseISO(targetDate).getDay(), s.id);
            const already = slotRoster(snap, targetDate, s.id).some((r) => r.studentId === entry.studentId);
            const isCurrent = targetDate === fromDate && s.id === fromSlotId;
            const full = occ >= cap;
            const blocked = full || already;
            return (
              <div
                key={s.id}
                className={`slot-option ${targetSlot === s.id ? "selected" : ""} ${blocked ? "full" : ""}`}
                onClick={blocked ? undefined : () => setTargetSlot(s.id)}
              >
                <span>
                  {s.start}–{s.end}
                </span>
                <span className="muted">
                  {isCurrent ? "es donde está ahora" : already ? "ya está anotado/a" : `${occ}/${cap}`}
                </span>
              </div>
            );
          })
        )}
      </div>
      {chosen && (
        <div className="banner" style={{ background: "#E6E1F0", borderColor: "#584A7A", color: "#584A7A" }}>
          <strong>Vas a pasarla/o a</strong>
          {fmtLong(targetDate)} · {chosen.start}–{chosen.end}
        </div>
      )}
      {error && <p className="err">{error}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="ghost block" onClick={onCancel}>
          Volver
        </button>
        <button className="primary block" disabled={!chosen || pending} onClick={confirm}>
          Confirmar
        </button>
      </div>
    </Modal>
  );
}

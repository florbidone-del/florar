"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { SwapCalendar } from "@/components/student/SwapCalendar";
import { fmtLong, parseISO } from "@/lib/domain";
import type { CalendarDay } from "@/lib/views/student";
import { redoScheduleChangeAction, requestScheduleChangeAction } from "@/lib/actions/schedule";

function hoursUntil(date: string, start: string) {
  const [h, m] = start.split(":").map(Number);
  const dt = parseISO(date);
  dt.setHours(h, m, 0, 0);
  return (dt.getTime() - Date.now()) / 3600000;
}

export function SwapModal({
  originalDate,
  originalSlotId,
  originalStart,
  originalEnd,
  isHolidayReschedule,
  redo,
  calendar,
  leadingBlanks,
  todayISO,
  onClose,
  onConfirmed,
}: {
  originalDate: string;
  originalSlotId: string;
  originalStart: string;
  originalEnd: string;
  isHolidayReschedule: boolean;
  /** Volver a cambiar un cambio ya hecho (dentro de las 48hs): el turno que tiene ahora queda
   *  bloqueado y el original se puede elegir para deshacer el cambio. */
  redo?: { changeId: string; currentDate: string; currentSlotId: string };
  calendar: CalendarDay[];
  leadingBlanks: number;
  todayISO: string;
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [chosenSlot, setChosenSlot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const chosenDay = chosenDate ? calendar.find((d) => d.date === chosenDate) : null;

  async function confirm() {
    if (!chosenDate || !chosenSlot) return;
    setError("");
    setPending(true);
    const res = redo
      ? await redoScheduleChangeAction({
          changeId: redo.changeId,
          targetDate: chosenDate,
          targetSlotId: chosenSlot,
        })
      : await requestScheduleChangeAction({
          originalDate,
          targetDate: chosenDate,
          targetSlotId: chosenSlot,
        });
    setPending(false);
    if ("error" in res) {
      setError(res.error!);
      return;
    }
    onConfirmed();
  }

  const currentSlot = redo
    ? calendar.find((d) => d.date === redo.currentDate)?.slots.find((s) => s.id === redo.currentSlotId)
    : null;
  const isUndoChoice = !!redo && chosenDate === originalDate && chosenSlot === originalSlotId;

  return (
    <Modal onClose={onClose}>
      <h3>
        {redo ? "Volver a cambiar" : isHolidayReschedule ? "Reprogramar clase de feriado" : "Cambiar turno"}
      </h3>
      <div className="banner" style={{ background: "var(--ok-bg)", borderColor: "var(--glaze)" }}>
        <strong>{redo ? "Tu clase original" : "Clase que estás cambiando"}</strong>
        {fmtLong(originalDate)} · {originalStart}–{originalEnd}
        {redo && (
          <div style={{ marginTop: 6 }}>
            <strong>Ahora la tenés el</strong>
            {fmtLong(redo.currentDate)} · {currentSlot?.start}–{currentSlot?.end}
          </div>
        )}
      </div>
      {redo && (
        <p className="muted">
          Podés moverla a otro turno o volver a tu turno original — no gasta otro cambio.
        </p>
      )}
      <p className="muted">Elegí un día de este mes con lugar.</p>
      <div className="step-label">1. Elegí el día (con lugar, dentro de este mes)</div>
      <div style={{ marginBottom: 14 }}>
        <SwapCalendar
          calendar={calendar}
          leadingBlanks={leadingBlanks}
          todayISO={todayISO}
          originalDate={originalDate}
          selectedDate={chosenDate}
          onSelect={(d) => {
            setChosenDate(d);
            setChosenSlot(null);
          }}
        />
      </div>
      <div className="step-label">2. Elegí el horario</div>
      <div>
        {!chosenDay ? null : chosenDay.slots.length === 0 ? (
          <p className="muted">No hay turnos ese día.</p>
        ) : (
          chosenDay.slots.map((slot) => {
            const isSameAsOriginal = chosenDate === originalDate && slot.id === originalSlotId;
            const isCurrent =
              !!redo && chosenDate === redo.currentDate && slot.id === redo.currentSlotId;
            const full = slot.occ >= slot.capacity;
            const hrs = hoursUntil(chosenDate!, slot.start);
            const blocked = full || hrs < 24 || isCurrent || (!redo && isSameAsOriginal);
            const label = isCurrent
              ? "es la que tenés ahora"
              : isSameAsOriginal
                ? redo
                  ? "tu turno original"
                  : "es la que estás cambiando"
                : `${slot.occ}/${slot.capacity}`;
            return (
              <div
                key={slot.id}
                className={`slot-option ${chosenSlot === slot.id ? "selected" : ""} ${blocked ? "full" : ""}`}
                onClick={blocked ? undefined : () => setChosenSlot(slot.id)}
              >
                <span>
                  {slot.start}–{slot.end}
                </span>
                <span className="muted">{label}</span>
              </div>
            );
          })
        )}
      </div>
      {chosenDate && chosenSlot && (
        <div className="banner" style={{ background: "#E6E1F0", borderColor: "#584A7A", color: "#584A7A" }}>
          <strong>{isUndoChoice ? "Vas a volver a tu turno original" : "Vas a mover esta clase a"}</strong>
          {fmtLong(chosenDate)} · {chosenDay?.slots.find((s) => s.id === chosenSlot)?.start}–
          {chosenDay?.slots.find((s) => s.id === chosenSlot)?.end}
        </div>
      )}
      {error && <p className="err">{error}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="ghost block" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="primary block"
          disabled={!chosenDate || !chosenSlot || pending}
          onClick={confirm}
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { SwapCalendar } from "@/components/student/SwapCalendar";
import { fmtLong, parseISO } from "@/lib/domain";
import type { CalendarDay } from "@/lib/views/student";
import { requestScheduleChangeAction } from "@/lib/actions/schedule";

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
  calendar,
  leadingBlanks,
  todayISO,
  capacity,
  onClose,
  onConfirmed,
}: {
  originalDate: string;
  originalSlotId: string;
  originalStart: string;
  originalEnd: string;
  isHolidayReschedule: boolean;
  calendar: CalendarDay[];
  leadingBlanks: number;
  todayISO: string;
  capacity: number;
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
    const res = await requestScheduleChangeAction({
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

  return (
    <Modal onClose={onClose}>
      <h3>{isHolidayReschedule ? "Reprogramar clase de feriado" : "Cambiar turno"}</h3>
      <div className="banner" style={{ background: "var(--ok-bg)", borderColor: "var(--glaze)" }}>
        <strong>Clase que estás cambiando</strong>
        {fmtLong(originalDate)} · {originalStart}–{originalEnd}
      </div>
      <p className="muted">Elegí un día de este mes con lugar.</p>
      <div className="step-label">1. Elegí el día (con lugar, dentro de este mes)</div>
      <div style={{ marginBottom: 14 }}>
        <SwapCalendar
          calendar={calendar}
          leadingBlanks={leadingBlanks}
          todayISO={todayISO}
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
            const full = slot.occ >= capacity;
            const hrs = hoursUntil(chosenDate!, slot.start);
            const blocked = full || hrs < 24 || isSameAsOriginal;
            return (
              <div
                key={slot.id}
                className={`slot-option ${chosenSlot === slot.id ? "selected" : ""} ${blocked ? "full" : ""}`}
                onClick={blocked ? undefined : () => setChosenSlot(slot.id)}
              >
                <span>
                  {slot.start}–{slot.end}
                </span>
                <span className="muted">
                  {isSameAsOriginal ? "es la que estás cambiando" : `${slot.occ}/${capacity}`}
                </span>
              </div>
            );
          })
        )}
      </div>
      {chosenDate && chosenSlot && (
        <div className="banner" style={{ background: "#E6E1F0", borderColor: "#584A7A", color: "#584A7A" }}>
          <strong>Vas a mover esta clase a</strong>
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

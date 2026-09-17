"use client";

import { Modal } from "@/components/shared/Modal";
import { Linkify } from "@/components/shared/Linkify";
import { Collapsible } from "@/components/shared/Collapsible";
import { fmtLong, parseISO } from "@/lib/domain";
import type { CalendarDay } from "@/lib/views/student";

function hoursUntil(date: string, start: string) {
  const [h, m] = start.split(":").map(Number);
  const dt = parseISO(date);
  dt.setHours(h, m, 0, 0);
  return (dt.getTime() - Date.now()) / 3600000;
}

export function OwnSessionModal({
  day,
  swapsLeft,
  onClose,
  onOpenSwap,
}: {
  day: CalendarDay;
  swapsLeft: number;
  onClose: () => void;
  onOpenSwap: (originalDate: string, isHolidayReschedule: boolean) => void;
}) {
  const own = day.own!;
  const hrs = hoursUntil(day.date, own.start);
  const future = hrs > 0;

  let body: React.ReactNode = null;
  let actionLabel: string | null = null;
  let actionDisabled = false;
  let isHolidayReschedule = false;

  if (own.status === "confirmed") {
    body = (
      <>
        <p className="muted">
          {own.start}–{own.end}
          {own.profeName ? ` · profe: ${own.profeName}` : ""}
        </p>
        <span className="tag ok">confirmada</span>
      </>
    );
    if (future) {
      const eligible = hrs >= 24 && swapsLeft > 0;
      actionLabel = "Cambiar este turno";
      actionDisabled = !eligible;
      if (!eligible) {
        body = (
          <>
            {body}
            <p className="hint">
              {hrs < 24 ? "Ya no se puede: falta menos de 24hs." : "Ya usaste tu cambio de este mes."}
            </p>
          </>
        );
      }
    } else {
      body = (
        <>
          {body}
          <p className="hint">Ya se dictó esta clase.</p>
        </>
      );
    }
  } else if (own.status === "pending-holiday") {
    body = (
      <>
        <p className="muted">
          {own.start}–{own.end}
        </p>
        <span className="tag warn">{day.holiday?.label || "sin clases"} — a reprogramar</span>
      </>
    );
    actionLabel = "Reprogramar";
    isHolidayReschedule = true;
  } else if (own.status === "capped") {
    body = (
      <>
        <p className="muted">
          {own.start}–{own.end}
        </p>
        <span className="tag moved">
          {day.holiday?.label || "Sin clases por ya haber tenido las 4 clases del mes"}
        </span>
      </>
    );
  } else if (own.status === "moved-swap" || own.status === "moved-holiday") {
    body = (
      <>
        <p className="muted">
          {own.start}–{own.end}
        </p>
        <span className="tag moved">movida a {fmtLong(own.movedTo!.date)}</span>
      </>
    );
  } else if (own.status === "rescheduled") {
    body = (
      <>
        <p className="muted">
          {own.start}–{own.end}
        </p>
        <span className="tag moved">reprogramada (antes {fmtLong(own.from!)})</span>
      </>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h3>{fmtLong(day.date)}</h3>
      {day.activity && (
        <div className="banner" style={{ background: "#F6EAD1", borderColor: "#C9962E" }}>
          <strong>{day.activity.title}</strong>
          {day.activity.range && <div className="muted">{day.activity.range}</div>}
          {day.activity.description && (
            <div style={{ marginTop: 10 }}>
              <Collapsible title="Material de la actividad">
                <Linkify text={day.activity.description} />
              </Collapsible>
            </div>
          )}
        </div>
      )}
      {body}
      {actionLabel && (
        <button
          className="primary block"
          style={{ marginTop: 14 }}
          disabled={actionDisabled}
          onClick={() => onOpenSwap(day.date, isHolidayReschedule)}
        >
          {actionLabel}
        </button>
      )}
      <button className="ghost block" style={{ marginTop: 10 }} onClick={onClose}>
        Cerrar
      </button>
    </Modal>
  );
}

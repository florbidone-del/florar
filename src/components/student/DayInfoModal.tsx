"use client";

import { Modal } from "@/components/shared/Modal";
import { Linkify } from "@/components/shared/Linkify";
import { fmtLong } from "@/lib/domain";
import type { CalendarDay } from "@/lib/views/student";

export function DayInfoModal({
  day,
  capacity,
  onClose,
}: {
  day: CalendarDay;
  capacity: number;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <h3>{fmtLong(day.date)}</h3>
      {day.activity && (
        <div className="banner" style={{ background: "#F6EAD1", borderColor: "#C9962E" }}>
          <strong>{day.activity.title}</strong>
          {day.activity.range && <div className="muted" style={{ marginBottom: 4 }}>{day.activity.range}</div>}
          {day.activity.description && <Linkify text={day.activity.description} />}
        </div>
      )}
      {day.holiday ? (
        <p className="muted">
          Feriado{day.holiday.label ? `: ${day.holiday.label}` : ""}. No hay clases este día.
        </p>
      ) : (
        day.slots.map((slot) => {
          const full = slot.occ >= capacity;
          return (
            <div className="list-item" key={slot.id}>
              <span>
                {slot.start}–{slot.end}
              </span>
              <span className={`tag ${full ? "warn" : "ok"}`}>
                {slot.occ}/{capacity}
              </span>
            </div>
          );
        })
      )}
      <button className="ghost block" style={{ marginTop: 14 }} onClick={onClose}>
        Cerrar
      </button>
    </Modal>
  );
}

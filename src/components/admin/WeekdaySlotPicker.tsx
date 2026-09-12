"use client";

import { DIAS_CORTO, slotsForWeekday, weekdayOccupancyCount, type WorkshopSnapshot } from "@/lib/domain";

export function WeekdaySlotPicker({
  snap,
  excludeStudentId,
  selDay,
  selSlot,
  onChange,
}: {
  snap: WorkshopSnapshot;
  excludeStudentId?: string;
  selDay: number | null;
  selSlot: string | null;
  onChange: (day: number, slot: string | null) => void;
}) {
  const dayOptions = [1, 2, 3, 4, 5, 6];
  const slots = selDay === null ? [] : slotsForWeekday(snap, selDay);

  return (
    <div>
      <div className="step-label">1. Elegí el día</div>
      <div className="chip-row">
        {dayOptions.map((d) => (
          <div
            key={d}
            className={`chip ${selDay === d ? "selected" : ""}`}
            onClick={() => onChange(d, null)}
          >
            {DIAS_CORTO[d]}
          </div>
        ))}
      </div>
      <div className="step-label">2. Elegí el horario</div>
      <div className="chip-row">
        {selDay === null ? null : slots.length === 0 ? (
          <p className="muted">Ese día no hay turnos configurados.</p>
        ) : (
          slots.map((slot) => {
            const occ = weekdayOccupancyCount(snap, selDay, slot.id, excludeStudentId);
            const full = occ >= snap.config.capacity;
            const isSel = selSlot === slot.id;
            return (
              <div
                key={slot.id}
                className={`chip ${isSel ? "selected" : ""} ${full && !isSel ? "full" : ""}`}
                onClick={full && !isSel ? undefined : () => onChange(selDay, slot.id)}
              >
                {slot.start}–{slot.end} <span className="muted">({occ}/{snap.config.capacity})</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  DIAS_CORTO,
  addDays,
  fmtLong,
  isHoliday,
  mondayOf,
  pad,
  parseISO,
  slotOccupancy,
  todayISO,
} from "@/lib/domain";
import type { AdminBundle } from "@/lib/views/admin";
import { OccupancyModal } from "@/components/admin/OccupancyModal";

export function WeekTab({ bundle }: { bundle: AdminBundle }) {
  const snap = bundle.snapshot;
  const [weekBase, setWeekBase] = useState(() => mondayOf(todayISO()));
  const [modalCell, setModalCell] = useState<{ date: string; slotId: string } | null>(null);

  const week = [0, 1, 2, 3, 4, 5].map((i) => addDays(weekBase, i));
  const orderedSlots = [...snap.config.slots].sort((a, b) => a.start.localeCompare(b.start));

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="ghost" onClick={() => setWeekBase(addDays(weekBase, -7))}>
          ← semana anterior
        </button>
        <button className="ghost" onClick={() => setWeekBase(addDays(weekBase, 7))}>
          semana siguiente →
        </button>
      </div>
      <div className="card" style={{ overflowX: "auto" }}>
        <h3>
          {fmtLong(week[0])} — {fmtLong(week[5])}
        </h3>
        <table>
          <tbody>
            <tr>
              <th></th>
              {week.map((d) => (
                <th key={d}>
                  {DIAS_CORTO[parseISO(d).getDay()]} {pad(parseISO(d).getDate())}
                </th>
              ))}
            </tr>
            {orderedSlots.map((slot) => {
              const slotId = slot.id;
              return (
                <tr key={slotId}>
                  <th style={{ whiteSpace: "nowrap" }}>
                    {slot.start}–{slot.end}
                  </th>
                  {week.map((date) => {
                    if (!slot.weekdays.includes(parseISO(date).getDay())) return <td key={date}>—</td>;
                    const hol = isHoliday(snap, date);
                    if (hol) {
                      return (
                        <td className="holiday" key={date}>
                          <span className="muted" style={{ fontSize: "0.68rem" }}>
                            feriado
                          </span>
                        </td>
                      );
                    }
                    const names = slotOccupancy(snap, date, slotId);
                    const full = names.length >= snap.config.capacity;
                    const isSubstituted = snap.substitutions.some(
                      (s) => s.date === date && s.slotId === slotId
                    );
                    const cls = [
                      "occ-cell",
                      names.length ? "has-people" : "",
                      full ? "full" : "",
                      isSubstituted ? "has-people" : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <td key={date}>
                        <button
                          type="button"
                          className={cls}
                          onClick={() => setModalCell({ date, slotId })}
                        >
                          {names.length}/{snap.config.capacity}
                          {isSubstituted ? " *" : ""}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="hint">Tocá un turno con alumnos para ver quiénes son.</p>
      </div>
      {modalCell && (
        <OccupancyModal
          date={modalCell.date}
          slotId={modalCell.slotId}
          bundle={bundle}
          onClose={() => setModalCell(null)}
        />
      )}
    </>
  );
}

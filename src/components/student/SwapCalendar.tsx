"use client";

import type { CalendarDay } from "@/lib/views/student";

export function SwapCalendar({
  calendar,
  leadingBlanks,
  todayISO,
  selectedDate,
  onSelect,
}: {
  calendar: CalendarDay[];
  leadingBlanks: number;
  todayISO: string;
  selectedDate: string | null;
  onSelect: (date: string) => void;
}) {
  return (
    <div>
      <div className="cal-grid cal-header">
        {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
          <div className="cal-h" key={i}>
            {d}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <div className="cal-cell empty" key={`b${i}`} />
        ))}
        {calendar.map((day) => {
          const isPastForSwap = day.date <= todayISO;
          let cls: string;
          if (day.weekday === 0) cls = "closed";
          else if (isPastForSwap) cls = "past";
          else cls = day.generalStatus;
          const clickable = cls === "available";
          return (
            <div
              key={day.date}
              className={`cal-cell ${cls} ${selectedDate === day.date ? "selected" : ""}`}
              onClick={clickable ? () => onSelect(day.date) : undefined}
            >
              {day.day}
              {day.activity && <span className="activity-dot" title="actividad" />}
            </div>
          );
        })}
      </div>
      <div className="cal-legend">
        <span>
          <span className="dot available" /> con lugar
        </span>
        <span>
          <span className="dot full" /> lleno
        </span>
        <span>
          <span className="dot holiday" /> feriado
        </span>
        <span>
          <span
            className="activity-dot"
            style={{ position: "static", display: "inline-block", boxShadow: "none" }}
          />{" "}
          actividad
        </span>
      </div>
    </div>
  );
}

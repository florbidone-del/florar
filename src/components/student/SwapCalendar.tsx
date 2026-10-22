"use client";

import type { CalendarDay } from "@/lib/views/student";

export function SwapCalendar({
  calendar,
  leadingBlanks,
  todayISO,
  originalDate,
  selectedDate,
  onSelect,
  allowToday = false,
}: {
  calendar: CalendarDay[];
  leadingBlanks: number;
  todayISO: string;
  originalDate: string;
  selectedDate: string | null;
  onSelect: (date: string) => void;
  /** La clase extra se puede agendar para hoy mismo (si queda algún turno sin empezar). */
  allowToday?: boolean;
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
          const isPastForSwap = allowToday ? day.date < todayISO : day.date <= todayISO;
          let cls: string;
          if (day.weekday === 0) cls = "closed";
          else if (isPastForSwap) cls = "past";
          else cls = day.generalStatus;
          const clickable = cls === "available";
          const isOrigin = day.date === originalDate;
          return (
            <div
              key={day.date}
              className={`cal-cell ${cls} ${selectedDate === day.date ? "selected" : ""} ${isOrigin ? "origin" : ""}`}
              onClick={clickable ? () => onSelect(day.date) : undefined}
            >
              {day.day}
            </div>
          );
        })}
      </div>
      <div className="cal-legend">
        {originalDate && (
          <span>
            <span className="dot origin" /> la que cambiás
          </span>
        )}
        <span>
          <span className="dot available" /> con lugar
        </span>
        <span>
          <span className="dot full" /> lleno
        </span>
        <span>
          <span className="dot holiday" /> sin clases
        </span>
      </div>
    </div>
  );
}

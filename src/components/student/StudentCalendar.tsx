"use client";

import type { CalendarDay } from "@/lib/views/student";

export function StudentCalendar({
  calendar,
  leadingBlanks,
  todayISO,
  onOwnClick,
  onOtherClick,
}: {
  calendar: CalendarDay[];
  leadingBlanks: number;
  todayISO: string;
  onOwnClick: (day: CalendarDay) => void;
  onOtherClick: (day: CalendarDay) => void;
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
          const isPast = day.date < todayISO;
          let cls: string;
          if (day.own) {
            if (day.own.status === "moved-swap" || day.own.status === "moved-holiday") cls = "own-moved";
            else if (day.own.status === "pending-holiday") cls = "own-pending";
            else if (day.own.status === "capped") cls = "own-attended";
            else if (day.own.status === "extra" && !isPast) cls = "own-extra";
            else if (isPast) cls = "own-attended";
            else cls = "own-confirmed";
          } else if (day.weekday === 0) {
            cls = "closed";
          } else if (isPast) {
            cls = "past";
          } else {
            cls = day.generalStatus;
          }
          const clickable =
            !!day.own ||
            day.generalStatus === "available" ||
            day.generalStatus === "full" ||
            day.generalStatus === "holiday" ||
            !!day.activity;
          return (
            <div
              key={day.date}
              className={`cal-cell ${cls}`}
              onClick={
                clickable ? () => (day.own ? onOwnClick(day) : onOtherClick(day)) : undefined
              }
            >
              {day.day}
            </div>
          );
        })}
      </div>
      <div className="cal-legend">
        <span>
          <span className="dot mine" /> tu clase
        </span>
        <span>
          <span className="dot available" /> con lugar
        </span>
        <span>
          <span className="dot full" /> lleno
        </span>
        <span>
          <span className="dot holiday" /> sin clases
        </span>
        <span>
          <span className="dot moved" /> movida
        </span>
      </div>
    </div>
  );
}

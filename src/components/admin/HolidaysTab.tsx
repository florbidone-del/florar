"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtLong, todayISO, capitalize, pad, MESES, DIAS_CORTO } from "@/lib/domain";
import type { HolidayDTO } from "@/lib/domain";
import { ShowMoreList } from "@/components/shared/ShowMoreList";
import { Modal } from "@/components/shared/Modal";
import { addHolidayAction, removeHolidayAction } from "@/lib/actions/content";
import type { AdminBundle } from "@/lib/views/admin";

export function HolidaysTab({ holidays, bundle }: { holidays: HolidayDTO[]; bundle: AdminBundle }) {
  const router = useRouter();
  const today = todayISO();
  const [viewMonthKey, setViewMonthKey] = useState(today.slice(0, 7));
  const [clickedDate, setClickedDate] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);

  const holidaysByDate = new Map(holidays.map((h) => [h.date, h]));
  // Un día solo tiene sentido cancelarlo si algún turno da clase ese día de la semana.
  const weekdaysWithClass = new Set(bundle.snapshot.config.slots.flatMap((s) => s.weekdays));

  const [y, m] = viewMonthKey.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const leadingBlanks = new Date(y, m - 1, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = `${y}-${pad(m)}-${pad(day)}`;
    const weekday = new Date(y, m - 1, day).getDay();
    return { date, day, weekday };
  });

  function changeMonth(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setViewMonthKey(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }

  function openDay(date: string) {
    setClickedDate(date);
    setLabel(holidaysByDate.get(date)?.label || "");
  }

  async function confirmCancelClass() {
    if (!clickedDate) return;
    setPending(true);
    await addHolidayAction({ date: clickedDate, label });
    setPending(false);
    setClickedDate(null);
    setLabel("");
    router.refresh();
  }

  async function confirmReactivate() {
    if (!clickedDate) return;
    setPending(true);
    await removeHolidayAction(clickedDate);
    setPending(false);
    setClickedDate(null);
    router.refresh();
  }

  async function remove(d: string) {
    await removeHolidayAction(d);
    router.refresh();
  }

  // Solo los que todavía faltan, del más cercano al más lejano — lo pasado no le sirve a nadie acá.
  const sorted = holidays.filter((h) => h.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const clickedHoliday = clickedDate ? holidaysByDate.get(clickedDate) : undefined;

  return (
    <>
      <div className="card">
        <h3>Calendario</h3>
        <p className="muted">
          Tocá un día para cancelar la clase (por feriado o cualquier otro motivo). Tocá uno ya
          cancelado para reactivarlo.
        </p>
        <div className="row" style={{ alignItems: "center", justifyContent: "space-between", marginTop: 10, marginBottom: 6 }}>
          <button type="button" className="ghost small" onClick={() => changeMonth(-1)}>
            ← anterior
          </button>
          <strong>
            {capitalize(MESES[m - 1])} {y}
          </strong>
          <button type="button" className="ghost small" onClick={() => changeMonth(1)}>
            siguiente →
          </button>
        </div>
        <div className="cal-grid cal-header">
          {DIAS_CORTO.map((d, i) => (
            <div className="cal-h" key={i}>
              {d[0]}
            </div>
          ))}
        </div>
        <div className="cal-grid">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div className="cal-cell empty" key={`b${i}`} />
          ))}
          {days.map((d) => {
            const hol = holidaysByDate.get(d.date);
            const hasClass = weekdaysWithClass.has(d.weekday);
            let cls = "cal-cell";
            if (hol) cls += " holiday";
            else if (hasClass) cls += " plain";
            else cls += " closed";
            if (d.date < today) cls += " past";
            if (d.date === today) cls += " today";
            const clickable = !!hol || hasClass;
            return (
              <div key={d.date} className={cls} onClick={clickable ? () => openDay(d.date) : undefined}>
                {d.day}
              </div>
            );
          })}
        </div>
        <div className="cal-legend">
          <span>
            <span className="dot holiday" /> clase cancelada
          </span>
        </div>
      </div>
      <div className="card">
        <h3>Feriados cargados</h3>
        <ShowMoreList
          items={sorted}
          initialCount={3}
          itemLabelPlural="feriados"
          emptyMessage="No hay feriados cargados."
          renderItem={(h) => (
            <div className="list-item" key={h.date}>
              <div>
                {fmtLong(h.date)} <span className="muted">— {h.label || ""}</span>
              </div>
              <button className="ghost" onClick={() => remove(h.date)}>
                quitar
              </button>
            </div>
          )}
        />
      </div>
      {clickedDate && (
        <Modal onClose={() => setClickedDate(null)}>
          <h3>{clickedHoliday ? "Clase cancelada" : "Cancelar clase"}</h3>
          <p className="muted">{fmtLong(clickedDate)}</p>
          {clickedHoliday ? (
            <>
              {clickedHoliday.label && <p>{clickedHoliday.label}</p>}
              <div className="row" style={{ marginTop: 16 }}>
                <button className="ghost block" onClick={() => setClickedDate(null)}>
                  Cerrar
                </button>
                <button className="danger block" disabled={pending} onClick={confirmReactivate}>
                  Reactivar clase
                </button>
              </div>
            </>
          ) : (
            <>
              <label>Motivo (opcional)</label>
              <input placeholder="Ej: Feriado nacional" value={label} onChange={(e) => setLabel(e.target.value)} />
              <div className="row" style={{ marginTop: 16 }}>
                <button className="ghost block" onClick={() => setClickedDate(null)}>
                  Cancelar
                </button>
                <button className="primary block" disabled={pending} onClick={confirmCancelClass}>
                  Confirmar
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

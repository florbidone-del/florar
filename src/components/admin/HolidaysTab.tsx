"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtLong } from "@/lib/domain";
import type { HolidayDTO } from "@/lib/domain";
import { addHolidayAction, removeHolidayAction } from "@/lib/actions/content";

export function HolidaysTab({ holidays }: { holidays: HolidayDTO[] }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);

  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date));

  async function add() {
    if (!date) return;
    setPending(true);
    await addHolidayAction({ date, label });
    setPending(false);
    setDate("");
    setLabel("");
    router.refresh();
  }
  async function remove(d: string) {
    await removeHolidayAction(d);
    router.refresh();
  }

  return (
    <>
      <div className="card">
        <h3>Agregar feriado</h3>
        <div className="row">
          <div>
            <label>Fecha</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label>Motivo (opcional)</label>
            <input placeholder="Ej: Feriado nacional" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
        </div>
        <button className="primary block" style={{ marginTop: 12 }} disabled={pending} onClick={add}>
          Agregar
        </button>
      </div>
      <div className="card">
        <h3>Feriados cargados</h3>
        {sorted.length === 0 ? (
          <p className="muted">No hay feriados cargados.</p>
        ) : (
          sorted.map((h) => (
            <div className="list-item" key={h.date}>
              <div>
                {fmtLong(h.date)} <span className="muted">— {h.label || ""}</span>
              </div>
              <button className="ghost" onClick={() => remove(h.date)}>
                quitar
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

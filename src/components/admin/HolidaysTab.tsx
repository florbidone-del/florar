"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtLong, daysSince } from "@/lib/domain";
import type { HolidayDTO } from "@/lib/domain";
import { ShowMoreList } from "@/components/shared/ShowMoreList";
import { addHolidayAction, removeHolidayAction, loadOfficialHolidaysAction } from "@/lib/actions/content";

export function HolidaysTab({ holidays, isMainProfe }: { holidays: HolidayDTO[]; isMainProfe: boolean }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [loadingOfficial, setLoadingOfficial] = useState(false);
  const [officialResult, setOfficialResult] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  // Ordenados por cercanía a hoy (sin importar si ya pasaron o todavía faltan) — así lo más
  // relevante para mirar de entrada es siempre lo más próximo a la fecha actual.
  const sorted = [...holidays].sort(
    (a, b) => Math.abs(daysSince(a.date)) - Math.abs(daysSince(b.date))
  );

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
  async function loadOfficial() {
    setLoadingOfficial(true);
    setOfficialResult(null);
    const res = await loadOfficialHolidaysAction([currentYear, currentYear + 1]);
    setLoadingOfficial(false);
    if ("error" in res) {
      setOfficialResult(res.error!);
      return;
    }
    setOfficialResult(
      res.added === 0
        ? "Ya estaban todos cargados — no había nada nuevo para agregar."
        : `Se agregaron ${res.added} feriados nuevos.`
    );
    router.refresh();
  }

  return (
    <>
      {isMainProfe && (
        <div className="card">
          <h3>Cargar feriados oficiales</h3>
          <p className="muted">
            Trae los feriados nacionales de {currentYear} y {currentYear + 1} desde la fuente oficial
            (api.argentinadatos.com), más el 25 de julio, fijo del taller. No pisa los que ya tengas
            cargados — podés apretarlo todos los años sin duplicar nada.
          </p>
          <button
            className="primary block"
            style={{ marginTop: 10 }}
            disabled={loadingOfficial}
            onClick={loadOfficial}
          >
            {loadingOfficial ? "Cargando…" : `Cargar feriados oficiales (${currentYear} y ${currentYear + 1})`}
          </button>
          {officialResult && <p className="hint">{officialResult}</p>}
        </div>
      )}
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
    </>
  );
}

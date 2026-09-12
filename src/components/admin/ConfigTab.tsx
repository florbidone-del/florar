"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DIAS_CORTO, slotsForWeekday } from "@/lib/domain";
import { THEMES } from "@/lib/themes";
import type { AdminBundle } from "@/lib/views/admin";
import {
  saveConfigAction,
  setThemeAction,
  addSlotAction,
  updateSlotAction,
  removeSlotAction,
} from "@/lib/actions/config";
import { setSlotAssignmentAction } from "@/lib/actions/schedule";

export function ConfigTab({ bundle }: { bundle: AdminBundle }) {
  const router = useRouter();
  const snap = bundle.snapshot;
  const c = snap.config;
  const profes = bundle.admins.filter((a) => a.role === "profe").map((a) => a.username);

  const [capacity, setCapacity] = useState(c.capacity);
  const [classesPerCycle, setClassesPerCycle] = useState(c.classesPerCycle);
  const [swapsPerMonth, setSwapsPerMonth] = useState(c.swapsPerMonth);
  const [paymentWindowStart, setPaymentWindowStart] = useState(c.paymentWindowStart);
  const [paymentWindowEnd, setPaymentWindowEnd] = useState(c.paymentWindowEnd);
  const [monthlyFee, setMonthlyFee] = useState(c.monthlyFee);
  const [announcementVisibleDays, setAnnouncementVisibleDays] = useState(c.announcementVisibleDays);
  const [defaultStudentPin, setDefaultStudentPin] = useState(c.defaultStudentPin);
  const [profeWhatsapp, setProfeWhatsapp] = useState(c.profeWhatsapp || "");
  const [mpLink, setMpLink] = useState(c.mpLink || "");
  const [savingRules, setSavingRules] = useState(false);

  async function saveRules() {
    setSavingRules(true);
    await saveConfigAction({
      capacity,
      classesPerCycle,
      swapsPerMonth,
      paymentWindowStart,
      paymentWindowEnd,
      monthlyFee,
      announcementVisibleDays,
      defaultStudentPin,
      profeWhatsapp,
      mpLink,
    });
    setSavingRules(false);
    router.refresh();
  }

  async function chooseTheme(theme: string) {
    await setThemeAction(theme);
    router.refresh();
  }

  return (
    <>
      <div className="card">
        <h3>Paleta de colores</h3>
        <div className="theme-grid">
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              type="button"
              key={key}
              className={`theme-card ${c.theme === key ? "selected" : ""}`}
              onClick={() => chooseTheme(key)}
            >
              <div className="theme-swatch">
                <span style={{ background: t.bg }} />
                <span style={{ background: t.glaze }} />
                <span style={{ background: t.oxide }} />
                <span style={{ background: t.ink }} />
              </div>
              <div className="theme-name">{t.name}</div>
            </button>
          ))}
        </div>
      </div>

      <SlotEditor type="weekday" title="Turnos de lunes a viernes" slots={c.slotsWeekday} onChanged={() => router.refresh()} />
      <SlotEditor type="saturday" title="Turnos de sábado" slots={c.slotsSaturday} onChanged={() => router.refresh()} />

      <div className="card">
        <h3>Profe a cargo de cada turno</h3>
        <p className="muted">
          Así los alumnos ven quién les da clase, y cada profe ve solo sus alumnos en la pestaña Alumnos.
          Opcional.
        </p>
        {profes.length === 0 ? (
          <p className="muted">
            Todavía no hay cuentas de profe creadas — pedile al dueño/a que cree una en su panel.
          </p>
        ) : (
          <div style={{ marginTop: 10 }}>
            {[1, 2, 3, 4, 5, 6].map((wd) =>
              slotsForWeekday(snap, wd).map((slot) => {
                const current =
                  snap.slotAssignments.find((sa) => sa.weekday === wd && sa.slotId === slot.id)
                    ?.profeUsername || "";
                return (
                  <div className="row" style={{ marginBottom: 8, alignItems: "center" }} key={`${wd}_${slot.id}`}>
                    <div className="muted" style={{ flex: 1.2 }}>
                      {DIAS_CORTO[wd]} · {slot.start}–{slot.end}
                    </div>
                    <select
                      defaultValue={current}
                      style={{ flex: 1 }}
                      onChange={async (e) => {
                        await setSlotAssignmentAction({
                          weekday: wd,
                          slotId: slot.id,
                          profeUsername: e.target.value || null,
                        });
                        router.refresh();
                      }}
                    >
                      <option value="">Sin asignar</option>
                      {profes.map((p) => (
                        <option value={p} key={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Reglas y cuota</h3>
        <label>Cupo por turno</label>
        <input type="number" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
        <label>Clases por ciclo (informativo)</label>
        <input type="number" value={classesPerCycle} onChange={(e) => setClassesPerCycle(Number(e.target.value))} />
        <label>Cambios permitidos por mes</label>
        <input type="number" value={swapsPerMonth} onChange={(e) => setSwapsPerMonth(Number(e.target.value))} />
        <div className="row">
          <div>
            <label>Pago desde el día</label>
            <input
              type="number"
              value={paymentWindowStart}
              onChange={(e) => setPaymentWindowStart(Number(e.target.value))}
            />
          </div>
          <div>
            <label>hasta el día</label>
            <input
              type="number"
              value={paymentWindowEnd}
              onChange={(e) => setPaymentWindowEnd(Number(e.target.value))}
            />
          </div>
        </div>
        <label>Cuota mensual por defecto</label>
        <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(Number(e.target.value))} />
        <label>Los avisos se muestran a los alumnos durante (días)</label>
        <input
          type="number"
          value={announcementVisibleDays}
          onChange={(e) => setAnnouncementVisibleDays(Number(e.target.value))}
        />
        <p className="hint">
          Pasados esos días, el aviso deja de aparecer en el home del alumno — pero vos seguís viéndolo en
          esta pestaña.
        </p>
        <label>PIN por defecto para alumnos nuevos</label>
        <input value={defaultStudentPin} maxLength={4} onChange={(e) => setDefaultStudentPin(e.target.value)} />
        <label>Tu WhatsApp (para avisos rápidos, sin el +, ej: 5491122334455)</label>
        <input placeholder="5491122334455" value={profeWhatsapp} onChange={(e) => setProfeWhatsapp(e.target.value)} />
        <p className="hint">
          Si lo cargás, cuando un alumno pida restablecer su PIN le va a aparecer un botón para avisarte
          directo por WhatsApp.
        </p>
        <label>Link de cobro de Mercado Pago (general)</label>
        <input placeholder="https://mpago.la/..." value={mpLink} onChange={(e) => setMpLink(e.target.value)} />
        <p className="hint">
          Se usa como respaldo si el cobro automático no está disponible, o como link general para
          alumnos sin uno personalizado.
        </p>
        <button className="primary block" style={{ marginTop: 14 }} disabled={savingRules} onClick={saveRules}>
          Guardar configuración
        </button>
      </div>
    </>
  );
}

function SlotEditor({
  type,
  title,
  slots,
  onChanged,
}: {
  type: "weekday" | "saturday";
  title: string;
  slots: { id: string; start: string; end: string }[];
  onChanged: () => void;
}) {
  async function update(id: string, field: "start" | "end", value: string, current: { start: string; end: string }) {
    await updateSlotAction({ id, start: field === "start" ? value : current.start, end: field === "end" ? value : current.end });
    onChanged();
  }
  async function remove(id: string) {
    await removeSlotAction(id);
    onChanged();
  }
  async function add() {
    await addSlotAction(type);
    onChanged();
  }

  return (
    <div className="card">
      <h3>{title}</h3>
      {slots.map((s) => (
        <div className="row" style={{ marginBottom: 8, alignItems: "flex-end" }} key={s.id}>
          <div>
            <label>Desde</label>
            <input type="time" defaultValue={s.start} onBlur={(e) => update(s.id, "start", e.target.value, s)} />
          </div>
          <div>
            <label>Hasta</label>
            <input type="time" defaultValue={s.end} onBlur={(e) => update(s.id, "end", e.target.value, s)} />
          </div>
          <button className="ghost" onClick={() => remove(s.id)}>
            ✕
          </button>
        </div>
      ))}
      <button className="ghost" onClick={add}>
        + agregar turno
      </button>
    </div>
  );
}

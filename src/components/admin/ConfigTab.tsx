"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DIAS_CORTO, capitalize, sortSlots } from "@/lib/domain";
import { THEMES } from "@/lib/themes";
import type { AdminBundle } from "@/lib/views/admin";
import { Collapsible } from "@/components/shared/Collapsible";
import { AutoTextarea } from "@/components/shared/AutoTextarea";
import { EmojiPicker } from "@/components/shared/EmojiPicker";
import {
  saveConfigAction,
  setThemeAction,
  addSlotAction,
  updateSlotAction,
  removeSlotAction,
} from "@/lib/actions/config";
import { setSlotAssignmentAction } from "@/lib/actions/schedule";
import { resetAllTutorialsAction, setMyDisplayNameAction } from "@/lib/actions/auth";
import { saveStudentInfoAction } from "@/lib/actions/content";

export function ConfigTab({
  bundle,
  isMainProfe,
  myUsername,
}: {
  bundle: AdminBundle;
  isMainProfe: boolean;
  myUsername: string;
}) {
  const router = useRouter();
  const snap = bundle.snapshot;
  const c = snap.config;
  const profes = bundle.admins.filter((a) => a.role === "profe").map((a) => a.username);
  const me = bundle.admins.find((a) => a.username === myUsername);

  const [capacity, setCapacity] = useState(c.capacity);
  const [classesPerCycle, setClassesPerCycle] = useState(c.classesPerCycle);
  const [swapsPerMonth, setSwapsPerMonth] = useState(c.swapsPerMonth);
  const [paymentWindowStart, setPaymentWindowStart] = useState(c.paymentWindowStart);
  const [paymentWindowEnd, setPaymentWindowEnd] = useState(c.paymentWindowEnd);
  const [monthlyFee, setMonthlyFee] = useState(c.monthlyFee);
  const [lateFeePercent, setLateFeePercent] = useState(c.lateFeePercent);
  const [announcementVisibleDays, setAnnouncementVisibleDays] = useState(c.announcementVisibleDays);
  const [defaultStudentPin, setDefaultStudentPin] = useState(c.defaultStudentPin);
  const [profeWhatsapp, setProfeWhatsapp] = useState(c.profeWhatsapp || "");
  const [mpLink, setMpLink] = useState(c.mpLink || "");
  const [savingRules, setSavingRules] = useState(false);
  const [resettingTutorial, setResettingTutorial] = useState(false);
  const [tutorialResetDone, setTutorialResetDone] = useState(false);
  const [studentInfo, setStudentInfo] = useState(c.studentInfo);
  const [savingInfo, setSavingInfo] = useState(false);
  const [displayName, setDisplayName] = useState(me?.displayName || "");
  const displayNameInputRef = useRef<HTMLInputElement>(null);
  const [savingDisplayName, setSavingDisplayName] = useState(false);

  async function saveStudentInfo() {
    setSavingInfo(true);
    await saveStudentInfoAction(studentInfo);
    setSavingInfo(false);
    router.refresh();
  }

  async function saveDisplayName() {
    setSavingDisplayName(true);
    await setMyDisplayNameAction(displayName);
    setSavingDisplayName(false);
    router.refresh();
  }

  async function resetTutorials() {
    if (!confirm("¿Reiniciar el tutorial para todas las cuentas (alumnos y profes)?")) return;
    setResettingTutorial(true);
    await resetAllTutorialsAction();
    setResettingTutorial(false);
    setTutorialResetDone(true);
  }

  async function saveRules() {
    setSavingRules(true);
    await saveConfigAction({
      capacity,
      classesPerCycle,
      swapsPerMonth,
      paymentWindowStart,
      paymentWindowEnd,
      monthlyFee,
      lateFeePercent,
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
      <Collapsible title="Tu nick">
        <p className="muted">
          Así te van a ver los alumnos en el chat, los avisos y el CeramiBlog, en vez de tu usuario de
          acceso ({myUsername}). Podés agregarle emojis.
        </p>
        <div className="nick-row" style={{ marginTop: 10 }}>
          <input
            ref={displayNameInputRef}
            placeholder={capitalize(myUsername)}
            maxLength={30}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <EmojiPicker onPick={(e) => setDisplayName((n) => n + e)} targetRef={displayNameInputRef} />
        </div>
        <button
          className="ghost block"
          style={{ marginTop: 8 }}
          disabled={savingDisplayName}
          onClick={saveDisplayName}
        >
          Guardar nick
        </button>
      </Collapsible>

      <Collapsible title="Paleta de colores">
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
      </Collapsible>

      <Collapsible title="Turnos">
        <p className="muted">Elegí los días en los que se dicta cada turno — no hace falta que sean los mismos todos los días.</p>
        <SlotEditor slots={c.slots} onChanged={() => router.refresh()} />
      </Collapsible>

      <Collapsible title="Información fija para alumnos">
        <p className="muted">
          Esto queda siempre visible arriba de todo en el celular del alumno — a diferencia de los
          avisos, no se acumula ni desaparece. Sirve para un link a un PDF, el material del mes, o algo
          que quieras que estén viendo siempre. Como no se toca seguido, vive acá en vez de en Avisos.
        </p>
        <AutoTextarea
          rows={4}
          placeholder="Ej: Material de este mes: [link]. Este viernes hay jornada especial de esmaltado."
          value={studentInfo}
          onChange={(e) => setStudentInfo(e.target.value)}
        />
        <button className="primary block" style={{ marginTop: 12 }} disabled={savingInfo} onClick={saveStudentInfo}>
          Guardar
        </button>
      </Collapsible>

      {isMainProfe && (
        <Collapsible title="Profe a cargo de cada turno">
          <p className="muted">
            Así los alumnos ven quién les da clase, y cada profe ve solo sus alumnos en la pestaña Alumnos.
            Opcional.
          </p>
          {profes.length === 0 ? (
            <p className="muted">
              Todavía no hay cuentas de profe creadas — pedile al dueño/a que cree una en su panel.
            </p>
          ) : (
            <SlotAssignmentGrid slots={c.slots} snap={snap} profes={profes} onChanged={() => router.refresh()} />
          )}
        </Collapsible>
      )}

      {isMainProfe && (
        <Collapsible title="Reglas y cuota">
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
        <label>Recargo por pago fuera de fecha (%)</label>
        <input
          type="number"
          value={lateFeePercent}
          onChange={(e) => setLateFeePercent(Number(e.target.value))}
        />
        <p className="hint">
          Pasado el día {paymentWindowEnd} sin pagar, la cuota le aparece al alumno con este recargo ya
          sumado (y el link de Mercado Pago cobra ese monto directo).
        </p>
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
        </Collapsible>
      )}

      {isMainProfe && (
        <Collapsible title="Herramientas">
          <a href="/api/export/payments">
            <button className="ghost block">Exportar pagos (Excel)</button>
          </a>
          <p className="hint">Descarga todos los pagos registrados (alumno, mes, monto, estado, origen y fecha) en un archivo .xlsx.</p>
          <button className="ghost block" style={{ marginTop: 14 }} disabled={resettingTutorial} onClick={resetTutorials}>
            Reiniciar tutorial para todos los usuarios
          </button>
          {tutorialResetDone && (
            <p className="hint">Listo — la próxima vez que cada alumno o profe entre, va a ver el tutorial de nuevo.</p>
          )}
        </Collapsible>
      )}
    </>
  );
}

const WEEKDAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0];

function SlotAssignmentGrid({
  slots,
  snap,
  profes,
  onChanged,
}: {
  slots: { id: string; weekdays: number[]; start: string; end: string }[];
  snap: AdminBundle["snapshot"];
  profes: string[];
  onChanged: () => void;
}) {
  if (slots.length === 0) return null;
  const sorted = [...slots].sort((a, b) => a.start.localeCompare(b.start));

  async function assign(weekday: number, slotId: string, value: string) {
    await setSlotAssignmentAction({ weekday, slotId, profeUsername: value || null });
    onChanged();
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <tbody>
          <tr>
            <th className="row-head"></th>
            {WEEKDAYS_MON_FIRST.filter((wd) => wd !== 0).map((wd) => (
              <th key={wd}>{DIAS_CORTO[wd]}</th>
            ))}
          </tr>
          {sorted.map((slot) => (
            <tr key={slot.id}>
              <th className="row-head" style={{ whiteSpace: "nowrap" }}>
                {slot.start}–{slot.end}
              </th>
              {WEEKDAYS_MON_FIRST.filter((wd) => wd !== 0).map((wd) => {
                if (!slot.weekdays.includes(wd)) return <td key={wd}>—</td>;
                const current =
                  snap.slotAssignments.find((sa) => sa.weekday === wd && sa.slotId === slot.id)
                    ?.profeUsername || "";
                return (
                  <td key={wd}>
                    <select
                      defaultValue={current}
                      style={{ fontSize: "0.72rem", padding: "6px 4px" }}
                      onChange={(e) => assign(wd, slot.id, e.target.value)}
                    >
                      <option value="">—</option>
                      {profes.map((p) => (
                        <option value={p} key={p}>
                          {capitalize(p)}
                        </option>
                      ))}
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlotEditor({
  slots,
  onChanged,
}: {
  slots: { id: string; weekdays: number[]; start: string; end: string }[];
  onChanged: () => void;
}) {
  // El orden visual se fija una vez al entrar y solo se actualiza cuando se agrega o
  // quita un turno — así una fila no salta de lugar mientras vas tildando sus días.
  const [order, setOrder] = useState<string[]>(() => sortSlots(slots).map((s) => s.id));
  useEffect(() => {
    setOrder((prev) => {
      const stillThere = prev.filter((id) => slots.some((s) => s.id === id));
      const newOnes = slots.filter((s) => !stillThere.includes(s.id));
      return newOnes.length ? [...stillThere, ...sortSlots(newOnes).map((s) => s.id)] : stillThere;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots.map((s) => s.id).join(",")]);
  const sorted = order.map((id) => slots.find((s) => s.id === id)).filter((s): s is (typeof slots)[number] => !!s);

  async function update(
    id: string,
    changes: Partial<{ start: string; end: string; weekdays: number[] }>,
    current: { start: string; end: string; weekdays: number[] }
  ) {
    await updateSlotAction({
      id,
      start: changes.start ?? current.start,
      end: changes.end ?? current.end,
      weekdays: changes.weekdays ?? current.weekdays,
    });
    onChanged();
  }
  async function remove(id: string) {
    await removeSlotAction(id);
    onChanged();
  }
  async function add() {
    await addSlotAction();
    onChanged();
  }

  return (
    <>
      {sorted.map((s) => (
        <div key={s.id} className="card" style={{ background: "var(--surface-2)", marginBottom: 10 }}>
          <div className="row" style={{ alignItems: "flex-end" }}>
            <div>
              <label>Desde</label>
              <input type="time" defaultValue={s.start} onBlur={(e) => update(s.id, { start: e.target.value }, s)} />
            </div>
            <div>
              <label>Hasta</label>
              <input type="time" defaultValue={s.end} onBlur={(e) => update(s.id, { end: e.target.value }, s)} />
            </div>
            <button className="ghost" onClick={() => remove(s.id)}>
              ✕
            </button>
          </div>
          <label>Días</label>
          <div className="chip-row" style={{ marginBottom: 0 }}>
            {WEEKDAYS_MON_FIRST.map((wd) => {
              const selected = s.weekdays.includes(wd);
              return (
                <div
                  key={wd}
                  className={`chip ${selected ? "selected" : ""}`}
                  onClick={() =>
                    update(
                      s.id,
                      { weekdays: selected ? s.weekdays.filter((w) => w !== wd) : [...s.weekdays, wd] },
                      s
                    )
                  }
                >
                  {DIAS_CORTO[wd]}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <button className="ghost" onClick={add}>
        + agregar turno
      </button>
    </>
  );
}

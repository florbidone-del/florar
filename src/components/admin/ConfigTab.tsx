"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DIAS_CORTO, capitalize, sortSlots } from "@/lib/domain";
import type { AdminBundle } from "@/lib/views/admin";
import { Collapsible } from "@/components/shared/Collapsible";
import { EmojiPicker } from "@/components/shared/EmojiPicker";
import {
  saveConfigAction,
  setFontAction,
  addSlotAction,
  updateSlotAction,
  removeSlotAction,
} from "@/lib/actions/config";
import { setSlotAssignmentAction } from "@/lib/actions/schedule";
import { resetAllTutorialsAction, setMyDisplayNameAction } from "@/lib/actions/auth";
import {
  clearOldImagesAction,
  loadOfficialHolidaysAction,
  loadExtraClassCancellationsAction,
} from "@/lib/actions/content";

const FONT_OPTIONS = [
  { key: "darumadrop", label: "Darumadrop One", cssVar: "var(--font-darumadrop)" },
  { key: "roboto", label: "Roboto", cssVar: "var(--font-test-roboto)" },
  { key: "montserrat", label: "Montserrat", cssVar: "var(--font-test-montserrat)" },
  { key: "fira", label: "Fira Sans Condensed", cssVar: "var(--font-test-fira)" },
];

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

  const [classesPerCycle, setClassesPerCycle] = useState(c.classesPerCycle);
  const [swapsPerMonth, setSwapsPerMonth] = useState(c.swapsPerMonth);
  const [paymentWindowStart, setPaymentWindowStart] = useState(c.paymentWindowStart);
  const [paymentWindowEnd, setPaymentWindowEnd] = useState(c.paymentWindowEnd);
  const [cashFee, setCashFee] = useState(c.cashFee);
  const [mpFee, setMpFee] = useState(c.mpFee);
  const [lateFeePercent, setLateFeePercent] = useState(c.lateFeePercent);
  const [announcementVisibleDays, setAnnouncementVisibleDays] = useState(c.announcementVisibleDays);
  const [defaultStudentPin, setDefaultStudentPin] = useState(c.defaultStudentPin);
  const [profeWhatsapp, setProfeWhatsapp] = useState(c.profeWhatsapp || "");
  const [mpLink, setMpLink] = useState(c.mpLink || "");
  const [savingRules, setSavingRules] = useState(false);
  const [resettingTutorial, setResettingTutorial] = useState(false);
  const [tutorialResetDone, setTutorialResetDone] = useState(false);
  const [displayName, setDisplayName] = useState(me?.displayName || "");
  const displayNameInputRef = useRef<HTMLInputElement>(null);
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [imagesBeforeDate, setImagesBeforeDate] = useState("");
  const [clearingImages, setClearingImages] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const [loadingOfficial, setLoadingOfficial] = useState(false);
  const [officialResult, setOfficialResult] = useState<string | null>(null);
  const [loadingExtraClass, setLoadingExtraClass] = useState(false);
  const [extraClassResult, setExtraClassResult] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  async function chooseFont(font: string) {
    await setFontAction(font);
    router.refresh();
  }

  async function saveDisplayName() {
    setSavingDisplayName(true);
    await setMyDisplayNameAction(displayName);
    setSavingDisplayName(false);
    router.refresh();
  }

  async function resetTutorials() {
    if (!confirm("¿Reiniciar el tutorial para todas las cuentas (estudiantes y profes)?")) return;
    setResettingTutorial(true);
    await resetAllTutorialsAction();
    setResettingTutorial(false);
    setTutorialResetDone(true);
  }

  async function clearOldImages() {
    if (!imagesBeforeDate) return;
    if (
      !confirm(
        `¿Seguro? Esto borra para siempre las fotos de los posts anteriores al ${imagesBeforeDate} (el texto, título y fecha quedan igual). Asegurate de haber descargado el .zip antes.`
      )
    )
      return;
    setClearingImages(true);
    setClearResult(null);
    const res = await clearOldImagesAction(imagesBeforeDate);
    setClearingImages(false);
    if ("error" in res) {
      setClearResult(res.error!);
      return;
    }
    setClearResult(`Listo — se borraron ${res.cleared} fotos.`);
    router.refresh();
  }

  async function loadOfficial() {
    setLoadingOfficial(true);
    setOfficialResult(null);
    const res = await loadOfficialHolidaysAction([currentYear]);
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

  async function loadExtraClass() {
    setLoadingExtraClass(true);
    setExtraClassResult(null);
    const res = await loadExtraClassCancellationsAction([currentYear]);
    setLoadingExtraClass(false);
    if ("error" in res) {
      setExtraClassResult(res.error!);
      return;
    }
    setExtraClassResult(
      res.added === 0
        ? "No había ningún mes con una 5ta clase de más para cancelar."
        : `Se cancelaron ${res.added} clases de más.`
    );
    router.refresh();
  }

  async function saveRules() {
    setSavingRules(true);
    await saveConfigAction({
      classesPerCycle,
      swapsPerMonth,
      paymentWindowStart,
      paymentWindowEnd,
      cashFee,
      mpFee,
      lateFeePercent,
      announcementVisibleDays,
      defaultStudentPin,
      profeWhatsapp,
      mpLink,
    });
    setSavingRules(false);
    router.refresh();
  }

  return (
    <>
      <Collapsible title="Tu nick">
        <p className="muted">
          Así te van a ver los estudiantes en el chat, los avisos y el CeramiBlog, en vez de tu usuario de
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

      {isMainProfe && (
        <Collapsible title="Tipografía (prueba)">
          <p className="muted">
            Se aplica a toda la app, para todo el mundo — probá cada una y quedate con la que te guste.
          </p>
          <div className="chip-row" style={{ marginTop: 10 }}>
            {FONT_OPTIONS.map((f) => (
              <div
                key={f.key}
                className={`chip ${c.font === f.key ? "selected" : ""}`}
                style={{ fontFamily: f.cssVar }}
                onClick={() => chooseFont(f.key)}
              >
                {f.label}
              </div>
            ))}
          </div>
        </Collapsible>
      )}

      <Collapsible title="Turnos">
        <p className="muted">Elegí los días en los que se dicta cada turno — no hace falta que sean los mismos todos los días.</p>
        <SlotEditor slots={c.slots} onChanged={() => router.refresh()} />
      </Collapsible>

      {isMainProfe && (
        <Collapsible title="Profe a cargo de cada turno">
          <p className="muted">
            Así los estudiantes ven quién les da clase, y cada profe ve solo sus estudiantes en la pestaña
            Estudiantes. Opcional.
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
        <label>Cuota en efectivo</label>
        <input type="number" value={cashFee} onChange={(e) => setCashFee(Number(e.target.value))} />
        <label>Cuota por Mercado Pago</label>
        <input type="number" value={mpFee} onChange={(e) => setMpFee(Number(e.target.value))} />
        <p className="hint">
          El botón de Mercado Pago siempre cobra el saldo restante: si el/la estudiante ya pagó una parte
          (por ejemplo en efectivo), solo le cobra la diferencia hasta esta cuota.
        </p>
        <label>Recargo por pago fuera de fecha (%)</label>
        <input
          type="number"
          value={lateFeePercent}
          onChange={(e) => setLateFeePercent(Number(e.target.value))}
        />
        <p className="hint">
          Pasado el día {paymentWindowEnd} sin pagar, ambas cuotas le aparecen al/a la estudiante con este
          recargo ya sumado.
        </p>
        <label>Los avisos se muestran a los estudiantes durante (días)</label>
        <input
          type="number"
          value={announcementVisibleDays}
          onChange={(e) => setAnnouncementVisibleDays(Number(e.target.value))}
        />
        <p className="hint">
          Pasados esos días, el aviso deja de aparecer en el home del/de la estudiante — pero vos seguís
          viéndolo en esta pestaña.
        </p>
        <label>PIN por defecto para estudiantes nuevos</label>
        <input value={defaultStudentPin} maxLength={4} onChange={(e) => setDefaultStudentPin(e.target.value)} />
        <label>Tu WhatsApp (para avisos rápidos, sin el +, ej: 5491122334455)</label>
        <input placeholder="5491122334455" value={profeWhatsapp} onChange={(e) => setProfeWhatsapp(e.target.value)} />
        <p className="hint">
          Si lo cargás, cuando un/a estudiante pida restablecer su PIN le va a aparecer un botón para
          avisarte directo por WhatsApp.
        </p>
        <label>Link de cobro de Mercado Pago (general)</label>
        <input placeholder="https://mpago.la/..." value={mpLink} onChange={(e) => setMpLink(e.target.value)} />
        <p className="hint">
          Se usa como respaldo si el cobro automático no está disponible, o como link general para
          estudiantes sin uno personalizado.
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
          <p className="hint">Descarga todos los pagos registrados (estudiante, mes, monto, estado, origen y fecha) en un archivo .xlsx.</p>
          <button className="ghost block" style={{ marginTop: 14 }} disabled={resettingTutorial} onClick={resetTutorials}>
            Reiniciar tutorial para todos los usuarios
          </button>
          {tutorialResetDone && (
            <p className="hint">Listo — la próxima vez que cada estudiante o profe entre, va a ver el tutorial de nuevo.</p>
          )}

          <label style={{ marginTop: 18 }}>Feriados</label>
          <p className="hint" style={{ marginTop: 0 }}>
            Trae los feriados nacionales de {currentYear} desde la fuente oficial (api.argentinadatos.com),
            más el 25 de julio, fijo del taller. No pisa los que ya tengas cargados — podés apretarlo
            todos los años sin duplicar nada.
          </p>
          <button className="ghost block" disabled={loadingOfficial} onClick={loadOfficial}>
            {loadingOfficial ? "Cargando…" : "Cargar los feriados de este año"}
          </button>
          {officialResult && <p className="hint">{officialResult}</p>}

          <label style={{ marginTop: 18 }}>Tope de 4 clases por mes</label>
          <p className="hint" style={{ marginTop: 0 }}>
            Cuando un día de la semana tiene 5 clases en un mes de {currentYear} (ej: 5 martes), cancela
            la última para que nadie dé más de 4 clases ese mes — igual que un feriado, la profe la puede
            reactivar después si hace falta. No pisa los días que ya tengas cargados.
          </p>
          <button className="ghost block" disabled={loadingExtraClass} onClick={loadExtraClass}>
            {loadingExtraClass ? "Cargando…" : "Cancelar las clases de más de este año"}
          </button>
          {extraClassResult && <p className="hint">{extraClassResult}</p>}

          <label style={{ marginTop: 18 }}>Fotos de CeramiBlog y bitácoras (antes de esta fecha)</label>
          <input type="date" value={imagesBeforeDate} onChange={(e) => setImagesBeforeDate(e.target.value)} />
          <p className="hint">
            Las fotos son lo que más pesa en la base. Dejá la fecha vacía para descargar todas, o
            elegí una para descargar y después borrar solo las más viejas — el texto, título y
            fecha de esos posts quedan igual, solo se saca la imagen.
          </p>
          <a href={`/api/export/images${imagesBeforeDate ? `?before=${imagesBeforeDate}` : ""}`}>
            <button className="ghost block" style={{ marginTop: 4 }}>
              Descargar fotos (.zip)
            </button>
          </a>
          <button
            className="danger block"
            style={{ marginTop: 8 }}
            disabled={!imagesBeforeDate || clearingImages}
            onClick={clearOldImages}
          >
            Ya las descargué — borrar esas fotos de la base
          </button>
          {clearResult && <p className="hint">{clearResult}</p>}
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
                      style={{ fontSize: "16px", padding: "6px 4px" }}
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

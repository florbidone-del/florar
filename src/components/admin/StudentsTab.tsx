"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import {
  capitalize,
  currentMonthKey,
  fmtLong,
  money,
  profeForSlot,
  studentFee,
  feeDueThisMonth,
  DIAS,
} from "@/lib/domain";
import type { AdminBundle } from "@/lib/views/admin";
import {
  markPaidManuallyAction,
  unmarkPaidAction,
  deleteStudentAction,
  resolvePinResetAction,
  resetStudentPinAction,
  setStudentThemeAction,
  dismissNotificationAction,
} from "@/lib/actions/students";
import { StudentFormModal } from "@/components/admin/StudentFormModal";
import { Modal } from "@/components/shared/Modal";
import { PostActionsMenu } from "@/components/shared/PostActionsMenu";

type Turno = { weekday: number; slotId: string; label: string; start: string; end: string };

function turnoKey(weekday: number, slotId: string) {
  return `${weekday}_${slotId}`;
}

export function StudentsTab({
  bundle,
  me,
  isMainProfe,
}: {
  bundle: AdminBundle;
  me: string;
  isMainProfe: boolean;
}) {
  const router = useRouter();
  const snap = bundle.snapshot;
  const [filter, setFilter] = useState<string>("all"); // "all" o turnoKey(weekday, slotId)
  const [formStudentId, setFormStudentId] = useState<string | null | "new">(null);
  const [payStudentId, setPayStudentId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function buildTurnos(match?: (weekday: number, slotId: string) => boolean): Turno[] {
    return snap.config.slots
      .flatMap((slot) => slot.weekdays.map((weekday) => ({ weekday, slotId: slot.id, start: slot.start, end: slot.end })))
      .filter((t) => !match || match(t.weekday, t.slotId))
      .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
      .map((t) => ({
        weekday: t.weekday,
        slotId: t.slotId,
        start: t.start,
        end: t.end,
        label: `${capitalize(DIAS[t.weekday])} ${t.start}–${t.end}`,
      }));
  }
  // La profe principal ve a todo el mundo; el resto, solo a los estudiantes de sus propios turnos.
  const myTurnos = buildTurnos((weekday, slotId) => profeForSlot(snap, weekday, slotId) === me);
  const turnoOptions = isMainProfe ? buildTurnos() : myTurnos;
  const myTurnoKeys = new Set(myTurnos.map((t) => turnoKey(t.weekday, t.slotId)));
  const mk = currentMonthKey();
  const pendingReceiptIds = new Set(bundle.receipts.filter((r) => r.status === "pending" && !r.isExtraClass).map((r) => r.studentId));

  // Turno de cada estudiante (para agrupar cuando el filtro es "Todos"), en orden cronológico.
  function turnoLabelFor(weekday: number, slotId: string) {
    const slot = snap.config.slots.find((s) => s.id === slotId);
    return `${capitalize(DIAS[weekday])}${slot ? ` ${slot.start}–${slot.end}` : ""}`;
  }
  function turnoOrder(weekday: number, slotId: string) {
    const slot = snap.config.slots.find((s) => s.id === slotId);
    return weekday * 10000 + (slot ? Number(slot.start.replace(":", "")) : 0);
  }

  const baseStudents = isMainProfe
    ? snap.students
    : snap.students.filter((s) => myTurnoKeys.has(turnoKey(s.defaultWeekday, s.defaultSlotId)));

  const filteredStudents =
    filter === "all"
      ? baseStudents
      : baseStudents.filter((s) => turnoKey(s.defaultWeekday, s.defaultSlotId) === filter);

  const visibleStudents = [...filteredStudents].sort((a, b) => {
    if (filter === "all") {
      const orderDiff =
        turnoOrder(a.defaultWeekday, a.defaultSlotId) - turnoOrder(b.defaultWeekday, b.defaultSlotId);
      if (orderDiff !== 0) return orderDiff;
    }
    return a.name.localeCompare(b.name);
  });

  async function removeUnpaid(id: string) {
    setBusy(id);
    await unmarkPaidAction(id);
    setBusy(null);
    router.refresh();
  }
  async function remove(id: string, name: string) {
    if (!confirm(`¿Eliminar a ${name}? Esto borra también su historial de cambios.`)) return;
    setBusy(id);
    await deleteStudentAction(id);
    setBusy(null);
    router.refresh();
  }
  async function dismissNotif(id: string) {
    await dismissNotificationAction(id);
    router.refresh();
  }
  async function resolveReset(id: string) {
    await resolvePinResetAction(id);
    router.refresh();
  }
  async function resetPin(id: string, name: string) {
    if (!confirm(`¿Restablecer el PIN de ${name} al default del taller (${snap.config.defaultStudentPin})?`))
      return;
    setBusy(id);
    await resetStudentPinAction(id);
    setBusy(null);
    router.refresh();
  }
  async function toggleGiftTheme(id: string, grant: boolean) {
    setBusy(id);
    await setStudentThemeAction(id, grant);
    setBusy(null);
    router.refresh();
  }

  return (
    <>
      {bundle.notifications.length > 0 && (
        <div className="card">
          <h3>Novedades de cambios</h3>
          {bundle.notifications.map((n) => (
            <div className="list-item" key={n.id}>
              <div>
                {n.message} <span className="muted">— {fmtLong(n.createdAt)}</span>
              </div>
              <button className="ghost small" onClick={() => dismissNotif(n.id)}>
                Listo
              </button>
            </div>
          ))}
        </div>
      )}
      {bundle.pinResets.length > 0 && (
        <div className="card">
          <h3>Pedidos de restablecer PIN</h3>
          {bundle.pinResets.map((r) => (
            <div className="list-item" key={r.id}>
              <div>
                {r.studentName} <span className="muted">— pedido el {fmtLong(r.requestedAt)}</span>
              </div>
              <button className="ghost small" onClick={() => resolveReset(r.id)}>
                Restablecer a {snap.config.defaultStudentPin}
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="card">
        <div className="row" style={{ alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Estudiantes ({baseStudents.length})</h3>
        </div>
        {turnoOptions.length > 0 && (
          <>
            <div className="chip-row" style={{ marginTop: 10 }}>
              <div className={`chip ${filter === "all" ? "selected" : ""}`} onClick={() => setFilter("all")}>
                Todos
              </div>
            </div>
            {Array.from(new Set(turnoOptions.map((t) => t.weekday))).map((weekday) => (
              <div key={weekday} style={{ marginTop: 10 }}>
                <div className="step-label" style={{ marginBottom: 4 }}>{capitalize(DIAS[weekday])}</div>
                <div className="chip-row">
                  {turnoOptions
                    .filter((t) => t.weekday === weekday)
                    .map((t) => (
                      <div
                        key={turnoKey(t.weekday, t.slotId)}
                        className={`chip ${filter === turnoKey(t.weekday, t.slotId) ? "selected" : ""}`}
                        onClick={() => setFilter(turnoKey(t.weekday, t.slotId))}
                      >
                        {t.start}–{t.end}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
      <div className="card">
        {visibleStudents.length === 0 ? (
          <p className="muted">No hay estudiantes para mostrar acá.</p>
        ) : (
          visibleStudents.map((s, i) => {
            const slot = snap.config.slots.find((x) => x.id === s.defaultSlotId);
            const payment = snap.payments.find(
              (p) => p.studentId === s.id && p.monthKey === mk && p.status === "approved"
            );
            const fee = feeDueThisMonth(snap, s.id);
            const paid = payment?.amount || 0;
            const isPaid = paid >= fee;
            const isPartial = paid > 0 && paid < fee;
            const profe = profeForSlot(snap, s.defaultWeekday, s.defaultSlotId);
            const prev = visibleStudents[i - 1];
            const showGroupHeader =
              filter === "all" &&
              (!prev || turnoKey(prev.defaultWeekday, prev.defaultSlotId) !== turnoKey(s.defaultWeekday, s.defaultSlotId));
            return (
              <Fragment key={s.id}>
                {showGroupHeader && (
                  <div className="roster-group-label" style={{ marginTop: i === 0 ? 0 : 14 }}>
                    {turnoLabelFor(s.defaultWeekday, s.defaultSlotId)}
                  </div>
                )}
              <div className="list-item">
                <div>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div className="muted">usuario: {s.id}</div>
                  <div className="muted">
                    {DIAS[s.defaultWeekday]} {slot ? `${slot.start}–${slot.end}` : ""}
                    {profe ? ` · profe: ${capitalize(profe)}` : ""}
                  </div>
                  {/* Todo lo de cuotas es un tema de plata entre la profe principal y el alumno —
                      el resto de las profes no lo ve acá. */}
                  {isMainProfe && (
                    <div
                      className={`tag ${isPaid ? "ok" : isPartial ? "partial" : "warn"}`}
                      style={{ marginTop: 4 }}
                    >
                      {isPaid
                        ? `pagó ${money(paid)}`
                        : isPartial
                          ? `pagó ${money(paid)} de ${money(fee)} — debe ${money(fee - paid)}`
                          : `debe ${money(fee)}`}
                    </div>
                  )}
                  {isMainProfe && !isPaid && pendingReceiptIds.has(s.id) && (
                    <div className="tag partial" style={{ marginTop: 4, marginLeft: 4 }}>
                      comprobante en revisión
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  {isMainProfe ? (
                    <PostActionsMenu
                      disabled={busy === s.id}
                      items={[
                        ...(paid === 0 ? [{ label: "Marcar pagado", onClick: () => setPayStudentId(s.id) }] : []),
                        ...(isPartial ? [{ label: "Registrar saldo", onClick: () => setPayStudentId(s.id) }] : []),
                        ...(isPaid || isPartial
                          ? [{ label: "Quitar pago", onClick: () => removeUnpaid(s.id) }]
                          : []),
                        { label: "Editar", onClick: () => setFormStudentId(s.id) },
                        {
                          label: s.theme === "azulyoro" ? "Quitar Azul y Oro" : "🎁 Regalar Azul y Oro",
                          onClick: () => toggleGiftTheme(s.id, s.theme !== "azulyoro"),
                        },
                        { label: "Restablecer PIN", onClick: () => resetPin(s.id, s.name) },
                        { label: "Eliminar", onClick: () => remove(s.id, s.name), danger: true },
                      ]}
                    />
                  ) : (
                    <button className="ghost small" disabled={busy === s.id} onClick={() => resetPin(s.id, s.name)}>
                      Restablecer PIN
                    </button>
                  )}
                </div>
              </div>
              </Fragment>
            );
          })
        )}
      </div>
      {formStudentId && (
        <StudentFormModal
          bundle={bundle}
          studentId={formStudentId === "new" ? null : formStudentId}
          onClose={() => setFormStudentId(null)}
          onSaved={() => {
            setFormStudentId(null);
            router.refresh();
          }}
        />
      )}
      {payStudentId && (() => {
        const payingFor = snap.students.find((s) => s.id === payStudentId);
        const existingPayment = snap.payments.find(
          (p) => p.studentId === payStudentId && p.monthKey === mk && p.status === "approved"
        );
        const alreadyPaid = existingPayment?.amount || 0;
        const fee = studentFee(snap);
        return (
          <MarkPaidModal
            studentName={payingFor?.name || ""}
            alreadyPaid={alreadyPaid}
            fee={fee}
            defaultAmount={Math.max(0, fee - alreadyPaid)}
            onClose={() => setPayStudentId(null)}
            onConfirm={async (amount) => {
              await markPaidManuallyAction(payStudentId, amount);
              setPayStudentId(null);
              router.refresh();
            }}
          />
        );
      })()}
      {isMainProfe && (
        <button type="button" className="fab" aria-label="Agregar estudiante" title="Agregar estudiante" onClick={() => setFormStudentId("new")}>
          +
        </button>
      )}
    </>
  );
}

function MarkPaidModal({
  studentName,
  alreadyPaid,
  fee,
  defaultAmount,
  onClose,
  onConfirm,
}: {
  studentName: string;
  alreadyPaid: number;
  fee: number;
  defaultAmount: number;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState(String(defaultAmount));
  const [pending, setPending] = useState(false);

  return (
    <Modal onClose={onClose}>
      <h3>{alreadyPaid > 0 ? "Registrar saldo" : "Marcar pagado"} — {studentName}</h3>
      {alreadyPaid > 0 && (
        <p className="hint">
          Ya registraste {money(alreadyPaid)} de {money(fee)} este mes. Lo que cargues acá se suma a
          eso, no lo reemplaza.
        </p>
      )}
      <label>Monto recibido ahora</label>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <p className="hint">
        {alreadyPaid > 0
          ? `Por defecto es el saldo que falta (${money(fee - alreadyPaid)}). Cambialo si cobraste otra cosa o solo una parte.`
          : "Por defecto es la cuota calculada del mes. Cambialo si cobraste otra cosa, o solo una parte (podés completar el resto después)."}
      </p>
      <div className="row" style={{ marginTop: 16 }}>
        <button className="ghost block" onClick={onClose}>
          Cancelar
        </button>
        <button
          className="primary block"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            await onConfirm(Number(amount));
          }}
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  capitalize,
  currentMonthKey,
  fmtLong,
  money,
  profeForSlot,
  studentFee,
  DIAS,
} from "@/lib/domain";
import type { AdminBundle } from "@/lib/views/admin";
import {
  markPaidManuallyAction,
  unmarkPaidAction,
  deleteStudentAction,
  resolvePinResetAction,
  resetStudentPinAction,
  dismissNotificationAction,
} from "@/lib/actions/students";
import { StudentFormModal } from "@/components/admin/StudentFormModal";
import { Modal } from "@/components/shared/Modal";

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
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [formStudentId, setFormStudentId] = useState<string | null | "new">(null);
  const [payStudentId, setPayStudentId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const iTeachSomething = snap.slotAssignments.some((sa) => sa.profeUsername === me);
  const mk = currentMonthKey();

  const visibleStudents = snap.students
    .filter((s) => (filter === "mine" ? profeForSlot(snap, s.defaultWeekday, s.defaultSlotId) === me : true))
    .sort((a, b) => a.name.localeCompare(b.name));

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
          <h3 style={{ margin: 0 }}>Estudiantes ({snap.students.length})</h3>
        </div>
        {iTeachSomething && (
          <div className="chip-row" style={{ marginTop: 10 }}>
            <div className={`chip ${filter === "all" ? "selected" : ""}`} onClick={() => setFilter("all")}>
              Todos
            </div>
            <div className={`chip ${filter === "mine" ? "selected" : ""}`} onClick={() => setFilter("mine")}>
              Solo los míos
            </div>
          </div>
        )}
        <button className="primary block" style={{ marginTop: 10 }} onClick={() => setFormStudentId("new")}>
          + Agregar estudiante
        </button>
      </div>
      <div className="card">
        {visibleStudents.length === 0 ? (
          <p className="muted">No hay estudiantes para mostrar acá.</p>
        ) : (
          visibleStudents.map((s) => {
            const slot = snap.config.slots.find((x) => x.id === s.defaultSlotId);
            const payment = snap.payments.find(
              (p) => p.studentId === s.id && p.monthKey === mk && p.status === "approved"
            );
            const fee = studentFee(snap);
            const paid = payment?.amount || 0;
            const isPaid = paid >= fee;
            const isPartial = paid > 0 && paid < fee;
            const profe = profeForSlot(snap, s.defaultWeekday, s.defaultSlotId);
            return (
              <div className="list-item" key={s.id}>
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
                </div>
                <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                  {isMainProfe && paid === 0 && (
                    <button className="ghost small" disabled={busy === s.id} onClick={() => setPayStudentId(s.id)}>
                      Marcar pagado
                    </button>
                  )}
                  {isMainProfe && isPartial && (
                    <button className="ghost small" disabled={busy === s.id} onClick={() => setPayStudentId(s.id)}>
                      Registrar saldo
                    </button>
                  )}
                  {isMainProfe && (isPaid || isPartial) && (
                    <button className="ghost small" disabled={busy === s.id} onClick={() => removeUnpaid(s.id)}>
                      Quitar pago
                    </button>
                  )}
                  <button className="ghost small" onClick={() => setFormStudentId(s.id)}>
                    Editar
                  </button>
                  <button className="ghost small" disabled={busy === s.id} onClick={() => resetPin(s.id, s.name)}>
                    Restablecer PIN
                  </button>
                  <button className="danger small" disabled={busy === s.id} onClick={() => remove(s.id, s.name)}>
                    Eliminar
                  </button>
                </div>
              </div>
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

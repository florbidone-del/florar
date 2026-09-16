"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { usernameCandidates } from "@/lib/domain";
import type { AdminBundle } from "@/lib/views/admin";
import { WeekdaySlotPicker } from "@/components/admin/WeekdaySlotPicker";
import { createStudentAction, updateStudentAction } from "@/lib/actions/students";

export function StudentFormModal({
  bundle,
  studentId,
  onClose,
  onSaved,
}: {
  bundle: AdminBundle;
  studentId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const snap = bundle.snapshot;
  const editing = !!studentId;
  const student = editing ? snap.students.find((s) => s.id === studentId) || null : null;

  const [name, setName] = useState(student?.name || "");
  const [selDay, setSelDay] = useState<number | null>(student?.defaultWeekday ?? null);
  const [selSlot, setSelSlot] = useState<string | null>(student?.defaultSlotId ?? null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setError("");
    if (!editing && name.trim().length < 2) return setError("Ingresá el nombre.");
    if (selDay === null || !selSlot) return setError("Elegí día y horario.");

    setPending(true);
    const res = editing
      ? await updateStudentAction(studentId!, { defaultWeekday: selDay, defaultSlotId: selSlot })
      : await createStudentAction({ name, defaultWeekday: selDay, defaultSlotId: selSlot });
    setPending(false);
    if ("error" in res) {
      setError(res.error!);
      return;
    }
    onSaved();
  }

  return (
    <Modal onClose={onClose}>
      <h3>{editing ? "Editar estudiante" : "Nuevo/a estudiante"}</h3>
      <label>Nombre y apellido</label>
      <input value={editing ? student?.name : name} disabled={editing} onChange={(e) => setName(e.target.value)} />
      {!editing && (
        <div className="hint">
          {name.trim()
            ? `Usuario para ingresar: ${usernameCandidates(name)[0]} (si ya existe, se ajusta solo)`
            : ""}
        </div>
      )}
      {editing && <div className="hint">Usuario: {student?.id}</div>}
      {!editing && (
        <p className="hint">
          Se crea con el PIN por defecto del taller ({snap.config.defaultStudentPin}) — el/la estudiante va
          a tener que cambiarlo la primera vez que entre.
        </p>
      )}
      <div style={{ marginTop: 14 }}>
        <WeekdaySlotPicker
          snap={snap}
          excludeStudentId={studentId || undefined}
          selDay={selDay}
          selSlot={selSlot}
          onChange={(d, s) => {
            setSelDay(d);
            setSelSlot(s);
          }}
        />
      </div>
      {error && <p className="err">{error}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="ghost block" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary block" disabled={pending} onClick={save}>
          Guardar
        </button>
      </div>
    </Modal>
  );
}

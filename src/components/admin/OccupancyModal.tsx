"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/shared/Modal";
import {
  fmtLong,
  parseISO,
  profeAccountsUsernames,
  profeForDateSlot,
  profeForSlot,
  slotById,
  slotOccupancy,
} from "@/lib/domain";
import type { AdminBundle } from "@/lib/views/admin";
import { setSubstitutionAction } from "@/lib/actions/schedule";

export function OccupancyModal({
  date,
  slotId,
  bundle,
  onClose,
}: {
  date: string;
  slotId: string;
  bundle: AdminBundle;
  onClose: () => void;
}) {
  const router = useRouter();
  const snap = bundle.snapshot;
  const slot = slotById(snap, date, slotId);
  const names = slotOccupancy(snap, date, slotId);
  const profes = profeAccountsUsernames(bundle.admins);
  const currentProfe = profeForDateSlot(snap, date, slotId);
  const regularProfe = profeForSlot(snap, parseISO(date).getDay(), slotId);
  const [pending, setPending] = useState(false);

  async function handleChange(value: string) {
    setPending(true);
    await setSubstitutionAction({ date, slotId, newProfe: value || null });
    setPending(false);
    onClose();
    router.refresh();
  }

  return (
    <Modal onClose={onClose}>
      <h3>{fmtLong(date)}</h3>
      <p className="muted">
        {slot ? `${slot.start}–${slot.end}` : ""} · {names.length}/{snap.config.capacity} ocupados
      </p>
      <div style={{ marginTop: 10 }}>
        {names.map((n, i) => (
          <div className="list-item" key={i}>
            {n}
          </div>
        ))}
      </div>
      {profes.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <label>
            Profe de este turno, solo para este día
            {currentProfe && currentProfe !== regularProfe ? " (suplente)" : ""}
          </label>
          <select
            defaultValue={currentProfe || ""}
            disabled={pending}
            onChange={(e) => handleChange(e.target.value)}
          >
            <option value="">
              — usar el profe habitual{regularProfe ? ` (${regularProfe})` : " (sin asignar)"} —
            </option>
            {profes.map((p) => (
              <option value={p} key={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      )}
      <button className="ghost block" style={{ marginTop: 14 }} onClick={onClose}>
        Cerrar
      </button>
    </Modal>
  );
}

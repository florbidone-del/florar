"use client";

import { useState } from "react";
import { DIAS, capitalize } from "@/lib/domain";
import { ChatPanel } from "@/components/shared/ChatPanel";
import type { AdminBundle } from "@/lib/views/admin";

type Turno = { weekday: number; slotId: string; label: string };

export function ChatTab({ bundle, myUsername, isMainProfe }: { bundle: AdminBundle; myUsername: string; isMainProfe: boolean }) {
  const snap = bundle.snapshot;

  const turnos: Turno[] = isMainProfe
    ? snap.config.slots
        .flatMap((slot) => slot.weekdays.map((weekday) => ({ weekday, slotId: slot.id, start: slot.start, end: slot.end })))
        .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
        .map((t) => ({ weekday: t.weekday, slotId: t.slotId, label: `${capitalize(DIAS[t.weekday])} ${t.start}–${t.end}` }))
    : snap.slotAssignments
        .filter((sa) => sa.profeUsername === myUsername)
        .map((sa) => {
          const slot = snap.config.slots.find((s) => s.id === sa.slotId);
          return {
            weekday: sa.weekday,
            slotId: sa.slotId,
            label: slot ? `${capitalize(DIAS[sa.weekday])} ${slot.start}–${slot.end}` : `${capitalize(DIAS[sa.weekday])}`,
          };
        })
        .sort((a, b) => a.weekday - b.weekday);

  const [selected, setSelected] = useState<Turno | null>(turnos[0] || null);

  if (turnos.length === 0) {
    return <p className="muted">Todavía no tenés ningún turno asignado.</p>;
  }

  return (
    <>
      {turnos.length > 1 && (
        <div className="tabs">
          {turnos.map((t) => (
            <button
              type="button"
              key={`${t.weekday}_${t.slotId}`}
              className={`tab ${selected?.weekday === t.weekday && selected?.slotId === t.slotId ? "active" : ""}`}
              onClick={() => setSelected(t)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {selected && (
        <>
          <p className="muted" style={{ marginBottom: 10 }}>
            Chat con los alumnos de {selected.label.toLowerCase()}
            {isMainProfe ? " (sos la profe principal, podés ver y participar en todos los turnos)." : "."}
          </p>
          <ChatPanel key={`${selected.weekday}_${selected.slotId}`} weekday={selected.weekday} slotId={selected.slotId} />
        </>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { DIAS, capitalize } from "@/lib/domain";
import { ChatPanel } from "@/components/shared/ChatPanel";
import type { AdminBundle } from "@/lib/views/admin";

type Turno = { weekday: number; slotId: string; label: string };

function turnoKey(t: Pick<Turno, "weekday" | "slotId">) {
  return `${t.weekday}_${t.slotId}`;
}

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

  const [selectedKey, setSelectedKey] = useState(turnos[0] ? turnoKey(turnos[0]) : null);
  const selected = turnos.find((t) => turnoKey(t) === selectedKey) || null;

  if (turnos.length === 0) {
    return <p className="muted">Todavía no tenés ningún turno asignado.</p>;
  }

  return (
    <div className="chat-layout">
      {turnos.length > 1 && (
        <div className="chat-turno-list">
          {turnos.map((t) => (
            <button
              type="button"
              key={turnoKey(t)}
              className={`chat-turno-item ${turnoKey(t) === selectedKey ? "active" : ""}`}
              onClick={() => setSelectedKey(turnoKey(t))}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="chat-turno-panel">
        {selected && (
          <>
            {isMainProfe && (
              <p className="muted" style={{ marginBottom: 10 }}>
                Sos la profe principal: podés ver y participar en el chat de cualquier turno.
              </p>
            )}
            <ChatPanel key={turnoKey(selected)} weekday={selected.weekday} slotId={selected.slotId} />
          </>
        )}
      </div>
    </div>
  );
}

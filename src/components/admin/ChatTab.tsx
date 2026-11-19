"use client";

import { useEffect, useState } from "react";
import { DIAS, capitalize } from "@/lib/domain";
import { ChatPanel } from "@/components/shared/ChatPanel";
import { markChatSeenAction } from "@/lib/actions/notifications";
import type { AdminBundle } from "@/lib/views/admin";

type Turno = { weekday: number; slotId: string; start: string; end: string; label: string };

function turnoKey(t: Pick<Turno, "weekday" | "slotId">) {
  return `${t.weekday}_${t.slotId}`;
}

const WEEK_MINUTES = 7 * 24 * 60;

function minuteOfWeek(weekday: number, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return weekday * 24 * 60 + h * 60 + (m || 0);
}

/** El turno más cercano a este momento: el que está en curso, o si no el que tenga el inicio o el
 *  final más cerca (hacia adelante o hacia atrás, dando la vuelta a la semana). Así, al abrir el
 *  chat un rato después de una clase aparece esa, y antes de una clase aparece la que viene. */
function closestTurno(turnos: Turno[], now: Date): Turno | undefined {
  const nowMin = now.getDay() * 24 * 60 + now.getHours() * 60 + now.getMinutes();
  const cyclic = (a: number, b: number) => {
    const d = Math.abs(a - b) % WEEK_MINUTES;
    return Math.min(d, WEEK_MINUTES - d);
  };
  let best: Turno | undefined;
  let bestDist = Infinity;
  for (const t of turnos) {
    const start = minuteOfWeek(t.weekday, t.start);
    const end = minuteOfWeek(t.weekday, t.end);
    const dist = nowMin >= start && nowMin <= end ? 0 : Math.min(cyclic(nowMin, start), cyclic(nowMin, end));
    if (dist < bestDist) {
      best = t;
      bestDist = dist;
    }
  }
  return best;
}

export function ChatTab({
  bundle,
  myUsername,
  isMainProfe,
  chatUnreadByTurno,
  onMarkTurnoSeen,
}: {
  bundle: AdminBundle;
  myUsername: string;
  isMainProfe: boolean;
  chatUnreadByTurno: Record<string, boolean>;
  onMarkTurnoSeen: (key: string) => void;
}) {
  const snap = bundle.snapshot;

  const turnos: Turno[] = isMainProfe
    ? snap.config.slots
        .flatMap((slot) => slot.weekdays.map((weekday) => ({ weekday, slotId: slot.id, start: slot.start, end: slot.end })))
        .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start))
        .map((t) => ({ ...t, label: `${capitalize(DIAS[t.weekday])} ${t.start}–${t.end}` }))
    : snap.slotAssignments
        .filter((sa) => sa.profeUsername === myUsername)
        .map((sa) => {
          const slot = snap.config.slots.find((s) => s.id === sa.slotId);
          return {
            weekday: sa.weekday,
            slotId: sa.slotId,
            start: slot?.start ?? "00:00",
            end: slot?.end ?? "00:00",
            label: slot ? `${capitalize(DIAS[sa.weekday])} ${slot.start}–${slot.end}` : `${capitalize(DIAS[sa.weekday])}`,
          };
        })
        .sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));

  // Arranca en el turno más cercano a ahora (no en el primero de la lista).
  const [selectedKey, setSelectedKey] = useState(() => {
    const t = closestTurno(turnos, new Date());
    return t ? turnoKey(t) : null;
  });
  const selected = turnos.find((t) => turnoKey(t) === selectedKey) || null;

  // Al entrar (o cambiar de turno) se marca ese turno como visto — cubre tanto el click en un
  // turno de la lista como el turno inicial que ya queda seleccionado al abrir la pestaña.
  useEffect(() => {
    if (!selectedKey) return;
    onMarkTurnoSeen(selectedKey);
    const [wd, slotId] = selectedKey.split("_");
    markChatSeenAction(Number(wd), slotId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  if (turnos.length === 0) {
    return <p className="muted">Todavía no tenés ningún turno asignado.</p>;
  }

  return (
    <div className="chat-layout">
      {turnos.length > 1 && (
        <div className="chat-turno-list">
          {turnos.map((t) => {
            const key = turnoKey(t);
            const isUnread = key !== selectedKey && chatUnreadByTurno[key];
            return (
              <button
                type="button"
                key={key}
                className={`chat-turno-item ${key === selectedKey ? "active" : ""} ${isUnread ? "has-unread" : ""}`}
                onClick={() => setSelectedKey(key)}
              >
                {t.label}
                {isUnread && <span className="unread-dot" />}
              </button>
            );
          })}
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

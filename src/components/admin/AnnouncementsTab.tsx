"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtLong, DIAS, capitalize } from "@/lib/domain";
import { AutoTextarea } from "@/components/shared/AutoTextarea";
import { ShowMoreList } from "@/components/shared/ShowMoreList";
import { CollapsibleText } from "@/components/shared/CollapsibleText";
import { EmojiPicker } from "@/components/shared/EmojiPicker";
import type { AnnouncementFullDTO } from "@/lib/views/admin";
import type { AdminBundle } from "@/lib/views/admin";
import { addAnnouncementAction, removeAnnouncementAction } from "@/lib/actions/content";

type Turno = { weekday: number; slotId: string; label: string };

function turnoKey(t: { weekday: number; slotId: string }) {
  return `${t.weekday}_${t.slotId}`;
}

export function AnnouncementsTab({
  announcements,
  bundle,
  myUsername,
  isMainProfe,
}: {
  announcements: AnnouncementFullDTO[];
  bundle: AdminBundle;
  myUsername: string;
  isMainProfe: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [turnoKeySel, setTurnoKeySel] = useState(""); // "" = todos
  const messageRef = useRef<HTMLTextAreaElement>(null);
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
            label: slot ? `${capitalize(DIAS[sa.weekday])} ${slot.start}–${slot.end}` : capitalize(DIAS[sa.weekday]),
          };
        })
        .sort((a, b) => a.weekday - b.weekday);

  const sorted = [...announcements].reverse();

  async function publish() {
    if (!message.trim()) return;
    setPending(true);
    const turno = turnos.find((t) => turnoKey(t) === turnoKeySel) || null;
    await addAnnouncementAction(message, turno ? { weekday: turno.weekday, slotId: turno.slotId } : null);
    setPending(false);
    setMessage("");
    router.refresh();
  }
  async function remove(id: string) {
    await removeAnnouncementAction(id);
    router.refresh();
  }

  return (
    <>
      <div className="card">
        <h3>Nuevo aviso</h3>
        <AutoTextarea
          ref={messageRef}
          rows={3}
          placeholder="Escribí el comunicado para los alumnos…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {turnos.length > 0 && (
          <>
            <label>Para</label>
            <select value={turnoKeySel} onChange={(e) => setTurnoKeySel(e.target.value)}>
              <option value="">Todos los alumnos</option>
              {turnos.map((t) => (
                <option key={turnoKey(t)} value={turnoKey(t)}>
                  Solo {t.label}
                </option>
              ))}
            </select>
          </>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <EmojiPicker onPick={(e) => setMessage((m) => m + e)} targetRef={messageRef} />
          <button className="primary block" style={{ flex: 1 }} disabled={pending} onClick={publish}>
            Publicar
          </button>
        </div>
      </div>
      <div className="card">
        <h3>Avisos publicados</h3>
        <ShowMoreList
          items={sorted}
          initialCount={3}
          itemLabelPlural="avisos"
          emptyMessage="No hay avisos."
          renderItem={(a) => (
            <div className="list-item" key={a.id}>
              <div>
                <div className="muted">
                  {fmtLong(a.createdAt)}
                  {a.authorName ? ` — ${a.authorName}` : ""}
                  {a.turnoLabel ? ` — solo ${a.turnoLabel}` : ""}
                </div>
                <CollapsibleText text={a.message} />
              </div>
              <button className="ghost" onClick={() => remove(a.id)}>
                quitar
              </button>
            </div>
          )}
        />
      </div>
    </>
  );
}

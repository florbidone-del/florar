"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtLong } from "@/lib/domain";
import { AutoTextarea } from "@/components/shared/AutoTextarea";
import type { AnnouncementFullDTO } from "@/lib/views/admin";
import { addAnnouncementAction, removeAnnouncementAction } from "@/lib/actions/content";

export function AnnouncementsTab({ announcements }: { announcements: AnnouncementFullDTO[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const sorted = [...announcements].reverse();

  async function publish() {
    if (!message.trim()) return;
    setPending(true);
    await addAnnouncementAction(message);
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
          rows={3}
          placeholder="Escribí el comunicado para los alumnos…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className="primary block" style={{ marginTop: 12 }} disabled={pending} onClick={publish}>
          Publicar
        </button>
      </div>
      <div className="card">
        <h3>Avisos publicados</h3>
        {sorted.length === 0 ? (
          <p className="muted">No hay avisos.</p>
        ) : (
          sorted.map((a) => (
            <div className="list-item" key={a.id}>
              <div>
                <div className="muted">{fmtLong(a.createdAt)}</div>
                {a.message}
              </div>
              <button className="ghost" onClick={() => remove(a.id)}>
                quitar
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

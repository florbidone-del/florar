"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtLong } from "@/lib/domain";
import type { AnnouncementFullDTO } from "@/lib/views/admin";
import {
  saveStudentInfoAction,
  addAnnouncementAction,
  removeAnnouncementAction,
} from "@/lib/actions/content";

export function AnnouncementsTab({
  studentInfo,
  announcements,
}: {
  studentInfo: string;
  announcements: AnnouncementFullDTO[];
}) {
  const router = useRouter();
  const [info, setInfo] = useState(studentInfo);
  const [savingInfo, setSavingInfo] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const sorted = [...announcements].reverse();

  async function saveInfo() {
    setSavingInfo(true);
    await saveStudentInfoAction(info);
    setSavingInfo(false);
    router.refresh();
  }
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
        <h3>Información fija</h3>
        <p className="muted">
          Esto queda siempre visible arriba de todo en el celular del alumno — a diferencia de los
          avisos, no se acumula ni desaparece. Sirve para un link a un PDF, el material del mes, o algo
          que quieras que estén viendo siempre.
        </p>
        <textarea
          rows={4}
          placeholder="Ej: Material de este mes: [link]. Este viernes hay jornada especial de esmaltado."
          value={info}
          onChange={(e) => setInfo(e.target.value)}
        />
        <button className="primary block" style={{ marginTop: 12 }} disabled={savingInfo} onClick={saveInfo}>
          Guardar
        </button>
      </div>
      <div className="card">
        <h3>Nuevo aviso</h3>
        <textarea
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtLong } from "@/lib/domain";
import type { ActivityDTO } from "@/lib/domain";
import { addActivityAction, removeActivityAction } from "@/lib/actions/content";

export function ActivitiesTab({ activities }: { activities: ActivityDTO[] }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [end, setEnd] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);

  const sorted = [...activities].sort((a, b) => a.startDate.localeCompare(b.startDate));

  async function add() {
    if (!date || !title.trim()) return;
    setPending(true);
    await addActivityAction({ date, endDate: end, title, description });
    setPending(false);
    setDate("");
    setEnd("");
    setTitle("");
    setDescription("");
    router.refresh();
  }
  async function remove(id: string) {
    await removeActivityAction(id);
    router.refresh();
  }

  return (
    <>
      <div className="card">
        <h3>Marcar una actividad especial</h3>
        <p className="muted">
          Puede durar un solo día, una semana o lo que necesites — aparece marcada en el calendario de
          todos los alumnos durante todo ese rango, sin afectar cupos ni clases normales.
        </p>
        <label>Título / temática</label>
        <input
          placeholder="Ej: Semana de esmaltado a mano"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="row">
          <div>
            <label>Desde</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label>Hasta (opcional)</label>
            <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <p className="hint">Si dejás &quot;Hasta&quot; vacío, la actividad dura solo ese día.</p>
        <label>Descripción / link (opcional)</label>
        <textarea
          rows={2}
          placeholder="Detalles, o pegá un link a un PDF, fotos, etc."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button className="primary block" style={{ marginTop: 12 }} disabled={pending} onClick={add}>
          Agregar
        </button>
      </div>
      <div className="card">
        <h3>Actividades cargadas</h3>
        {sorted.length === 0 ? (
          <p className="muted">No hay actividades cargadas.</p>
        ) : (
          sorted.map((a) => (
            <div className="list-item" key={a.id}>
              <div>
                <div style={{ fontWeight: 600 }}>{a.title}</div>
                <div className="muted">
                  {fmtLong(a.startDate)}
                  {a.endDate !== a.startDate ? ` — ${fmtLong(a.endDate)}` : ""}
                </div>
                {a.description && <div className="muted">{a.description}</div>}
              </div>
              <button className="ghost small" onClick={() => remove(a.id)}>
                quitar
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

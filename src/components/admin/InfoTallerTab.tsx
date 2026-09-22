"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Linkify } from "@/components/shared/Linkify";
import { AutoTextarea } from "@/components/shared/AutoTextarea";
import { EditIcon } from "@/components/shared/Icons";
import { saveStudentInfoAction } from "@/lib/actions/content";

/** Lo mismo que ve el/la estudiante en su pestaña "Info del Taller". Solo la profe principal
 *  tiene el lápiz para editarlo ahí mismo en vez de tener que ir a Configuración. */
export function InfoTallerTab({
  studentInfo,
  isMainProfe,
}: {
  studentInfo: string;
  isMainProfe: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(studentInfo);
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    await saveStudentInfoAction(text);
    setPending(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ background: "var(--ok-bg)", borderColor: "var(--glaze)", position: "relative" }}>
      {!editing && isMainProfe && (
        <button
          type="button"
          className="icon-button"
          style={{ position: "absolute", top: 10, right: 10 }}
          aria-label="Editar información"
          title="Editar"
          onClick={() => {
            setText(studentInfo);
            setEditing(true);
          }}
        >
          <EditIcon size={16} />
        </button>
      )}
      {editing ? (
        <>
          <p className="muted" style={{ marginTop: 0, marginRight: 40 }}>
            Queda siempre visible arriba de todo en el celular del estudiante — a diferencia de los
            avisos, no se acumula ni desaparece. Sirve para un link a un PDF, el material del mes, o algo
            que quieras que estén viendo siempre.
          </p>
          <AutoTextarea
            rows={4}
            placeholder="Ej: Material de este mes: [link]. Este viernes hay jornada especial de esmaltado."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="row" style={{ marginTop: 12 }}>
            <button className="ghost block" onClick={() => setEditing(false)}>
              Cancelar
            </button>
            <button className="primary block" disabled={pending} onClick={save}>
              Guardar
            </button>
          </div>
        </>
      ) : studentInfo ? (
        <div style={{ marginRight: 40 }}>
          <Linkify text={studentInfo} />
        </div>
      ) : (
        <p className="muted" style={{ marginRight: 40 }}>
          {isMainProfe ? "Todavía no hay información cargada. Tocá el lápiz para cargarla." : "Todavía no hay información cargada."}
        </p>
      )}
    </div>
  );
}

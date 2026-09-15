"use client";

import { useState } from "react";
import { studentChangePinAction } from "@/lib/actions/auth";

/** Pantalla obligatoria (sin forma de saltearla) para el primer ingreso, o después de que la
 *  profe reestablezca el PIN al default del taller — no se puede usar el resto de la app hasta
 *  elegir un PIN propio. */
export function ForcePinChangeScreen({
  studentName,
  onDone,
}: {
  studentName: string;
  onDone: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setError("");
    setPending(true);
    const res = await studentChangePinAction({ current, next, next2 });
    setPending(false);
    if ("error" in res) {
      setError(res.error!);
      return;
    }
    onDone();
  }

  return (
    <div className="center-stage">
      <h1>¡Hola, {studentName}!</h1>
      <p className="muted" style={{ maxWidth: "34ch" }}>
        Por tu seguridad, antes de entrar tenés que cambiar el PIN que te dio la profe por uno que
        solo sepas vos.
      </p>
      <div className="card" style={{ width: "100%", maxWidth: 320, textAlign: "left" }}>
        <label>PIN actual (el que te dieron)</label>
        <input
          inputMode="numeric"
          maxLength={4}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
        <label style={{ marginTop: 10 }}>PIN nuevo</label>
        <input inputMode="numeric" maxLength={4} value={next} onChange={(e) => setNext(e.target.value)} />
        <label style={{ marginTop: 10 }}>Repetir PIN nuevo</label>
        <input
          inputMode="numeric"
          maxLength={4}
          value={next2}
          onChange={(e) => setNext2(e.target.value)}
        />
        {error && <p className="err">{error}</p>}
        <button className="primary block" style={{ marginTop: 14 }} disabled={pending} onClick={save}>
          Guardar y entrar
        </button>
      </div>
    </div>
  );
}

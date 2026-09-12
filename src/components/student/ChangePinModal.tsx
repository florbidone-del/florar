"use client";

import { useState } from "react";
import { Modal } from "@/components/shared/Modal";
import { studentChangePinAction } from "@/lib/actions/auth";

export function ChangePinModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [next2, setNext2] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
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
    setSaved(true);
  }

  return (
    <Modal onClose={onClose}>
      <h3>Cambiar mi PIN</h3>
      {saved ? (
        <>
          <p style={{ color: "var(--glaze-dark)" }}>PIN actualizado.</p>
          <button className="ghost block" style={{ marginTop: 16 }} onClick={onClose}>
            Cerrar
          </button>
        </>
      ) : (
        <>
          <label>PIN actual</label>
          <input
            inputMode="numeric"
            maxLength={4}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <label>PIN nuevo</label>
          <input
            inputMode="numeric"
            maxLength={4}
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
          <label>Repetir PIN nuevo</label>
          <input
            inputMode="numeric"
            maxLength={4}
            value={next2}
            onChange={(e) => setNext2(e.target.value)}
          />
          {error && <p className="err">{error}</p>}
          <div className="row" style={{ marginTop: 16 }}>
            <button className="ghost block" onClick={onClose}>
              Cancelar
            </button>
            <button className="primary block" disabled={pending} onClick={save}>
              Guardar
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ownerSetupAction } from "@/lib/actions/auth";

export function OwnerSetupForm({ studioName }: { studioName: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setError("");
    setPending(true);
    const res = await ownerSetupAction({ username, password, password2 });
    setPending(false);
    if ("error" in res) {
      setError(res.error!);
      return;
    }
    router.push("/profe/panel");
    router.refresh();
  }

  return (
    <>
      <div className="topbar">
        <h1>{studioName}</h1>
        <button className="ghost" onClick={() => router.push("/")}>
          volver
        </button>
      </div>
      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <h3>Primera vez: creá tu cuenta de dueño/a</h3>
        <p className="muted">Esta cuenta va a poder crear el resto de las cuentas de profes.</p>
        <label>Usuario</label>
        <input
          autoCapitalize="none"
          placeholder="Ej: valentina"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <label>Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="hint">Mínimo 6 caracteres, combinando letras y números.</p>
        <label>Repetir contraseña</label>
        <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
        {error && <p className="err">{error}</p>}
        <button type="submit" className="primary block" style={{ marginTop: 14 }} disabled={pending}>
          Crear cuenta
        </button>
      </form>
    </>
  );
}

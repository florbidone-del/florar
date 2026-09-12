"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLoginAction } from "@/lib/actions/auth";

export function AdminLoginForm({ studioName }: { studioName: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setError("");
    setPending(true);
    const res = await adminLoginAction({ username, password });
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
      <div className="card">
        <h3>Acceso del equipo docente</h3>
        <label>Usuario</label>
        <input autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label>Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="err">{error}</p>}
        <button className="primary block" style={{ marginTop: 14 }} disabled={pending} onClick={handleSubmit}>
          Entrar
        </button>
      </div>
    </>
  );
}

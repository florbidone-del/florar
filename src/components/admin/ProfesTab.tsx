"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminDTO } from "@/lib/views/admin";
import { capitalize } from "@/lib/domain";
import {
  createProfeAction,
  deleteProfeAction,
  resetProfePasswordAction,
  setMainProfeAction,
} from "@/lib/actions/admins";
import { Modal } from "@/components/shared/Modal";

export function ProfesTab({ admins, me }: { admins: AdminDTO[]; me: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isMainProfe, setIsMainProfe] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  const sorted = [...admins].sort((a, b) => a.username.localeCompare(b.username));
  const hasMainProfe = admins.some((a) => a.role === "profe" && a.isMainProfe);

  async function create() {
    setError("");
    setPending(true);
    const res = await createProfeAction({ username, password, isMainProfe });
    setPending(false);
    if ("error" in res) {
      setError(res.error!);
      return;
    }
    setUsername("");
    setPassword("");
    setIsMainProfe(false);
    router.refresh();
  }
  async function remove(u: string) {
    if (!confirm(`¿Eliminar la cuenta de ${u}?`)) return;
    await deleteProfeAction(u);
    router.refresh();
  }
  async function toggleMain(u: string, value: boolean) {
    await setMainProfeAction({ username: u, isMainProfe: value });
    router.refresh();
  }

  return (
    <>
      <div className="card">
        <h3>Agregar profe</h3>
        <label>Usuario</label>
        <input autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} />
        <label>Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <p className="hint">Mínimo 6 caracteres, combinando letras y números.</p>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={isMainProfe}
            onChange={(e) => setIsMainProfe(e.target.checked)}
          />
          <span style={{ marginTop: 0 }}>Profe principal (puede editar turnos por profe y reglas/cuota)</span>
        </label>
        {!hasMainProfe && (
          <p className="hint">Todavía no hay ninguna profe principal — esta cuenta va a quedar como tal.</p>
        )}
        {error && <p className="err">{error}</p>}
        <button className="primary block" style={{ marginTop: 12 }} disabled={pending} onClick={create}>
          Crear cuenta de profe
        </button>
      </div>
      <div className="card">
        <h3>Cuentas del equipo</h3>
        {sorted.map((a) => (
          <div className="list-item" key={a.username}>
            <div>
              <div style={{ fontWeight: 600 }}>
                {capitalize(a.username)}{" "}
                <span className="badge-role">{a.role === "owner" ? "dueño/a" : "profe"}</span>
                {a.role === "profe" && a.isMainProfe && <span className="badge-role">principal</span>}
              </div>
              <div className="muted">creado {a.createdAt}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
              {a.role === "profe" && (
                <button className="ghost small" onClick={() => toggleMain(a.username, !a.isMainProfe)}>
                  {a.isMainProfe ? "Quitar principal" : "Marcar principal"}
                </button>
              )}
              {a.role !== "owner" && (
                <button className="ghost small" onClick={() => setResetTarget(a.username)}>
                  Resetear contraseña
                </button>
              )}
              {a.username !== me ? (
                <button className="danger small" onClick={() => remove(a.username)}>
                  Eliminar
                </button>
              ) : (
                <span className="muted">vos</span>
              )}
            </div>
          </div>
        ))}
      </div>
      {resetTarget && (
        <ResetPasswordModal username={resetTarget} onClose={() => setResetTarget(null)} />
      )}
    </>
  );
}

function ResetPasswordModal({ username, onClose }: { username: string; onClose: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setError("");
    setPending(true);
    const res = await resetProfePasswordAction({ username, password });
    setPending(false);
    if ("error" in res) {
      setError(res.error!);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <Modal onClose={onClose}>
      <h3>Resetear contraseña de {capitalize(username)}</h3>
      <label>Contraseña nueva</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <p className="hint">Mínimo 6 caracteres, combinando letras y números.</p>
      {error && <p className="err">{error}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="ghost block" onClick={onClose}>
          Cancelar
        </button>
        <button className="primary block" disabled={pending} onClick={save}>
          Guardar
        </button>
      </div>
    </Modal>
  );
}

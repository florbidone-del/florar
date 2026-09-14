"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { studentLoginAction, studentForgotPinAction } from "@/lib/actions/auth";

export function StudentAuthForm({ studioName }: { studioName: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const [fpName, setFpName] = useState("");
  const [fpResult, setFpResult] = useState<
    | { kind: "error"; message: string }
    | { kind: "pending" }
    | { kind: "sent"; name: string; defaultPin: string; whatsapp: string | null }
    | null
  >(null);

  async function handleLogin() {
    setError("");
    setPending(true);
    const res = await studentLoginAction({ name, pin });
    setPending(false);
    if ("error" in res) {
      setError(res.error!);
      return;
    }
    router.push("/alumno/panel");
    router.refresh();
  }

  async function handleForgot() {
    setFpResult(null);
    setPending(true);
    const res = await studentForgotPinAction({ name: fpName });
    setPending(false);
    if (res.status === "not-found") {
      setFpResult({
        kind: "error",
        message: "No encontramos esa cuenta. Revisá cómo escribiste tu nombre.",
      });
    } else if (res.status === "already-pending") {
      setFpResult({ kind: "pending" });
    } else {
      setFpResult({
        kind: "sent",
        name: res.name,
        defaultPin: res.defaultPin,
        whatsapp: res.whatsapp,
      });
    }
  }

  if (mode === "forgot") {
    return (
      <>
        <div className="topbar">
          <h1>{studioName}</h1>
          <button className="ghost" onClick={() => { setMode("login"); setFpResult(null); }}>
            volver
          </button>
        </div>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (!fpResult || fpResult.kind !== "sent") handleForgot();
          }}
        >
          <h3>Pedir restablecer PIN</h3>
          <p className="muted">
            Escribí tu usuario, el mismo con el que entrás siempre. Le va a quedar la
            solicitud a la profesora para que te restablezca el PIN.
          </p>
          <label>Usuario</label>
          <input
            placeholder="Tu usuario"
            value={fpName}
            onChange={(e) => setFpName(e.target.value)}
          />
          {fpResult?.kind === "error" && <p className="err">{fpResult.message}</p>}
          {fpResult?.kind === "pending" && (
            <p style={{ color: "var(--glaze-dark)" }}>
              Ya hay una solicitud pendiente. Esperá a que la profesora te
              restablezca el PIN.
            </p>
          )}
          {fpResult?.kind === "sent" && (
            <>
              <p style={{ color: "var(--glaze-dark)" }}>
                Listo. Cuando la profesora vea tu pedido te va a restablecer el PIN a{" "}
                {fpResult.defaultPin}.
              </p>
              {fpResult.whatsapp ? (
                <a
                  href={`https://wa.me/${fpResult.whatsapp}?text=${encodeURIComponent(
                    `Hola! Pedí restablecer mi PIN en la app del taller. Soy ${fpResult.name}.`
                  )}`}
                  target="_blank"
                  rel="noopener"
                >
                  <button className="primary block" style={{ marginTop: 8 }}>
                    Avisarle también por WhatsApp
                  </button>
                </a>
              ) : (
                <p className="muted">
                  Tip para la profe: cargá un WhatsApp en Configuración y este botón
                  te va a avisar al toque la próxima vez.
                </p>
              )}
            </>
          )}
          {!fpResult || fpResult.kind !== "sent" ? (
            <button type="submit" className="primary block" style={{ marginTop: 14 }} disabled={pending}>
              Enviar solicitud
            </button>
          ) : null}
        </form>
      </>
    );
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
          handleLogin();
        }}
      >
        <h3>Entrar</h3>
        <div className="field">
          <label>Usuario</label>
          <input
            placeholder="Tu usuario"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>PIN</label>
          <input
            inputMode="numeric"
            maxLength={4}
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Tu usuario y PIN te los da la profesora al crear tu cuenta.
        </p>
        {error && <p className="err">{error}</p>}
        <button type="submit" className="primary block" style={{ marginTop: 14 }} disabled={pending}>
          Entrar
        </button>
        <button
          type="button"
          className="ghost block"
          style={{ marginTop: 8 }}
          onClick={() => setMode("forgot")}
        >
          ¿Olvidaste tu PIN?
        </button>
      </form>
    </>
  );
}

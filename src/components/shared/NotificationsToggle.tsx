"use client";

import { useEffect, useState } from "react";
import { subscribeToPushAction, unsubscribeFromPushAction } from "@/lib/actions/push";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari en iOS todavía no soporta display-mode: standalone en el matchMedia, así que hay
    // que mirar esta propiedad no estándar aparte.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

type Status = "checking" | "unsupported" | "ios-needs-install" | "off" | "on" | "denied";

/** Botón para activar/desactivar las notificaciones push (nuevo mensaje de chat, nueva
 *  publicación de CeramiBlog) en este dispositivo. En iPhone, Safari solo entrega estas
 *  notificaciones si la app está instalada en la pantalla de inicio — si no, se lo avisa en vez
 *  de mostrar el botón. */
export function NotificationsToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
        setStatus("unsupported");
        return;
      }
      if (isIos() && !isStandalone()) {
        setStatus("ios-needs-install");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const sub = await reg.pushManager.getSubscription();
        setStatus(sub ? "on" : "off");
      } catch {
        setStatus("unsupported");
      }
    })();
  }, []);

  async function activate() {
    setError("");
    setPending(true);
    try {
      await navigator.serviceWorker.register("/sw.js");
      // Espera a que el service worker recién registrado quede activo — pushManager.subscribe()
      // en un registro todavía "installing" puede quedarse esperando sin resolver nunca.
      const reg = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const json = sub.toJSON();
      const res = await subscribeToPushAction({
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys!.p256dh!, auth: json.keys!.auth! },
      });
      if ("error" in res) {
        setError(res.error!);
        return;
      }
      setStatus("on");
    } catch {
      setError("No se pudo activar. Probá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  async function deactivate() {
    setError("");
    setPending(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeFromPushAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    } catch {
      setError("No se pudo desactivar. Probá de nuevo.");
    } finally {
      setPending(false);
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return <p className="muted">Tu navegador no soporta notificaciones push.</p>;
  }

  if (status === "ios-needs-install") {
    return (
      <p className="muted">
        Para recibir notificaciones en iPhone, primero agregá la app a tu pantalla de inicio:
        tocá el botón de compartir de Safari y elegí &quot;Agregar a inicio&quot;. Después volvé a
        entrar desde ese ícono y vas a poder activarlas acá.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="muted">
        Bloqueaste las notificaciones para esta app en el navegador. Para activarlas, habilitalas
        de nuevo desde la configuración del navegador/celular.
      </p>
    );
  }

  return (
    <>
      <p className="muted">
        {status === "on"
          ? "Vas a recibir avisos en este dispositivo cuando haya un mensaje nuevo en tu chat o una publicación nueva en CeramiBlog."
          : "Activá los avisos para enterarte al toque de un mensaje nuevo en tu chat o una publicación nueva en CeramiBlog."}
      </p>
      {error && <p className="err">{error}</p>}
      <button
        type="button"
        className={status === "on" ? "ghost block" : "primary block"}
        disabled={pending}
        onClick={status === "on" ? deactivate : activate}
        style={{ marginTop: 8 }}
      >
        {status === "on" ? "Desactivar notificaciones" : "Activar notificaciones"}
      </button>
    </>
  );
}

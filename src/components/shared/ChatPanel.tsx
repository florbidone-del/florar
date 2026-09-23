"use client";

import { useEffect, useRef, useState } from "react";
import { sendChatMessageAction } from "@/lib/actions/chat";
import { ChatAttachMenu } from "@/components/shared/ChatAttachMenu";
import { AutoTextarea } from "@/components/shared/AutoTextarea";
import { resizeToDataUrl } from "@/lib/resizeImage";

type ChatMsg = {
  id: string;
  authorKind: "student" | "admin";
  authorName: string;
  authorStudentId: string | null;
  authorAdminUsername: string | null;
  body: string;
  attachmentUrl: string | null;
  attachmentType: string | null;
  createdAt: string;
};

const POLL_MS = 6000;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Etiqueta del divisor de fecha, estilo WhatsApp: "Hoy" / "Ayer" / "dd/mm/aaaa". */
function fmtDayDivider(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(d) === dayKey(today)) return "Hoy";
  if (dayKey(d) === dayKey(yesterday)) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Chat de un turno (día+horario fijo). Se actualiza solo por polling cada POLL_MS, sin
 *  websockets — consistente con que el resto de la app se actualiza con router.refresh(). */
export function ChatPanel({ weekday, slotId }: { weekday: number; slotId: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [me, setMe] = useState<{ kind: string; id: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingGif, setPendingGif] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const res = await fetch(`/api/chat/${weekday}/${slotId}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
      setMe(data.me);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekday, slotId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send() {
    const body = text.trim();
    if ((!body && !pendingImage && !pendingGif) || pending) return;
    setPending(true);
    setError("");
    const res = await sendChatMessageAction({
      weekday,
      slotId,
      body,
      imageData: pendingImage,
      gifUrl: pendingGif,
    });
    setPending(false);
    if ("error" in res) {
      setError(res.error!);
      return;
    }
    setText("");
    setPendingImage(null);
    setPendingGif(null);
    load();
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      setPendingImage(await resizeToDataUrl(file));
      setPendingGif(null);
    } catch {
      setError("No se pudo leer esa imagen.");
    }
  }

  function isMine(m: ChatMsg) {
    if (!me) return false;
    if (m.authorKind === "student") return me.kind === "student" && m.authorStudentId === me.id;
    return me.kind === "admin" && m.authorAdminUsername === me.id;
  }

  return (
    <div className="card chat-card">
      <div className="chat-messages">
        {!loaded ? (
          <p className="muted">Cargando…</p>
        ) : messages.length === 0 ? (
          <p className="muted">Todavía no hay mensajes. ¡Arrancá la charla!</p>
        ) : (
          messages.map((m, i) => {
            const showDivider = i === 0 || dayKey(new Date(m.createdAt)) !== dayKey(new Date(messages[i - 1].createdAt));
            return (
              <div key={m.id} style={{ display: "contents" }}>
                {showDivider && <div className="chat-day-divider">{fmtDayDivider(m.createdAt)}</div>}
                <div className={`chat-bubble ${isMine(m) ? "mine" : ""}`}>
                  <div className="chat-author">{m.authorName}</div>
                  {m.attachmentUrl && <img src={m.attachmentUrl} alt="" className="chat-attachment" />}
                  {m.body && <div>{m.body}</div>}
                  <div className="chat-time">{fmtTime(m.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p className="err">{error}</p>}
      {(pendingImage || pendingGif) && (
        <div className="chat-pending-attachment">
          <img src={pendingImage || pendingGif || ""} alt="" />
          <button
            type="button"
            className="ghost small"
            onClick={() => {
              setPendingImage(null);
              setPendingGif(null);
            }}
          >
            quitar
          </button>
        </div>
      )}
      <div className="chat-input-row">
        <AutoTextarea
          ref={inputRef}
          rows={1}
          placeholder="Escribí un mensaje…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => pickImage(e.target.files?.[0])}
        />
        <ChatAttachMenu
          onPickEmoji={(e) => setText((t) => t + e)}
          onPickPhoto={() => fileInputRef.current?.click()}
          onPickGif={(url) => {
            setPendingGif(url);
            setPendingImage(null);
          }}
        />
        <button
          type="button"
          className="primary"
          disabled={pending || (!text.trim() && !pendingImage && !pendingGif)}
          onClick={send}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { sendChatMessageAction } from "@/lib/actions/chat";
import { EmojiPicker } from "@/components/shared/EmojiPicker";

type ChatMsg = {
  id: string;
  authorKind: "student" | "admin";
  authorName: string;
  authorStudentId: string | null;
  authorAdminUsername: string | null;
  body: string;
  createdAt: string;
};

const POLL_MS = 6000;

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!body || pending) return;
    setPending(true);
    setError("");
    const res = await sendChatMessageAction({ weekday, slotId, body });
    setPending(false);
    if ("error" in res) {
      setError(res.error!);
      return;
    }
    setText("");
    load();
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
          messages.map((m) => (
            <div key={m.id} className={`chat-bubble ${isMine(m) ? "mine" : ""}`}>
              <div className="chat-author">{m.authorName}</div>
              <div>{m.body}</div>
              <div className="chat-time">{fmtTime(m.createdAt)}</div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p className="err">{error}</p>}
      <div className="chat-input-row">
        <input
          ref={inputRef}
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
        <EmojiPicker onPick={(e) => setText((t) => t + e)} targetRef={inputRef} />
        <button type="button" className="primary" disabled={pending || !text.trim()} onClick={send}>
          Enviar
        </button>
      </div>
    </div>
  );
}

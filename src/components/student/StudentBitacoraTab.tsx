"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtLong } from "@/lib/domain";
import { AutoTextarea } from "@/components/shared/AutoTextarea";
import { ImagePicker } from "@/components/shared/ImagePicker";
import { Linkify } from "@/components/shared/Linkify";
import { CollapsibleText } from "@/components/shared/CollapsibleText";
import { ShowMoreList } from "@/components/shared/ShowMoreList";
import { Modal } from "@/components/shared/Modal";
import { EmojiPicker } from "@/components/shared/EmojiPicker";
import { PostInteractions } from "@/components/shared/PostInteractions";
import { PostImage } from "@/components/shared/PostImage";
import { TrashIcon } from "@/components/shared/Icons";
import { addStudentPostAction, removeStudentPostAction } from "@/lib/actions/studentPosts";
import type { StudentPanelData } from "@/lib/views/student";

export function StudentBitacoraTab({
  myPosts,
  communityPosts,
}: {
  myPosts: StudentPanelData["myPosts"];
  communityPosts: StudentPanelData["communityPosts"];
}) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<"mine" | "community">("mine");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  async function publish() {
    setError("");
    if (!body.trim() && !imageData) {
      setError("Escribí algo o subí una foto.");
      return;
    }
    setPending(true);
    const res = await addStudentPostAction({ title, body, imageData });
    setPending(false);
    if ("error" in res) {
      setError(res.error!);
      return;
    }
    setTitle("");
    setBody("");
    setImageData(null);
    setShowForm(false);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar esta publicación de tu bitácora?")) return;
    await removeStudentPostAction(id);
    router.refresh();
  }

  return (
    <>
      <div className="tabs">
        <div className={`tab ${subTab === "mine" ? "active" : ""}`} onClick={() => setSubTab("mine")}>
          Mi bitácora
        </div>
        <div className={`tab ${subTab === "community" ? "active" : ""}`} onClick={() => setSubTab("community")}>
          Bitácora del taller
        </div>
      </div>

      {subTab === "mine" && (
        <div className="card">
          <ShowMoreList
            items={myPosts}
            initialCount={3}
            itemLabelPlural="publicaciones"
            emptyMessage="Todavía no publicaste nada en tu bitácora."
            renderItem={(p) => (
              <div className="blog-post" key={p.id}>
                <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span>
                    {fmtLong(p.date)} — <span className={`tag ${p.isPublic ? "ok" : "moved"}`}>{p.isPublic ? "pública" : "privada"}</span>
                  </span>
                  {!p.imageData && (
                    <button
                      type="button"
                      className="ghost blog-post-delete-inline post-menu-toggle"
                      aria-label="Borrar"
                      title="Borrar"
                      onClick={() => remove(p.id)}
                    >
                      <TrashIcon size={15} />
                    </button>
                  )}
                </div>
                {p.title && <h4>{p.title}</h4>}
                {p.imageData && <PostImage src={p.imageData} onDelete={() => remove(p.id)} />}
                {p.body && (
                  <p className="blog-post-body">
                    <CollapsibleText text={p.body} render={(t) => <Linkify text={t} />} />
                  </p>
                )}
                <PostInteractions
                  postType="studentpost"
                  postId={p.id}
                  likedByMe={p.likedByMe}
                  likeCount={p.likeCount}
                  comments={p.comments}
                />
              </div>
            )}
          />
        </div>
      )}

      {subTab === "community" && (
        <div className="card">
          <p className="muted">Publicaciones que otros compañeros hicieron públicas.</p>
          <ShowMoreList
            items={communityPosts}
            initialCount={3}
            itemLabelPlural="publicaciones"
            emptyMessage="Todavía no hay publicaciones públicas de otros compañeros."
            renderItem={(p) => (
              <div className="blog-post" key={p.id}>
                <div className="muted">
                  {p.studentName} compartió: {fmtLong(p.date)}
                </div>
                {p.title && <h4>{p.title}</h4>}
                {p.imageData && <img src={p.imageData} alt="" className="blog-post-image" />}
                {p.body && (
                  <p className="blog-post-body">
                    <CollapsibleText text={p.body} render={(t) => <Linkify text={t} />} />
                  </p>
                )}
                <PostInteractions
                  postType="studentpost"
                  postId={p.id}
                  likedByMe={p.likedByMe}
                  likeCount={p.likeCount}
                  comments={p.comments}
                />
              </div>
            )}
          />
        </div>
      )}
      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3>Nueva publicación</h3>
          <p className="muted">
            Subí una pieza, un avance o una idea con foto y descripción. Queda privada — solo la ven las
            profes y vos — salvo que una profe decida hacerla pública o destacarla en el CeramiBlog.
          </p>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Título (opcional)</label>
            <input placeholder="Ej: Mi primer bowl" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Descripción</label>
            <AutoTextarea
              ref={bodyRef}
              rows={3}
              placeholder="Contá cómo lo hiciste, con qué técnica, cómo te fue…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div style={{ marginTop: 6 }}>
              <EmojiPicker onPick={(e) => setBody((b) => b + e)} targetRef={bodyRef} />
            </div>
          </div>
          <ImagePicker value={imageData} onChange={setImageData} />
          {error && <p className="err">{error}</p>}
          <div className="row" style={{ marginTop: 16 }}>
            <button className="ghost block" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
            <button className="primary block" disabled={pending} onClick={publish}>
              Publicar
            </button>
          </div>
        </Modal>
      )}
      <button type="button" className="fab" aria-label="Nueva publicación" title="Nueva publicación" onClick={() => setShowForm(true)}>
        +
      </button>
    </>
  );
}

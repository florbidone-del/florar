"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtLong } from "@/lib/domain";
import { AutoTextarea } from "@/components/shared/AutoTextarea";
import { ImagePicker } from "@/components/shared/ImagePicker";
import { Linkify } from "@/components/shared/Linkify";
import { CollapsibleText } from "@/components/shared/CollapsibleText";
import { ShowMoreList } from "@/components/shared/ShowMoreList";
import { NewItemCard } from "@/components/shared/NewItemCard";
import { EmojiPicker } from "@/components/shared/EmojiPicker";
import { PostInteractions } from "@/components/shared/PostInteractions";
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
    await removeStudentPostAction(id);
    router.refresh();
  }

  return (
    <>
      <NewItemCard label="Nueva publicación" open={showForm} onOpen={() => setShowForm(true)}>
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
        <button className="primary block" style={{ marginTop: 14 }} disabled={pending} onClick={publish}>
          Publicar
        </button>
      </NewItemCard>

      <div className="card">
        <h3>Mi bitácora</h3>
        <ShowMoreList
          items={myPosts}
          initialCount={3}
          itemLabelPlural="publicaciones"
          emptyMessage="Todavía no publicaste nada en tu bitácora."
          renderItem={(p) => (
            <div className="blog-post" key={p.id}>
              <div className="muted">
                {fmtLong(p.date)} — <span className={`tag ${p.isPublic ? "ok" : "moved"}`}>{p.isPublic ? "pública" : "privada"}</span>
              </div>
              {p.title && <h4>{p.title}</h4>}
              {p.imageData && <img src={p.imageData} alt="" className="blog-post-image" />}
              {p.body && (
                <p>
                  <CollapsibleText text={p.body} render={(t) => <Linkify text={t} />} />
                </p>
              )}
              <button className="ghost" onClick={() => remove(p.id)}>
                quitar
              </button>
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

      <div className="card">
        <h3>Bitácoras del taller</h3>
        <p className="muted">Publicaciones que otros compañeros hicieron públicas.</p>
        <ShowMoreList
          items={communityPosts}
          initialCount={3}
          itemLabelPlural="publicaciones"
          emptyMessage="Todavía no hay publicaciones públicas de otros compañeros."
          renderItem={(p) => (
            <div className="blog-post" key={p.id}>
              <div className="muted">
                {fmtLong(p.date)} — {p.studentName}
              </div>
              {p.title && <h4>{p.title}</h4>}
              {p.imageData && <img src={p.imageData} alt="" className="blog-post-image" />}
              {p.body && (
                <p>
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
    </>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtLong } from "@/lib/domain";
import { AutoTextarea } from "@/components/shared/AutoTextarea";
import { ImagePicker } from "@/components/shared/ImagePicker";
import { Linkify } from "@/components/shared/Linkify";
import { ShowMoreList } from "@/components/shared/ShowMoreList";
import { Modal } from "@/components/shared/Modal";
import { CollapsibleText } from "@/components/shared/CollapsibleText";
import { EmojiPicker } from "@/components/shared/EmojiPicker";
import { PostInteractions } from "@/components/shared/PostInteractions";
import type { BlogPostDTO } from "@/lib/views/admin";
import { addBlogPostAction, removeBlogPostAction } from "@/lib/actions/content";

export function BlogTab({ posts }: { posts: BlogPostDTO[] }) {
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
    const res = await addBlogPostAction({ title, body, imageData });
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
    await removeBlogPostAction(id);
    router.refresh();
  }

  return (
    <>
      <div className="card">
        <h3>Posts publicados</h3>
        <ShowMoreList
          items={posts}
          initialCount={3}
          itemLabelPlural="posts"
          emptyMessage="Todavía no hay posts."
          renderItem={(p) => (
            <div className="blog-post" key={p.id}>
              <div className="muted">
                {p.authorName ? `${p.authorName} compartió: ` : ""}
                {fmtLong(p.createdAt)}
              </div>
              {p.featured && (
                <div className="tag ok" style={{ marginTop: 4 }}>
                  ⭐ Destacado{p.studentAuthorName ? ` de ${p.studentAuthorName}` : ""}
                </div>
              )}
              {p.title && <h4>{p.title}</h4>}
              {p.imageData && <img src={p.imageData} alt="" className="blog-post-image" />}
              {p.body && (
                <p className="blog-post-body">
                  <CollapsibleText text={p.body} render={(t) => <Linkify text={t} />} />
                </p>
              )}
              <button className="ghost" onClick={() => remove(p.id)}>
                quitar
              </button>
              <PostInteractions
                postType="blog"
                postId={p.id}
                likedByMe={p.likedByMe}
                likeCount={p.likeCount}
                comments={p.comments}
              />
            </div>
          )}
        />
      </div>
      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <h3>Nuevo post</h3>
          <p className="muted">
            Compartí links, fotos de piezas terminadas, técnicas o ideas — los estudiantes lo ven en su
            pestaña CeramiBlog.
          </p>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Título (opcional)</label>
            <input placeholder="Ej: Esmaltado con óxidos" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Texto</label>
            <AutoTextarea
              ref={bodyRef}
              rows={3}
              placeholder="Escribí la idea, contá algo, pegá un link…"
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
      <button type="button" className="fab" aria-label="Nuevo post" title="Nuevo post" onClick={() => setShowForm(true)}>
        +
      </button>
    </>
  );
}

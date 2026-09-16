"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtLong } from "@/lib/domain";
import { Linkify } from "@/components/shared/Linkify";
import { CollapsibleText } from "@/components/shared/CollapsibleText";
import { ShowMoreList } from "@/components/shared/ShowMoreList";
import { PostInteractions } from "@/components/shared/PostInteractions";
import {
  setStudentPostPublicAction,
  featureStudentPostAction,
  removeStudentPostAction,
} from "@/lib/actions/studentPosts";
import type { StudentPostDTO } from "@/lib/views/admin";

export function StudentPostsTab({ posts }: { posts: StudentPostDTO[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function togglePublic(id: string, isPublic: boolean) {
    setBusy(id);
    await setStudentPostPublicAction(id, !isPublic);
    setBusy(null);
    router.refresh();
  }

  async function feature(id: string) {
    setBusy(id);
    await featureStudentPostAction(id);
    setBusy(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar esta publicación de la bitácora del/de la estudiante?")) return;
    setBusy(id);
    await removeStudentPostAction(id);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="card">
      <h3>Bitácoras de los/las estudiantes</h3>
      <p className="muted">
        Lo que van subiendo a su bitácora personal — por defecto solo lo ven ellos y vos. Podés hacerla
        pública (la ven también sus compañeros) y/o destacarla en el CeramiBlog, con crédito al/a la estudiante.
      </p>
      <ShowMoreList
        items={posts}
        initialCount={5}
        itemLabelPlural="publicaciones"
        emptyMessage="Todavía no hay publicaciones en ninguna bitácora."
        renderItem={(p) => (
          <div className="blog-post" key={p.id}>
            <div className="muted">
              {fmtLong(p.createdAt)} — {p.studentName}{" "}
              <span className={`tag ${p.isPublic ? "ok" : "moved"}`}>{p.isPublic ? "pública" : "privada"}</span>
              {p.featured && <span className="tag ok">⭐ destacada</span>}
            </div>
            {p.title && <h4>{p.title}</h4>}
            {p.imageData && <img src={p.imageData} alt="" className="blog-post-image" />}
            {p.body && (
              <p>
                <CollapsibleText text={p.body} render={(t) => <Linkify text={t} />} />
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button className="ghost small" disabled={busy === p.id} onClick={() => togglePublic(p.id, p.isPublic)}>
                {p.isPublic ? "Hacer privada" : "Hacer pública"}
              </button>
              {!p.featured && (
                <button className="ghost small" disabled={busy === p.id} onClick={() => feature(p.id)}>
                  Destacar en CeramiBlog
                </button>
              )}
              <button className="danger small" disabled={busy === p.id} onClick={() => remove(p.id)}>
                Borrar
              </button>
            </div>
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
  );
}

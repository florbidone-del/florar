"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  togglePostLikeAction,
  addPostCommentAction,
  removePostCommentAction,
  type PostType,
} from "@/lib/actions/postInteractions";
import type { CommentDTO } from "@/lib/postInteractionsData";

/** Barra de "me gusta" + comentarios para un post de CeramiBlog o de bitácora. El conteo de
 *  likes solo se muestra si `likeCount` no es null — eso lo decide quien arma los datos según
 *  si quien mira es el dueño del post (los likes de otros posts quedan ocultos a propósito). */
export function PostInteractions({
  postType,
  postId,
  likedByMe,
  likeCount,
  comments,
}: {
  postType: PostType;
  postId: string;
  likedByMe: boolean;
  likeCount: number | null;
  comments: CommentDTO[];
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(likedByMe);
  const [busy, setBusy] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => setLiked(likedByMe), [likedByMe]);

  async function toggleLike() {
    if (busy) return;
    setLiked((v) => !v);
    setBusy(true);
    const res = await togglePostLikeAction(postType, postId);
    setBusy(false);
    if ("error" in res) {
      setLiked((v) => !v);
      return;
    }
    router.refresh();
  }

  async function postComment() {
    const text = commentText.trim();
    if (!text || posting) return;
    setPosting(true);
    const res = await addPostCommentAction(postType, postId, text);
    setPosting(false);
    if ("error" in res) return;
    setCommentText("");
    router.refresh();
  }

  async function removeComment(id: string) {
    await removePostCommentAction(id);
    router.refresh();
  }

  return (
    <div className="post-interactions">
      <div className="post-actions-row">
        <button type="button" className={`ghost small like-btn ${liked ? "liked" : ""}`} disabled={busy} onClick={toggleLike}>
          <img src="/florar-mark.png" alt="" className="like-icon" />
          Me enflorece{likeCount !== null ? ` (${likeCount})` : ""}
        </button>
        <button type="button" className="ghost small" onClick={() => setShowComments((v) => !v)}>
          💬 Comentarios{comments.length > 0 ? ` (${comments.length})` : ""}
        </button>
      </div>
      {showComments && (
        <div className="post-comments">
          {comments.length === 0 && <p className="muted post-comment-empty">Sin comentarios todavía.</p>}
          {comments.map((c) => (
            <div className="post-comment" key={c.id}>
              <span className="post-comment-author">{c.authorName}</span> {c.body}
              {c.canDelete && (
                <button type="button" className="ghost small" onClick={() => removeComment(c.id)}>
                  quitar
                </button>
              )}
            </div>
          ))}
          <div className="post-comment-input-row">
            <input
              placeholder="Escribí un comentario…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  postComment();
                }
              }}
            />
            <button type="button" className="ghost small" disabled={posting || !commentText.trim()} onClick={postComment}>
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

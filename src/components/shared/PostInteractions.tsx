"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { togglePostLikeAction, type PostType } from "@/lib/actions/postInteractions";

/** Barra de "me gusta" para un post de CeramiBlog o de bitácora. El conteo de likes solo se
 *  muestra si `likeCount` no es null — eso lo decide quien arma los datos según si quien mira
 *  es el dueño del post (los likes de otros posts quedan ocultos a propósito). */
export function PostInteractions({
  postType,
  postId,
  likedByMe,
  likeCount,
}: {
  postType: PostType;
  postId: string;
  likedByMe: boolean;
  likeCount: number | null;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(likedByMe);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="post-interactions">
      <div className="post-actions-row">
        <button type="button" className={`ghost small like-btn ${liked ? "liked" : ""}`} disabled={busy} onClick={toggleLike}>
          <img src="/florar-mark.png" alt="" className="like-icon" />
          Me enflorece{likeCount !== null ? ` (${likeCount})` : ""}
        </button>
      </div>
    </div>
  );
}

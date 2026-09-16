import "server-only";
import { prisma } from "@/lib/prisma";
import { isoDate } from "@/lib/domain";
import type { PostType } from "@/lib/actions/postInteractions";

export type CommentDTO = { id: string; authorName: string; body: string; date: string; canDelete: boolean };
export type InteractionEntry = { likedByMe: boolean; likeCount: number; comments: CommentDTO[] };

/** Trae likes y comentarios de un lote de posts de una vez (CeramiBlog o bitácora). El
 *  `likeCount` siempre viene calculado — quien arma el DTO final decide si mostrarlo (solo al
 *  dueño del post) o esconderlo, según la regla de privacidad de los likes. */
export async function loadInteractions(
  postType: PostType,
  postIds: string[],
  viewerKey: string | null,
  viewerIsProfe: boolean
): Promise<Map<string, InteractionEntry>> {
  const map = new Map<string, InteractionEntry>();
  for (const id of postIds) map.set(id, { likedByMe: false, likeCount: 0, comments: [] });
  if (postIds.length === 0) return map;

  const [likes, comments] = await Promise.all([
    prisma.postLike.findMany({ where: { postType, postId: { in: postIds } } }),
    prisma.postComment.findMany({
      where: { postType, postId: { in: postIds } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  for (const l of likes) {
    const entry = map.get(l.postId);
    if (!entry) continue;
    entry.likeCount++;
    if (viewerKey && l.actorKey === viewerKey) entry.likedByMe = true;
  }
  for (const c of comments) {
    const entry = map.get(c.postId);
    if (!entry) continue;
    entry.comments.push({
      id: c.id,
      authorName: c.authorName,
      body: c.body,
      date: isoDate(c.createdAt),
      canDelete: c.actorKey === viewerKey || viewerIsProfe,
    });
  }
  return map;
}

/** La cantidad de likes solo se muestra al dueño del post, o a cualquier profe (ya tienen acceso
 *  privilegiado de moderación sobre estos posts igual). Para todos los demás queda oculta. */
export function visibleLikeCount(entry: InteractionEntry, isOwner: boolean, viewerIsProfe: boolean): number | null {
  return isOwner || viewerIsProfe ? entry.likeCount : null;
}

/** Borra los likes y comentarios de un post — llamar antes/junto con borrar el post en sí. */
export async function deleteInteractionsFor(postType: PostType, postId: string): Promise<void> {
  await Promise.all([
    prisma.postLike.deleteMany({ where: { postType, postId } }),
    prisma.postComment.deleteMany({ where: { postType, postId } }),
  ]);
}

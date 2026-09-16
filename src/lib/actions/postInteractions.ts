"use server";

import { prisma } from "@/lib/prisma";
import { requireStudent, requireAdmin } from "@/lib/session";
import { requireProfe } from "@/lib/authz";
import { capitalize } from "@/lib/domain";
import type { ActionResult } from "@/lib/actions/auth";

export type PostType = "blog" | "studentpost";

async function currentActor(): Promise<{ key: string; name: string } | null> {
  const student = await requireStudent();
  if (student) {
    const s = await prisma.student.findUnique({ where: { id: student.studentId } });
    if (!s) return null;
    return { key: `student:${s.id}`, name: s.nick || s.name };
  }
  const admin = await requireAdmin();
  if (admin) {
    const a = await prisma.admin.findUnique({ where: { username: admin.username } });
    return { key: `admin:${admin.username}`, name: a?.displayName || capitalize(admin.username) };
  }
  return null;
}

/** Da o saca el "me gusta" del que está logueado (alumno o profe) en un post de CeramiBlog o de
 *  bitácora. La cuenta de likes queda oculta salvo para el dueño del post — eso se resuelve del
 *  lado de la lectura (loadPostInteractions), acá solo se guarda quién le dio like. */
export async function togglePostLikeAction(
  postType: PostType,
  postId: string
): Promise<ActionResult & { liked?: boolean }> {
  const actor = await currentActor();
  if (!actor) return { error: "No autorizado." };

  const existing = await prisma.postLike.findUnique({
    where: { postType_postId_actorKey: { postType, postId, actorKey: actor.key } },
  });
  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } });
    return { ok: true, liked: false };
  }
  await prisma.postLike.create({ data: { postType, postId, actorKey: actor.key } });
  return { ok: true, liked: true };
}

/** Comentario de texto simple, sin hilos — como en Instagram. */
export async function addPostCommentAction(
  postType: PostType,
  postId: string,
  body: string
): Promise<ActionResult> {
  const actor = await currentActor();
  if (!actor) return { error: "No autorizado." };
  const trimmed = body.trim();
  if (!trimmed) return { error: "Escribí algo." };
  if (trimmed.length > 500) return { error: "El comentario es demasiado largo." };

  await prisma.postComment.create({
    data: { postType, postId, body: trimmed, authorName: actor.name, actorKey: actor.key },
  });
  return { ok: true };
}

/** Borra un comentario propio, o cualquiera si quien pide es profe (moderación). */
export async function removePostCommentAction(id: string): Promise<ActionResult> {
  const actor = await currentActor();
  if (!actor) return { error: "No autorizado." };
  const profe = await requireProfe();

  const comment = await prisma.postComment.findUnique({ where: { id } });
  if (!comment) return { ok: true };
  if (comment.actorKey !== actor.key && !profe) return { error: "No autorizado." };

  await prisma.postComment.deleteMany({ where: { id } });
  return { ok: true };
}

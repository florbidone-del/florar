"use server";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";
import { requireProfe } from "@/lib/authz";
import { uploadImageDataUrl, duplicateBlobImage, deleteBlobImage } from "@/lib/blobStorage";
import type { ActionResult } from "@/lib/actions/auth";

/** Publica en la bitácora personal del alumno logueado — arranca privada (solo la ve él/ella y
 *  las profes). La foto se sube a Vercel Blob y en la base solo queda el link. */
export async function addStudentPostAction(input: {
  title?: string;
  body: string;
  imageData?: string | null;
}): Promise<ActionResult> {
  const session = await requireStudent();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };
  const body = input.body.trim();
  if (!body && !input.imageData) return { error: "Escribí algo o subí una foto." };

  let imageUrl: string | null = null;
  if (input.imageData) {
    try {
      imageUrl = await uploadImageDataUrl(input.imageData, "bitacoras");
    } catch {
      return { error: "No se pudo subir la foto. Probá de nuevo." };
    }
  }

  await prisma.studentPost.create({
    data: {
      studentId: session.studentId,
      title: input.title?.trim() || null,
      body,
      imageData: imageUrl,
    },
  });
  return { ok: true };
}

/** El alumno borra su propia publicación, o cualquier profe la borra (moderación). */
export async function removeStudentPostAction(id: string): Promise<ActionResult> {
  const student = await requireStudent();
  const profe = student ? null : await requireProfe();
  if (!student && !profe) return { error: "No autorizado." };

  const where = student ? { id, studentId: student.studentId } : { id };
  const post = await prisma.studentPost.findFirst({ where, select: { imageData: true } });
  await deleteBlobImage(post?.imageData);
  await prisma.studentPost.deleteMany({ where });
  return { ok: true };
}

/** Una profe decide si una publicación de la bitácora se ve también para el resto de los alumnos. */
export async function setStudentPostPublicAction(
  id: string,
  isPublic: boolean
): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.studentPost.update({ where: { id }, data: { isPublic } });
  return { ok: true };
}

/** "Retuitea" una publicación de la bitácora de un alumno al CeramiBlog, marcada como destacada
 *  y con crédito al alumno. La deja pública de paso, ya que ahora es visible para todos. */
export async function featureStudentPostAction(id: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };

  const post = await prisma.studentPost.findUnique({ where: { id }, include: { student: true } });
  if (!post) return { error: "No se encontró la publicación." };

  const already = await prisma.blogPost.findFirst({ where: { sourceStudentPostId: id } });
  if (already) return { error: "Ya está destacada en el CeramiBlog." };

  // Se copia el archivo (no se reusa el mismo link) para que después se pueda borrar la foto de
  // uno de los dos posts (ej: al limpiar fotos viejas) sin dejar al otro con una imagen rota.
  let imageUrl: string | null = null;
  if (post.imageData) {
    try {
      imageUrl = post.imageData.startsWith("http")
        ? await duplicateBlobImage(post.imageData, "ceramiblog")
        : post.imageData;
    } catch {
      imageUrl = null;
    }
  }

  await prisma.blogPost.create({
    data: {
      title: post.title,
      body: post.body,
      imageData: imageUrl,
      authorUsername: session.username,
      featured: true,
      studentAuthorName: post.student.name,
      sourceStudentPostId: post.id,
    },
  });
  await prisma.studentPost.update({ where: { id }, data: { isPublic: true } });
  return { ok: true };
}

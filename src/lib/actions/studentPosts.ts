"use server";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";
import { requireProfe } from "@/lib/authz";
import { uploadPostImages, duplicateBlobImage, deleteBlobImage } from "@/lib/blobStorage";
import { MAX_POST_IMAGES } from "@/lib/postImages";
import { deleteInteractionsFor } from "@/lib/postInteractionsData";
import { notifyNewBlogPost } from "@/lib/push";
import type { ActionResult } from "@/lib/actions/auth";

/** Publica en la bitácora personal del alumno logueado — arranca privada (solo la ve él/ella y
 *  las profes). Las fotos (hasta 3) se suben a Vercel Blob y en la base solo quedan los links. */
export async function addStudentPostAction(input: {
  title?: string;
  body: string;
  images?: string[];
}): Promise<ActionResult> {
  const session = await requireStudent();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };
  const body = input.body.trim();
  const images = input.images ?? [];
  if (!body && images.length === 0) return { error: "Escribí algo o subí una foto." };
  if (images.length > MAX_POST_IMAGES) return { error: `Podés subir hasta ${MAX_POST_IMAGES} fotos.` };

  let imageUrls: string[];
  try {
    imageUrls = await uploadPostImages(images, "bitacoras");
  } catch (err) {
    console.error("[addStudentPostAction] Falló la subida a Blob:", err);
    return { error: "No se pudieron subir las fotos. Probá de nuevo." };
  }

  await prisma.studentPost.create({
    data: {
      studentId: session.studentId,
      title: input.title?.trim() || null,
      body,
      imageUrls,
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
  const post = await prisma.studentPost.findFirst({ where, select: { imageUrls: true } });
  await Promise.all((post?.imageUrls ?? []).map(deleteBlobImage));
  await deleteInteractionsFor("studentpost", id);
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

  // Se copian los archivos (no se reusan los mismos links) para que después se puedan borrar las
  // fotos de uno de los dos posts (ej: al limpiar fotos viejas) sin dejar al otro con imágenes
  // rotas. Si alguna copia falla, el destacado sale sin esa foto en vez de no salir.
  const copies = await Promise.all(
    post.imageUrls.map((url) =>
      url.startsWith("http") ? duplicateBlobImage(url, "ceramiblog").catch(() => null) : url
    )
  );
  const imageUrls = copies.filter((url): url is string => !!url);

  await prisma.blogPost.create({
    data: {
      title: post.title,
      body: post.body,
      imageUrls,
      authorUsername: session.username,
      featured: true,
      studentAuthorName: post.student.name,
      sourceStudentPostId: post.id,
    },
  });
  await prisma.studentPost.update({ where: { id }, data: { isPublic: true } });
  after(() =>
    notifyNewBlogPost({ authorUsername: session.username, title: post.title, body: post.body }).catch(() => {})
  );
  return { ok: true };
}

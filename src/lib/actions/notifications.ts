"use server";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";
import { requireAdmin } from "@/lib/session";
import type { ActionResult } from "@/lib/actions/auth";

type SeenSection = "avisos" | "chat" | "blog";

/** Marca como "visto" el momento actual para avisos/chat/CeramiBlog — apaga el circulito rojo de
 *  no-leído hasta que aparezca contenido más nuevo que este timestamp. */
export async function markSeenAction(section: SeenSection): Promise<ActionResult> {
  const student = await requireStudent();
  const admin = student ? null : await requireAdmin();
  if (!student && !admin) return { error: "No autorizado." };

  const field = `${section}SeenAt` as const;
  const now = new Date();
  if (student) {
    await prisma.student.update({ where: { id: student.studentId }, data: { [field]: now } });
  } else if (admin) {
    await prisma.admin.update({ where: { username: admin.username }, data: { [field]: now } });
  }
  return { ok: true };
}

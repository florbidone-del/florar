"use server";

import { prisma } from "@/lib/prisma";
import { authorizeChatTurno } from "@/lib/chat";
import type { ActionResult } from "@/lib/actions/auth";

export async function sendChatMessageAction(input: {
  weekday: number;
  slotId: string;
  body: string;
}): Promise<ActionResult> {
  const identity = await authorizeChatTurno(input.weekday, input.slotId);
  if (!identity) return { error: "No autorizado." };
  const body = input.body.trim();
  if (!body) return { error: "Escribí un mensaje." };
  if (body.length > 2000) return { error: "El mensaje es demasiado largo." };

  await prisma.chatMessage.create({
    data: {
      weekday: input.weekday,
      slotId: input.slotId,
      authorKind: identity.kind,
      authorName: identity.authorName,
      authorStudentId: identity.kind === "student" ? identity.studentId : null,
      authorAdminUsername: identity.kind === "admin" ? identity.username : null,
      body,
    },
  });
  return { ok: true };
}

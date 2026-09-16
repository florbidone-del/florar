"use server";

import { prisma } from "@/lib/prisma";
import { authorizeChatTurno } from "@/lib/chat";
import { uploadImageDataUrl } from "@/lib/blobStorage";
import type { ActionResult } from "@/lib/actions/auth";

export async function sendChatMessageAction(input: {
  weekday: number;
  slotId: string;
  body: string;
  imageData?: string | null; // foto propia en base64 — se sube a Vercel Blob
  gifUrl?: string | null; // GIF ya alojado en Giphy — se guarda el link tal cual
}): Promise<ActionResult> {
  const identity = await authorizeChatTurno(input.weekday, input.slotId);
  if (!identity) return { error: "No autorizado." };
  const body = input.body.trim();
  if (!body && !input.imageData && !input.gifUrl) {
    return { error: "Escribí un mensaje o mandá una imagen." };
  }
  if (body.length > 2000) return { error: "El mensaje es demasiado largo." };

  let attachmentUrl: string | null = null;
  let attachmentType: string | null = null;
  if (input.imageData) {
    try {
      attachmentUrl = await uploadImageDataUrl(input.imageData, "chat");
      attachmentType = "photo";
    } catch {
      return { error: "No se pudo subir la foto. Probá de nuevo." };
    }
  } else if (input.gifUrl) {
    attachmentUrl = input.gifUrl;
    attachmentType = "gif";
  }

  await prisma.chatMessage.create({
    data: {
      weekday: input.weekday,
      slotId: input.slotId,
      authorKind: identity.kind,
      authorName: identity.authorName,
      authorStudentId: identity.kind === "student" ? identity.studentId : null,
      authorAdminUsername: identity.kind === "admin" ? identity.username : null,
      body,
      attachmentUrl,
      attachmentType,
    },
  });
  return { ok: true };
}

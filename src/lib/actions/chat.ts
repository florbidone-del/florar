"use server";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeChatTurno } from "@/lib/chat";
import { uploadImageDataUrl } from "@/lib/blobStorage";
import { notifyNewChatMessage } from "@/lib/push";
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
    } catch (err) {
      console.error("[sendChatMessageAction] Falló la subida a Blob:", err);
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

  // after() sigue corriendo aunque ya se le haya respondido a quien escribió — así no lo hace
  // esperar a que salgan los pushes, pero tampoco se cortan a mitad de camino.
  after(() =>
    notifyNewChatMessage({
      weekday: input.weekday,
      slotId: input.slotId,
      authorName: identity.authorName,
      body,
      hasAttachment: !!attachmentUrl,
      excludeStudentId: identity.kind === "student" ? identity.studentId : null,
      excludeAdminUsername: identity.kind === "admin" ? identity.username : null,
    }).catch(() => {})
  );

  return { ok: true };
}

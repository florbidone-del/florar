"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { ActionResult } from "@/lib/actions/auth";

export async function subscribeToPushAction(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "No autorizado." };

  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      studentId: session.kind === "student" ? session.studentId : null,
      adminUsername: session.kind === "admin" ? session.username : null,
    },
    // Si el mismo endpoint ya estaba de otra cuenta (celu compartido, cambiaron de usuario), pasa
    // a ser de quien lo está activando ahora.
    update: {
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      studentId: session.kind === "student" ? session.studentId : null,
      adminUsername: session.kind === "admin" ? session.username : null,
    },
  });
  return { ok: true };
}

export async function unsubscribeFromPushAction(endpoint: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: "No autorizado." };
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return { ok: true };
}

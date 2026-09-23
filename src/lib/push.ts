import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:soporte@florar.app";

const configured = !!(PUBLIC_KEY && PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY!, PRIVATE_KEY!);
}

type PushPayload = { title: string; body: string; url: string };
type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Manda el push a cada suscripción; si el navegador ya la dio de baja (410/404) la borra sola,
 *  así la base no acumula suscripciones muertas. Nunca tira: un push que falla no debe romper la
 *  acción que lo disparó (mandar un mensaje de chat, publicar en el blog, etc). */
async function sendToSubscriptions(subs: Sub[], payload: PushPayload) {
  if (!configured || subs.length === 0) return;
  const stale: string[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) stale.push(sub.id);
      }
    })
  );
  if (stale.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: stale } } });
  }
}

/** Avisa por push a todo el resto de gente del turno (estudiantes + profe asignado/a + profe
 *  principal) de que hay un mensaje nuevo en su chat — a quien lo escribió no, obviamente. */
export async function notifyNewChatMessage(input: {
  weekday: number;
  slotId: string;
  authorName: string;
  body: string;
  hasAttachment: boolean;
  excludeStudentId?: string | null;
  excludeAdminUsername?: string | null;
}) {
  if (!configured) return;
  const [students, assignment, mainProfes] = await Promise.all([
    prisma.student.findMany({
      where: {
        defaultWeekday: input.weekday,
        defaultSlotId: input.slotId,
        ...(input.excludeStudentId ? { id: { not: input.excludeStudentId } } : {}),
      },
      select: { id: true },
    }),
    prisma.slotAssignment.findUnique({
      where: { weekday_slotId: { weekday: input.weekday, slotId: input.slotId } },
    }),
    prisma.admin.findMany({ where: { isMainProfe: true }, select: { username: true } }),
  ]);

  const adminUsernames = new Set<string>();
  if (assignment) adminUsernames.add(assignment.profeUsername);
  mainProfes.forEach((p) => adminUsernames.add(p.username));
  if (input.excludeAdminUsername) adminUsernames.delete(input.excludeAdminUsername);

  if (students.length === 0 && adminUsernames.size === 0) return;
  const subs = await prisma.pushSubscription.findMany({
    where: {
      OR: [
        { studentId: { in: students.map((s) => s.id) } },
        { adminUsername: { in: Array.from(adminUsernames) } },
      ],
    },
  });

  await sendToSubscriptions(subs, {
    title: `${input.authorName} escribió en tu chat`,
    body: input.body.trim() || (input.hasAttachment ? "Mandó una imagen." : ""),
    url: "/",
  });
}

/** Avisa por push a todos los estudiantes y al resto de profes de que hay una publicación nueva
 *  en el CeramiBlog (lo ve toda la comunidad del taller, no un turno puntual). */
export async function notifyNewBlogPost(input: {
  authorUsername: string;
  title: string | null;
  body: string;
}) {
  if (!configured) return;
  const [students, admins] = await Promise.all([
    prisma.student.findMany({ select: { id: true } }),
    prisma.admin.findMany({ where: { username: { not: input.authorUsername } }, select: { username: true } }),
  ]);
  if (students.length === 0 && admins.length === 0) return;
  const subs = await prisma.pushSubscription.findMany({
    where: {
      OR: [
        { studentId: { in: students.map((s) => s.id) } },
        { adminUsername: { in: admins.map((a) => a.username) } },
      ],
    },
  });

  await sendToSubscriptions(subs, {
    title: "Nueva publicación en CeramiBlog",
    body: input.title || input.body.trim(),
    url: "/",
  });
}

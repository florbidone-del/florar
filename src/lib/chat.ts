import "server-only";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { capitalize } from "@/lib/domain";

export type ChatIdentity =
  | { kind: "student"; studentId: string; authorName: string }
  | { kind: "admin"; username: string; authorName: string };

/** Alumnos: solo el chat de su propio turno fijo. Profes: el turno que tienen asignado, o
 *  cualquiera si son la profe principal (para poder moderar). */
export async function authorizeChatTurno(weekday: number, slotId: string): Promise<ChatIdentity | null> {
  const session = await getSession();
  if (!session) return null;

  if (session.kind === "student") {
    const student = await prisma.student.findUnique({ where: { id: session.studentId } });
    if (!student || student.defaultWeekday !== weekday || student.defaultSlotId !== slotId) return null;
    return { kind: "student", studentId: student.id, authorName: student.nick || student.name };
  }

  const admin = await prisma.admin.findUnique({ where: { username: session.username } });
  if (!admin || admin.role !== "profe") return null;
  if (!admin.isMainProfe) {
    const assignment = await prisma.slotAssignment.findUnique({
      where: { weekday_slotId: { weekday, slotId } },
    });
    if (!assignment || assignment.profeUsername !== admin.username) return null;
  }
  return { kind: "admin", username: admin.username, authorName: admin.displayName || capitalize(admin.username) };
}

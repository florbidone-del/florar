import "server-only";
import { prisma } from "@/lib/prisma";
import { requireAdmin, type AdminSession } from "@/lib/session";

/** Cualquier cuenta de profe (no la dueña/o). */
export async function requireProfe(): Promise<AdminSession | null> {
  const session = await requireAdmin();
  if (!session || session.role !== "profe") return null;
  return session;
}

/** Solo la profe "principal": puede tocar turnos por profe y reglas/cuota del taller. */
export async function requireMainProfe(): Promise<AdminSession | null> {
  const session = await requireProfe();
  if (!session) return null;
  const admin = await prisma.admin.findUnique({ where: { username: session.username } });
  if (!admin?.isMainProfe) return null;
  return session;
}

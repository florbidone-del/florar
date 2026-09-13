"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { requireProfe } from "@/lib/authz";
import { usernameCandidates, currentMonthKey } from "@/lib/domain";
import type { ActionResult } from "@/lib/actions/auth";

export async function createStudentAction(input: {
  name: string;
  pin: string;
  defaultWeekday: number;
  defaultSlotId: string;
}): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const name = input.name.trim();
  if (name.length < 2) return { error: "Ingresá el nombre." };
  if (!input.pin.trim()) return { error: "Ingresá un PIN." };
  if (input.defaultWeekday === null || !input.defaultSlotId)
    return { error: "Elegí día y horario." };
  let id: string | null = null;
  for (const candidate of usernameCandidates(name)) {
    const existing = await prisma.student.findUnique({ where: { id: candidate } });
    if (!existing) {
      id = candidate;
      break;
    }
  }
  if (!id) {
    return {
      error:
        'Ya existe un alumno con ese nombre. Agregá una inicial extra para diferenciarlo (ej: "Julia Gómez B").',
    };
  }
  await prisma.student.create({
    data: {
      id,
      name,
      pin: input.pin.trim(),
      defaultWeekday: input.defaultWeekday,
      defaultSlotId: input.defaultSlotId,
    },
  });
  return { ok: true };
}

export async function updateStudentAction(
  id: string,
  input: {
    pin: string;
    defaultWeekday: number;
    defaultSlotId: string;
  }
): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  if (!input.pin.trim()) return { error: "Ingresá un PIN." };
  if (input.defaultWeekday === null || !input.defaultSlotId)
    return { error: "Elegí día y horario." };
  await prisma.student.update({
    where: { id },
    data: {
      pin: input.pin.trim(),
      defaultWeekday: input.defaultWeekday,
      defaultSlotId: input.defaultSlotId,
    },
  });
  return { ok: true };
}

export async function deleteStudentAction(id: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.student.deleteMany({ where: { id } });
  return { ok: true };
}

/** Marcar pagado a mano, con el monto que haya recibido la profe (ej. con descuento por efectivo). */
export async function markPaidManuallyAction(
  studentId: string,
  amount: number
): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  if (!Number.isFinite(amount) || amount < 0) return { error: "Monto inválido." };
  const mk = currentMonthKey();
  await prisma.payment.upsert({
    where: { studentId_monthKey: { studentId, monthKey: mk } },
    create: { studentId, monthKey: mk, amount: Math.round(amount), status: "approved", source: "manual" },
    update: { status: "approved", source: "manual", amount: Math.round(amount) },
  });
  return { ok: true };
}

export async function unmarkPaidAction(studentId: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const mk = currentMonthKey();
  await prisma.payment.deleteMany({ where: { studentId, monthKey: mk } });
  return { ok: true };
}

export async function resolvePinResetAction(
  requestId: string
): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const req = await prisma.pinResetRequest.findUnique({
    where: { id: requestId },
  });
  if (req) {
    const config = await prisma.config.findUniqueOrThrow({ where: { id: 1 } });
    await prisma.student.update({
      where: { id: req.studentId },
      data: { pin: config.defaultStudentPin },
    });
    await prisma.pinResetRequest.delete({ where: { id: requestId } });
  }
  return { ok: true };
}

export async function dismissNotificationAction(
  id: string
): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { error: "No autorizado." };
  await prisma.notification.deleteMany({ where: { id } });
  return { ok: true };
}

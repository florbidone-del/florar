"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { requireProfe, requireMainProfe } from "@/lib/authz";
import { usernameCandidates, currentMonthKey } from "@/lib/domain";
import type { ActionResult } from "@/lib/actions/auth";

export async function createStudentAction(input: {
  name: string;
  defaultWeekday: number;
  defaultSlotId: string;
}): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const name = input.name.trim();
  if (name.length < 2) return { error: "Ingresá el nombre." };
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
  const config = await prisma.config.findUniqueOrThrow({ where: { id: 1 } });
  await prisma.student.create({
    data: {
      id,
      name,
      pin: config.defaultStudentPin,
      mustChangePin: true,
      defaultWeekday: input.defaultWeekday,
      defaultSlotId: input.defaultSlotId,
    },
  });
  return { ok: true };
}

export async function updateStudentAction(
  id: string,
  input: {
    defaultWeekday: number;
    defaultSlotId: string;
  }
): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  if (input.defaultWeekday === null || !input.defaultSlotId)
    return { error: "Elegí día y horario." };
  await prisma.student.update({
    where: { id },
    data: {
      defaultWeekday: input.defaultWeekday,
      defaultSlotId: input.defaultSlotId,
    },
  });
  return { ok: true };
}

/** Restablece el PIN al default del taller sin que la profe llegue a ver cuál era — solo
 *  puede resetearlo, nunca leerlo (con el chat de por medio, ver el PIN sería ver la
 *  identidad de otra persona). Fuerza a cambiarlo de nuevo en el próximo ingreso. */
export async function resetStudentPinAction(studentId: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const config = await prisma.config.findUniqueOrThrow({ where: { id: 1 } });
  await prisma.student.update({
    where: { id: studentId },
    data: { pin: config.defaultStudentPin, mustChangePin: true },
  });
  await prisma.pinResetRequest.deleteMany({ where: { studentId } });
  return { ok: true };
}

export async function deleteStudentAction(id: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.student.deleteMany({ where: { id } });
  return { ok: true };
}

/** Registra un pago a mano (efectivo/transferencia). Si ya había un pago parcial aprobado este
 *  mes, el monto se SUMA al que ya tenía — no lo reemplaza — para poder cobrar el saldo en partes.
 *  Solo la profe principal: el estado de cuotas es un tema de plata que no ven las demás profes. */
export async function markPaidManuallyAction(
  studentId: string,
  amount: number
): Promise<ActionResult> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Monto inválido." };
  const mk = currentMonthKey();
  const existing = await prisma.payment.findUnique({
    where: { studentId_monthKey: { studentId, monthKey: mk } },
  });
  const alreadyPaid = existing?.status === "approved" ? existing.amount : 0;
  const total = alreadyPaid + Math.round(amount);
  await prisma.payment.upsert({
    where: { studentId_monthKey: { studentId, monthKey: mk } },
    create: { studentId, monthKey: mk, amount: total, status: "approved", source: "manual" },
    update: { status: "approved", source: "manual", amount: total },
  });
  return { ok: true };
}

export async function unmarkPaidAction(studentId: string): Promise<ActionResult> {
  const session = await requireMainProfe();
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
      data: { pin: config.defaultStudentPin, mustChangePin: true },
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

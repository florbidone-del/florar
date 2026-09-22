"use server";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";
import {
  capacityForSlot,
  currentMonthKey,
  dayAvailability,
  fmtShort,
  hoursUntil,
  parseISO,
  profeForSlot,
  slotOccupancy,
  slotsForDate,
  studentSessionsThisMonth,
  todayISO,
} from "@/lib/domain";
import { dateInputToUTC, loadWorkshopSnapshot } from "@/lib/snapshot";
import type { ActionResult } from "@/lib/actions/auth";

/** El/la estudiante agenda una clase extra ya pagada (ver ExtraClassPurchase) — mismas reglas que
 *  un cambio de turno (24hs de anticipación, mismo cupo del turno), pero sin liberar nada: se suma
 *  a sus clases normales de la semana. */
export async function requestExtraClassBookingAction(input: {
  purchaseId: string;
  targetDate: string;
  targetSlotId: string;
}): Promise<ActionResult> {
  const session = await requireStudent();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };
  const snap = await loadWorkshopSnapshot();
  const student = snap.students.find((s) => s.id === session.studentId);
  if (!student) return { error: "Tenés que iniciar sesión de nuevo." };

  const purchase = snap.extraClassPurchases.find(
    (p) => p.id === input.purchaseId && p.studentId === student.id
  );
  if (!purchase) return { error: "No encontramos esa compra." };
  if (purchase.status !== "approved") return { error: "Ese pago todavía no está aprobado." };
  if (purchase.bookedDate) return { error: "Esa clase extra ya fue agendada." };
  if (purchase.monthKey !== currentMonthKey()) {
    return { error: "Esa clase extra ya venció — era válida solo para el mes en que se pagó." };
  }

  const { targetDate, targetSlotId } = input;
  const today = todayISO();
  if (targetDate <= today) return { error: "Elegí un día posterior a hoy." };
  if (dayAvailability(snap, targetDate) !== "available") {
    return { error: "Ese día no tiene lugar disponible." };
  }
  const validSlot = slotsForDate(snap, targetDate).some((s) => s.id === targetSlotId);
  if (!validSlot) return { error: "Ese horario no es válido para ese día." };
  const alreadyHasClassThatDay = studentSessionsThisMonth(snap, student.id).some(
    (r) => r.date === targetDate
  );
  if (alreadyHasClassThatDay) return { error: "Ya tenés una clase ese día." };
  const occ = slotOccupancy(snap, targetDate, targetSlotId, student.id);
  if (occ.length >= capacityForSlot(snap, parseISO(targetDate).getDay(), targetSlotId)) {
    return { error: "Ese turno ya está lleno." };
  }
  if (hoursUntil(snap, targetDate, targetSlotId) < 24) {
    return { error: "Elegí un turno con más de 24hs de anticipación." };
  }

  await prisma.extraClassPurchase.update({
    where: { id: purchase.id },
    data: { bookedDate: dateInputToUTC(targetDate), bookedSlotId: targetSlotId },
  });

  const weekday = parseISO(targetDate).getDay();
  const slot = slotsForDate(snap, targetDate).find((s) => s.id === targetSlotId);
  const when = `${fmtShort(targetDate)} · ${slot?.start || ""}–${slot?.end || ""}`;
  const profe = profeForSlot(snap, weekday, targetSlotId);
  const notifs: { forProfe: string | null; message: string }[] = [
    { forProfe: null, message: `${student.name} agendó una clase extra para el ${when}.` },
  ];
  if (profe) {
    notifs.push({ forProfe: profe, message: `Se te sumó ${student.name} para una clase extra el ${when}.` });
  }
  await prisma.notification.createMany({ data: notifs });

  return { ok: true };
}

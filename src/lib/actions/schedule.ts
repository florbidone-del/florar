"use server";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";
import { requireProfe, requireMainProfe } from "@/lib/authz";
import {
  currentMonthKey,
  dayAvailability,
  fmtShort,
  hoursUntil,
  isHoliday,
  parseISO,
  profeForSlot,
  slotOccupancy,
  slotsForDate,
  swapsUsedThisMonth,
  todayISO,
} from "@/lib/domain";
import { dateInputToUTC, loadWorkshopSnapshot } from "@/lib/snapshot";
import type { ActionResult } from "@/lib/actions/auth";

/** El alumno cambia una clase puntual (turno confirmado) o reprograma una clase caída por feriado. */
export async function requestScheduleChangeAction(input: {
  originalDate: string;
  targetDate: string;
  targetSlotId: string;
}): Promise<ActionResult> {
  const session = await requireStudent();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };
  const snap = await loadWorkshopSnapshot();
  const student = snap.students.find((s) => s.id === session.studentId);
  if (!student) return { error: "Tenés que iniciar sesión de nuevo." };

  const { originalDate, targetDate, targetSlotId } = input;
  const originalSlotId = student.defaultSlotId;

  const alreadyChanged = snap.scheduleChanges.some(
    (c) => c.studentId === student.id && c.fromDate === originalDate
  );
  if (alreadyChanged) return { error: "Esa clase ya fue movida." };

  const isHolidayReschedule = !!isHoliday(snap, originalDate);
  const reason: "cambio" | "feriado" = isHolidayReschedule ? "feriado" : "cambio";

  if (!isHolidayReschedule) {
    const hrs = hoursUntil(snap, originalDate, originalSlotId);
    if (hrs < 24) return { error: "Ya no se puede: falta menos de 24hs." };
    const swapsLeft = snap.config.swapsPerMonth - swapsUsedThisMonth(snap, student.id);
    if (swapsLeft <= 0) return { error: "Ya usaste tu cambio de este mes." };
  }

  const today = todayISO();
  if (targetDate <= today) {
    return { error: "Elegí un día posterior a hoy." };
  }
  if (dayAvailability(snap, targetDate) !== "available") {
    return { error: "Ese día no tiene lugar disponible." };
  }
  const validSlot = slotsForDate(snap, targetDate).some((s) => s.id === targetSlotId);
  if (!validSlot) return { error: "Ese horario no es válido para ese día." };
  if (targetDate === originalDate && targetSlotId === originalSlotId) {
    return { error: "Elegí un turno distinto del que estás cambiando." };
  }
  const occ = slotOccupancy(snap, targetDate, targetSlotId, student.id);
  if (occ.length >= snap.config.capacity) {
    return { error: "Ese turno ya está lleno." };
  }
  if (hoursUntil(snap, targetDate, targetSlotId) < 24) {
    return { error: "Elegí un turno con más de 24hs de anticipación." };
  }

  const monthKey = currentMonthKey();
  await prisma.scheduleChange.create({
    data: {
      studentId: student.id,
      fromDate: dateInputToUTC(originalDate),
      fromSlotId: originalSlotId,
      toDate: dateInputToUTC(targetDate),
      toSlotId: targetSlotId,
      reason,
      monthKey,
    },
  });

  // ---- notificaciones ----
  const fromWeekday = parseISO(originalDate).getDay();
  const toWeekday = parseISO(targetDate).getDay();
  const fromSlot = slotsForDate(snap, originalDate).find((s) => s.id === originalSlotId);
  const toSlot = slotsForDate(snap, targetDate).find((s) => s.id === targetSlotId);
  const fromTxt = `${fmtShort(originalDate)} · ${fromSlot?.start || ""}–${fromSlot?.end || ""}`;
  const toTxt = `${fmtShort(targetDate)} · ${toSlot?.start || ""}–${toSlot?.end || ""}`;
  const fromProfe = profeForSlot(snap, fromWeekday, originalSlotId);
  const toProfe = profeForSlot(snap, toWeekday, targetSlotId);

  const notifs: { forProfe: string | null; message: string }[] = [
    { forProfe: null, message: `${student.name} cambió su clase del ${fromTxt} al ${toTxt}.` },
  ];
  if (fromProfe && fromProfe !== toProfe) {
    notifs.push({
      forProfe: fromProfe,
      message: `Se te quitó ${student.name} del turno del ${fromTxt} — movió su clase.`,
    });
  }
  if (toProfe && toProfe !== fromProfe) {
    notifs.push({
      forProfe: toProfe,
      message: `Se te sumó ${student.name} para el turno del ${toTxt}.`,
    });
  }
  await prisma.notification.createMany({ data: notifs });

  return { ok: true };
}

export async function setSubstitutionAction(input: {
  date: string;
  slotId: string;
  newProfe: string | null;
}): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const snap = await loadWorkshopSnapshot();
  const weekday = parseISO(input.date).getDay();
  const regularProfe = profeForSlot(snap, weekday, input.slotId);

  if (input.newProfe) {
    await prisma.substitution.upsert({
      where: { date_slotId: { date: dateInputToUTC(input.date), slotId: input.slotId } },
      create: { date: dateInputToUTC(input.date), slotId: input.slotId, profeUsername: input.newProfe },
      update: { profeUsername: input.newProfe },
    });
  } else {
    await prisma.substitution.deleteMany({
      where: { date: dateInputToUTC(input.date), slotId: input.slotId },
    });
  }

  const slot = slotsForDate(snap, input.date).find((s) => s.id === input.slotId);
  const when = `${fmtShort(input.date)} · ${slot?.start || ""}–${slot?.end || ""}`;
  const effectiveProfe = input.newProfe || regularProfe;
  const notifs: { forProfe: string; message: string }[] = [];
  if (regularProfe && regularProfe !== effectiveProfe) {
    notifs.push({
      forProfe: regularProfe,
      message: `Te sustituyen el ${when} — da la clase ${effectiveProfe}.`,
    });
  }
  if (input.newProfe && input.newProfe !== regularProfe) {
    notifs.push({
      forProfe: input.newProfe,
      message: `Vas a cubrir el turno del ${when}${regularProfe ? " en lugar de " + regularProfe : ""}.`,
    });
  }
  if (notifs.length) await prisma.notification.createMany({ data: notifs });

  return { ok: true };
}

export async function setSlotAssignmentAction(input: {
  weekday: number;
  slotId: string;
  profeUsername: string | null;
}): Promise<ActionResult> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };
  if (input.profeUsername) {
    await prisma.slotAssignment.upsert({
      where: { weekday_slotId: { weekday: input.weekday, slotId: input.slotId } },
      create: { weekday: input.weekday, slotId: input.slotId, profeUsername: input.profeUsername },
      update: { profeUsername: input.profeUsername },
    });
  } else {
    await prisma.slotAssignment.deleteMany({
      where: { weekday: input.weekday, slotId: input.slotId },
    });
  }
  return { ok: true };
}

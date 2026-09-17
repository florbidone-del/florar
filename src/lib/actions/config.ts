"use server";

import { prisma } from "@/lib/prisma";
import { requireProfe, requireMainProfe } from "@/lib/authz";
import type { ActionResult } from "@/lib/actions/auth";

export async function saveConfigAction(input: {
  classesPerCycle: number;
  swapsPerMonth: number;
  paymentWindowStart: number;
  paymentWindowEnd: number;
  cashFee: number;
  mpFee: number;
  lateFeePercent: number;
  announcementVisibleDays: number;
  defaultStudentPin: string;
  profeWhatsapp: string;
  mpLink: string;
}): Promise<ActionResult> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.config.update({
    where: { id: 1 },
    data: {
      classesPerCycle: input.classesPerCycle,
      swapsPerMonth: input.swapsPerMonth,
      paymentWindowStart: input.paymentWindowStart,
      paymentWindowEnd: input.paymentWindowEnd,
      cashFee: input.cashFee,
      mpFee: input.mpFee,
      lateFeePercent: input.lateFeePercent,
      announcementVisibleDays: input.announcementVisibleDays,
      defaultStudentPin: input.defaultStudentPin.trim() || "0000",
      profeWhatsapp: input.profeWhatsapp.trim().replace(/[^0-9]/g, "") || null,
      mpLink: input.mpLink.trim() || null,
    },
  });
  return { ok: true };
}

export async function setThemeAction(theme: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.config.update({ where: { id: 1 }, data: { theme } });
  return { ok: true };
}

export async function addSlotAction(): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const count = await prisma.slot.count();
  const id = "sl" + Date.now().toString().slice(-8);
  await prisma.slot.create({
    data: { id, weekdays: [], start: "09:00", end: "11:00", order: count },
  });
  return { ok: true };
}

export async function updateSlotAction(input: {
  id: string;
  start: string;
  end: string;
  weekdays: number[];
}): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.slot.update({
    where: { id: input.id },
    data: { start: input.start, end: input.end, weekdays: input.weekdays },
  });
  return { ok: true };
}

export async function removeSlotAction(id: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.slot.deleteMany({ where: { id } });
  return { ok: true };
}

"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { dateInputToUTC } from "@/lib/snapshot";
import type { ActionResult } from "@/lib/actions/auth";

async function requireProfe() {
  const session = await requireAdmin();
  if (!session || session.role !== "profe") return null;
  return session;
}

export async function addHolidayAction(input: {
  date: string;
  label?: string;
}): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  if (!input.date) return { error: "Elegí una fecha." };
  await prisma.holiday.upsert({
    where: { date: dateInputToUTC(input.date) },
    create: { date: dateInputToUTC(input.date), label: input.label?.trim() || null },
    update: { label: input.label?.trim() || null },
  });
  return { ok: true };
}

export async function removeHolidayAction(date: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.holiday.deleteMany({ where: { date: dateInputToUTC(date) } });
  return { ok: true };
}

export async function addActivityAction(input: {
  date: string;
  endDate?: string;
  title: string;
  description?: string;
}): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const title = input.title.trim();
  if (!input.date || !title) return { error: "Faltan datos." };
  const endDate = input.endDate && input.endDate >= input.date ? input.endDate : input.date;
  await prisma.activity.create({
    data: {
      startDate: dateInputToUTC(input.date),
      endDate: dateInputToUTC(endDate),
      title,
      description: input.description?.trim() || null,
    },
  });
  return { ok: true };
}

export async function removeActivityAction(id: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.activity.deleteMany({ where: { id } });
  return { ok: true };
}

export async function saveStudentInfoAction(message: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.config.update({ where: { id: 1 }, data: { studentInfo: message.trim() } });
  return { ok: true };
}

export async function addAnnouncementAction(message: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const trimmed = message.trim();
  if (!trimmed) return { error: "Escribí un mensaje." };
  await prisma.announcement.create({ data: { message: trimmed } });
  return { ok: true };
}

export async function removeAnnouncementAction(id: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.announcement.deleteMany({ where: { id } });
  return { ok: true };
}

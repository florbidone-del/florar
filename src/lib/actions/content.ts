"use server";

import { prisma } from "@/lib/prisma";
import { requireProfe, requireMainProfe } from "@/lib/authz";
import { dateInputToUTC } from "@/lib/snapshot";
import { todayISO } from "@/lib/domain";
import { uploadImageDataUrl, deleteBlobImage } from "@/lib/blobStorage";
import { deleteInteractionsFor } from "@/lib/postInteractionsData";
import type { ActionResult } from "@/lib/actions/auth";

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

type OfficialHoliday = { fecha: string; nombre: string };

/** Trae los feriados nacionales oficiales (api.argentinadatos.com) para uno o más años, más el
 *  25 de julio (fijo del taller, no está en la fuente oficial). Nunca pisa un feriado que ya
 *  esté cargado — así se puede apretar el botón de nuevo sin duplicar ni perder ediciones. */
export async function loadOfficialHolidaysAction(
  years: number[]
): Promise<ActionResult & { added?: number }> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };

  const toAdd: { date: string; label: string }[] = [];
  for (const year of years) {
    let data: OfficialHoliday[];
    try {
      const res = await fetch(`https://api.argentinadatos.com/v1/feriados/${year}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      data = await res.json();
    } catch {
      return { error: `No se pudo traer los feriados de ${year}. Probá de nuevo en un rato.` };
    }
    for (const h of data) {
      toAdd.push({ date: h.fecha, label: h.nombre });
    }
    toAdd.push({ date: `${year}-07-25`, label: "Feriado del taller" });
  }

  let added = 0;
  for (const h of toAdd) {
    const existing = await prisma.holiday.findUnique({ where: { date: dateInputToUTC(h.date) } });
    if (existing) continue;
    await prisma.holiday.create({ data: { date: dateInputToUTC(h.date), label: h.label } });
    added++;
  }
  return { ok: true, added };
}

const CLASS_CAP_LABEL = "Sin clases por ya haber tenido las 4 clases del mes";

/** Cancela automáticamente la 5ta clase del mes de cada día de la semana que la tenga (ej: si un
 *  mes tiene 5 martes, cancela el último) — así ningún turno da más de 4 clases por mes. Igual que
 *  los feriados oficiales, nunca pisa un día ya cargado, así que se puede apretar todos los años. */
export async function loadExtraClassCancellationsAction(
  years: number[]
): Promise<ActionResult & { added?: number }> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };

  const slots = await prisma.slot.findMany();
  const weekdaysWithClass = new Set(slots.flatMap((s) => s.weekdays));

  const toAdd: string[] = [];
  for (const year of years) {
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(year, month, 0).getDate();
      const datesByWeekday = new Map<number, string[]>();
      for (let day = 1; day <= daysInMonth; day++) {
        const weekday = new Date(year, month - 1, day).getDay();
        if (!weekdaysWithClass.has(weekday)) continue;
        const dateISO = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const list = datesByWeekday.get(weekday) || [];
        list.push(dateISO);
        datesByWeekday.set(weekday, list);
      }
      for (const dates of datesByWeekday.values()) {
        if (dates.length >= 5) toAdd.push(dates[4]);
      }
    }
  }

  // No reescribe el pasado: una clase que ya se dio, se dio — esto es para lo que falta de acá
  // en adelante, no para "corregir" retroactivamente meses que ya pasaron.
  const today = todayISO();
  const futureOnly = toAdd.filter((dateISO) => dateISO >= today);

  let added = 0;
  for (const dateISO of futureOnly) {
    const existing = await prisma.holiday.findUnique({ where: { date: dateInputToUTC(dateISO) } });
    if (existing) continue;
    await prisma.holiday.create({ data: { date: dateInputToUTC(dateISO), label: CLASS_CAP_LABEL } });
    added++;
  }
  return { ok: true, added };
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

export async function updateActivityAction(input: {
  id: string;
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
  await prisma.activity.update({
    where: { id: input.id },
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

/** `turno` en null es un aviso para todos los alumnos; si se pasa, solo lo ven los de ese
 *  día+horario fijo puntual (el mismo turno que usa el chat). */
export async function addAnnouncementAction(
  message: string,
  turno?: { weekday: number; slotId: string } | null
): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const trimmed = message.trim();
  if (!trimmed) return { error: "Escribí un mensaje." };
  await prisma.announcement.create({
    data: {
      message: trimmed,
      authorUsername: session.username,
      weekday: turno?.weekday ?? null,
      slotId: turno?.slotId ?? null,
    },
  });
  return { ok: true };
}

export async function removeAnnouncementAction(id: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.announcement.deleteMany({ where: { id } });
  return { ok: true };
}

/** Post de CeramiBlog: texto (con links) y, opcionalmente, una foto — se sube a Vercel Blob y en
 *  la base solo queda guardado el link, para no inflar la base de datos con el archivo entero. */
export async function addBlogPostAction(input: {
  title?: string;
  body: string;
  imageData?: string | null;
}): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const body = input.body.trim();
  if (!body && !input.imageData) return { error: "Escribí algo o subí una foto." };

  let imageUrl: string | null = null;
  if (input.imageData) {
    try {
      imageUrl = await uploadImageDataUrl(input.imageData, "ceramiblog");
    } catch {
      return { error: "No se pudo subir la foto. Probá de nuevo." };
    }
  }

  await prisma.blogPost.create({
    data: {
      title: input.title?.trim() || null,
      body,
      imageData: imageUrl,
      authorUsername: session.username,
    },
  });
  return { ok: true };
}

export async function removeBlogPostAction(id: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const post = await prisma.blogPost.findUnique({ where: { id }, select: { imageData: true } });
  await deleteBlobImage(post?.imageData);
  await deleteInteractionsFor("blog", id);
  await prisma.blogPost.deleteMany({ where: { id } });
  return { ok: true };
}

/** Borra la foto (no el texto ni la fecha) de los posts de CeramiBlog y bitácoras anteriores a
 *  `before` — para liberar espacio después de exportarlas a un .zip. Borra también el archivo de
 *  Vercel Blob, no solo la referencia en la base. */
export async function clearOldImagesAction(before: string): Promise<ActionResult & { cleared?: number }> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };
  if (!before) return { error: "Elegí una fecha límite." };
  const beforeDate = new Date(`${before}T23:59:59.999Z`);

  const [oldBlogs, oldPosts] = await Promise.all([
    prisma.blogPost.findMany({
      where: { imageData: { not: null }, createdAt: { lt: beforeDate } },
      select: { id: true, imageData: true },
    }),
    prisma.studentPost.findMany({
      where: { imageData: { not: null }, createdAt: { lt: beforeDate } },
      select: { id: true, imageData: true },
    }),
  ]);

  await Promise.all([...oldBlogs, ...oldPosts].map((p) => deleteBlobImage(p.imageData)));

  const [blogResult, postResult] = await Promise.all([
    prisma.blogPost.updateMany({
      where: { id: { in: oldBlogs.map((p) => p.id) } },
      data: { imageData: null },
    }),
    prisma.studentPost.updateMany({
      where: { id: { in: oldPosts.map((p) => p.id) } },
      data: { imageData: null },
    }),
  ]);
  return { ok: true, cleared: blogResult.count + postResult.count };
}

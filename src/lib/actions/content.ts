"use server";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProfe, requireMainProfe } from "@/lib/authz";
import { dateInputToUTC } from "@/lib/snapshot";
import { todayISO } from "@/lib/domain";
import { uploadPostImages, deleteBlobImage } from "@/lib/blobStorage";
import { MAX_POST_IMAGES } from "@/lib/postImages";
import { deleteInteractionsFor } from "@/lib/postInteractionsData";
import { notifyNewBlogPost } from "@/lib/push";
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
  await applyMonthlyClassCap([Number(input.date.slice(0, 4))]);
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
  await applyMonthlyClassCap(years);
  return { ok: true, added };
}

const CLASS_CAP_LABEL = "Sin clases por ya haber tenido las 4 clases del mes";

/** Asegura que ningún turno dé más de 4 clases por mes cuando un mes tiene 5 veces el mismo día
 *  de la semana. Cada feriado no-tope "debe" una clase (se reprograma gratis), así que también
 *  cuenta para el total: 4 días reales + 1 feriado reprogramado = 5 clases. Por eso, si el mes
 *  tiene 5 lunes:
 *  - sin feriados → se cancela el último lunes (tope nuevo);
 *  - con un feriado → ese feriado pasa a ser "tope": sigue mostrando su nombre, pero ya no se
 *    reprograma (con los 4 lunes reales ya están las 4 clases).
 *  Nunca borra ni renombra días ya cargados, así que se puede apretar las veces que haga falta. */
export async function loadExtraClassCancellationsAction(
  years: number[]
): Promise<ActionResult & { added?: number }> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };
  const added = await applyMonthlyClassCap(years);
  return { ok: true, added };
}

/** Lógica del tope de 4 clases (ver loadExtraClassCancellationsAction). Corre sola cada vez que se
 *  carga un feriado, para que nunca quede un mes con 5 clases sin que la profe tenga que acordarse.
 *  No corre al borrar un día: si la profe borra un tope a mano es porque quiere dar esa clase. */
async function applyMonthlyClassCap(years: number[]): Promise<number> {
  const slots = await prisma.slot.findMany();
  const weekdaysWithClass = new Set(slots.flatMap((s) => s.weekdays));
  const existingHolidays = await prisma.holiday.findMany();
  const holidayByDate = new Map(
    existingHolidays.map((h) => [h.date.toISOString().slice(0, 10), h])
  );

  const toAdd: string[] = [];
  const toCap: string[] = [];
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
        // Clases que el turno da ese mes: cada día que no sea tope, sea normal o un feriado que
        // se reprograma. Lo que pase de 4 hay que recortarlo.
        let excess = dates.filter((d) => !holidayByDate.get(d)?.capped).length - 4;
        if (excess <= 0) continue;
        // Primero se recortan feriados (empezando por el último): así nadie pierde un día real
        // de clase, solo deja de tener la reprogramación gratis de ese feriado.
        const reschedulable = dates.filter((d) => {
          const h = holidayByDate.get(d);
          return h && !h.capped;
        });
        for (const d of reschedulable.reverse()) {
          if (excess <= 0) break;
          toCap.push(d);
          excess--;
        }
        // Si no alcanzó con los feriados, se cancelan los últimos días normales del mes.
        const normal = dates.filter((d) => !holidayByDate.has(d));
        for (const d of normal.reverse()) {
          if (excess <= 0) break;
          toAdd.push(d);
          excess--;
        }
      }
    }
  }

  // No reescribe el pasado: una clase que ya se dio, se dio — esto es para lo que falta de acá
  // en adelante, no para "corregir" retroactivamente meses que ya pasaron.
  const today = todayISO();

  let added = 0;
  for (const dateISO of toAdd.filter((d) => d >= today)) {
    const existing = await prisma.holiday.findUnique({ where: { date: dateInputToUTC(dateISO) } });
    if (existing) continue;
    await prisma.holiday.create({
      data: { date: dateInputToUTC(dateISO), label: CLASS_CAP_LABEL, capped: true },
    });
    added++;
  }
  for (const dateISO of toCap.filter((d) => d >= today)) {
    await prisma.holiday.update({
      where: { date: dateInputToUTC(dateISO) },
      data: { capped: true },
    });
    added++;
  }
  return added;
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

/** Post de CeramiBlog: texto (con links) y, opcionalmente, hasta 3 fotos — se suben a Vercel Blob y
 *  en la base solo quedan guardados los links, para no inflarla con los archivos enteros. */
export async function addBlogPostAction(input: {
  title?: string;
  body: string;
  images?: string[];
}): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const body = input.body.trim();
  const images = input.images ?? [];
  if (!body && images.length === 0) return { error: "Escribí algo o subí una foto." };
  if (images.length > MAX_POST_IMAGES) return { error: `Podés subir hasta ${MAX_POST_IMAGES} fotos.` };

  let imageUrls: string[];
  try {
    imageUrls = await uploadPostImages(images, "ceramiblog");
  } catch (err) {
    console.error("[addBlogPostAction] Falló la subida a Blob:", err);
    return { error: "No se pudieron subir las fotos. Probá de nuevo." };
  }

  await prisma.blogPost.create({
    data: {
      title: input.title?.trim() || null,
      body,
      imageUrls,
      authorUsername: session.username,
    },
  });
  after(() =>
    notifyNewBlogPost({ authorUsername: session.username, title: input.title?.trim() || null, body }).catch(
      () => {}
    )
  );
  return { ok: true };
}

export async function removeBlogPostAction(id: string): Promise<ActionResult> {
  const session = await requireProfe();
  if (!session) return { error: "No autorizado." };
  const post = await prisma.blogPost.findUnique({ where: { id }, select: { imageUrls: true } });
  await Promise.all((post?.imageUrls ?? []).map(deleteBlobImage));
  await deleteInteractionsFor("blog", id);
  await prisma.blogPost.deleteMany({ where: { id } });
  return { ok: true };
}

/** Borra las fotos (no el texto ni la fecha) de los posts de CeramiBlog y bitácoras anteriores a
 *  `before` — para liberar espacio después de exportarlas a un .zip. Borra también el archivo de
 *  Vercel Blob, no solo la referencia en la base. */
export async function clearOldImagesAction(before: string): Promise<ActionResult & { cleared?: number }> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };
  if (!before) return { error: "Elegí una fecha límite." };
  const beforeDate = new Date(`${before}T23:59:59.999Z`);

  const [oldBlogs, oldPosts] = await Promise.all([
    prisma.blogPost.findMany({
      where: { imageUrls: { isEmpty: false }, createdAt: { lt: beforeDate } },
      select: { id: true, imageUrls: true },
    }),
    prisma.studentPost.findMany({
      where: { imageUrls: { isEmpty: false }, createdAt: { lt: beforeDate } },
      select: { id: true, imageUrls: true },
    }),
  ]);

  const oldUrls = [...oldBlogs, ...oldPosts].flatMap((p) => p.imageUrls);
  await Promise.all(oldUrls.map(deleteBlobImage));

  await Promise.all([
    prisma.blogPost.updateMany({
      where: { id: { in: oldBlogs.map((p) => p.id) } },
      data: { imageUrls: [] },
    }),
    prisma.studentPost.updateMany({
      where: { id: { in: oldPosts.map((p) => p.id) } },
      data: { imageUrls: [] },
    }),
  ]);
  return { ok: true, cleared: oldUrls.length };
}

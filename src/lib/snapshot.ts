import "server-only";
import { prisma } from "@/lib/prisma";
import type { WorkshopSnapshot, ConfigDTO } from "@/lib/domain";

function dOnly(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function dateInputToUTC(dateISO: string) {
  return new Date(`${dateISO}T00:00:00.000Z`);
}

const DEFAULT_CONFIG = {
  studioName: "Taller de Cerámica",
  capacity: 8,
  classesPerCycle: 4,
  swapsPerMonth: 1,
  paymentWindowStart: 1,
  paymentWindowEnd: 10,
  monthlyFee: 15000,
  mpLink: null as string | null,
  theme: "florar",
  defaultStudentPin: "0000",
  profeWhatsapp: null as string | null,
  announcementVisibleDays: 7,
  studentInfo: "",
};

const DEFAULT_SLOTS: { id: string; weekdays: number[]; start: string; end: string; order: number }[] = [
  { id: "w3", weekdays: [1], start: "15:30", end: "17:30", order: 0 },
  { id: "w1", weekdays: [5], start: "10:30", end: "12:30", order: 1 },
  { id: "w4", weekdays: [1, 2, 3, 4, 5], start: "18:00", end: "20:00", order: 2 },
  { id: "s0", weekdays: [6], start: "09:00", end: "11:00", order: 3 },
  { id: "s1", weekdays: [6], start: "11:00", end: "13:00", order: 4 },
  { id: "s2", weekdays: [6], start: "14:00", end: "16:00", order: 5 },
];

/** Crea la config y los turnos por defecto la primera vez que se corre la app contra una base vacía. */
export async function ensureBootstrapped() {
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  if (!config) {
    await prisma.config.create({ data: { id: 1, ...DEFAULT_CONFIG } });
  }
  const slotCount = await prisma.slot.count();
  if (slotCount === 0) {
    await prisma.slot.createMany({ data: DEFAULT_SLOTS });
  }
}

export async function loadConfig(): Promise<ConfigDTO> {
  await ensureBootstrapped();
  const [config, slots] = await Promise.all([
    prisma.config.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.slot.findMany({ orderBy: { start: "asc" } }),
  ]);
  return {
    studioName: config.studioName,
    capacity: config.capacity,
    classesPerCycle: config.classesPerCycle,
    swapsPerMonth: config.swapsPerMonth,
    paymentWindowStart: config.paymentWindowStart,
    paymentWindowEnd: config.paymentWindowEnd,
    monthlyFee: config.monthlyFee,
    mpLink: config.mpLink,
    theme: config.theme,
    defaultStudentPin: config.defaultStudentPin,
    profeWhatsapp: config.profeWhatsapp,
    announcementVisibleDays: config.announcementVisibleDays,
    studentInfo: config.studentInfo,
    slots: slots.map((s) => ({ id: s.id, weekdays: s.weekdays, start: s.start, end: s.end })),
  };
}

/** Carga todo lo necesario para calcular ocupación, calendarios y estado de pago. */
export async function loadWorkshopSnapshot(): Promise<WorkshopSnapshot> {
  const [config, holidays, students, scheduleChanges, payments, activities, slotAssignments, substitutions] =
    await Promise.all([
      loadConfig(),
      prisma.holiday.findMany(),
      prisma.student.findMany(),
      prisma.scheduleChange.findMany(),
      prisma.payment.findMany(),
      prisma.activity.findMany(),
      prisma.slotAssignment.findMany(),
      prisma.substitution.findMany(),
    ]);

  return {
    config,
    holidays: holidays.map((h) => ({ date: dOnly(h.date), label: h.label })),
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      pin: s.pin,
      defaultWeekday: s.defaultWeekday,
      defaultSlotId: s.defaultSlotId,
      feeOverride: s.feeOverride,
      mpLink: s.mpLink,
      theme: s.theme,
      createdAt: s.createdAt.toISOString(),
    })),
    scheduleChanges: scheduleChanges.map((c) => ({
      id: c.id,
      studentId: c.studentId,
      fromDate: dOnly(c.fromDate),
      fromSlotId: c.fromSlotId,
      toDate: dOnly(c.toDate),
      toSlotId: c.toSlotId,
      reason: c.reason,
      monthKey: c.monthKey,
    })),
    payments: payments.map((p) => ({
      studentId: p.studentId,
      monthKey: p.monthKey,
      amount: p.amount,
      status: p.status,
      source: p.source,
    })),
    activities: activities.map((a) => ({
      id: a.id,
      startDate: dOnly(a.startDate),
      endDate: dOnly(a.endDate),
      title: a.title,
      description: a.description,
    })),
    slotAssignments: slotAssignments.map((sa) => ({
      weekday: sa.weekday,
      slotId: sa.slotId,
      profeUsername: sa.profeUsername,
    })),
    substitutions: substitutions.map((s) => ({
      date: dOnly(s.date),
      slotId: s.slotId,
      profeUsername: s.profeUsername,
    })),
  };
}

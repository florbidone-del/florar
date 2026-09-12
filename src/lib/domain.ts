// Lógica de negocio pura, portada 1:1 desde taller-ceramica.html (funciones de fecha,
// turnos, ocupación y estado de clases). No toca la base de datos: opera sobre un
// "snapshot" de datos ya cargados, igual que el `state` del archivo original.

export const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
export const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function pad(n: number) {
  return n.toString().padStart(2, "0");
}
export function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayISO() {
  return isoDate(new Date());
}
export function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function daysSince(dateISO: string) {
  return Math.floor(
    (parseISO(todayISO()).getTime() - parseISO(dateISO).getTime()) / 86400000
  );
}
export function monthKeyOf(dateISO: string) {
  return dateISO.slice(0, 7);
}
export function currentMonthKey() {
  return monthKeyOf(todayISO());
}
export function fmtLong(dateISO: string) {
  const d = parseISO(dateISO);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
}
export function fmtShort(dateISO: string) {
  const d = parseISO(dateISO);
  return `${DIAS_CORTO[d.getDay()]} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
export function fmtMonthName(dateISO = todayISO()) {
  return MESES[parseISO(dateISO).getMonth()];
}
export function mondayOf(dateISO: string) {
  const d = parseISO(dateISO);
  const wd = d.getDay();
  const diff = wd === 0 ? -6 : 1 - wd;
  d.setDate(d.getDate() + diff);
  return isoDate(d);
}
export function addDays(dateISO: string, n: number) {
  const d = parseISO(dateISO);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
export function money(n: number | null | undefined) {
  return "$" + Number(n || 0).toLocaleString("es-AR");
}
export function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
export function occurrencesInMonth(weekday: number, monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const dates: string[] = [];
  const d = new Date(y, m - 1, 1);
  while (d.getMonth() === m - 1) {
    if (d.getDay() === weekday) dates.push(isoDate(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}
export function nextDateForWeekday(weekday: number) {
  const d = new Date();
  for (let i = 0; i < 7; i++) {
    if (d.getDay() === weekday) return isoDate(d);
    d.setDate(d.getDate() + 1);
  }
  return isoDate(d);
}

// ---------- tipos del snapshot ----------
export type SlotDTO = {
  id: string;
  type: "weekday" | "saturday";
  start: string;
  end: string;
};
export type ConfigDTO = {
  studioName: string;
  capacity: number;
  classesPerCycle: number;
  swapsPerMonth: number;
  paymentWindowStart: number;
  paymentWindowEnd: number;
  monthlyFee: number;
  mpLink: string | null;
  theme: string;
  defaultStudentPin: string;
  profeWhatsapp: string | null;
  announcementVisibleDays: number;
  studentInfo: string;
  slotsWeekday: SlotDTO[];
  slotsSaturday: SlotDTO[];
};
export type HolidayDTO = { date: string; label: string | null };
export type StudentDTO = {
  id: string;
  name: string;
  pin: string;
  defaultWeekday: number;
  defaultSlotId: string;
  feeOverride: number | null;
  mpLink: string | null;
  createdAt: string;
};
export type ScheduleChangeDTO = {
  id: string;
  studentId: string;
  fromDate: string;
  fromSlotId: string;
  toDate: string;
  toSlotId: string;
  reason: "cambio" | "feriado";
  monthKey: string;
};
export type PaymentDTO = {
  studentId: string;
  monthKey: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  source: "manual" | "mercadopago";
};
export type ActivityDTO = {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  description: string | null;
};
export type AnnouncementDTO = { id: string; message: string; createdAt: string };
export type SlotAssignmentDTO = {
  weekday: number;
  slotId: string;
  profeUsername: string;
};
export type SubstitutionDTO = {
  date: string;
  slotId: string;
  profeUsername: string;
};

export type WorkshopSnapshot = {
  config: ConfigDTO;
  holidays: HolidayDTO[];
  students: StudentDTO[];
  scheduleChanges: ScheduleChangeDTO[];
  payments: PaymentDTO[];
  activities: ActivityDTO[];
  slotAssignments: SlotAssignmentDTO[];
  substitutions: SubstitutionDTO[];
};

// ---------- lógica de turnos y ocupación ----------
export function isHoliday(snap: WorkshopSnapshot, dateISO: string) {
  return snap.holidays.find((h) => h.date === dateISO) || null;
}
export function activityForDate(snap: WorkshopSnapshot, dateISO: string) {
  return (
    snap.activities.find(
      (a) => dateISO >= a.startDate && dateISO <= (a.endDate || a.startDate)
    ) || null
  );
}
export function slotAssignmentKey(weekday: number, slotId: string) {
  return `${weekday}_${slotId}`;
}
export function profeForSlot(
  snap: WorkshopSnapshot,
  weekday: number,
  slotId: string
) {
  const found = snap.slotAssignments.find(
    (sa) => sa.weekday === weekday && sa.slotId === slotId
  );
  return found ? found.profeUsername : null;
}
export function profeForDateSlot(
  snap: WorkshopSnapshot,
  dateISO: string,
  slotId: string
) {
  const sub = snap.substitutions.find(
    (s) => s.date === dateISO && s.slotId === slotId
  );
  if (sub) return sub.profeUsername;
  return profeForSlot(snap, parseISO(dateISO).getDay(), slotId);
}
export function slotsForDate(snap: WorkshopSnapshot, dateISO: string) {
  const wd = parseISO(dateISO).getDay();
  if (wd === 0) return [] as SlotDTO[];
  if (wd === 6) return snap.config.slotsSaturday;
  return snap.config.slotsWeekday;
}
export function slotsForWeekday(snap: WorkshopSnapshot, wd: number) {
  if (wd === 0) return [] as SlotDTO[];
  if (wd === 6) return snap.config.slotsSaturday;
  return snap.config.slotsWeekday;
}
export function slotById(snap: WorkshopSnapshot, dateISO: string, slotId: string) {
  return slotsForDate(snap, dateISO).find((s) => s.id === slotId) || null;
}
export function slotStartDateTime(
  snap: WorkshopSnapshot,
  dateISO: string,
  slotId: string
) {
  const slot = slotById(snap, dateISO, slotId);
  if (!slot) return null;
  const [h, m] = slot.start.split(":").map(Number);
  const d = parseISO(dateISO);
  d.setHours(h, m, 0, 0);
  return d;
}
export function hoursUntil(
  snap: WorkshopSnapshot,
  dateISO: string,
  slotId: string
) {
  const dt = slotStartDateTime(snap, dateISO, slotId);
  if (!dt) return -999;
  return (dt.getTime() - Date.now()) / 3600000;
}

/** Nombres anotados en una fecha+turno: turno fijo semanal (si no está cancelado ese día) + cambios puntuales hacia ese día. */
export function slotOccupancy(
  snap: WorkshopSnapshot,
  dateISO: string,
  slotId: string,
  excludeStudentId?: string
) {
  const names: string[] = [];
  const wd = parseISO(dateISO).getDay();
  for (const s of snap.students) {
    if (s.id === excludeStudentId) continue;
    if (s.defaultWeekday === wd && s.defaultSlotId === slotId) {
      const cancelled = snap.scheduleChanges.some(
        (c) => c.studentId === s.id && c.fromDate === dateISO
      );
      if (!cancelled) names.push(s.name);
    }
  }
  for (const c of snap.scheduleChanges) {
    if (c.studentId === excludeStudentId) continue;
    if (c.toDate === dateISO && c.toSlotId === slotId) {
      const student = snap.students.find((s) => s.id === c.studentId);
      names.push(student?.name || "?");
    }
  }
  return names;
}
export function weekdayOccupancyCount(
  snap: WorkshopSnapshot,
  weekday: number,
  slotId: string,
  excludeStudentId?: string
) {
  return slotOccupancy(
    snap,
    nextDateForWeekday(weekday),
    slotId,
    excludeStudentId
  ).length;
}
export function dayAvailability(
  snap: WorkshopSnapshot,
  dateISO: string
): "holiday" | "closed" | "available" | "full" {
  if (isHoliday(snap, dateISO)) return "holiday";
  const slots = slotsForDate(snap, dateISO);
  if (!slots.length) return "closed";
  const anyRoom = slots.some(
    (s) => slotOccupancy(snap, dateISO, s.id).length < snap.config.capacity
  );
  return anyRoom ? "available" : "full";
}

export type SessionRow = {
  date: string;
  slotId: string;
  status:
    | "moved-holiday"
    | "moved-swap"
    | "pending-holiday"
    | "confirmed"
    | "rescheduled";
  movedTo?: { date: string; slotId: string };
  from?: string;
};

/** Todas las clases del alumno en el mes actual (fijas + reprogramadas), con su estado. */
export function studentSessionsThisMonth(
  snap: WorkshopSnapshot,
  studentId: string
): SessionRow[] {
  const s = snap.students.find((st) => st.id === studentId);
  if (!s) return [];
  const mk = currentMonthKey();
  const dates = occurrencesInMonth(s.defaultWeekday, mk);
  const rows: SessionRow[] = [];
  dates.forEach((date) => {
    const change = snap.scheduleChanges.find(
      (c) => c.studentId === studentId && c.fromDate === date
    );
    if (change) {
      rows.push({
        date,
        slotId: s.defaultSlotId,
        status: change.reason === "feriado" ? "moved-holiday" : "moved-swap",
        movedTo: { date: change.toDate, slotId: change.toSlotId },
      });
    } else if (isHoliday(snap, date)) {
      rows.push({ date, slotId: s.defaultSlotId, status: "pending-holiday" });
    } else {
      rows.push({ date, slotId: s.defaultSlotId, status: "confirmed" });
    }
  });
  snap.scheduleChanges
    .filter((c) => c.studentId === studentId && monthKeyOf(c.toDate) === mk)
    .forEach((c) => {
      rows.push({
        date: c.toDate,
        slotId: c.toSlotId,
        status: "rescheduled",
        from: c.fromDate,
      });
    });
  rows.sort((a, b) => a.date.localeCompare(b.date) || a.slotId.localeCompare(b.slotId));
  return rows;
}

export function swapsUsedThisMonth(snap: WorkshopSnapshot, studentId: string) {
  const mk = currentMonthKey();
  return snap.scheduleChanges.filter(
    (c) =>
      c.studentId === studentId && c.reason === "cambio" && c.monthKey === mk
  ).length;
}
export function studentFee(snap: WorkshopSnapshot, studentId: string) {
  const s = snap.students.find((st) => st.id === studentId);
  if (!s) return snap.config.monthlyFee;
  return s.feeOverride !== null && s.feeOverride !== undefined
    ? s.feeOverride
    : snap.config.monthlyFee;
}
export function isUnpaid(snap: WorkshopSnapshot, studentId: string) {
  const mk = currentMonthKey();
  const payment = snap.payments.find(
    (p) => p.studentId === studentId && p.monthKey === mk
  );
  return !(payment && payment.status === "approved");
}
export function withinPaymentWindow(snap: WorkshopSnapshot) {
  const day = new Date().getDate();
  return (
    day >= snap.config.paymentWindowStart && day <= snap.config.paymentWindowEnd
  );
}
export function profeAccountsUsernames(admins: { username: string; role: string }[]) {
  return admins.filter((a) => a.role === "profe").map((a) => a.username);
}

export function passwordIssues(pw: string): string | null {
  if (pw.length < 6) return "Mínimo 6 caracteres.";
  if (!/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) return "Combiná letras y números.";
  return null;
}

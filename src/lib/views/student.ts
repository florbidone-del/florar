import "server-only";
import { prisma } from "@/lib/prisma";
import {
  DIAS,
  activityForDate,
  capitalize,
  currentMonthKey,
  daysSince,
  dayAvailability,
  fmtShort,
  isHoliday,
  isoDate,
  isUnpaid,
  money,
  parseISO,
  profeForDateSlot,
  profeForSlot,
  slotOccupancy,
  slotsForDate,
  studentFee,
  studentSessionsThisMonth,
  swapsUsedThisMonth,
  todayISO,
  isPastPaymentWindow,
  withinPaymentWindow,
  fmtMonthName,
  type WorkshopSnapshot,
  type SessionRow,
} from "@/lib/domain";

export type CalendarDaySlot = { id: string; start: string; end: string; occ: number };
export type CalendarDay = {
  date: string;
  day: number;
  weekday: number;
  generalStatus: "closed" | "holiday" | "available" | "full";
  own: (SessionRow & { start: string; end: string; profeName: string | null }) | null;
  activity: { title: string; description: string | null; range: string } | null;
  holiday: { label: string | null } | null;
  slots: CalendarDaySlot[];
};

export type StudentPanelData = {
  studioName: string;
  theme: string;
  tutorialSeen: boolean;
  studentId: string;
  studentName: string;
  firstName: string;
  defaultWeekdayLabel: string;
  defaultSlot: { start: string; end: string } | null;
  profeName: string | null;
  confirmedCount: number;
  swapsLeft: number;
  capacity: number;
  payment: {
    unpaid: boolean;
    fee: string;
    mpLink: string | null;
    withinWindow: boolean;
    isLate: boolean;
    lateFeePercent: number;
    paymentWindowStart: number;
    paymentWindowEnd: number;
    monthName: string;
  };
  studentInfo: string;
  announcements: { id: string; date: string; message: string }[];
  activitiesThisMonth: { title: string; description: string | null; range: string }[];
  calendar: CalendarDay[];
  leadingBlanks: number;
  todayISO: string;
};

export async function buildStudentPanelData(
  snap: WorkshopSnapshot,
  studentId: string
): Promise<StudentPanelData | null> {
  const student = snap.students.find((s) => s.id === studentId);
  if (!student) return null;

  const sessions = studentSessionsThisMonth(snap, studentId);
  const ownByDate = new Map(sessions.map((r) => [r.date, r]));
  const confirmedCount = sessions.filter((r) =>
    ["confirmed", "rescheduled", "moved-swap", "moved-holiday"].includes(r.status)
  ).length;
  const swapsLeft = snap.config.swapsPerMonth - swapsUsedThisMonth(snap, studentId);
  const defaultSlot = snap.config.slots.find((s) => s.id === student.defaultSlotId) || null;
  const profeName = capitalize(profeForSlot(snap, student.defaultWeekday, student.defaultSlotId));

  const today = todayISO();
  const mk = currentMonthKey();
  const [y, m] = mk.split("-").map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const monthStart = `${mk}-01`;
  const monthEnd = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
  const activitiesThisMonth = snap.activities
    .filter((a) => a.startDate <= monthEnd && a.endDate >= monthStart)
    .map((a) => ({
      title: a.title,
      description: a.description,
      range: a.endDate !== a.startDate ? `${fmtShort(a.startDate)} — ${fmtShort(a.endDate)}` : fmtShort(a.startDate),
    }));

  const calendar: CalendarDay[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekday = parseISO(date).getDay();
    const own = ownByDate.get(date) || null;
    const holiday = isHoliday(snap, date);
    const activity = activityForDate(snap, date);
    const slotsToday = slotsForDate(snap, date);
    const slotsInfo: CalendarDaySlot[] = slotsToday.map((s) => ({
      id: s.id,
      start: s.start,
      end: s.end,
      occ: slotOccupancy(snap, date, s.id).length,
    }));

    const generalStatus: CalendarDay["generalStatus"] =
      weekday === 0 ? "closed" : dayAvailability(snap, date);

    let ownAugmented: CalendarDay["own"] = null;
    if (own) {
      const slot = slotsForDate(snap, date).find((s) => s.id === own.slotId);
      ownAugmented = {
        ...own,
        start: slot?.start || "",
        end: slot?.end || "",
        profeName: capitalize(profeForDateSlot(snap, date, own.slotId)),
      };
    }

    calendar.push({
      date,
      day,
      weekday,
      generalStatus,
      own: ownAugmented,
      activity: activity
        ? {
            title: activity.title,
            description: activity.description,
            range:
              activity.endDate && activity.endDate !== activity.startDate
                ? `${fmtShort(activity.startDate)} — ${fmtShort(activity.endDate)}`
                : "",
          }
        : null,
      holiday: holiday ? { label: holiday.label } : null,
      slots: slotsInfo,
    });
  }

  const allAnnouncements = await prisma.announcement.findMany({
    orderBy: { createdAt: "asc" },
  });
  const announcements = allAnnouncements
    .map((a) => ({ id: a.id, date: isoDate(a.createdAt), message: a.message }))
    .filter((a) => daysSince(a.date) <= snap.config.announcementVisibleDays)
    .slice(-8)
    .reverse();

  return {
    studioName: snap.config.studioName,
    theme: student.theme || snap.config.theme,
    tutorialSeen: student.tutorialSeen,
    studentId: student.id,
    studentName: student.name,
    firstName: student.name.split(" ")[0],
    defaultWeekdayLabel: DIAS[student.defaultWeekday],
    defaultSlot: defaultSlot ? { start: defaultSlot.start, end: defaultSlot.end } : null,
    profeName,
    confirmedCount,
    swapsLeft,
    capacity: snap.config.capacity,
    payment: {
      unpaid: isUnpaid(snap, studentId),
      fee: money(studentFee(snap, studentId)),
      mpLink: student.mpLink || snap.config.mpLink,
      withinWindow: withinPaymentWindow(snap),
      isLate: isPastPaymentWindow(snap),
      lateFeePercent: snap.config.lateFeePercent,
      paymentWindowStart: snap.config.paymentWindowStart,
      paymentWindowEnd: snap.config.paymentWindowEnd,
      monthName: fmtMonthName(),
    },
    studentInfo: snap.config.studentInfo,
    announcements,
    activitiesThisMonth,
    calendar,
    leadingBlanks,
    todayISO: today,
  };
}

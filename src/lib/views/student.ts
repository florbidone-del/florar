import "server-only";
import { prisma } from "@/lib/prisma";
import {
  DIAS,
  activityForDate,
  capacityForSlot,
  capitalize,
  currentMonthKey,
  daysSince,
  dayAvailability,
  fmtShort,
  isHoliday,
  isoDate,
  isUnpaid,
  paidAmountThisMonth,
  extraClassCreditsAvailable,
  extraClassPurchasesPending,
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
  type WorkshopSnapshot,
  type SessionRow,
} from "@/lib/domain";
import { loadInteractions, visibleLikeCount, type CommentDTO } from "@/lib/postInteractionsData";

export type CalendarDaySlot = { id: string; start: string; end: string; occ: number; capacity: number };
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
  mustChangePin: boolean;
  studentId: string;
  studentName: string;
  firstName: string;
  nick: string | null;
  defaultWeekday: number;
  defaultWeekdayLabel: string;
  defaultSlotId: string;
  defaultSlot: { start: string; end: string } | null;
  profeName: string | null;
  totalClasses: number;
  pendingHolidays: number;
  swapsLeft: number;
  payment: {
    unpaid: boolean;
    isPartial: boolean;
    paidAmount: string;
    cashFee: string;
    remainingCash: string;
    mpFee: string;
    remainingMp: string;
    mpLink: string | null;
    isLate: boolean;
    lateFeePercent: number;
  };
  extraClass: {
    feeAmount: string;
    availableCount: number;
    nextPurchaseId: string | null;
    pendingCount: number;
  };
  studentInfo: string;
  announcements: { id: string; date: string; message: string; authorName: string | null }[];
  blogPosts: {
    id: string;
    title: string | null;
    body: string;
    imageData: string | null;
    date: string;
    authorName: string | null;
    featured: boolean;
    studentAuthorName: string | null;
    likedByMe: boolean;
    likeCount: number | null;
    comments: CommentDTO[];
  }[];
  myPosts: {
    id: string;
    title: string | null;
    body: string;
    imageData: string | null;
    date: string;
    isPublic: boolean;
    likedByMe: boolean;
    likeCount: number | null;
    comments: CommentDTO[];
  }[];
  communityPosts: {
    id: string;
    studentName: string;
    title: string | null;
    body: string;
    imageData: string | null;
    date: string;
    likedByMe: boolean;
    likeCount: number | null;
    comments: CommentDTO[];
  }[];
  activitiesThisMonth: { title: string; description: string | null; range: string }[];
  calendar: CalendarDay[];
  leadingBlanks: number;
  todayISO: string;
  unread: { avisos: boolean; chat: boolean; blog: boolean };
};

export async function buildStudentPanelData(
  snap: WorkshopSnapshot,
  studentId: string
): Promise<StudentPanelData | null> {
  const student = snap.students.find((s) => s.id === studentId);
  if (!student) return null;

  const sessions = studentSessionsThisMonth(snap, studentId);
  const ownByDate = new Map(sessions.map((r) => [r.date, r]));
  // "moved-holiday"/"moved-swap" son la fecha ORIGINAL que se vació: la clase real ya
  // está contada por su fila "rescheduled" en la fecha destino. Sumar ambas duplica la clase.
  const totalClasses = sessions.filter((r) =>
    ["confirmed", "rescheduled", "pending-holiday", "extra"].includes(r.status)
  ).length;
  const pendingHolidays = sessions.filter((r) => r.status === "pending-holiday").length;
  const swapsLeft = snap.config.swapsPerMonth - swapsUsedThisMonth(snap, studentId);
  const defaultSlot = snap.config.slots.find((s) => s.id === student.defaultSlotId) || null;
  const profeName = capitalize(profeForSlot(snap, student.defaultWeekday, student.defaultSlotId));
  const paidThisMonth = paidAmountThisMonth(snap, studentId);
  const extraCredits = extraClassCreditsAvailable(snap, studentId);
  const extraPending = extraClassPurchasesPending(snap, studentId);

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
      capacity: capacityForSlot(snap, weekday, s.id),
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

  const [allAnnouncements, allBlogPosts, admins, allStudentPosts, seenAt, latestChatMsg] =
    await Promise.all([
      prisma.announcement.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.admin.findMany({ select: { username: true, displayName: true } }),
      prisma.studentPost.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.student.findUnique({
        where: { id: studentId },
        select: { avisosSeenAt: true, chatSeenAt: true, blogSeenAt: true },
      }),
      prisma.chatMessage.findFirst({
        // authorStudentId es null en los mensajes de las profes — "NOT: { authorStudentId: studentId }"
        // los excluye a todos (NULL != studentId no es TRUE en SQL), por eso se arma como OR explícito.
        where: {
          weekday: student.defaultWeekday,
          slotId: student.defaultSlotId,
          OR: [{ authorStudentId: null }, { authorStudentId: { not: studentId } }],
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);
  // Nombre a mostrar para cada profe: su nick si se puso uno, si no el usuario con mayúscula.
  const authorNameByUsername = new Map(
    admins.map((a) => [a.username, a.displayName || capitalize(a.username)])
  );
  // Un aviso con turno cargado (weekday+slotId) solo es para los alumnos de ese turno puntual;
  // sin turno cargado, es para todos.
  const forMyTurno = (a: { weekday: number | null; slotId: string | null }) =>
    a.weekday === null || (a.weekday === student.defaultWeekday && a.slotId === student.defaultSlotId);
  const announcements = allAnnouncements
    .filter(forMyTurno)
    .map((a) => ({
      id: a.id,
      date: isoDate(a.createdAt),
      message: a.message,
      authorName: a.authorUsername ? authorNameByUsername.get(a.authorUsername) || null : null,
    }))
    .filter((a) => daysSince(a.date) <= snap.config.announcementVisibleDays)
    .slice(-8)
    .reverse();
  const latestVisibleAvisoAt = allAnnouncements
    .filter(forMyTurno)
    .filter((a) => daysSince(isoDate(a.createdAt)) <= snap.config.announcementVisibleDays)
    .at(-1)?.createdAt;

  const viewerKey = `student:${studentId}`;
  const [blogInteractions, studentPostInteractions] = await Promise.all([
    loadInteractions("blog", allBlogPosts.map((p) => p.id), viewerKey, false),
    loadInteractions("studentpost", allStudentPosts.map((p) => p.id), viewerKey, false),
  ]);
  const unread = {
    avisos: !!latestVisibleAvisoAt && (!seenAt?.avisosSeenAt || seenAt.avisosSeenAt < latestVisibleAvisoAt),
    chat: !!latestChatMsg && (!seenAt?.chatSeenAt || seenAt.chatSeenAt < latestChatMsg.createdAt),
    blog: !!allBlogPosts[0] && (!seenAt?.blogSeenAt || seenAt.blogSeenAt < allBlogPosts[0].createdAt),
  };
  const blogPosts = allBlogPosts.map((p) => {
    const interaction = blogInteractions.get(p.id)!;
    const isOwner = !!p.authorUsername && `admin:${p.authorUsername}` === viewerKey;
    return {
      id: p.id,
      title: p.title,
      body: p.body,
      imageData: p.imageData,
      date: isoDate(p.createdAt),
      authorName: p.authorUsername ? authorNameByUsername.get(p.authorUsername) || null : null,
      featured: p.featured,
      studentAuthorName: p.studentAuthorName,
      likedByMe: interaction.likedByMe,
      likeCount: visibleLikeCount(interaction, isOwner, false),
      comments: interaction.comments,
    };
  });
  const myPosts = allStudentPosts
    .filter((p) => p.studentId === studentId)
    .map((p) => {
      const interaction = studentPostInteractions.get(p.id)!;
      return {
        id: p.id,
        title: p.title,
        body: p.body,
        imageData: p.imageData,
        date: isoDate(p.createdAt),
        isPublic: p.isPublic,
        likedByMe: interaction.likedByMe,
        likeCount: visibleLikeCount(interaction, true, false),
        comments: interaction.comments,
      };
    });
  const communityPosts = allStudentPosts
    .filter((p) => p.isPublic && p.studentId !== studentId)
    .map((p) => {
      const interaction = studentPostInteractions.get(p.id)!;
      return {
        id: p.id,
        studentName: snap.students.find((s) => s.id === p.studentId)?.name || "?",
        title: p.title,
        body: p.body,
        imageData: p.imageData,
        date: isoDate(p.createdAt),
        likedByMe: interaction.likedByMe,
        likeCount: visibleLikeCount(interaction, false, false),
        comments: interaction.comments,
      };
    });

  return {
    studioName: snap.config.studioName,
    theme: student.theme || snap.config.theme,
    tutorialSeen: student.tutorialSeen,
    mustChangePin: student.mustChangePin,
    studentId: student.id,
    studentName: student.name,
    firstName: student.name.split(" ")[0],
    nick: student.nick,
    defaultWeekday: student.defaultWeekday,
    defaultWeekdayLabel: DIAS[student.defaultWeekday],
    defaultSlotId: student.defaultSlotId,
    defaultSlot: defaultSlot ? { start: defaultSlot.start, end: defaultSlot.end } : null,
    profeName,
    totalClasses,
    pendingHolidays,
    swapsLeft,
    payment: {
      unpaid: isUnpaid(snap, studentId),
      isPartial: paidThisMonth > 0 && paidThisMonth < studentFee(snap),
      paidAmount: money(paidThisMonth),
      cashFee: money(studentFee(snap, "cash")),
      remainingCash: money(Math.max(0, studentFee(snap, "cash") - paidThisMonth)),
      mpFee: money(studentFee(snap, "mp")),
      remainingMp: money(Math.max(0, studentFee(snap, "mp") - paidThisMonth)),
      mpLink: snap.config.mpLink,
      isLate: isPastPaymentWindow(snap),
      lateFeePercent: snap.config.lateFeePercent,
    },
    extraClass: {
      feeAmount: money(snap.config.extraClassFee),
      availableCount: extraCredits.length,
      nextPurchaseId: extraCredits[0]?.id || null,
      pendingCount: extraPending.length,
    },
    studentInfo: snap.config.studentInfo,
    announcements,
    blogPosts,
    myPosts,
    communityPosts,
    activitiesThisMonth,
    calendar,
    leadingBlanks,
    todayISO: today,
    unread,
  };
}

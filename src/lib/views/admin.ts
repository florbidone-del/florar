import "server-only";
import { prisma } from "@/lib/prisma";
import { loadWorkshopSnapshot } from "@/lib/snapshot";
import { isoDate, capitalize, DIAS, type WorkshopSnapshot } from "@/lib/domain";
import { loadInteractions, visibleLikeCount, type CommentDTO } from "@/lib/postInteractionsData";

export type AdminDTO = {
  username: string;
  role: "owner" | "profe";
  isMainProfe: boolean;
  tutorialSeen: boolean;
  displayName: string | null;
  createdAt: string;
};
export type NotificationDTO = {
  id: string;
  forProfe: string | null;
  message: string;
  createdAt: string;
};
export type PinResetDTO = {
  id: string;
  studentId: string;
  studentName: string;
  requestedAt: string;
};
export type AnnouncementFullDTO = {
  id: string;
  message: string;
  authorName: string | null;
  createdAt: string;
  weekday: number | null;
  slotId: string | null;
  turnoLabel: string | null;
};
export type BlogPostDTO = {
  id: string;
  title: string | null;
  body: string;
  imageData: string | null;
  authorName: string | null;
  featured: boolean;
  studentAuthorName: string | null;
  createdAt: string;
  likedByMe: boolean;
  likeCount: number | null;
  comments: CommentDTO[];
};
export type StudentPostDTO = {
  id: string;
  studentId: string;
  studentName: string;
  title: string | null;
  body: string;
  imageData: string | null;
  isPublic: boolean;
  featured: boolean;
  createdAt: string;
  likedByMe: boolean;
  likeCount: number | null;
  comments: CommentDTO[];
};

export type AdminBundle = {
  snapshot: WorkshopSnapshot;
  admins: AdminDTO[];
  notifications: NotificationDTO[];
  pinResets: PinResetDTO[];
  announcements: AnnouncementFullDTO[];
  blogPosts: BlogPostDTO[];
  studentPosts: StudentPostDTO[];
  unread: { avisos: boolean; chat: boolean; blog: boolean };
  chatUnreadByTurno: Record<string, boolean>;
};

export async function loadAdminBundle(username: string): Promise<AdminBundle> {
  const [snapshot, admins, notifications, pinResets, announcements, blogPosts, studentPosts] =
    await Promise.all([
      loadWorkshopSnapshot(),
      prisma.admin.findMany(),
      prisma.notification.findMany({
        where: { OR: [{ forProfe: null }, { forProfe: username }] },
        orderBy: { createdAt: "asc" },
      }),
      prisma.pinResetRequest.findMany({ include: { student: true } }),
      prisma.announcement.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.studentPost.findMany({ include: { student: true }, orderBy: { createdAt: "desc" } }),
    ]);

  // Publicaciones de bitácora ya destacadas en el CeramiBlog (para no ofrecer destacarlas de nuevo).
  const featuredStudentPostIds = new Set(
    blogPosts.filter((p) => p.sourceStudentPostId).map((p) => p.sourceStudentPostId as string)
  );

  // Nombre a mostrar para cada profe: su nick si se puso uno, si no el usuario con mayúscula.
  const authorNameByUsername = new Map(
    admins.map((a) => [a.username, a.displayName || capitalize(a.username)])
  );

  // El chat es por turno (la principal ve varios a la vez), así que lo no-leído también se calcula
  // por turno: turnos que le interesan a esta profe (todos si es la principal, si no los asignados).
  const me = admins.find((a) => a.username === username);
  const turnoKey = (t: { weekday: number; slotId: string }) => `${t.weekday}_${t.slotId}`;
  const relevantTurnos = me?.isMainProfe
    ? snapshot.config.slots.flatMap((slot) => slot.weekdays.map((weekday) => ({ weekday, slotId: slot.id })))
    : snapshot.slotAssignments
        .filter((sa) => sa.profeUsername === username)
        .map((sa) => ({ weekday: sa.weekday, slotId: sa.slotId }));

  const chatUnreadByTurno: Record<string, boolean> = {};
  if (relevantTurnos.length > 0) {
    // authorAdminUsername es null en los mensajes de estudiantes — "NOT: { authorAdminUsername: username }"
    // los excluye a todos (NULL != username no es TRUE en SQL), por eso se arma como OR explícito.
    const [lastMsgsByTurno, seenByTurno] = await Promise.all([
      prisma.chatMessage.groupBy({
        by: ["weekday", "slotId"],
        where: { OR: [{ authorAdminUsername: null }, { authorAdminUsername: { not: username } }] },
        _max: { createdAt: true },
      }),
      prisma.adminChatSeen.findMany({ where: { adminUsername: username } }),
    ]);
    const lastMsgMap = new Map(lastMsgsByTurno.map((r) => [turnoKey(r), r._max.createdAt]));
    const seenMap = new Map(seenByTurno.map((s) => [turnoKey(s), s.seenAt]));
    for (const t of relevantTurnos) {
      const key = turnoKey(t);
      const last = lastMsgMap.get(key);
      const seen = seenMap.get(key);
      chatUnreadByTurno[key] = !!last && (!seen || seen < last);
    }
  }

  const latestAvisoAt = announcements.at(-1)?.createdAt;
  const latestBlogAt = blogPosts[0]?.createdAt;
  const unread = {
    avisos: !!latestAvisoAt && (!me?.avisosSeenAt || me.avisosSeenAt < latestAvisoAt),
    chat: Object.values(chatUnreadByTurno).some(Boolean),
    blog: !!latestBlogAt && (!me?.blogSeenAt || me.blogSeenAt < latestBlogAt),
  };

  // Cualquier profe ve el conteo de likes de cualquier post acá (ya tienen acceso privilegiado
  // de moderación sobre todo esto) — a diferencia de la vista del alumno, donde queda oculto.
  const viewerKey = `admin:${username}`;
  const [blogInteractions, studentPostInteractions] = await Promise.all([
    loadInteractions("blog", blogPosts.map((p) => p.id), viewerKey, true),
    loadInteractions("studentpost", studentPosts.map((p) => p.id), viewerKey, true),
  ]);

  // El PIN nunca debe llegar al navegador de ninguna profe (ni siquiera oculto en el HTML/props):
  // con el chat de por medio, tenerlo permitiría loguearse como el alumno y leer sus mensajes.
  const sanitizedSnapshot = { ...snapshot, students: snapshot.students.map((s) => ({ ...s, pin: "" })) };

  return {
    snapshot: sanitizedSnapshot,
    admins: admins.map((a) => ({
      username: a.username,
      role: a.role,
      isMainProfe: a.isMainProfe,
      tutorialSeen: a.tutorialSeen,
      displayName: a.displayName,
      createdAt: isoDate(a.createdAt),
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      forProfe: n.forProfe,
      message: n.message,
      createdAt: isoDate(n.createdAt),
    })),
    pinResets: pinResets.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.student.name,
      requestedAt: isoDate(r.requestedAt),
    })),
    announcements: announcements.map((a) => {
      const slot = a.slotId ? snapshot.config.slots.find((s) => s.id === a.slotId) : null;
      return {
        id: a.id,
        authorName: a.authorUsername ? authorNameByUsername.get(a.authorUsername) || null : null,
        message: a.message,
        createdAt: isoDate(a.createdAt),
        weekday: a.weekday,
        slotId: a.slotId,
        turnoLabel:
          a.weekday !== null
            ? `${capitalize(DIAS[a.weekday])}${slot ? ` ${slot.start}–${slot.end}` : ""}`
            : null,
      };
    }),
    blogPosts: blogPosts.map((p) => {
      const interaction = blogInteractions.get(p.id)!;
      return {
        id: p.id,
        title: p.title,
        body: p.body,
        imageData: p.imageData,
        authorName: p.authorUsername ? authorNameByUsername.get(p.authorUsername) || null : null,
        featured: p.featured,
        studentAuthorName: p.studentAuthorName,
        createdAt: isoDate(p.createdAt),
        likedByMe: interaction.likedByMe,
        likeCount: visibleLikeCount(interaction, true, true),
        comments: interaction.comments,
      };
    }),
    studentPosts: studentPosts.map((p) => {
      const interaction = studentPostInteractions.get(p.id)!;
      return {
        id: p.id,
        studentId: p.studentId,
        studentName: p.student.name,
        title: p.title,
        body: p.body,
        imageData: p.imageData,
        isPublic: p.isPublic,
        featured: featuredStudentPostIds.has(p.id),
        createdAt: isoDate(p.createdAt),
        likedByMe: interaction.likedByMe,
        likeCount: visibleLikeCount(interaction, true, true),
        comments: interaction.comments,
      };
    }),
    unread,
    chatUnreadByTurno,
  };
}

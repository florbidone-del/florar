import "server-only";
import { prisma } from "@/lib/prisma";
import { loadWorkshopSnapshot } from "@/lib/snapshot";
import { isoDate, capitalize, type WorkshopSnapshot } from "@/lib/domain";

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
};
export type BlogPostDTO = {
  id: string;
  title: string | null;
  body: string;
  imageData: string | null;
  authorName: string | null;
  createdAt: string;
};

export type AdminBundle = {
  snapshot: WorkshopSnapshot;
  admins: AdminDTO[];
  notifications: NotificationDTO[];
  pinResets: PinResetDTO[];
  announcements: AnnouncementFullDTO[];
  blogPosts: BlogPostDTO[];
};

export async function loadAdminBundle(username: string): Promise<AdminBundle> {
  const [snapshot, admins, notifications, pinResets, announcements, blogPosts] = await Promise.all([
    loadWorkshopSnapshot(),
    prisma.admin.findMany(),
    prisma.notification.findMany({
      where: { OR: [{ forProfe: null }, { forProfe: username }] },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pinResetRequest.findMany({ include: { student: true } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.blogPost.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  // Nombre a mostrar para cada profe: su nick si se puso uno, si no el usuario con mayúscula.
  const authorNameByUsername = new Map(
    admins.map((a) => [a.username, a.displayName || capitalize(a.username)])
  );

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
    announcements: announcements.map((a) => ({
      id: a.id,
      authorName: a.authorUsername ? authorNameByUsername.get(a.authorUsername) || null : null,
      message: a.message,
      createdAt: isoDate(a.createdAt),
    })),
    blogPosts: blogPosts.map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      imageData: p.imageData,
      authorName: p.authorUsername ? authorNameByUsername.get(p.authorUsername) || null : null,
      createdAt: isoDate(p.createdAt),
    })),
  };
}

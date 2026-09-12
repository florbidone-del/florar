import "server-only";
import { prisma } from "@/lib/prisma";
import { loadWorkshopSnapshot } from "@/lib/snapshot";
import type { WorkshopSnapshot } from "@/lib/domain";

export type AdminDTO = {
  username: string;
  role: "owner" | "profe";
  isMainProfe: boolean;
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
export type AnnouncementFullDTO = { id: string; message: string; createdAt: string };

export type AdminBundle = {
  snapshot: WorkshopSnapshot;
  admins: AdminDTO[];
  notifications: NotificationDTO[];
  pinResets: PinResetDTO[];
  announcements: AnnouncementFullDTO[];
};

export async function loadAdminBundle(username: string): Promise<AdminBundle> {
  const [snapshot, admins, notifications, pinResets, announcements] = await Promise.all([
    loadWorkshopSnapshot(),
    prisma.admin.findMany(),
    prisma.notification.findMany({
      where: { OR: [{ forProfe: null }, { forProfe: username }] },
      orderBy: { createdAt: "asc" },
    }),
    prisma.pinResetRequest.findMany({ include: { student: true } }),
    prisma.announcement.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return {
    snapshot,
    admins: admins.map((a) => ({
      username: a.username,
      role: a.role,
      isMainProfe: a.isMainProfe,
      createdAt: a.createdAt.toISOString().slice(0, 10),
    })),
    notifications: notifications.map((n) => ({
      id: n.id,
      forProfe: n.forProfe,
      message: n.message,
      createdAt: n.createdAt.toISOString().slice(0, 10),
    })),
    pinResets: pinResets.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.student.name,
      requestedAt: r.requestedAt.toISOString().slice(0, 10),
    })),
    announcements: announcements.map((a) => ({
      id: a.id,
      message: a.message,
      createdAt: a.createdAt.toISOString().slice(0, 10),
    })),
  };
}

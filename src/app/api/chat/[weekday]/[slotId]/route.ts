import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizeChatTurno } from "@/lib/chat";

const MAX_MESSAGES = 200;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ weekday: string; slotId: string }> }
) {
  const { weekday: weekdayRaw, slotId } = await params;
  const weekday = Number(weekdayRaw);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return NextResponse.json({ error: "Turno inválido." }, { status: 400 });
  }

  const identity = await authorizeChatTurno(weekday, slotId);
  if (!identity) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { weekday, slotId },
    orderBy: { createdAt: "asc" },
    take: MAX_MESSAGES,
  });

  return NextResponse.json({
    me: identity.kind === "student" ? { kind: "student", id: identity.studentId } : { kind: "admin", id: identity.username },
    messages: messages.map((m) => ({
      id: m.id,
      authorKind: m.authorKind,
      authorName: m.authorName,
      authorStudentId: m.authorStudentId,
      authorAdminUsername: m.authorAdminUsername,
      body: m.body,
      attachmentUrl: m.attachmentUrl,
      attachmentType: m.attachmentType,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

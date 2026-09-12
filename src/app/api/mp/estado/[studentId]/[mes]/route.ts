import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStudent } from "@/lib/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string; mes: string }> }
) {
  const { studentId, mes } = await params;

  const student = await requireStudent();
  const admin = await requireAdmin();
  if (!admin && (!student || student.studentId !== studentId)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const payment = await prisma.payment.findUnique({
    where: { studentId_monthKey: { studentId, monthKey: mes } },
  });
  if (!payment) return NextResponse.json({ status: "sin_registro" });
  return NextResponse.json({
    status: payment.status,
    amount: payment.amount,
    source: payment.source,
    updatedAt: payment.updatedAt,
  });
}

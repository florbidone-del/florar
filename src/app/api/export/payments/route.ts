import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMainProfe } from "@/lib/authz";
import { isoDate } from "@/lib/domain";

const STATUS_ES: Record<string, string> = {
  approved: "aprobado",
  pending: "pendiente",
  rejected: "rechazado",
};
const SOURCE_ES: Record<string, string> = {
  manual: "manual",
  mercadopago: "Mercado Pago",
};

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Export de todos los pagos (alumno, mes, monto, estado, origen, fecha) para la profe principal. */
export async function GET() {
  const session = await requireMainProfe();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const payments = await prisma.payment.findMany({
    include: { student: true },
    orderBy: [{ monthKey: "desc" }, { createdAt: "asc" }],
  });

  const header = ["Alumno", "Usuario", "Mes", "Monto", "Estado", "Origen", "Fecha"];
  const rows = payments.map((p) => [
    p.student.name,
    p.studentId,
    p.monthKey,
    String(p.amount),
    STATUS_ES[p.status] || p.status,
    SOURCE_ES[p.source] || p.source,
    isoDate(p.updatedAt),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const bom = "﻿"; // para que Excel abra los acentos bien

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pagos-${isoDate(new Date())}.csv"`,
    },
  });
}

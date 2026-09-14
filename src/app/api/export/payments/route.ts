import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
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

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pagos");
  sheet.columns = [
    { header: "Alumno", key: "alumno", width: 26 },
    { header: "Usuario", key: "usuario", width: 16 },
    { header: "Mes", key: "mes", width: 10 },
    { header: "Monto", key: "monto", width: 12 },
    { header: "Estado", key: "estado", width: 12 },
    { header: "Origen", key: "origen", width: 14 },
    { header: "Fecha", key: "fecha", width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const p of payments) {
    sheet.addRow({
      alumno: p.student.name,
      usuario: p.studentId,
      mes: p.monthKey,
      monto: p.amount,
      estado: STATUS_ES[p.status] || p.status,
      origen: SOURCE_ES[p.source] || p.source,
      fecha: isoDate(p.updatedAt),
    });
  }
  sheet.getColumn("monto").numFmt = "#,##0";

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pagos-${isoDate(new Date())}.xlsx"`,
    },
  });
}

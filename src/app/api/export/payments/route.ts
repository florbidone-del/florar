import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireMainProfe } from "@/lib/authz";
import { isoDate, currentMonthKey } from "@/lib/domain";
import { loadConfig } from "@/lib/snapshot";

const STATUS_ES: Record<string, string> = {
  approved: "aprobado",
  pending: "pendiente",
  rejected: "rechazado",
};
const SOURCE_ES: Record<string, string> = {
  manual: "manual",
  mercadopago: "Mercado Pago",
};

const GREEN_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEFDD" } };
const GREEN_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF1E7A34" } };
const RED_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6D9D9" } };
const RED_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFB3261E" } };

type Row = {
  alumno: string;
  usuario: string;
  mes: string;
  monto: number;
  estado: string;
  origen: string;
  fecha: string;
};

/** Export de todos los pagos (alumno, mes, monto, estado, origen, fecha) para la profe principal. */
export async function GET() {
  const session = await requireMainProfe();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const [payments, students, config] = await Promise.all([
    prisma.payment.findMany({ include: { student: true }, orderBy: [{ monthKey: "desc" }, { createdAt: "asc" }] }),
    prisma.student.findMany(),
    loadConfig(),
  ]);

  const rows: Row[] = payments.map((p) => ({
    alumno: p.student.name,
    usuario: p.studentId,
    mes: p.monthKey,
    monto: p.amount,
    estado: STATUS_ES[p.status] || p.status,
    origen: SOURCE_ES[p.source] || p.source,
    fecha: isoDate(p.updatedAt),
  }));

  // Alumnos que todavía no tienen ningún pago registrado este mes (por ej. recién agregados):
  // no aparecen en la tabla Payment, así que se agrega una fila "pendiente" para que no falten.
  const mk = currentMonthKey();
  const hasCurrentMonthPayment = new Set(payments.filter((p) => p.monthKey === mk).map((p) => p.studentId));
  const isLate = new Date().getDate() > config.paymentWindowEnd;
  const currentFee = isLate
    ? Math.round(config.monthlyFee * (1 + config.lateFeePercent / 100))
    : config.monthlyFee;
  for (const s of students) {
    if (hasCurrentMonthPayment.has(s.id)) continue;
    rows.push({
      alumno: s.name,
      usuario: s.id,
      mes: mk,
      monto: currentFee,
      estado: "pendiente",
      origen: "—",
      fecha: "—",
    });
  }
  rows.sort((a, b) => b.mes.localeCompare(a.mes));

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
  sheet.getColumn("monto").numFmt = "#,##0";

  for (const row of rows) {
    const excelRow = sheet.addRow(row);
    const estadoCell = excelRow.getCell("estado");
    if (row.estado === "aprobado") {
      estadoCell.fill = GREEN_FILL;
      estadoCell.font = GREEN_FONT;
    } else {
      // "pendiente" y "rechazado" se marcan igual: ambos significan que todavía no cobraste.
      estadoCell.fill = RED_FILL;
      estadoCell.font = RED_FONT;
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="pagos-${isoDate(new Date())}.xlsx"`,
    },
  });
}

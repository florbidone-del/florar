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
const YELLOW_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCEEB0" } };
const YELLOW_FONT: Partial<ExcelJS.Font> = { color: { argb: "FF8A6D1D" } };
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

  const mk = currentMonthKey();
  const isLate = new Date().getDate() > config.paymentWindowEnd;
  const lateFactor = isLate ? 1 + config.lateFeePercent / 100 : 1;
  const currentFee = isLate
    ? Math.round(config.cashFee * (1 + config.lateFeePercent / 100))
    : config.cashFee;

  // Origen y fecha solo tienen sentido para un pago efectivamente concretado (aprobado): un link de
  // Mercado Pago abierto pero no pagado ya crea la fila en estado "pending", y no queremos que
  // parezca que el pago se hizo con esos datos. Un pago aprobado del mes actual por menos de la
  // cuota es un pago parcial: todavía falta el saldo, aunque la fila diga "approved" en la base.
  const rows: Row[] = payments.map((p) => {
    const baseFee = p.source === "mercadopago" ? config.mpFee : config.cashFee;
    const paidOn = isoDate(p.paidAt ?? p.updatedAt);
    const paidOnTime = paidOn.slice(0, 7) === mk && Number(paidOn.slice(8, 10)) <= config.paymentWindowEnd;
    const dueFee = paidOnTime && p.amount >= baseFee ? baseFee : Math.round(baseFee * lateFactor);
    const isCurrentPartial = p.status === "approved" && p.monthKey === mk && p.amount < dueFee;
    return {
      alumno: p.student.name,
      usuario: p.studentId,
      mes: p.monthKey,
      monto: p.amount,
      estado: isCurrentPartial ? "parcial" : STATUS_ES[p.status] || p.status,
      origen: p.status === "approved" ? SOURCE_ES[p.source] || p.source : "—",
      fecha: p.status === "approved" ? isoDate(p.paidAt ?? p.updatedAt) : "—",
    };
  });

  // Alumnos que todavía no tienen ningún pago registrado este mes (por ej. recién agregados):
  // no aparecen en la tabla Payment, así que se agrega una fila "pendiente" para que no falten.
  const hasCurrentMonthPayment = new Set(payments.filter((p) => p.monthKey === mk).map((p) => p.studentId));
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
    { header: "Estudiante", key: "alumno", width: 26 },
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
      // "pendiente", "rechazado" y "parcial" son todos "todavía falta cobrar algo". Se distingue por
      // fecha límite: amarillo si ese mes todavía está dentro de la ventana de pago, rojo si ya se pasó.
      const overdue = row.mes < mk || (row.mes === mk && isLate);
      estadoCell.fill = overdue ? RED_FILL : YELLOW_FILL;
      estadoCell.font = overdue ? RED_FONT : YELLOW_FONT;
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

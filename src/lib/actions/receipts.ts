"use server";

import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";
import { requireMainProfe } from "@/lib/authz";
import { currentMonthKey, isUnpaid, money } from "@/lib/domain";
import { loadWorkshopSnapshot } from "@/lib/snapshot";
import { notifyReceiptReviewed, notifyReceiptSubmitted } from "@/lib/push";
import type { ActionResult } from "@/lib/actions/auth";

// Fotos (ya redimensionadas en el navegador) o el PDF que comparten las apps de los bancos.
const FILE_PATTERN = /^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/;
const MAX_FILE_BYTES = 2.5 * 1024 * 1024;

/** El/la estudiante sube el comprobante de su transferencia del mes ("ya pagué"). Si ya tenía uno
 *  pendiente, lo reemplaza. Mientras esté pendiente tiene acceso provisorio al calendario. */
export async function submitPaymentReceiptAction(input: {
  fileData: string;
  amount: number;
  note?: string;
}): Promise<ActionResult> {
  const session = await requireStudent();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };

  const match = input.fileData.match(FILE_PATTERN);
  if (!match) return { error: "El archivo tiene que ser una foto o un PDF." };
  const [, fileType, base64] = match;
  if ((base64.length * 3) / 4 > MAX_FILE_BYTES) {
    return { error: "El archivo es muy pesado (máximo 2,5 MB). Probá con una captura de pantalla." };
  }
  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Poné el monto que transferiste." };

  const snap = await loadWorkshopSnapshot();
  const student = snap.students.find((s) => s.id === session.studentId);
  if (!student) return { error: "No se encontró tu cuenta." };
  if (!isUnpaid(snap, student.id)) return { error: "Tu cuota de este mes ya figura como pagada." };

  const monthKey = currentMonthKey();
  await prisma.$transaction([
    prisma.paymentReceipt.deleteMany({ where: { studentId: student.id, monthKey, status: "pending" } }),
    prisma.paymentReceipt.create({
      data: {
        studentId: student.id,
        monthKey,
        amount,
        note: input.note?.trim() || null,
        fileData: input.fileData,
        fileType,
      },
    }),
  ]);

  after(() => notifyReceiptSubmitted({ studentName: student.name, amount: money(amount) }));
  return { ok: true };
}

/** La profe principal confirma el comprobante: se registra el pago (sumado a lo que ya hubiera
 *  pagado ese mes) con la fecha en que el/la estudiante lo subió, así no se le cobra recargo si lo
 *  mandó dentro de la ventana aunque la revisión llegue después. */
export async function approvePaymentReceiptAction(id: string, amount: number): Promise<ActionResult> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };
  const finalAmount = Math.round(Number(amount));
  if (!Number.isFinite(finalAmount) || finalAmount <= 0) return { error: "Monto inválido." };

  const receipt = await prisma.paymentReceipt.findUnique({
    where: { id },
    select: { id: true, studentId: true, monthKey: true, createdAt: true, status: true },
  });
  if (!receipt) return { error: "No se encontró el comprobante." };
  if (receipt.status !== "pending") return { error: "Este comprobante ya fue revisado." };

  const { studentId, monthKey } = receipt;
  const existing = await prisma.payment.findUnique({
    where: { studentId_monthKey: { studentId, monthKey } },
  });
  const total = (existing?.status === "approved" ? existing.amount : 0) + finalAmount;

  await prisma.$transaction([
    prisma.payment.upsert({
      where: { studentId_monthKey: { studentId, monthKey } },
      create: { studentId, monthKey, amount: total, status: "approved", source: "manual", paidAt: receipt.createdAt },
      update: { amount: total, status: "approved", source: "manual", paidAt: receipt.createdAt },
    }),
    prisma.paymentReceipt.update({
      where: { id },
      data: { status: "approved", amount: finalAmount, reviewedBy: session.username, reviewedAt: new Date() },
    }),
  ]);

  after(() => notifyReceiptReviewed({ studentId, approved: true }));
  return { ok: true };
}

/** La profe principal rechaza el comprobante (no llegó la plata, no se lee, etc). El/la estudiante
 *  ve el motivo y puede subir otro; si ya pasó la ventana de pago, pierde el acceso provisorio. */
export async function rejectPaymentReceiptAction(id: string, reason: string): Promise<ActionResult> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };
  const rejectReason = reason.trim();
  if (!rejectReason) return { error: "Contale el motivo así sabe qué corregir." };

  const updated = await prisma.paymentReceipt.updateMany({
    where: { id, status: "pending" },
    data: { status: "rejected", rejectReason, reviewedBy: session.username, reviewedAt: new Date() },
  });
  if (updated.count === 0) return { error: "Este comprobante ya fue revisado." };

  const receipt = await prisma.paymentReceipt.findUnique({ where: { id }, select: { studentId: true } });
  if (receipt) after(() => notifyReceiptReviewed({ studentId: receipt.studentId, approved: false, reason: rejectReason }));
  return { ok: true };
}

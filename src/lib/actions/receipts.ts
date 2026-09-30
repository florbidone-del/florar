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

function parseReceiptFile(fileData: string): { fileType: string } | { error: string } {
  const match = fileData.match(FILE_PATTERN);
  if (!match) return { error: "El archivo tiene que ser una foto o un PDF." };
  const [, fileType, base64] = match;
  if ((base64.length * 3) / 4 > MAX_FILE_BYTES) {
    return { error: "El archivo es muy pesado (máximo 2,5 MB). Probá con una captura de pantalla." };
  }
  return { fileType };
}

/** El/la estudiante sube el comprobante de su transferencia de la cuota del mes ("ya pagué"). Si ya
 *  tenía uno pendiente, lo reemplaza. Mientras esté pendiente tiene acceso provisorio al calendario. */
export async function submitPaymentReceiptAction(input: {
  fileData: string;
  amount: number;
  note?: string;
}): Promise<ActionResult> {
  const session = await requireStudent();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };

  const file = parseReceiptFile(input.fileData);
  if ("error" in file) return file;
  const amount = Math.round(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Poné el monto que transferiste." };

  const snap = await loadWorkshopSnapshot();
  const student = snap.students.find((s) => s.id === session.studentId);
  if (!student) return { error: "No se encontró tu cuenta." };
  if (!isUnpaid(snap, student.id)) return { error: "Tu cuota de este mes ya figura como pagada." };

  const monthKey = currentMonthKey();
  await prisma.$transaction([
    prisma.paymentReceipt.deleteMany({
      where: { studentId: student.id, monthKey, status: "pending", extraClassPurchaseId: null },
    }),
    prisma.paymentReceipt.create({
      data: {
        studentId: student.id,
        monthKey,
        amount,
        note: input.note?.trim() || null,
        fileData: input.fileData,
        fileType: file.fileType,
      },
    }),
  ]);

  after(() => notifyReceiptSubmitted({ studentName: student.name, amount: money(amount), isExtraClass: false }));
  return { ok: true };
}

/** Compra de una clase extra pagada por transferencia: crea la compra (pendiente) junto con su
 *  comprobante. Recién cuando la profe lo aprueba, el/la estudiante puede elegir el día. */
export async function submitExtraClassReceiptAction(input: {
  fileData: string;
  note?: string;
}): Promise<ActionResult> {
  const session = await requireStudent();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };

  const file = parseReceiptFile(input.fileData);
  if ("error" in file) return file;

  const snap = await loadWorkshopSnapshot();
  const student = snap.students.find((s) => s.id === session.studentId);
  if (!student) return { error: "No se encontró tu cuenta." };

  const monthKey = currentMonthKey();
  const amount = snap.config.extraClassFee;
  await prisma.extraClassPurchase.create({
    data: {
      studentId: student.id,
      monthKey,
      amount,
      status: "pending",
      receipt: {
        create: {
          studentId: student.id,
          monthKey,
          amount,
          note: input.note?.trim() || null,
          fileData: input.fileData,
          fileType: file.fileType,
        },
      },
    },
  });

  after(() => notifyReceiptSubmitted({ studentName: student.name, amount: money(amount), isExtraClass: true }));
  return { ok: true };
}

/** La profe principal confirma el comprobante. Si es de la cuota, se registra el pago (sumado a lo
 *  que ya hubiera pagado ese mes) con la fecha en que el/la estudiante lo subió, así no se le cobra
 *  recargo si lo mandó dentro de la ventana aunque la revisión llegue después. Si es de una clase
 *  extra, se habilita esa compra para que elija el día. */
export async function approvePaymentReceiptAction(id: string, amount: number): Promise<ActionResult> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };
  const finalAmount = Math.round(Number(amount));
  if (!Number.isFinite(finalAmount) || finalAmount <= 0) return { error: "Monto inválido." };

  const receipt = await prisma.paymentReceipt.findUnique({
    where: { id },
    select: {
      id: true,
      studentId: true,
      monthKey: true,
      createdAt: true,
      status: true,
      extraClassPurchaseId: true,
    },
  });
  if (!receipt) return { error: "No se encontró el comprobante." };
  if (receipt.status !== "pending") return { error: "Este comprobante ya fue revisado." };

  const reviewed = {
    status: "approved" as const,
    amount: finalAmount,
    reviewedBy: session.username,
    reviewedAt: new Date(),
  };
  const { studentId, monthKey } = receipt;

  if (receipt.extraClassPurchaseId) {
    await prisma.$transaction([
      prisma.extraClassPurchase.update({
        where: { id: receipt.extraClassPurchaseId },
        data: { status: "approved", amount: finalAmount },
      }),
      prisma.paymentReceipt.update({ where: { id }, data: reviewed }),
    ]);
  } else {
    const existing = await prisma.payment.findUnique({
      where: { studentId_monthKey: { studentId, monthKey } },
    });
    const total = (existing?.status === "approved" ? existing.amount : 0) + finalAmount;
    await prisma.$transaction([
      prisma.payment.upsert({
        where: { studentId_monthKey: { studentId, monthKey } },
        create: {
          studentId,
          monthKey,
          amount: total,
          status: "approved",
          source: "transferencia",
          paidAt: receipt.createdAt,
        },
        update: { amount: total, status: "approved", source: "transferencia", paidAt: receipt.createdAt },
      }),
      prisma.paymentReceipt.update({ where: { id }, data: reviewed }),
    ]);
  }

  after(() =>
    notifyReceiptReviewed({ studentId, approved: true, isExtraClass: !!receipt.extraClassPurchaseId })
  );
  return { ok: true };
}

/** La profe principal rechaza el comprobante (no llegó la plata, no se lee, etc). El/la estudiante
 *  ve el motivo y puede subir otro. Si era de la cuota y ya pasó la ventana de pago, pierde el acceso
 *  provisorio; si era de una clase extra, esa compra queda anulada. */
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

  const receipt = await prisma.paymentReceipt.findUnique({
    where: { id },
    select: { studentId: true, extraClassPurchaseId: true },
  });
  if (receipt?.extraClassPurchaseId) {
    await prisma.extraClassPurchase.update({
      where: { id: receipt.extraClassPurchaseId },
      data: { status: "rejected" },
    });
  }
  if (receipt) {
    after(() =>
      notifyReceiptReviewed({
        studentId: receipt.studentId,
        approved: false,
        reason: rejectReason,
        isExtraClass: !!receipt.extraClassPurchaseId,
      })
    );
  }
  return { ok: true };
}

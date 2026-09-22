import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fmtMonthName, money } from "@/lib/domain";
import { isValidMpSignature, mapMpStatus, mpAccessToken } from "@/lib/mp";

/** Mercado Pago llama acá cuando cambia el estado de un pago. Respondemos 200 rápido y procesamos después. */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const type = url.searchParams.get("type") || body?.type;
  const dataId = url.searchParams.get("data.id") || body?.data?.id;

  // Responder ya: Mercado Pago solo necesita un 200. El procesamiento sigue debajo.
  const response = NextResponse.json({ received: true });

  if (type !== "payment" || !dataId) return response;

  const valid = isValidMpSignature(
    req.headers.get("x-signature"),
    req.headers.get("x-request-id"),
    dataId
  );
  if (!valid) {
    console.warn("Firma de webhook de Mercado Pago inválida, se ignora.");
    return response;
  }

  try {
    const accessToken = mpAccessToken();
    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const payment = await payRes.json();
    const externalReference: string | undefined = payment.external_reference;
    if (!externalReference) return response;

    // Clase extra: referencia "extra__<id>" — cada compra es su propia fila, sin merge de montos
    // (a diferencia de la cuota, acá no hay "saldo restante" que sumar).
    if (externalReference.startsWith("extra__")) {
      const purchaseId = externalReference.slice("extra__".length);
      const status = mapMpStatus(payment.status);
      const mpAmount = Math.round(payment.transaction_amount || 0);
      const previous = await prisma.extraClassPurchase.findUnique({ where: { id: purchaseId } });
      if (!previous) return response;
      await prisma.extraClassPurchase.update({
        where: { id: purchaseId },
        data: { status, mpPaymentId: String(payment.id) },
      });
      if (status === "approved" && previous.status !== "approved") {
        const student = await prisma.student.findUnique({ where: { id: previous.studentId } });
        if (student) {
          await prisma.notification.create({
            data: {
              forProfe: null,
              message: `${student.name} pagó una clase extra (${money(mpAmount || previous.amount)}) — ya puede elegir el día.`,
            },
          });
        }
      }
      return response;
    }

    if (!externalReference.includes("__")) return response;

    const [studentId, monthKey] = externalReference.split("__");
    const status = mapMpStatus(payment.status);
    const mpAmount = Math.round(payment.transaction_amount || 0);

    const previous = await prisma.payment.findUnique({
      where: { studentId_monthKey: { studentId, monthKey } },
    });

    if (status === "approved") {
      // Si ya había un pago aprobado este mes (a mano o por un cobro de Mercado Pago anterior),
      // este nuevo monto aprobado se suma en vez de reemplazarlo — el botón de Mercado Pago
      // cobra el saldo restante, así que lo que llega acá es justo la parte que faltaba.
      const baseApproved = previous?.status === "approved" ? previous.amount : 0;
      await prisma.payment.upsert({
        where: { studentId_monthKey: { studentId, monthKey } },
        create: {
          studentId,
          monthKey,
          amount: mpAmount,
          status: "approved",
          source: "mercadopago",
          mpPaymentId: String(payment.id),
        },
        update: {
          amount: baseApproved + mpAmount,
          status: "approved",
          source: "mercadopago",
          mpPaymentId: String(payment.id),
        },
      });
    } else if (previous?.status === "approved") {
      // Ya había un pago confirmado y este intento nuevo quedó pendiente/rechazado: no lo tocamos,
      // solo guardamos la referencia por si hace falta para depurar.
      await prisma.payment.update({
        where: { studentId_monthKey: { studentId, monthKey } },
        data: { mpPaymentId: String(payment.id) },
      });
    } else {
      await prisma.payment.upsert({
        where: { studentId_monthKey: { studentId, monthKey } },
        create: {
          studentId,
          monthKey,
          amount: mpAmount,
          status,
          source: "mercadopago",
          mpPaymentId: String(payment.id),
        },
        update: {
          amount: mpAmount,
          status,
          source: "mercadopago",
          mpPaymentId: String(payment.id),
        },
      });
    }

    if (status === "approved" && previous?.status !== "approved") {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (student) {
        await prisma.notification.create({
          data: {
            forProfe: null,
            message: `${student.name} pagó la cuota de ${fmtMonthName(`${monthKey}-01`)} (${money(
              mpAmount
            )}) por Mercado Pago.`,
          },
        });
      }
    }
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago:", err);
  }

  return response;
}

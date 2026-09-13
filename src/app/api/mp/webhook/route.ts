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
    if (!externalReference || !externalReference.includes("__")) return response;

    const [studentId, monthKey] = externalReference.split("__");
    const status = mapMpStatus(payment.status);

    const previous = await prisma.payment.findUnique({
      where: { studentId_monthKey: { studentId, monthKey } },
    });

    await prisma.payment.upsert({
      where: { studentId_monthKey: { studentId, monthKey } },
      create: {
        studentId,
        monthKey,
        amount: Math.round(payment.transaction_amount || 0),
        status,
        source: "mercadopago",
        mpPaymentId: String(payment.id),
      },
      update: {
        status,
        source: "mercadopago",
        mpPaymentId: String(payment.id),
      },
    });

    if (status === "approved" && previous?.status !== "approved") {
      const student = await prisma.student.findUnique({ where: { id: studentId } });
      if (student) {
        await prisma.notification.create({
          data: {
            forProfe: null,
            message: `${student.name} pagó la cuota de ${fmtMonthName(`${monthKey}-01`)} (${money(
              Math.round(payment.transaction_amount || 0)
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

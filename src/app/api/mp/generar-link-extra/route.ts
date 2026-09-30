import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";
import { currentMonthKey } from "@/lib/domain";
import { loadWorkshopSnapshot } from "@/lib/snapshot";
import { appBaseUrl, mpAccessToken } from "@/lib/mp";

/** Genera un link de pago (Checkout Pro) para una clase extra del alumno logueado. A diferencia
 *  de la cuota, cada compra es independiente (un/a estudiante puede pagar varias este mes). */
export async function POST(req: NextRequest) {
  const session = await requireStudent();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const snap = await loadWorkshopSnapshot();
  if (!snap.config.mpEnabled) {
    return NextResponse.json({ error: "El pago por Mercado Pago no está habilitado." }, { status: 403 });
  }
  const student = snap.students.find((s) => s.id === session.studentId);
  if (!student) {
    return NextResponse.json({ error: "Estudiante no encontrado." }, { status: 404 });
  }

  const monthKey = currentMonthKey();
  const amount = snap.config.extraClassFee;
  const baseUrl = appBaseUrl(req.url);

  let accessToken: string;
  try {
    accessToken = mpAccessToken();
  } catch {
    return NextResponse.json(
      { error: "El cobro por Mercado Pago no está configurado todavía." },
      { status: 503 }
    );
  }

  const purchase = await prisma.extraClassPurchase.create({
    data: { studentId: student.id, monthKey, amount, status: "pending" },
  });

  const preference = {
    items: [
      {
        title: `Clase extra ${monthKey} — ${student.name}`,
        quantity: 1,
        currency_id: "ARS",
        unit_price: amount,
      },
    ],
    external_reference: `extra__${purchase.id}`,
    notification_url: `${baseUrl}/api/mp/webhook`,
    back_urls: {
      success: `${baseUrl}/pago-exitoso`,
      pending: `${baseUrl}/pago-pendiente`,
      failure: `${baseUrl}/pago-fallido`,
    },
    auto_return: "approved",
  };

  const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(preference),
  });
  const data = await mpRes.json();
  if (!mpRes.ok) {
    await prisma.extraClassPurchase.delete({ where: { id: purchase.id } });
    return NextResponse.json(
      { error: "Mercado Pago rechazó la solicitud.", detail: data },
      { status: 502 }
    );
  }

  await prisma.extraClassPurchase.update({
    where: { id: purchase.id },
    data: { mpPreferenceId: data.id },
  });

  return NextResponse.json({ init_point: data.init_point });
}

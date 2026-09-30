import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";
import { currentMonthKey, studentFee, paidAmountThisMonth } from "@/lib/domain";
import { loadWorkshopSnapshot } from "@/lib/snapshot";
import { appBaseUrl, mpAccessToken } from "@/lib/mp";

/** Genera un link de pago (Checkout Pro) para el alumno logueado y el mes actual. */
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
  const fee = studentFee(snap, "mp");
  const alreadyPaid = paidAmountThisMonth(snap, student.id);
  const amount = fee - alreadyPaid;
  if (amount <= 0) {
    return NextResponse.json({ error: "Ya no debés nada este mes." }, { status: 400 });
  }
  const externalReference = `${student.id}__${monthKey}`;
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

  const preference = {
    items: [
      {
        title: `Cuota ${monthKey} — ${student.name}`,
        quantity: 1,
        currency_id: "ARS",
        unit_price: amount,
      },
    ],
    external_reference: externalReference,
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
    return NextResponse.json(
      { error: "Mercado Pago rechazó la solicitud.", detail: data },
      { status: 502 }
    );
  }

  // Si ya hay un pago aprobado este mes (por ejemplo, una seña en efectivo), no lo pisamos:
  // solo guardamos la referencia de esta preferencia para poder identificarla cuando llegue
  // el webhook, que va a sumarle este monto al ya confirmado en vez de reemplazarlo.
  const existing = await prisma.payment.findUnique({
    where: { studentId_monthKey: { studentId: student.id, monthKey } },
  });
  if (existing?.status === "approved") {
    await prisma.payment.update({
      where: { studentId_monthKey: { studentId: student.id, monthKey } },
      data: { mpPreferenceId: data.id },
    });
  } else {
    await prisma.payment.upsert({
      where: { studentId_monthKey: { studentId: student.id, monthKey } },
      create: {
        studentId: student.id,
        monthKey,
        amount,
        status: "pending",
        source: "mercadopago",
        mpPreferenceId: data.id,
      },
      update: {
        amount,
        status: "pending",
        source: "mercadopago",
        mpPreferenceId: data.id,
      },
    });
  }

  return NextResponse.json({ init_point: data.init_point });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";
import { requireMainProfe } from "@/lib/authz";

/** Sirve el archivo de un comprobante de transferencia. Tiene datos bancarios, así que solo lo ven
 *  la profe principal y el/la estudiante que lo subió (nunca queda en una URL pública). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [student, mainProfe] = await Promise.all([requireStudent(), requireMainProfe()]);
  if (!student && !mainProfe) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const receipt = await prisma.paymentReceipt.findUnique({
    where: { id },
    select: { studentId: true, fileData: true, fileType: true },
  });
  if (!receipt || (!mainProfe && receipt.studentId !== student?.studentId)) {
    return NextResponse.json({ error: "No encontrado." }, { status: 404 });
  }

  const base64 = receipt.fileData.slice(receipt.fileData.indexOf(",") + 1);
  const ext = receipt.fileType === "application/pdf" ? "pdf" : receipt.fileType.split("/")[1];
  return new NextResponse(Buffer.from(base64, "base64"), {
    headers: {
      "Content-Type": receipt.fileType,
      "Content-Disposition": `inline; filename="comprobante-${id}.${ext}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { requireMainProfe } from "@/lib/authz";
import { isoDate, slugify } from "@/lib/domain";

/** La imagen puede ser una URL de Vercel Blob (lo normal desde la migración) o, para posts viejos
 *  de antes de eso, una data URL en base64 guardada directo en la base. */
async function toImageBuffer(imageData: string): Promise<{ buffer: Buffer; ext: string }> {
  if (imageData.startsWith("http")) {
    const res = await fetch(imageData);
    const arrayBuffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    return { buffer: Buffer.from(arrayBuffer), ext };
  }
  const match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return { buffer: Buffer.from(imageData, "base64"), ext: "jpg" };
  const [, type, base64] = match;
  return { buffer: Buffer.from(base64, "base64"), ext: type === "jpeg" ? "jpg" : type };
}

/** Descarga todas las fotos de CeramiBlog y bitácoras (o solo las anteriores a `before`) en un
 *  .zip, para tener un respaldo real antes de limpiarlas de la base. Solo la profe principal. */
export async function GET(req: NextRequest) {
  const session = await requireMainProfe();
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const before = searchParams.get("before");
  const beforeDate = before ? new Date(`${before}T23:59:59.999Z`) : null;
  const dateFilter = beforeDate ? { createdAt: { lt: beforeDate } } : {};

  const [blogPosts, studentPosts] = await Promise.all([
    prisma.blogPost.findMany({
      where: { imageData: { not: null }, ...dateFilter },
      orderBy: { createdAt: "asc" },
    }),
    prisma.studentPost.findMany({
      where: { imageData: { not: null }, ...dateFilter },
      include: { student: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const zip = new JSZip();
  const ceramiFolder = zip.folder("ceramiblog");
  const bitacoraFolder = zip.folder("bitacoras");

  for (const p of blogPosts) {
    if (!p.imageData) continue;
    const { buffer, ext } = await toImageBuffer(p.imageData);
    const name = `${isoDate(p.createdAt)}_${slugify(p.title || "post")}_${p.id.slice(-6)}.${ext}`;
    ceramiFolder?.file(name, buffer);
  }
  for (const p of studentPosts) {
    if (!p.imageData) continue;
    const { buffer, ext } = await toImageBuffer(p.imageData);
    const name = `${isoDate(p.createdAt)}_${slugify(p.student.name)}_${slugify(p.title || "post")}_${p.id.slice(-6)}.${ext}`;
    bitacoraFolder?.file(name, buffer);
  }

  if (blogPosts.length === 0 && studentPosts.length === 0) {
    return NextResponse.json({ error: "No hay fotos para exportar en ese rango." }, { status: 404 });
  }

  const content = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(new Uint8Array(content), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="fotos-florar-${isoDate(new Date())}.zip"`,
    },
  });
}

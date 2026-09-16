import { NextRequest, NextResponse } from "next/server";
import { requireStudent, requireAdmin } from "@/lib/session";

/** Busca GIFs en Giphy para el selector del chat — nunca los alojamos nosotros, solo devolvemos
 *  los links que da la API de Giphy (rating "g" para que sea apto para todo público). */
export async function GET(req: NextRequest) {
  const student = await requireStudent();
  const admin = student ? null : await requireAdmin();
  if (!student && !admin) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Los GIFs no están configurados todavía." }, { status: 503 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const endpoint = q
    ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=24&rating=g&lang=es`
    : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=24&rating=g`;

  let data: any;
  try {
    const res = await fetch(endpoint);
    data = await res.json();
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con Giphy." }, { status: 502 });
  }

  const gifs = (data?.data || []).map((g: any) => ({
    id: g.id,
    preview: g.images?.fixed_width_small?.url || g.images?.fixed_width?.url || g.images?.original?.url,
    url: g.images?.fixed_width?.url || g.images?.original?.url,
  }));
  return NextResponse.json({ gifs });
}

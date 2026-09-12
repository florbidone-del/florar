import "server-only";
import crypto from "node:crypto";

export function mpAccessToken() {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error("Falta MP_ACCESS_TOKEN en las variables de entorno.");
  return token;
}

export function appBaseUrl(requestUrl: string) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return new URL(requestUrl).origin;
}

/** Firma HMAC del webhook de Mercado Pago (x-signature). Sin secreto configurado no valida (solo para pruebas). */
export function isValidMpSignature(
  signatureHeader: string | null,
  requestId: string | null,
  dataId: string | null
) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signatureHeader || !dataId) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("=").map((s) => s.trim()))
  );
  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const hash = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return hash === parts.v1;
}

export function mapMpStatus(mpStatus: string): "approved" | "pending" | "rejected" {
  if (mpStatus === "approved") return "approved";
  if (mpStatus === "pending" || mpStatus === "in_process") return "pending";
  return "rejected";
}

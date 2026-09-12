import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "florar_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "Falta SESSION_SECRET (o es muy corto) en las variables de entorno."
    );
  }
  return new TextEncoder().encode(secret);
}

export type StudentSession = { kind: "student"; studentId: string };
export type AdminSession = {
  kind: "admin";
  username: string;
  role: "owner" | "profe";
};
export type Session = StudentSession | AdminSession;

export async function createSession(session: Session) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.kind === "student" && typeof payload.studentId === "string") {
      return { kind: "student", studentId: payload.studentId };
    }
    if (
      payload.kind === "admin" &&
      typeof payload.username === "string" &&
      (payload.role === "owner" || payload.role === "profe")
    ) {
      return { kind: "admin", username: payload.username, role: payload.role };
    }
    return null;
  } catch {
    return null;
  }
}

export async function requireStudent(): Promise<StudentSession | null> {
  const s = await getSession();
  return s && s.kind === "student" ? s : null;
}

export async function requireAdmin(): Promise<AdminSession | null> {
  const s = await getSession();
  return s && s.kind === "admin" ? s : null;
}

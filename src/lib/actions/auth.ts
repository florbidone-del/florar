"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, requireAdmin, requireStudent } from "@/lib/session";
import { requireMainProfe } from "@/lib/authz";
import { passwordIssues } from "@/lib/domain";

export type ActionResult = { error?: string } | { ok: true };

export async function studentLoginAction(input: {
  name: string;
  pin: string;
}): Promise<ActionResult> {
  const name = input.name.trim();
  const pin = input.pin.trim();
  if (name.length < 2) return { error: "Ingresá tu usuario." };
  if (!pin) return { error: "Ingresá tu PIN." };
  const id = name.toLowerCase();
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student || student.pin !== pin) {
    return {
      error:
        "No encontramos esa cuenta o el PIN no coincide. Consultá con la profesora.",
    };
  }
  await createSession({ kind: "student", studentId: id });
  return { ok: true };
}

export async function studentChangePinAction(input: {
  current: string;
  next: string;
  next2: string;
}): Promise<ActionResult> {
  const session = await requireStudent();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };
  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
  });
  if (!student) return { error: "Tenés que iniciar sesión de nuevo." };
  if (input.current.trim() !== student.pin)
    return { error: "El PIN actual no coincide." };
  if (input.next.trim().length < 4)
    return { error: "El PIN nuevo debe tener 4 dígitos." };
  if (input.next.trim() !== input.next2.trim())
    return { error: "Los PIN nuevos no coinciden." };
  if (input.next.trim() === input.current.trim())
    return { error: "Elegí un PIN distinto al actual." };
  await prisma.student.update({
    where: { id: session.studentId },
    data: { pin: input.next.trim(), mustChangePin: false },
  });
  return { ok: true };
}

export async function setMyThemeAction(theme: string): Promise<ActionResult> {
  const session = await requireStudent();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };
  await prisma.student.update({
    where: { id: session.studentId },
    data: { theme },
  });
  return { ok: true };
}

export async function setMyNickAction(nick: string): Promise<ActionResult> {
  const session = await requireStudent();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };
  const trimmed = nick.trim();
  if (trimmed.length > 30) return { error: "Máximo 30 caracteres." };
  await prisma.student.update({
    where: { id: session.studentId },
    data: { nick: trimmed || null },
  });
  return { ok: true };
}

export async function setMyDisplayNameAction(displayName: string): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };
  const trimmed = displayName.trim();
  if (trimmed.length > 30) return { error: "Máximo 30 caracteres." };
  await prisma.admin.update({
    where: { username: session.username },
    data: { displayName: trimmed || null },
  });
  return { ok: true };
}

export async function dismissStudentTutorialAction(): Promise<ActionResult> {
  const session = await requireStudent();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };
  await prisma.student.update({
    where: { id: session.studentId },
    data: { tutorialSeen: true },
  });
  return { ok: true };
}

export async function dismissAdminTutorialAction(): Promise<ActionResult> {
  const session = await requireAdmin();
  if (!session) return { error: "Tenés que iniciar sesión de nuevo." };
  await prisma.admin.update({
    where: { username: session.username },
    data: { tutorialSeen: true },
  });
  return { ok: true };
}

export async function resetAllTutorialsAction(): Promise<ActionResult> {
  const session = await requireMainProfe();
  if (!session) return { error: "No autorizado." };
  await prisma.student.updateMany({ data: { tutorialSeen: false } });
  await prisma.admin.updateMany({ data: { tutorialSeen: false } });
  return { ok: true };
}

export type ForgotPinResult =
  | { status: "not-found" }
  | { status: "already-pending" }
  | { status: "sent"; name: string; defaultPin: string; whatsapp: string | null };

export async function studentForgotPinAction(input: {
  name: string;
}): Promise<ForgotPinResult> {
  const id = input.name.trim().toLowerCase();
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) return { status: "not-found" };

  const existing = await prisma.pinResetRequest.findFirst({
    where: { studentId: id },
  });
  if (existing) return { status: "already-pending" };

  await prisma.pinResetRequest.create({ data: { studentId: id } });
  const config = await prisma.config.findUniqueOrThrow({ where: { id: 1 } });
  return {
    status: "sent",
    name: student.name,
    defaultPin: config.defaultStudentPin,
    whatsapp: config.profeWhatsapp,
  };
}

export async function adminLoginAction(input: {
  username: string;
  password: string;
}): Promise<ActionResult> {
  const username = input.username.trim().toLowerCase();
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) return { error: "Usuario no encontrado." };
  const valid = await bcrypt.compare(input.password, admin.passwordHash);
  if (!valid) return { error: "Contraseña incorrecta." };
  await createSession({ kind: "admin", username: admin.username, role: admin.role });
  return { ok: true };
}

export async function ownerSetupAction(input: {
  username: string;
  password: string;
  password2: string;
}): Promise<ActionResult> {
  const count = await prisma.admin.count();
  if (count > 0) {
    return { error: "Ya existe una cuenta de dueño/a." };
  }
  const username = input.username.trim().toLowerCase();
  if (username.length < 3)
    return { error: "Elegí un usuario de al menos 3 caracteres." };
  const issue = passwordIssues(input.password);
  if (issue) return { error: issue };
  if (input.password !== input.password2)
    return { error: "Las contraseñas no coinciden." };
  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.admin.create({
    data: { username, passwordHash, role: "owner" },
  });
  await createSession({ kind: "admin", username, role: "owner" });
  return { ok: true };
}

export async function logoutAction() {
  await destroySession();
}

"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { passwordIssues } from "@/lib/domain";
import type { ActionResult } from "@/lib/actions/auth";

async function requireOwner() {
  const session = await requireAdmin();
  if (!session || session.role !== "owner") return null;
  return session;
}

export async function createProfeAction(input: {
  username: string;
  password: string;
}): Promise<ActionResult> {
  const session = await requireOwner();
  if (!session) return { error: "No autorizado." };
  const username = input.username.trim().toLowerCase();
  if (username.length < 3) return { error: "Elegí un usuario de al menos 3 caracteres." };
  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) return { error: "Ya existe una cuenta con ese usuario." };
  const issue = passwordIssues(input.password);
  if (issue) return { error: issue };
  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.admin.create({ data: { username, passwordHash, role: "profe" } });
  return { ok: true };
}

export async function resetProfePasswordAction(input: {
  username: string;
  password: string;
}): Promise<ActionResult> {
  const session = await requireOwner();
  if (!session) return { error: "No autorizado." };
  const issue = passwordIssues(input.password);
  if (issue) return { error: issue };
  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.admin.update({
    where: { username: input.username },
    data: { passwordHash },
  });
  return { ok: true };
}

export async function deleteProfeAction(username: string): Promise<ActionResult> {
  const session = await requireOwner();
  if (!session) return { error: "No autorizado." };
  if (username === session.username) return { error: "No podés eliminar tu propia cuenta." };
  await prisma.admin.deleteMany({ where: { username } });
  return { ok: true };
}

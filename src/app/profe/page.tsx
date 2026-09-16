import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadConfig } from "@/lib/snapshot";
import { prisma } from "@/lib/prisma";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { OwnerSetupForm } from "@/components/admin/OwnerSetupForm";
import { PullToRefresh } from "@/components/shared/PullToRefresh";

export default async function ProfeLoginPage() {
  const session = await getSession();
  if (session?.kind === "admin") redirect("/profe/panel");
  if (session?.kind === "student") redirect("/alumno/panel");

  const config = await loadConfig();
  const adminCount = await prisma.admin.count();

  if (adminCount === 0) {
    return (
      <PullToRefresh>
        <OwnerSetupForm studioName={config.studioName} />
      </PullToRefresh>
    );
  }
  return (
    <PullToRefresh>
      <AdminLoginForm studioName={config.studioName} />
    </PullToRefresh>
  );
}

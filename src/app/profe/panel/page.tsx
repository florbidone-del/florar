import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { loadAdminBundle } from "@/lib/views/admin";
import { AdminApp } from "@/components/admin/AdminApp";

export default async function AdminPanelPage() {
  const session = await requireAdmin();
  if (!session) redirect("/profe");

  const bundle = await loadAdminBundle(session.username);

  return <AdminApp bundle={bundle} session={session} />;
}

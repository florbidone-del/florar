import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadConfig } from "@/lib/snapshot";
import { StudentAuthForm } from "@/components/student/StudentAuthForm";
import { PullToRefresh } from "@/components/shared/PullToRefresh";

export default async function AlumnoLoginPage() {
  const session = await getSession();
  if (session?.kind === "student") redirect("/alumno/panel");
  if (session?.kind === "admin") redirect("/profe/panel");

  const config = await loadConfig();
  return (
    <PullToRefresh>
      <StudentAuthForm studioName={config.studioName} />
    </PullToRefresh>
  );
}

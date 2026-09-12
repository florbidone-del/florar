import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadConfig } from "@/lib/snapshot";
import { StudentAuthForm } from "@/components/student/StudentAuthForm";

export default async function AlumnoLoginPage() {
  const session = await getSession();
  if (session?.kind === "student") redirect("/alumno/panel");
  if (session?.kind === "admin") redirect("/profe/panel");

  const config = await loadConfig();
  return <StudentAuthForm studioName={config.studioName} />;
}

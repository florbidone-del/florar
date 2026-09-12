import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadConfig } from "@/lib/snapshot";

export default async function LandingPage() {
  const session = await getSession();
  if (session?.kind === "student") redirect("/alumno/panel");
  if (session?.kind === "admin") redirect("/profe/panel");

  const config = await loadConfig();

  return (
    <div className="center-stage">
      <h1>{config.studioName}</h1>
      <p>Turnos, avisos y pagos del taller, en un solo lugar.</p>
      <div className="landing-buttons">
        <Link href="/alumno">
          <button className="primary block">Soy alumno/a</button>
        </Link>
        <Link href="/profe">
          <button className="ghost block">Soy profe</button>
        </Link>
      </div>
    </div>
  );
}

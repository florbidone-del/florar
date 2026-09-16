import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { loadConfig } from "@/lib/snapshot";
import { PullToRefresh } from "@/components/shared/PullToRefresh";

export default async function LandingPage() {
  const session = await getSession();
  if (session?.kind === "student") redirect("/alumno/panel");
  if (session?.kind === "admin") redirect("/profe/panel");

  const config = await loadConfig();

  return (
    <PullToRefresh>
      <div className="center-stage">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-florar.png" alt={config.studioName} className="landing-logo" />
        <h1 className="sr-only">{config.studioName}</h1>
        <p>Turnos, avisos y pagos del taller, en un solo lugar.</p>
        <div className="landing-buttons">
          <Link href="/alumno">
            <button className="primary block">Soy estudiante</button>
          </Link>
          <Link href="/profe">
            <button className="ghost block">Soy profe</button>
          </Link>
        </div>
      </div>
    </PullToRefresh>
  );
}

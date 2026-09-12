"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/lib/actions/auth";
import { capitalize } from "@/lib/domain";
import type { AdminBundle } from "@/lib/views/admin";
import type { AdminSession } from "@/lib/session";
import { WeekTab } from "@/components/admin/WeekTab";
import { StudentsTab } from "@/components/admin/StudentsTab";
import { HolidaysTab } from "@/components/admin/HolidaysTab";
import { ActivitiesTab } from "@/components/admin/ActivitiesTab";
import { AnnouncementsTab } from "@/components/admin/AnnouncementsTab";
import { ConfigTab } from "@/components/admin/ConfigTab";
import { ProfesTab } from "@/components/admin/ProfesTab";

const TAB_LABELS: Record<string, string> = {
  semana: "Semana",
  alumnos: "Alumnos",
  feriados: "Feriados",
  actividades: "Actividades",
  avisos: "Avisos",
  config: "Configuración",
  profes: "Profes",
};

export function AdminApp({ bundle, session }: { bundle: AdminBundle; session: AdminSession }) {
  const router = useRouter();
  const isOwner = session.role === "owner";
  const isMainProfe = bundle.admins.find((a) => a.username === session.username)?.isMainProfe ?? false;
  const tabs = isOwner
    ? ["profes"]
    : ["semana", "alumnos", "avisos", "actividades", "feriados", "config"];
  const [tab, setTab] = useState(tabs[0]);

  async function logout() {
    await logoutAction();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Panel</h1>
          <div className="sub">
            {capitalize(session.username)}
            <span className="badge-role">{isOwner ? "dueño/a" : "profe"}</span>
          </div>
        </div>
        <button className="ghost" onClick={logout}>
          salir
        </button>
      </div>
      {isOwner && (
        <p className="muted" style={{ marginBottom: 14 }}>
          Esta cuenta solo gestiona las cuentas del equipo docente. Para dar clase, entrá con una cuenta
          de profe.
        </p>
      )}
      <div className="tabs">
        {tabs.map((t) => (
          <div key={t} className={`tab ${t === tab ? "active" : ""}`} onClick={() => setTab(t)}>
            {TAB_LABELS[t]}
          </div>
        ))}
      </div>
      <div>
        {isOwner && tab === "profes" && <ProfesTab admins={bundle.admins} me={session.username} />}
        {!isOwner && tab === "semana" && <WeekTab bundle={bundle} />}
        {!isOwner && tab === "alumnos" && <StudentsTab bundle={bundle} me={session.username} />}
        {!isOwner && tab === "feriados" && <HolidaysTab holidays={bundle.snapshot.holidays} />}
        {!isOwner && tab === "actividades" && <ActivitiesTab activities={bundle.snapshot.activities} />}
        {!isOwner && tab === "avisos" && (
          <AnnouncementsTab
            studentInfo={bundle.snapshot.config.studentInfo}
            announcements={bundle.announcements}
          />
        )}
        {!isOwner && tab === "config" && <ConfigTab bundle={bundle} isMainProfe={isMainProfe} />}
      </div>
    </>
  );
}

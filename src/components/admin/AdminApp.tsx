"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction, dismissAdminTutorialAction } from "@/lib/actions/auth";
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
import { OnboardingTour, type TourStep } from "@/components/shared/OnboardingTour";

function ownerTourSteps(): TourStep[] {
  return [
    {
      title: "¡Bienvenida/o!",
      body: (
        <p className="muted">
          Esta cuenta de dueño/a solo gestiona el equipo docente — no ve turnos, alumnos ni cuotas.
        </p>
      ),
    },
    {
      title: "Pestaña Profes",
      focus: "profes",
      body: (
        <p className="muted">
          Acá creás las cuentas de profe, les reseteás la contraseña si hace falta, y marcás cuál es la
          profe &quot;principal&quot; (la única que puede tocar turnos por profe y reglas/cuota en su
          panel). Para dar clase, cada profe entra con su propia cuenta.
        </p>
      ),
    },
  ];
}

function profeTourSteps(isMainProfe: boolean): TourStep[] {
  return [
    { title: "¡Bienvenida/o!", body: <p className="muted">Un repaso rápido de las pestañas. Se puede saltear.</p> },
    {
      title: "Semana",
      focus: "semana",
      body: (
        <p className="muted">
          Ocupación de cada turno en la semana. Tocá un turno para ver quién está anotado y, si hace
          falta, asignar una suplencia solo para ese día.
        </p>
      ),
    },
    {
      title: "Alumnos",
      focus: "alumnos",
      body: (
        <p className="muted">
          Alta y baja de alumnos, marcar la cuota como pagada, y ahí mismo aparecen las novedades de
          cambios de turno y los pedidos de restablecer PIN.
        </p>
      ),
    },
    {
      title: "Avisos",
      focus: "avisos",
      body: (
        <p className="muted">
          Publicá avisos y la información fija que ven los alumnos en su home.
        </p>
      ),
    },
    {
      title: "Actividades",
      focus: "actividades",
      body: (
        <p className="muted">
          Marcá actividades especiales en el calendario de todos los alumnos, con fechas y material.
        </p>
      ),
    },
    {
      title: "Feriados",
      focus: "feriados",
      body: <p className="muted">Cargá los feriados del taller — cancelan las clases de ese día automáticamente.</p>,
    },
    {
      title: "Configuración",
      focus: "config",
      body: isMainProfe ? (
        <p className="muted">
          Turnos, tema de colores y, como sos la profe principal, también podés asignar qué profe da
          cada turno y ajustar las reglas y la cuota del taller.
        </p>
      ) : (
        <p className="muted">
          Turnos y tema de colores. La asignación de profes por turno y las reglas/cuota las maneja la
          profe principal.
        </p>
      ),
    },
  ];
}

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
  const tutorialSeen = bundle.admins.find((a) => a.username === session.username)?.tutorialSeen ?? false;
  const [showTour, setShowTour] = useState(!tutorialSeen);

  async function logout() {
    await logoutAction();
    router.push("/");
    router.refresh();
  }

  async function finishTour() {
    setShowTour(false);
    await dismissAdminTutorialAction();
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
      {showTour && (
        <OnboardingTour
          steps={isOwner ? ownerTourSteps() : profeTourSteps(isMainProfe)}
          onFinish={finishTour}
          onStepChange={(step) => step.focus && setTab(step.focus)}
        />
      )}
    </>
  );
}

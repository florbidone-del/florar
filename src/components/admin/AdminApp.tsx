"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logoutAction, dismissAdminTutorialAction } from "@/lib/actions/auth";
import { markSeenAction } from "@/lib/actions/notifications";
import { capitalize } from "@/lib/domain";
import type { AdminBundle } from "@/lib/views/admin";
import type { AdminSession } from "@/lib/session";
import { WeekTab } from "@/components/admin/WeekTab";
import { StudentsTab } from "@/components/admin/StudentsTab";
import { HolidaysTab } from "@/components/admin/HolidaysTab";
import { ActivitiesTab } from "@/components/admin/ActivitiesTab";
import { AnnouncementsTab } from "@/components/admin/AnnouncementsTab";
import { BlogTab } from "@/components/admin/BlogTab";
import { StudentPostsTab } from "@/components/admin/StudentPostsTab";
import { ChatTab } from "@/components/admin/ChatTab";
import { ConfigTab } from "@/components/admin/ConfigTab";
import { ProfesTab } from "@/components/admin/ProfesTab";
import { OnboardingTour, type TourStep } from "@/components/shared/OnboardingTour";
import { useBackToClose } from "@/lib/useBackToClose";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { ChatIcon, GearIcon } from "@/components/shared/Icons";
import { PullToRefreshIndicator } from "@/components/shared/PullToRefreshIndicator";

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
      title: "Chat",
      focus: "chat",
      body: isMainProfe ? (
        <p className="muted">
          Un chat por turno entre esos alumnos y su profe. Como sos la profe principal, podés ver y
          participar en el de cualquier turno.
        </p>
      ) : (
        <p className="muted">Un chat con los alumnos de tu turno — no ven los de otros turnos.</p>
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
          Publicá avisos para los alumnos y cargá los feriados del taller — un feriado cancela la clase
          de ese día automáticamente. La información fija (la que no cambia seguido) se mudó a
          Configuración.
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
      title: "CeramiBlog",
      focus: "blog",
      body: (
        <p className="muted">
          Compartí links, fotos de piezas o técnicas e ideas — queda en una pestaña propia para los
          alumnos, separado de los avisos urgentes.
        </p>
      ),
    },
    {
      title: "Configuración",
      focus: "config",
      body: isMainProfe ? (
        <p className="muted">
          Turnos, información fija para alumnos, tema de colores y, como sos la profe principal, también
          podés asignar qué profe da cada turno y ajustar las reglas y la cuota del taller.
        </p>
      ) : (
        <p className="muted">
          Turnos, información fija para alumnos y tema de colores. La asignación de profes por turno y
          las reglas/cuota las maneja la profe principal.
        </p>
      ),
    },
  ];
}

const TAB_LABELS: Record<string, string> = {
  semana: "Semana",
  alumnos: "Alumnos",
  chat: "Chat",
  actividades: "Actividades",
  avisos: "Avisos",
  blog: "CeramiBlog",
  bitacoras: "Bitácoras",
  config: "Configuración",
  profes: "Profes",
};

export function AdminApp({ bundle, session }: { bundle: AdminBundle; session: AdminSession }) {
  const router = useRouter();
  const isOwner = session.role === "owner";
  const isMainProfe = bundle.admins.find((a) => a.username === session.username)?.isMainProfe ?? false;
  const tabs = isOwner ? ["profes"] : ["semana", "alumnos", "avisos", "actividades", "blog", "bitacoras"];
  const [tab, setTab] = useState(tabs[0]);
  const tutorialSeen = bundle.admins.find((a) => a.username === session.username)?.tutorialSeen ?? false;
  const [showTour, setShowTour] = useState(!tutorialSeen);
  const [isRefreshing, startRefresh] = useTransition();
  const pullDistance = usePullToRefresh(() => startRefresh(() => router.refresh()));
  const [seenOverride, setSeenOverride] = useState<{ avisos?: boolean; chat?: boolean; blog?: boolean }>({});
  const unread = {
    avisos: bundle.unread.avisos && !seenOverride.avisos,
    chat: bundle.unread.chat && !seenOverride.chat,
    blog: bundle.unread.blog && !seenOverride.blog,
  };

  function openTab(t: string) {
    setTab(t);
    if (t === "avisos" && unread.avisos) {
      setSeenOverride((o) => ({ ...o, avisos: true }));
      markSeenAction("avisos");
    }
    if (t === "chat" && unread.chat) {
      setSeenOverride((o) => ({ ...o, chat: true }));
      markSeenAction("chat");
    }
    if (t === "blog" && unread.blog) {
      setSeenOverride((o) => ({ ...o, blog: true }));
      markSeenAction("blog");
    }
  }

  // "Atrás" en el celular vuelve a la pestaña inicial en vez de salir de la app.
  useBackToClose(() => setTab(tabs[0]), tab !== tabs[0]);

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
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={isRefreshing} />
      <div className="topbar">
        <div>
          <h1>Panel</h1>
          <div className="sub">
            {capitalize(session.username)}
            <span className="badge-role">{isOwner ? "dueño/a" : "profe"}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {!isOwner && (
            <>
              <button
                type="button"
                className={`icon-button solid ${tab === "chat" ? "active" : ""} ${unread.chat ? "has-unread" : ""}`}
                onClick={() => openTab("chat")}
                aria-label="Chat"
                title="Chat"
              >
                <ChatIcon />
                {unread.chat && <span className="unread-dot" />}
              </button>
              <button
                type="button"
                className={`icon-button solid ${tab === "config" ? "active" : ""}`}
                onClick={() => setTab("config")}
                aria-label="Configuración"
                title="Configuración"
              >
                <GearIcon />
              </button>
            </>
          )}
          <button className="ghost" onClick={logout}>
            salir
          </button>
        </div>
      </div>
      {isOwner && (
        <p className="muted" style={{ marginBottom: 14 }}>
          Esta cuenta solo gestiona las cuentas del equipo docente. Para dar clase, entrá con una cuenta
          de profe.
        </p>
      )}
      <div className="tabs">
        {tabs.map((t) => {
          const isUnread = (t === "avisos" && unread.avisos) || (t === "blog" && unread.blog);
          return (
            <div
              key={t}
              className={`tab ${t === tab ? "active" : ""} ${isUnread ? "has-unread" : ""}`}
              onClick={() => openTab(t)}
            >
              {TAB_LABELS[t]}
              {isUnread && <span className="unread-dot" />}
            </div>
          );
        })}
      </div>
      <div>
        {isOwner && tab === "profes" && <ProfesTab admins={bundle.admins} me={session.username} />}
        {!isOwner && tab === "semana" && <WeekTab bundle={bundle} />}
        {!isOwner && tab === "alumnos" && (
          <StudentsTab bundle={bundle} me={session.username} isMainProfe={isMainProfe} />
        )}
        {!isOwner && tab === "chat" && (
          <ChatTab bundle={bundle} myUsername={session.username} isMainProfe={isMainProfe} />
        )}
        {!isOwner && tab === "actividades" && <ActivitiesTab activities={bundle.snapshot.activities} />}
        {!isOwner && tab === "avisos" && (
          <>
            <AnnouncementsTab
              announcements={bundle.announcements}
              bundle={bundle}
              myUsername={session.username}
              isMainProfe={isMainProfe}
            />
            <HolidaysTab holidays={bundle.snapshot.holidays} />
          </>
        )}
        {!isOwner && tab === "blog" && <BlogTab posts={bundle.blogPosts} />}
        {!isOwner && tab === "bitacoras" && <StudentPostsTab posts={bundle.studentPosts} />}
        {!isOwner && tab === "config" && (
          <ConfigTab bundle={bundle} isMainProfe={isMainProfe} myUsername={session.username} />
        )}
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

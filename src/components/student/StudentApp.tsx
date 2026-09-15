"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Linkify } from "@/components/shared/Linkify";
import { StudentCalendar } from "@/components/student/StudentCalendar";
import { OwnSessionModal } from "@/components/student/OwnSessionModal";
import { DayInfoModal } from "@/components/student/DayInfoModal";
import { SwapModal } from "@/components/student/SwapModal";
import { ChangePinModal } from "@/components/student/ChangePinModal";
import { ForcePinChangeScreen } from "@/components/student/ForcePinChangeScreen";
import { PayButton } from "@/components/student/PayButton";
import { ChatPanel } from "@/components/shared/ChatPanel";
import { EmojiPicker } from "@/components/shared/EmojiPicker";
import { fmtLong } from "@/lib/domain";
import { THEMES } from "@/lib/themes";
import { OnboardingTour, type TourStep } from "@/components/shared/OnboardingTour";
import { useBackToClose } from "@/lib/useBackToClose";
import {
  logoutAction,
  setMyThemeAction,
  setMyNickAction,
  dismissStudentTutorialAction,
} from "@/lib/actions/auth";
import type { CalendarDay, StudentPanelData } from "@/lib/views/student";

const ALL_TABS = ["calendario", "chat", "blog", "info", "cuenta"] as const;
type Tab = (typeof ALL_TABS)[number];
// "chat" no está acá: tiene su propio botón (globito) junto a "salir", no ocupa lugar de pestaña.
const PILL_TABS: Tab[] = ["calendario", "blog", "info", "cuenta"];
const TAB_LABELS: Record<Tab, string> = {
  calendario: "Calendario",
  chat: "Chat",
  blog: "CeramiBlog",
  info: "Información del taller",
  cuenta: "Mi cuenta",
};
const SECTION_TAB: Record<string, Tab> = {
  "calendar-section": "calendario",
  "announcements-section": "calendario",
  "chat-section": "chat",
  "blog-section": "blog",
  "info-section": "info",
  "account-section": "cuenta",
};

function studentTourSteps(studioName: string): TourStep[] {
  return [
    {
      title: `¡Bienvenido/a a ${studioName}!`,
      body: <p className="muted">Un recorrido rapidito por lo que podés hacer acá. Se puede saltear.</p>,
    },
    {
      title: "Tu calendario",
      focus: "calendar-section",
      body: (
        <p className="muted">
          Tu clase fija aparece con fondo violeta sólido. Tocá ese día para ver el detalle o para
          cambiarlo; tocá cualquier otro día para ver si tiene lugar.
        </p>
      ),
    },
    {
      title: "Cambiar un turno",
      focus: "calendar-section",
      body: (
        <p className="muted">
          Podés mover una clase puntual una vez por mes, con al menos 24hs de anticipación. Si cae un
          feriado, esa clase queda para reprogramar sin gastar tu cambio del mes.
        </p>
      ),
    },
    {
      title: "Chat de tu turno",
      focus: "chat-section",
      body: (
        <p className="muted">
          Un chat solo entre vos, tus compañeros del mismo día y horario, y la profe de ese turno —
          nadie más lo ve.
        </p>
      ),
    },
    {
      title: "Avisos",
      focus: "announcements-section",
      body: (
        <p className="muted">
          Acá vas a ver los avisos recientes del taller. Si debés la cuota, te va a aparecer arriba de
          todo un botón para pagar con Mercado Pago, sin importar en qué pestaña estés.
        </p>
      ),
    },
    {
      title: "CeramiBlog",
      focus: "blog-section",
      body: (
        <p className="muted">
          Acá la profe comparte links, fotos y técnicas de vez en cuando — es más para inspirarse que
          para avisos urgentes.
        </p>
      ),
    },
    {
      title: "Información del taller",
      focus: "info-section",
      body: <p className="muted">En esta pestaña encontrás la información fija del taller y de tu profe.</p>,
    },
    {
      title: "Tu cuenta",
      focus: "account-section",
      body: (
        <p className="muted">
          Acá podés cambiar tu PIN y elegir el tema de colores de tu propia app, sin que afecte a nadie
          más.
        </p>
      ),
    },
  ];
}

type ModalState =
  | { kind: "own"; day: CalendarDay }
  | { kind: "other"; day: CalendarDay }
  | { kind: "swap"; originalDate: string; isHolidayReschedule: boolean }
  | { kind: "pin" }
  | null;

export function StudentApp({ data }: { data: StudentPanelData }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [showTour, setShowTour] = useState(!data.tutorialSeen);
  const [tourFocus, setTourFocus] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>("calendario");
  const [nick, setNick] = useState(data.nick || "");
  const [savingNick, setSavingNick] = useState(false);

  // "Atrás" en el celular vuelve a Calendario en vez de salir de la app, mientras no estés ahí.
  useBackToClose(() => setTab("calendario"), tab !== "calendario");

  async function finishTour() {
    setShowTour(false);
    setTourFocus(undefined);
    await dismissStudentTutorialAction();
  }

  useEffect(() => {
    if (!tourFocus) return;
    const target = SECTION_TAB[tourFocus];
    if (target) setTab(target);
  }, [tourFocus]);

  useEffect(() => {
    if (!tourFocus) return;
    const id = setTimeout(() => {
      document.getElementById(tourFocus)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => clearTimeout(id);
  }, [tourFocus, tab]);

  async function logout() {
    await logoutAction();
    router.push("/");
    router.refresh();
  }

  function closeAndRefresh() {
    setModal(null);
    router.refresh();
  }

  async function chooseTheme(theme: string) {
    await setMyThemeAction(theme);
    router.refresh();
  }

  async function saveNick() {
    setSavingNick(true);
    await setMyNickAction(nick);
    setSavingNick(false);
    router.refresh();
  }

  const originalDay = modal?.kind === "swap" ? data.calendar.find((d) => d.date === modal.originalDate) : null;

  if (data.mustChangePin) {
    return <ForcePinChangeScreen studentName={data.firstName} onDone={() => router.refresh()} />;
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Hola, {data.firstName}</h1>
          <div className="sub">
            {data.defaultWeekdayLabel} ·{" "}
            {data.defaultSlot ? `${data.defaultSlot.start}–${data.defaultSlot.end}` : ""}
            {data.profeName ? ` · profe: ${data.profeName}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            className={`icon-button ghost ${tab === "chat" ? "active" : ""}`}
            onClick={() => setTab("chat")}
            aria-label="Chat"
            title="Chat"
          >
            💬
          </button>
          <button className="ghost" onClick={logout}>
            salir
          </button>
        </div>
      </div>

      {data.payment.unpaid && (
        <div className="banner">
          <strong>
            {data.payment.isPartial ? "Te falta completar la cuota de este mes" : "Debés la cuota de este mes"}
          </strong>
          {data.payment.isPartial ? (
            <>
              Ya pagaste {data.payment.paidAmount} de {data.payment.fee}. Te faltan {data.payment.remaining}.
            </>
          ) : (
            <>Cuota de {data.payment.monthName}: {data.payment.fee}.</>
          )}{" "}
          {data.payment.isLate
            ? `Te pasaste de la fecha de pago (día ${data.payment.paymentWindowEnd}) — tiene un recargo del ${data.payment.lateFeePercent}%, ya incluido en el monto.`
            : data.payment.withinWindow
              ? `El pago se hace entre el día ${data.payment.paymentWindowStart} y el ${data.payment.paymentWindowEnd}.`
              : `El pago se habilita a partir del día ${data.payment.paymentWindowStart}.`}
          {data.payment.isPartial && (
            <p className="hint" style={{ marginTop: 6 }}>
              Ojo: el botón de Mercado Pago cobra la cuota completa, no el saldo. Para pagar solo lo que
              falta, coordiná con la profe.
            </p>
          )}
          <PayButton fallbackLink={data.payment.mpLink} />
        </div>
      )}

      <div className="tabs">
        {PILL_TABS.map((t) => (
          <button
            type="button"
            key={t}
            className={`tab ${t === tab ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "calendario" && (
        <div>
          <div className="card" id="announcements-section">
            <h3>Avisos</h3>
            {data.announcements.length === 0 ? (
              <p className="muted">No hay avisos por ahora.</p>
            ) : (
              data.announcements.map((a) => (
                <div className="announcement" key={a.id}>
                  <div className="date">
                    {fmtLong(a.date)}
                    {a.authorName ? ` — ${a.authorName}` : ""}
                  </div>
                  <div>{a.message}</div>
                </div>
              ))
            )}
          </div>

          <div className="stat-grid">
            <div className="stat">
              <div className="num">{data.totalClasses}</div>
              <div className="label">clase{data.totalClasses === 1 ? "" : "s"} este mes</div>
            </div>
            <div className="stat">
              <div className="num">{data.swapsLeft}</div>
              <div className="label">
                cambio{data.swapsLeft === 1 ? "" : "s"} disponible{data.swapsLeft === 1 ? "" : "s"} este mes
              </div>
            </div>
          </div>

          {data.pendingHolidays > 0 && (
            <div className="banner">
              <strong>
                {data.pendingHolidays === 1
                  ? "Tenés 1 feriado por reprogramar"
                  : `Tenés ${data.pendingHolidays} feriados por reprogramar`}
              </strong>
              Buscá el día marcado como feriado en tu calendario y tocalo para elegir una nueva fecha. No
              te gasta el cambio del mes.
            </div>
          )}

          <div className="card" id="calendar-section">
            <h3>Calendario del taller</h3>
            <p className="muted" style={{ marginTop: 6 }}>
              Tus clases están marcadas en violeta sólido. Tocá un día para verlo o cambiarlo; tocá
              cualquier otro día para ver si hay lugar.
            </p>
            {data.activitiesThisMonth.map((act, i) => (
              <div className="banner" key={i} style={{ background: "#F6EAD1", borderColor: "#C9962E" }}>
                <strong>{act.title}</strong>
                <div className="muted">{act.range}</div>
              </div>
            ))}
            <div style={{ marginTop: 10 }}>
              <StudentCalendar
                calendar={data.calendar}
                leadingBlanks={data.leadingBlanks}
                todayISO={data.todayISO}
                onOwnClick={(day) => setModal({ kind: "own", day })}
                onOtherClick={(day) => setModal({ kind: "other", day })}
              />
            </div>
          </div>
        </div>
      )}

      {tab === "chat" && (
        <div id="chat-section">
          <ChatPanel weekday={data.defaultWeekday} slotId={data.defaultSlotId} />
        </div>
      )}

      {tab === "blog" && (
        <div id="blog-section">
          {data.blogPosts.length === 0 ? (
            <p className="muted">Todavía no hay posts en el CeramiBlog.</p>
          ) : (
            data.blogPosts.map((p) => (
              <div className="card blog-post" key={p.id}>
                <div className="muted">
                  {fmtLong(p.date)}
                  {p.authorName ? ` — ${p.authorName}` : ""}
                </div>
                {p.title && <h3>{p.title}</h3>}
                {p.imageData && <img src={p.imageData} alt="" className="blog-post-image" />}
                {p.body && (
                  <p>
                    <Linkify text={p.body} />
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "info" && (
        <div id="info-section">
          {data.studentInfo ? (
            <div className="card" style={{ background: "#F6EAD1", borderColor: "#C9962E" }}>
              <h3>Información</h3>
              <div>
                <Linkify text={data.studentInfo} />
              </div>
            </div>
          ) : (
            <p className="muted">Todavía no hay información cargada.</p>
          )}
        </div>
      )}

      {tab === "cuenta" && (
        <div className="card" id="account-section">
          <h3>Tu cuenta</h3>
          <button className="ghost block" onClick={() => setModal({ kind: "pin" })}>
            Cambiar mi PIN
          </button>
          <label style={{ marginTop: 14 }}>Tu nick para el chat (opcional)</label>
          <p className="hint" style={{ marginTop: 0 }}>
            Tu nombre real ({data.studentName}) sigue siendo el que ve la profe en todos lados — esto
            solo cambia cómo te ven tus compañeros en el chat de tu turno.
          </p>
          <div className="nick-row">
            <input
              placeholder={data.studentName}
              maxLength={30}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
            />
            <EmojiPicker onPick={(e) => setNick((n) => n + e)} />
          </div>
          <button className="ghost block" style={{ marginTop: 8 }} disabled={savingNick} onClick={saveNick}>
            Guardar nick
          </button>
          <label style={{ marginTop: 14 }}>Tema de tu app</label>
          <div className="theme-grid">
            {Object.entries(THEMES).map(([key, t]) => (
              <button
                type="button"
                key={key}
                className={`theme-card ${data.theme === key ? "selected" : ""}`}
                onClick={() => chooseTheme(key)}
              >
                <div className="theme-swatch">
                  <span style={{ background: t.bg }} />
                  <span style={{ background: t.glaze }} />
                  <span style={{ background: t.oxide }} />
                  <span style={{ background: t.ink }} />
                </div>
                <div className="theme-name">{t.name}</div>
              </button>
            ))}
          </div>
          <p className="hint">
            Esto solo cambia los colores de tu propia app — no afecta lo que ven la profe ni otros
            alumnos.
          </p>
        </div>
      )}

      <p className="footer-note">{data.studioName} · turno fijo, cambios con 24hs de anticipación</p>

      {modal?.kind === "own" && (
        <OwnSessionModal
          day={modal.day}
          swapsLeft={data.swapsLeft}
          onClose={() => setModal(null)}
          onOpenSwap={(originalDate, isHolidayReschedule) =>
            setModal({ kind: "swap", originalDate, isHolidayReschedule })
          }
        />
      )}
      {modal?.kind === "other" && (
        <DayInfoModal day={modal.day} capacity={data.capacity} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "swap" && originalDay?.own && (
        <SwapModal
          originalDate={modal.originalDate}
          originalSlotId={originalDay.own.slotId}
          originalStart={originalDay.own.start}
          originalEnd={originalDay.own.end}
          isHolidayReschedule={modal.isHolidayReschedule}
          calendar={data.calendar}
          leadingBlanks={data.leadingBlanks}
          todayISO={data.todayISO}
          capacity={data.capacity}
          onClose={() => setModal(null)}
          onConfirmed={closeAndRefresh}
        />
      )}
      {modal?.kind === "pin" && <ChangePinModal onClose={() => setModal(null)} />}
      {showTour && (
        <OnboardingTour
          steps={studentTourSteps(data.studioName)}
          onFinish={finishTour}
          onStepChange={(step) => setTourFocus(step.focus)}
        />
      )}
    </>
  );
}

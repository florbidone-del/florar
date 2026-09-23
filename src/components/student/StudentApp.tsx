"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Linkify } from "@/components/shared/Linkify";
import { StudentCalendar } from "@/components/student/StudentCalendar";
import { OwnSessionModal } from "@/components/student/OwnSessionModal";
import { DayInfoModal } from "@/components/student/DayInfoModal";
import { SwapModal } from "@/components/student/SwapModal";
import { ExtraClassModal } from "@/components/student/ExtraClassModal";
import { ChangePinModal } from "@/components/student/ChangePinModal";
import { ForcePinChangeScreen } from "@/components/student/ForcePinChangeScreen";
import { PayButton } from "@/components/student/PayButton";
import { ChatPanel } from "@/components/shared/ChatPanel";
import { StudentBitacoraTab } from "@/components/student/StudentBitacoraTab";
import { TabsScroller } from "@/components/shared/TabsScroller";
import { NotificationsToggle } from "@/components/shared/NotificationsToggle";
import { EmojiPicker } from "@/components/shared/EmojiPicker";
import { PostInteractions } from "@/components/shared/PostInteractions";
import { ChatIcon, GearIcon } from "@/components/shared/Icons";
import { PullToRefreshIndicator } from "@/components/shared/PullToRefreshIndicator";
import { fmtLong } from "@/lib/domain";
import { OnboardingTour, type TourStep } from "@/components/shared/OnboardingTour";
import { useBackToClose } from "@/lib/useBackToClose";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { useSwipeTabs } from "@/lib/useSwipeTabs";
import { useTabSlideDirection } from "@/lib/useTabSlideDirection";
import {
  logoutAction,
  setMyNickAction,
  dismissStudentTutorialAction,
} from "@/lib/actions/auth";
import { markSeenAction } from "@/lib/actions/notifications";
import type { CalendarDay, StudentPanelData } from "@/lib/views/student";

const ALL_TABS = ["calendario", "chat", "blog", "bitacora", "info", "cuenta"] as const;
type Tab = (typeof ALL_TABS)[number];
// "chat" y "cuenta" no están acá: tienen su propio botón (globito / rueda) junto a "salir", no
// ocupan lugar de pestaña.
const PILL_TABS: Tab[] = ["calendario", "blog", "bitacora", "info"];
const TAB_LABELS: Record<Tab, string> = {
  calendario: "Calendario",
  chat: "Chat",
  blog: "CeramiBlog",
  bitacora: "Bitácora",
  info: "Info taller",
  cuenta: "Mi cuenta",
};
const SECTION_TAB: Record<string, Tab> = {
  "announcements-section": "calendario",
  "calendar-section": "calendario",
  "extra-class-section": "calendario",
  "blog-section": "blog",
  "bitacora-section": "bitacora",
  "info-section": "info",
  "chat-section": "chat",
  "account-section": "cuenta",
};

function studentTourSteps(studioName: string): TourStep[] {
  return [
    {
      title: `¡Bienvenidx a ${studioName}!`,
      body: <p className="muted">Te hago un recorrido de lo que podés hacer en la app.</p>,
    },
    {
      title: "Avisos",
      focus: "announcements-section",
      body: (
        <p className="muted">
          Acá vas a ver los avisos recientes del taller. Si debés la cuota, te va a aparecer arriba de
          todo un botón para pagar con Mercado Pago.
        </p>
      ),
    },
    {
      title: "Tu calendario",
      focus: "calendar-section",
      body: (
        <p className="muted">
          Tus clases aparecen con fondo violeta sólido. Tocá ese día para ver el detalle o para
          cambiarlo; tocá cualquier otro día para ver si tiene lugar.
        </p>
      ),
    },
    {
      title: "Cambiar un turno",
      focus: "calendar-section",
      body: (
        <p className="muted">
          Podés recuperar una clase al mes, con al menos 24hs de anticipación, dentro del mes corriente.
          Si una clase te cae feriado, tenes que anotarte otro día para tener tu 4ta clase. No te gasta el
          cambio del mes.
        </p>
      ),
    },
    {
      title: "Clase extra",
      focus: "extra-class-section",
      body: (
        <p className="muted">
          Debajo del calendario podés comprar una clase extra por Mercado Pago. Una vez aprobado el
          pago, elegís el día que quieras entre los que tengan lugar, dentro del mismo mes.
        </p>
      ),
    },
    {
      title: "CeramiBlog",
      focus: "blog-section",
      body: <p className="muted">Acá lxs profes comparten inspiración para lxs estudiantes.</p>,
    },
    {
      title: "Bitácora",
      focus: "bitacora-section",
      body: (
        <p className="muted">
          Registro personal y privado de tus piezas. Solo lo ven lxs profes y vos, salvo que decidan
          hacerlo público, en ese caso aparecerá en Bitácora del taller y/o también pueden
          destacarlo en CeramiBlog.
        </p>
      ),
    },
    {
      title: "Info del Taller",
      focus: "info-section",
      body: <p className="muted">Acá encontras las reglas del taller, un glosario y data de proveedores.</p>,
    },
    {
      title: "Chat de tu turno",
      focus: "chat-section",
      body: (
        <p className="muted">
          Un chat privado entre vos, tus compas del mismo turno y tu profe — nadie más lo ve.
        </p>
      ),
    },
    {
      title: "Tu cuenta",
      focus: "account-section",
      body: (
        <p className="muted">Acá podés cambiar tu PIN.</p>
      ),
    },
  ];
}

type ModalState =
  | { kind: "own"; day: CalendarDay }
  | { kind: "other"; day: CalendarDay }
  | { kind: "swap"; originalDate: string; isHolidayReschedule: boolean }
  | { kind: "pin" }
  | { kind: "extra" }
  | null;

export function StudentApp({ data }: { data: StudentPanelData }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [showTour, setShowTour] = useState(!data.tutorialSeen);
  const [tourFocus, setTourFocus] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>("calendario");
  const [nick, setNick] = useState(data.nick || "");
  const nickInputRef = useRef<HTMLInputElement>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const [savingNick, setSavingNick] = useState(false);
  const pullDistance = usePullToRefresh(() => startRefresh(() => router.refresh()));
  const [seenOverride, setSeenOverride] = useState<{ avisos?: boolean; chat?: boolean; blog?: boolean }>({});
  const unread = {
    avisos: data.unread.avisos && !seenOverride.avisos,
    chat: data.unread.chat && !seenOverride.chat,
    blog: data.unread.blog && !seenOverride.blog,
  };

  function openTab(t: Tab) {
    setTab(t);
    if (t === "calendario" && unread.avisos) {
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

  useSwipeTabs(PILL_TABS, tab, (t) => openTab(t as Tab));
  const slideDir = useTabSlideDirection(ALL_TABS, tab);

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
      const el = document.getElementById(tourFocus);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.classList.add("tour-highlight");
    }, 50);
    return () => {
      clearTimeout(id);
      document.getElementById(tourFocus)?.classList.remove("tour-highlight");
    };
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

  async function saveNick() {
    setSavingNick(true);
    await setMyNickAction(nick);
    setSavingNick(false);
    router.refresh();
  }

  const originalDay = modal?.kind === "swap" ? data.calendar.find((d) => d.date === modal.originalDate) : null;
  // Pasada la ventana de pago (hoy: día 10) sin abonar, se corta el acceso al calendario de clases.
  const paymentBlocked = data.payment.unpaid && data.payment.isLate;

  if (data.mustChangePin) {
    return <ForcePinChangeScreen studentName={data.firstName} onDone={() => router.refresh()} />;
  }

  return (
    <>
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={isRefreshing} />
      <div className="topbar">
        <div>
          <h1>Hola, {data.firstName}</h1>
          <div className="sub">
            {data.defaultWeekdayLabel} ·{" "}
            {data.defaultSlot ? `${data.defaultSlot.start}–${data.defaultSlot.end}` : ""}
            {data.profeName ? ` · profe: ${data.profeName}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
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
            className={`icon-button solid ${tab === "cuenta" ? "active" : ""}`}
            onClick={() => setTab("cuenta")}
            aria-label="Mi cuenta"
            title="Mi cuenta"
          >
            <GearIcon />
          </button>
          <button className="ghost" onClick={logout}>
            salir
          </button>
        </div>
      </div>

      {data.payment.unpaid && (
        <div className="banner">
          <strong>
            {data.payment.isPartial ? "Te falta completar la cuota del mes" : "Debés la cuota del mes"}
          </strong>
          {data.payment.isPartial ? (
            <p style={{ margin: "4px 0 0" }}>
              Ya pagaste {data.payment.paidAmount} de {data.payment.cashFee}. Te faltan{" "}
              {data.payment.remainingCash} en efectivo, {data.payment.remainingMp} en otro medio.
            </p>
          ) : (
            <>
              <p style={{ margin: "4px 0 0" }}>
                En efectivo es: {data.payment.cashFee}
                {data.payment.isLate && ` - recargo del ${data.payment.lateFeePercent}%`}
              </p>
              <p style={{ margin: "2px 0 0" }}>
                En otro medio: {data.payment.mpFee}
                {data.payment.isLate && ` - recargo del ${data.payment.lateFeePercent}%`}
              </p>
            </>
          )}
          <PayButton fallbackLink={data.payment.mpLink} />
        </div>
      )}

      {data.extraClass.availableCount > 0 && (
        <div className="banner" style={{ background: "var(--ok-bg)", borderColor: "var(--glaze)" }}>
          <strong>
            {data.extraClass.availableCount === 1
              ? "Tenés una clase extra pagada para agendar este mes"
              : `Tenés ${data.extraClass.availableCount} clases extra pagadas para agendar este mes`}
          </strong>
          <button
            className="primary block"
            style={{ marginTop: 10 }}
            onClick={() => {
              setTab("calendario");
              setModal({ kind: "extra" });
            }}
          >
            Elegir día
          </button>
        </div>
      )}

      <TabsScroller>
        {PILL_TABS.map((t) => {
          const isUnread = (t === "calendario" && unread.avisos) || (t === "blog" && unread.blog);
          return (
            <button
              type="button"
              key={t}
              className={`tab ${t === tab ? "active" : ""} ${isUnread ? "has-unread" : ""}`}
              onClick={() => openTab(t)}
            >
              {TAB_LABELS[t]}
              {isUnread && <span className="unread-dot" />}
            </button>
          );
        })}
      </TabsScroller>

      <div key={tab} className={`tab-panel-enter-${slideDir}`}>
      {tab === "calendario" && paymentBlocked && (
        <div className="card" id="calendar-section" style={{ textAlign: "center" }}>
          <h3>CUOTA VENCIDA</h3>
          <p className="muted">
            Para seguir accediendo a la app tenés que abonar la cuota del mes. Una vez que la profe
            registre tu pago, vas a volver a ver tu calendario acá.
          </p>
          <PayButton fallbackLink={data.payment.mpLink} label="Pagar ahora" />
        </div>
      )}

      {tab === "calendario" && !paymentBlocked && (
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
                  ? "Tenés una clase para agendarte este mes por feriado, para poder tener tus 4 clases mensuales"
                  : `Tenés ${data.pendingHolidays} clases para agendarte este mes por feriado, para poder tener tus 4 clases mensuales`}
              </strong>
              Buscá el día marcado en tu calendario y tocalo para elegir una nueva fecha. No te gasta el
              cambio del mes.
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

          <div className="card" id="extra-class-section">
            <h3>Clase extra</h3>
            <p className="muted" style={{ marginTop: 6 }}>
              ¡Adicionate clases en el mes! Una vez abonada, podés agendarla en el calendario en
              cualquier horario disponible.
            </p>
            {data.extraClass.pendingCount > 0 && (
              <p className="hint">
                Tenés un pago de clase extra en proceso — en cuanto se confirme vas a poder elegir el
                día.
              </p>
            )}
            <PayButton
              fallbackLink={null}
              label={`Comprar clase extra (${data.extraClass.feeAmount})`}
              endpoint="/api/mp/generar-link-extra"
            />
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
                  {p.authorName ? `${p.authorName} compartió: ` : ""}
                  {fmtLong(p.date)}
                </div>
                {p.featured && (
                  <div className="tag ok" style={{ marginTop: 4 }}>
                    ⭐ Destacado{p.studentAuthorName ? ` de ${p.studentAuthorName}` : ""}
                  </div>
                )}
                {p.title && <h3>{p.title}</h3>}
                {p.imageData && <img src={p.imageData} alt="" className="blog-post-image" />}
                {p.body && (
                  <p className="blog-post-body">
                    <Linkify text={p.body} />
                  </p>
                )}
                <PostInteractions
                  postType="blog"
                  postId={p.id}
                  likedByMe={p.likedByMe}
                  likeCount={p.likeCount}
                />
              </div>
            ))
          )}
        </div>
      )}

      {tab === "bitacora" && (
        <div id="bitacora-section">
          <StudentBitacoraTab myPosts={data.myPosts} communityPosts={data.communityPosts} />
        </div>
      )}

      {tab === "info" && (
        <div id="info-section">
          {data.studentInfo ? (
            <div className="card" style={{ background: "var(--ok-bg)", borderColor: "var(--glaze)" }}>
              <Linkify text={data.studentInfo} />
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
              ref={nickInputRef}
              placeholder={data.studentName}
              maxLength={30}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
            />
            <EmojiPicker onPick={(e) => setNick((n) => n + e)} targetRef={nickInputRef} />
          </div>
          <button className="ghost block" style={{ marginTop: 8 }} disabled={savingNick} onClick={saveNick}>
            Guardar nick
          </button>
        </div>
      )}

      {tab === "cuenta" && (
        <div className="card" style={{ marginTop: 14 }}>
          <h3>Notificaciones</h3>
          <NotificationsToggle />
        </div>
      )}
      </div>

      <p className="footer-note">
        Florar - Taller y Escuela de Cerámica
        <br />
        El espacio que reúne calidez, aprendizaje y diversión
      </p>

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
        <DayInfoModal day={modal.day} onClose={() => setModal(null)} />
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
          onClose={() => setModal(null)}
          onConfirmed={closeAndRefresh}
        />
      )}
      {modal?.kind === "pin" && <ChangePinModal onClose={() => setModal(null)} />}
      {modal?.kind === "extra" && data.extraClass.nextPurchaseId && (
        <ExtraClassModal
          purchaseId={data.extraClass.nextPurchaseId}
          calendar={data.calendar}
          leadingBlanks={data.leadingBlanks}
          todayISO={data.todayISO}
          onClose={() => setModal(null)}
          onConfirmed={closeAndRefresh}
        />
      )}
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Linkify } from "@/components/shared/Linkify";
import { StudentCalendar } from "@/components/student/StudentCalendar";
import { OwnSessionModal } from "@/components/student/OwnSessionModal";
import { DayInfoModal } from "@/components/student/DayInfoModal";
import { SwapModal } from "@/components/student/SwapModal";
import { ChangePinModal } from "@/components/student/ChangePinModal";
import { PayButton } from "@/components/student/PayButton";
import { fmtLong } from "@/lib/domain";
import { logoutAction } from "@/lib/actions/auth";
import type { CalendarDay, StudentPanelData } from "@/lib/views/student";

type ModalState =
  | { kind: "own"; day: CalendarDay }
  | { kind: "other"; day: CalendarDay }
  | { kind: "swap"; originalDate: string; isHolidayReschedule: boolean }
  | { kind: "pin" }
  | null;

export function StudentApp({ data }: { data: StudentPanelData }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);

  async function logout() {
    await logoutAction();
    router.push("/");
    router.refresh();
  }

  function closeAndRefresh() {
    setModal(null);
    router.refresh();
  }

  const originalDay = modal?.kind === "swap" ? data.calendar.find((d) => d.date === modal.originalDate) : null;

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
        <button className="ghost" onClick={logout}>
          salir
        </button>
      </div>

      {data.payment.unpaid && (
        <div className="banner">
          <strong>Debés la cuota de este mes</strong>
          Cuota de {data.payment.monthName}: {data.payment.fee}.{" "}
          {data.payment.withinWindow
            ? `El pago se hace entre el día ${data.payment.paymentWindowStart} y el ${data.payment.paymentWindowEnd}.`
            : "Ya venció la fecha habitual de pago."}
          <PayButton fallbackLink={data.payment.mpLink} />
        </div>
      )}

      {data.studentInfo && (
        <div className="card" style={{ background: "#F6EAD1", borderColor: "#C9962E" }}>
          <h3>Información</h3>
          <div>
            <Linkify text={data.studentInfo} />
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat">
          <div className="num">{data.confirmedCount}</div>
          <div className="label">clases este mes</div>
        </div>
        <div className="stat">
          <div className="num">{data.swapsLeft}</div>
          <div className="label">
            cambio{data.swapsLeft === 1 ? "" : "s"} disponible{data.swapsLeft === 1 ? "" : "s"} este mes
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Calendario del taller</h3>
        <p className="muted" style={{ marginTop: 6 }}>
          Tus clases están marcadas con un punto. Tocá un día para verlo o cambiarlo; tocá cualquier otro día
          para ver si hay lugar.
        </p>
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

      <div className="card">
        <h3>Avisos</h3>
        {data.announcements.length === 0 ? (
          <p className="muted">No hay avisos por ahora.</p>
        ) : (
          data.announcements.map((a) => (
            <div className="announcement" key={a.id}>
              <div className="date">{fmtLong(a.date)}</div>
              <div>{a.message}</div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3>Tu cuenta</h3>
        <button className="ghost block" onClick={() => setModal({ kind: "pin" })}>
          Cambiar mi PIN
        </button>
      </div>

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
    </>
  );
}

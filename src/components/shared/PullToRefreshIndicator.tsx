"use client";

const TRIGGER_DISTANCE = 70;

/** Círculo que aparece arriba de todo mientras se arrastra hacia abajo, y gira mientras refresca. */
export function PullToRefreshIndicator({
  pullDistance,
  refreshing,
}: {
  pullDistance: number;
  refreshing: boolean;
}) {
  if (pullDistance <= 0 && !refreshing) return null;
  const progress = Math.min(pullDistance / TRIGGER_DISTANCE, 1);

  return (
    <div
      className="pull-refresh-indicator"
      style={{
        transform: `translateX(-50%) translateY(${refreshing ? 14 : pullDistance - 24}px)`,
        opacity: refreshing ? 1 : progress,
      }}
    >
      <span
        className={refreshing ? "spinning" : ""}
        style={{
          display: "inline-flex",
          transform: refreshing ? undefined : `rotate(${progress * 180}deg)`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/florar-mark.png"
          alt=""
          width={28}
          height={28}
          style={{ borderRadius: "50%", display: "block" }}
        />
      </span>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const TRIGGER_DISTANCE = 70;
const MAX_VISUAL_PULL = 90;

/**
 * Gesto de "deslizar hacia abajo para actualizar" en mobile, como el de instalar la app como PWA
 * (donde no hay otra forma de refrescar salvo cerrarla y volver a abrirla). Solo arranca cuando el
 * dedo empieza arriba de todo de la página y no dentro de un modal, para no interferir con el
 * scroll normal ni con gestos dentro de un modal abierto.
 */
export function usePullToRefresh(onTrigger: () => void, disabled = false) {
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number | null>(null);
  const active = useRef(false);
  const startedInsideScrollable = useRef(false);

  useEffect(() => {
    if (disabled) return;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) return;
      const target = e.target as HTMLElement;
      if (target.closest(".modal-backdrop")) return;
      // El chat (y cualquier otra lista con su propio scroll) tiene que poder scrollear para
      // arriba/abajo sin que el gesto de refrescar la página se lo pise en el medio.
      startedInsideScrollable.current = !!target.closest(".chat-messages");
      startY.current = e.touches[0].clientY;
      active.current = true;
    }
    function onTouchMove(e: TouchEvent) {
      if (!active.current || startY.current === null) return;
      if (startedInsideScrollable.current) return;
      if (window.scrollY > 0) {
        active.current = false;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      e.preventDefault();
      setPullDistance(Math.min(delta * 0.5, MAX_VISUAL_PULL));
    }
    function onTouchEnd() {
      if (!active.current) return;
      active.current = false;
      startY.current = null;
      setPullDistance((d) => {
        if (d >= TRIGGER_DISTANCE) onTrigger();
        return 0;
      });
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [disabled, onTrigger]);

  return pullDistance;
}

"use client";

import { useEffect, useRef } from "react";

const TRIGGER_DISTANCE = 60;
const VERTICAL_CANCEL_SLACK = 15;

function isInsideHorizontalScroller(el: HTMLElement | null): boolean {
  let node = el;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth) return true;
    node = node.parentElement;
  }
  return false;
}

/**
 * Deslizar horizontalmente para pasar al tab siguiente/anterior de una lista de pestañas, como en
 * varias apps de mobile. No usa preventDefault (el scroll normal sigue andando) y se cancela solo
 * si el gesto resulta más vertical que horizontal, o si arranca dentro de algo con su propio
 * scroll horizontal (una tabla, por ejemplo) — para no pisarle el gesto a esos elementos.
 */
export function useSwipeTabs(
  tabs: string[],
  currentTab: string,
  onChange: (tab: string) => void,
  disabled = false
) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    if (disabled) return;

    function onTouchStart(e: TouchEvent) {
      const target = e.target as HTMLElement;
      if (target.closest(".modal-backdrop, .lightbox") || isInsideHorizontalScroller(target)) {
        startX.current = null;
        return;
      }
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      cancelled.current = false;
    }
    function onTouchMove(e: TouchEvent) {
      if (startX.current === null || startY.current === null || cancelled.current) return;
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > VERTICAL_CANCEL_SLACK) {
        cancelled.current = true;
      }
    }
    function onTouchEnd(e: TouchEvent) {
      if (startX.current === null || cancelled.current) {
        startX.current = null;
        return;
      }
      const dx = e.changedTouches[0].clientX - startX.current;
      startX.current = null;
      if (Math.abs(dx) < TRIGGER_DISTANCE) return;
      const idx = tabs.indexOf(currentTab);
      if (idx === -1) return;
      if (dx < 0 && idx < tabs.length - 1) onChange(tabs[idx + 1]);
      else if (dx > 0 && idx > 0) onChange(tabs[idx - 1]);
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [disabled, tabs, currentTab, onChange]);
}

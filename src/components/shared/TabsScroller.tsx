"use client";

import { useEffect, useRef, useState } from "react";

/** Envuelve una fila de tabs con scroll horizontal y le agrega flechas que aparecen solo del lado
 *  donde todavía queda contenido para desplazarse — así en vez de depender de deslizar (touch o
 *  drag), se puede tocar la flecha para avanzar/retroceder. */
export function TabsScroller({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  function updateArrows() {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows);
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
      window.removeEventListener("resize", updateArrows);
    };
  }, [children]);

  function scrollByAmount(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  return (
    <div className="tabs-scroller">
      <div className="tabs" ref={scrollRef}>
        {children}
      </div>
      {canLeft && (
        <button
          type="button"
          className="tabs-arrow tabs-arrow-left"
          aria-label="Ver tabs anteriores"
          onClick={() => scrollByAmount(-120)}
        >
          ‹
        </button>
      )}
      {canRight && (
        <button
          type="button"
          className="tabs-arrow tabs-arrow-right"
          aria-label="Ver más tabs"
          onClick={() => scrollByAmount(120)}
        >
          ›
        </button>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

/** De qué lado tiene que entrar deslizando el contenido de una pestaña, según si se avanzó o se
 *  retrocedió en el orden de `tabsOrder` respecto de la pestaña anterior. */
export function useTabSlideDirection(tabsOrder: readonly string[], currentTab: string): "left" | "right" {
  const prevIndexRef = useRef(tabsOrder.indexOf(currentTab));
  const currentIndex = tabsOrder.indexOf(currentTab);
  const dir = currentIndex >= prevIndexRef.current ? "right" : "left";

  useEffect(() => {
    prevIndexRef.current = currentIndex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab]);

  return dir;
}

"use client";

import { useEffect, useRef } from "react";

// Contador global de "profundidad": cada trap activo (un modal, o estar fuera del tab de
// inicio) pushea con un número más alto que el anterior. Como "popstate" es un solo evento
// global, esto es lo que le permite a cada trap saber si fue SU entrada la que se consumió
// (aparece un número menor a la propia) o si fue una más profunda (no le toca reaccionar) —
// así, con un modal abierto arriba de un tab que no es el de inicio, "atrás" cierra primero el
// modal, y un segundo "atrás" recién ahí vuelve al inicio.
let globalDepth = 0;

/** Hace que el botón/gesto "volver" del celular dispare `onBack` en vez de salir de la app o de
 *  la página. Mientras `active` sea true, reserva una entrada de historial; el próximo "atrás" la
 *  consume y llama a `onBack` en lugar de navegar afuera.
 *
 *  Evita pushear dos veces por el doble efecto de React StrictMode en desarrollo (monta → limpia
 *  → vuelve a montar en el mismo tick): sin ese chequeo, la limpieza intermedia corría un
 *  `history.back()` async que llegaba a destiempo y cerraba lo que se acababa de abrir. Si se
 *  cierra por otro medio (botón, click afuera) esa entrada queda inerte en el historial en vez de
 *  intentar sacarla — compensación simple a cambio de no depender de timings de navegación async. */
export function useBackToClose(onBack: () => void, active: boolean = true) {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const myDepthRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    if (myDepthRef.current === null) {
      globalDepth += 1;
      myDepthRef.current = globalDepth;
      window.history.pushState({ florarBackDepth: myDepthRef.current }, "");
    }

    function handlePopState(e: PopStateEvent) {
      const landedDepth: number = (e.state && e.state.florarBackDepth) || 0;
      if (myDepthRef.current !== null && landedDepth < myDepthRef.current) {
        myDepthRef.current = null;
        onBackRef.current();
      }
    }
    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [active]);
}

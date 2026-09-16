"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { usePullToRefresh } from "@/lib/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/shared/PullToRefreshIndicator";

/** Envuelve una página con el gesto de "deslizar para actualizar" — para pantallas previas al
 *  login (landing, ingreso de profe/estudiante), que son server components y no pueden usar el
 *  hook directo. AdminApp y StudentApp ya lo traen incorporado, así que no lo necesitan. */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const pullDistance = usePullToRefresh(() => startRefresh(() => router.refresh()));

  return (
    <>
      <PullToRefreshIndicator pullDistance={pullDistance} refreshing={isRefreshing} />
      {children}
    </>
  );
}

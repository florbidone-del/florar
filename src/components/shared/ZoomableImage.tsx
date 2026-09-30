"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useBackToClose } from "@/lib/useBackToClose";

/** Foto que al tocarla se abre a pantalla completa (chat, CeramiBlog, bitácoras). Se ve adentro de
 *  la app a propósito: con la app instalada, abrirla en otra pestaña deja sin forma de volver.
 *  "Atrás", la cruz o tocar el fondo la cierran. */
export function ZoomableImage({ src, className, alt = "" }: { src: string; className?: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        className={`${className ?? ""} zoomable`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      />
      {open && <Lightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false);
  useBackToClose(onClose);

  // Portal al body: si no, un contenedor con transform (la animación de las pestañas) haría que el
  // "position: fixed" quede atrapado adentro en vez de cubrir toda la pantalla.
  return createPortal(
    <div
      className={`lightbox ${zoomed ? "zoomed" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button type="button" className="lightbox-close" aria-label="Cerrar" onClick={onClose}>
        ✕
      </button>
      <img src={src} alt={alt} onClick={() => setZoomed((z) => !z)} />
    </div>,
    document.body
  );
}

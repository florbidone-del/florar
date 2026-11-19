"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useBackToClose } from "@/lib/useBackToClose";

/** Foto que al tocarla se abre a pantalla completa (chat, CeramiBlog, bitácoras). Se ve adentro de
 *  la app a propósito: con la app instalada, abrirla en otra pestaña deja sin forma de volver.
 *  "Atrás", la cruz o tocar el fondo la cierran.
 *
 *  Con `gallery` (todas las fotos de un post) e `index` (cuál es esta), adentro del visor se puede
 *  deslizar a las otras; `onCloseAt` avisa en qué foto se cerró, para que el carrusel quede ahí. */
export function ZoomableImage({
  src,
  className,
  alt = "",
  gallery,
  index = 0,
  onCloseAt,
}: {
  src: string;
  className?: string;
  alt?: string;
  gallery?: string[];
  index?: number;
  onCloseAt?: (index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const images = gallery && gallery.length > 1 ? gallery : [src];
  const startIndex = images === gallery ? index : 0;

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
      {open && (
        <Lightbox
          images={images}
          startIndex={startIndex}
          alt={alt}
          onClose={(i) => {
            setOpen(false);
            onCloseAt?.(i);
          }}
        />
      )}
    </>
  );
}

function Lightbox({
  images,
  startIndex,
  alt,
  onClose,
}: {
  images: string[];
  startIndex: number;
  alt: string;
  onClose: (index: number) => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [index, setIndex] = useState(startIndex);
  const trackRef = useRef<HTMLDivElement>(null);
  const close = () => onClose(index);
  useBackToClose(close);

  const isGallery = images.length > 1;

  // Arranca mostrando la foto que se tocó (sin animación). También al salir del zoom, porque la
  // tira de fotos se vuelve a montar.
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollLeft = index * track.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed]);

  function goTo(i: number) {
    const track = trackRef.current;
    if (track) track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  }

  const closeOnBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) close();
  };

  // Portal al body: si no, un contenedor con transform (la animación de las pestañas) haría que el
  // "position: fixed" quede atrapado adentro en vez de cubrir toda la pantalla.
  return createPortal(
    <div className={`lightbox ${zoomed ? "zoomed" : ""}`} onClick={closeOnBackdrop}>
      <button type="button" className="lightbox-close" aria-label="Cerrar" onClick={close}>
        ✕
      </button>
      {zoomed || !isGallery ? (
        <img src={images[index]} alt={alt} onClick={() => setZoomed((z) => !z)} />
      ) : (
        <>
          <div
            className="lightbox-track"
            ref={trackRef}
            onScroll={(e) => {
              const track = e.currentTarget;
              if (track.clientWidth > 0) setIndex(Math.round(track.scrollLeft / track.clientWidth));
            }}
          >
            {images.map((src) => (
              <div key={src} className="lightbox-slide" onClick={closeOnBackdrop}>
                <img src={src} alt={alt} onClick={() => setZoomed(true)} />
              </div>
            ))}
          </div>
          <span className="lightbox-count">
            {index + 1}/{images.length}
          </span>
          {index > 0 && (
            <button
              type="button"
              className="lightbox-arrow prev"
              aria-label="Foto anterior"
              onClick={() => goTo(index - 1)}
            >
              ‹
            </button>
          )}
          {index < images.length - 1 && (
            <button
              type="button"
              className="lightbox-arrow next"
              aria-label="Foto siguiente"
              onClick={() => goTo(index + 1)}
            >
              ›
            </button>
          )}
        </>
      )}
    </div>,
    document.body
  );
}

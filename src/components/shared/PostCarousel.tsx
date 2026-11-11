"use client";

import { useRef, useState, type ReactNode } from "react";
import { ZoomableImage } from "@/components/shared/ZoomableImage";

/** Fotos de un post (CeramiBlog o bitácora). Con una sola se ve como siempre; con varias, como un
 *  carrusel que se desliza con el dedo (o con las flechas, en compu), con puntitos abajo. El
 *  deslizado es scroll nativo con scroll-snap, así que el gesto de cambiar de pestaña lo ignora
 *  solo (useSwipeTabs no se activa adentro de algo con scroll horizontal). `overlay` es lo que va
 *  superpuesto en la esquina: el botón de borrar o el menú de acciones. */
export function PostCarousel({ images, overlay }: { images: string[]; overlay?: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (images.length === 0) return null;

  if (images.length === 1) {
    if (!overlay) return <ZoomableImage src={images[0]} className="blog-post-image" />;
    return (
      <div className="blog-post-image-wrap">
        <ZoomableImage src={images[0]} className="blog-post-image" />
        {overlay}
      </div>
    );
  }

  function goTo(i: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="blog-post-image-wrap post-carousel">
      <div
        className="post-carousel-track"
        ref={trackRef}
        onScroll={(e) => {
          const track = e.currentTarget;
          if (track.clientWidth > 0) setIndex(Math.round(track.scrollLeft / track.clientWidth));
        }}
      >
        {images.map((src) => (
          <ZoomableImage key={src} src={src} className="post-carousel-slide" />
        ))}
      </div>
      <span className="post-carousel-count">
        {index + 1}/{images.length}
      </span>
      {index > 0 && (
        <button
          type="button"
          className="post-carousel-arrow prev"
          aria-label="Foto anterior"
          onClick={() => goTo(index - 1)}
        >
          ‹
        </button>
      )}
      {index < images.length - 1 && (
        <button
          type="button"
          className="post-carousel-arrow next"
          aria-label="Foto siguiente"
          onClick={() => goTo(index + 1)}
        >
          ›
        </button>
      )}
      <div className="post-carousel-dots">
        {images.map((src, i) => (
          <button
            type="button"
            key={src}
            className={`post-carousel-dot ${i === index ? "active" : ""}`}
            aria-label={`Ver foto ${i + 1}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
      {overlay}
    </div>
  );
}

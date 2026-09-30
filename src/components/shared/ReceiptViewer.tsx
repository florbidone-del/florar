"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/shared/Modal";

// Los PDF de los bancos suelen ser de 1 página; por las dudas se dibujan hasta 3.
const MAX_PDF_PAGES = 3;

/** Muestra un comprobante (foto o PDF) adentro de la app, en un modal. No se abre en otra pestaña
 *  a propósito: con la app instalada (pantalla completa, sin barra del navegador) eso deja al
 *  usuario sin forma de volver, y "atrás" cierra la app. Acá "atrás" cierra el modal. */
export function ReceiptViewer({
  receiptId,
  isPdf,
  title,
  subtitle,
  onClose,
  children,
}: {
  receiptId: string;
  isPdf: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Botones de abajo (aprobar/rechazar, cerrar, etc). */
  children?: React.ReactNode;
}) {
  const url = `/api/comprobantes/${receiptId}`;
  const [zoomed, setZoomed] = useState(false);

  return (
    <Modal onClose={onClose}>
      <h3>{title}</h3>
      {subtitle && (
        <p className="muted" style={{ marginTop: 0 }}>
          {subtitle}
        </p>
      )}
      <div className={`receipt-viewer ${zoomed ? "zoomed" : ""}`}>
        {isPdf ? (
          <PdfPages url={url} />
        ) : (
          <img
            src={url}
            alt="Comprobante"
            onClick={() => setZoomed((z) => !z)}
            className="receipt-viewer-img"
          />
        )}
      </div>
      {!isPdf && (
        <p className="hint" style={{ textAlign: "center" }}>
          {zoomed ? "Tocá la imagen para achicarla." : "Tocá la imagen para agrandarla."}
        </p>
      )}
      {children ?? (
        <button className="ghost block" style={{ marginTop: 12 }} onClick={onClose}>
          Cerrar
        </button>
      )}
    </Modal>
  );
}

/** Dibuja las páginas del PDF en canvas con pdf.js: los navegadores de Android no muestran PDFs
 *  embebidos en la página, así que no alcanza con un <iframe>. La librería se carga recién acá. */
function PdfPages({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        const data = await (await fetch(url)).arrayBuffer();
        const doc = await pdfjs.getDocument({ data }).promise;
        const container = containerRef.current;
        if (!container || cancelled) return;
        container.innerHTML = "";
        const cssWidth = container.clientWidth || 320;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
        for (let n = 1; n <= Math.min(doc.numPages, MAX_PDF_PAGES); n++) {
          const page = await doc.getPage(n);
          const scale = cssWidth / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale: scale * pixelRatio });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.className = "receipt-viewer-page";
          container.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
          if (cancelled) return;
        }
        setState("ok");
      } catch (err) {
        console.error("[ReceiptViewer] No se pudo mostrar el PDF:", err);
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <>
      {state === "loading" && <p className="muted" style={{ textAlign: "center" }}>Cargando PDF…</p>}
      {state === "error" && (
        <p className="err" style={{ textAlign: "center" }}>
          No se pudo mostrar el PDF. Probá de nuevo más tarde.
        </p>
      )}
      <div ref={containerRef} />
    </>
  );
}

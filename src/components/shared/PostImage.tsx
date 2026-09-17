"use client";

import { TrashIcon } from "@/components/shared/Icons";

/** Foto de un post con el botón de borrar superpuesto en la esquina, en vez de un botón de
 *  texto aparte abajo de todo. */
export function PostImage({ src, onDelete }: { src: string; onDelete: () => void }) {
  return (
    <div className="blog-post-image-wrap">
      <img src={src} alt="" className="blog-post-image" />
      <button type="button" className="blog-post-delete" aria-label="Borrar" title="Borrar" onClick={onDelete}>
        <TrashIcon size={16} />
      </button>
    </div>
  );
}

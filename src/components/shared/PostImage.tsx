"use client";

import { TrashIcon } from "@/components/shared/Icons";
import { PostCarousel } from "@/components/shared/PostCarousel";

/** Foto(s) de un post con el botón de borrar superpuesto en la esquina, en vez de un botón de
 *  texto aparte abajo de todo. */
export function PostImage({ images, onDelete }: { images: string[]; onDelete: () => void }) {
  return (
    <PostCarousel
      images={images}
      overlay={
        <button type="button" className="blog-post-delete" aria-label="Borrar" title="Borrar" onClick={onDelete}>
          <TrashIcon size={16} />
        </button>
      }
    />
  );
}

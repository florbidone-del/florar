-- Los posts de CeramiBlog y de las bitácoras pasan de una sola foto ("imageData") a una lista de
-- hasta 3 ("imageUrls"). Se agrega la columna nueva y se copia la foto que ya tenía cada post.
--
-- "imageData" NO se borra acá a propósito: la app ya no la usa, pero dejarla permite volver a la
-- versión anterior sin perder fotos si algo sale mal con el deploy. Se borra en una migración
-- posterior, cuando el carrusel ya esté andando en producción.

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "StudentPost" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill
UPDATE "BlogPost" SET "imageUrls" = ARRAY["imageData"] WHERE "imageData" IS NOT NULL;
UPDATE "StudentPost" SET "imageUrls" = ARRAY["imageData"] WHERE "imageData" IS NOT NULL;

-- AlterTable
ALTER TABLE "BlogPost" ALTER COLUMN "imageUrls" DROP DEFAULT;
ALTER TABLE "StudentPost" ALTER COLUMN "imageUrls" DROP DEFAULT;

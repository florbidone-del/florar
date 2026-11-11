-- Los posts de CeramiBlog y de las bitácoras pasan de una sola foto ("imageData") a una lista de
-- hasta 3 ("imageUrls"). Se agrega la columna nueva, se copia la foto que ya tenía cada post y
-- recién después se borra la columna vieja.

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "StudentPost" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill
UPDATE "BlogPost" SET "imageUrls" = ARRAY["imageData"] WHERE "imageData" IS NOT NULL;
UPDATE "StudentPost" SET "imageUrls" = ARRAY["imageData"] WHERE "imageData" IS NOT NULL;

-- AlterTable
ALTER TABLE "BlogPost" DROP COLUMN "imageData",
ALTER COLUMN "imageUrls" DROP DEFAULT;
ALTER TABLE "StudentPost" DROP COLUMN "imageData",
ALTER COLUMN "imageUrls" DROP DEFAULT;

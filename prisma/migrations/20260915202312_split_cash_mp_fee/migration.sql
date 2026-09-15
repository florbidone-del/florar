-- Reemplaza "monthlyFee" por dos cuotas separadas (efectivo / Mercado Pago). Se renombra la
-- columna en vez de borrarla y crear una nueva, para no perder el valor ya cargado; "mpFee"
-- arranca en el mismo valor que "cashFee" (la profe puede después ponerle uno distinto).
ALTER TABLE "Config" RENAME COLUMN "monthlyFee" TO "cashFee";
ALTER TABLE "Config" ADD COLUMN "mpFee" INTEGER NOT NULL DEFAULT 15000;
UPDATE "Config" SET "mpFee" = "cashFee";

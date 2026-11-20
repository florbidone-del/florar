-- Mensaje de pago para WhatsApp editado y guardado por la profe principal. Columna opcional: si
-- queda en null, el mensaje se sigue armando solo a partir de la configuración.

-- AlterTable
ALTER TABLE "Config" ADD COLUMN "paymentMessage" TEXT;

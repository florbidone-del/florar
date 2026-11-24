-- Día de la transferencia que declara el/la estudiante al subir el comprobante (lo puede corregir la
-- profe). Solo agrega una columna opcional: los comprobantes existentes quedan con null y siguen
-- usando la fecha de subida.

-- AlterTable
ALTER TABLE "PaymentReceipt" ADD COLUMN "paidOn" TIMESTAMP(3);

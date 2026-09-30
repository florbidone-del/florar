-- AlterEnum
ALTER TYPE "PaymentSource" ADD VALUE 'transferencia';

-- AlterTable
ALTER TABLE "Config" ADD COLUMN     "mpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transferAlias" TEXT,
ADD COLUMN     "transferCbu" TEXT,
ADD COLUMN     "transferHolder" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "paidAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "fileData" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "rejectReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extraClassPurchaseId" TEXT,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_extraClassPurchaseId_key" ON "PaymentReceipt"("extraClassPurchaseId");

-- CreateIndex
CREATE INDEX "PaymentReceipt_studentId_monthKey_idx" ON "PaymentReceipt"("studentId", "monthKey");

-- CreateIndex
CREATE INDEX "PaymentReceipt_status_idx" ON "PaymentReceipt"("status");

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_extraClassPurchaseId_fkey" FOREIGN KEY ("extraClassPurchaseId") REFERENCES "ExtraClassPurchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AlterTable
ALTER TABLE "Config" ADD COLUMN     "extraClassFee" INTEGER NOT NULL DEFAULT 15000;

-- CreateTable
CREATE TABLE "ExtraClassPurchase" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "mpPaymentId" TEXT,
    "mpPreferenceId" TEXT,
    "bookedDate" DATE,
    "bookedSlotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtraClassPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtraClassPurchase_studentId_monthKey_idx" ON "ExtraClassPurchase"("studentId", "monthKey");

-- CreateIndex
CREATE INDEX "ExtraClassPurchase_bookedDate_bookedSlotId_idx" ON "ExtraClassPurchase"("bookedDate", "bookedSlotId");

-- AddForeignKey
ALTER TABLE "ExtraClassPurchase" ADD CONSTRAINT "ExtraClassPurchase_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "SlotType" AS ENUM ('weekday', 'saturday');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('owner', 'profe');

-- CreateEnum
CREATE TYPE "ChangeReason" AS ENUM ('cambio', 'feriado');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('manual', 'mercadopago');

-- CreateTable
CREATE TABLE "Config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "studioName" TEXT NOT NULL DEFAULT 'Taller de Cerámica',
    "capacity" INTEGER NOT NULL DEFAULT 8,
    "classesPerCycle" INTEGER NOT NULL DEFAULT 4,
    "swapsPerMonth" INTEGER NOT NULL DEFAULT 1,
    "paymentWindowStart" INTEGER NOT NULL DEFAULT 1,
    "paymentWindowEnd" INTEGER NOT NULL DEFAULT 10,
    "monthlyFee" INTEGER NOT NULL DEFAULT 15000,
    "mpLink" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'florar',
    "defaultStudentPin" TEXT NOT NULL DEFAULT '0000',
    "profeWhatsapp" TEXT,
    "announcementVisibleDays" INTEGER NOT NULL DEFAULT 7,
    "studentInfo" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slot" (
    "id" TEXT NOT NULL,
    "type" "SlotType" NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "date" DATE NOT NULL,
    "label" TEXT,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "Admin" (
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "defaultWeekday" INTEGER NOT NULL,
    "defaultSlotId" TEXT NOT NULL,
    "feeOverride" INTEGER,
    "mpLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotAssignment" (
    "weekday" INTEGER NOT NULL,
    "slotId" TEXT NOT NULL,
    "profeUsername" TEXT NOT NULL,

    CONSTRAINT "SlotAssignment_pkey" PRIMARY KEY ("weekday","slotId")
);

-- CreateTable
CREATE TABLE "Substitution" (
    "date" DATE NOT NULL,
    "slotId" TEXT NOT NULL,
    "profeUsername" TEXT NOT NULL,

    CONSTRAINT "Substitution_pkey" PRIMARY KEY ("date","slotId")
);

-- CreateTable
CREATE TABLE "ScheduleChange" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "fromSlotId" TEXT NOT NULL,
    "toDate" DATE NOT NULL,
    "toSlotId" TEXT NOT NULL,
    "reason" "ChangeReason" NOT NULL,
    "monthKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduleChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "source" "PaymentSource" NOT NULL,
    "mpPaymentId" TEXT,
    "mpPreferenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PinResetRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PinResetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "forProfe" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Student_defaultWeekday_defaultSlotId_idx" ON "Student"("defaultWeekday", "defaultSlotId");

-- CreateIndex
CREATE INDEX "ScheduleChange_toDate_toSlotId_idx" ON "ScheduleChange"("toDate", "toSlotId");

-- CreateIndex
CREATE INDEX "ScheduleChange_studentId_monthKey_idx" ON "ScheduleChange"("studentId", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleChange_studentId_fromDate_key" ON "ScheduleChange"("studentId", "fromDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_studentId_monthKey_key" ON "Payment"("studentId", "monthKey");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_defaultSlotId_fkey" FOREIGN KEY ("defaultSlotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotAssignment" ADD CONSTRAINT "SlotAssignment_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotAssignment" ADD CONSTRAINT "SlotAssignment_profeUsername_fkey" FOREIGN KEY ("profeUsername") REFERENCES "Admin"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Substitution" ADD CONSTRAINT "Substitution_profeUsername_fkey" FOREIGN KEY ("profeUsername") REFERENCES "Admin"("username") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChange" ADD CONSTRAINT "ScheduleChange_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChange" ADD CONSTRAINT "ScheduleChange_fromSlotId_fkey" FOREIGN KEY ("fromSlotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleChange" ADD CONSTRAINT "ScheduleChange_toSlotId_fkey" FOREIGN KEY ("toSlotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PinResetRequest" ADD CONSTRAINT "PinResetRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_forProfe_fkey" FOREIGN KEY ("forProfe") REFERENCES "Admin"("username") ON DELETE CASCADE ON UPDATE CASCADE;


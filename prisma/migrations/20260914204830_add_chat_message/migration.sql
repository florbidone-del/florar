-- CreateEnum
CREATE TYPE "ChatAuthorKind" AS ENUM ('student', 'admin');

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "slotId" TEXT NOT NULL,
    "authorKind" "ChatAuthorKind" NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorStudentId" TEXT,
    "authorAdminUsername" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatMessage_weekday_slotId_createdAt_idx" ON "ChatMessage"("weekday", "slotId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_authorStudentId_fkey" FOREIGN KEY ("authorStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_authorAdminUsername_fkey" FOREIGN KEY ("authorAdminUsername") REFERENCES "Admin"("username") ON DELETE SET NULL ON UPDATE CASCADE;

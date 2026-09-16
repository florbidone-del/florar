-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "chatSeenAt";

-- CreateTable
CREATE TABLE "AdminChatSeen" (
    "adminUsername" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "slotId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminChatSeen_pkey" PRIMARY KEY ("adminUsername","weekday","slotId")
);

-- AddForeignKey
ALTER TABLE "AdminChatSeen" ADD CONSTRAINT "AdminChatSeen_adminUsername_fkey" FOREIGN KEY ("adminUsername") REFERENCES "Admin"("username") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminChatSeen" ADD CONSTRAINT "AdminChatSeen_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

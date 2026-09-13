-- AlterTable
ALTER TABLE "Slot" DROP COLUMN "type",
ADD COLUMN     "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- DropEnum
DROP TYPE "SlotType";


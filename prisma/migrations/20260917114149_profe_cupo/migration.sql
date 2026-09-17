-- AlterTable
ALTER TABLE "Admin" ADD COLUMN "cupo" INTEGER NOT NULL DEFAULT 12;

-- AlterTable
ALTER TABLE "Config" DROP COLUMN "capacity";

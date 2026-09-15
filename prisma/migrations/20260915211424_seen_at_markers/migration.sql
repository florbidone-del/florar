-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "avisosSeenAt" TIMESTAMP(3),
ADD COLUMN     "blogSeenAt" TIMESTAMP(3),
ADD COLUMN     "chatSeenAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "avisosSeenAt" TIMESTAMP(3),
ADD COLUMN     "blogSeenAt" TIMESTAMP(3),
ADD COLUMN     "chatSeenAt" TIMESTAMP(3);

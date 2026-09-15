-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceStudentPostId" TEXT,
ADD COLUMN     "studentAuthorName" TEXT;

-- CreateTable
CREATE TABLE "StudentPost" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "imageData" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentPost_studentId_createdAt_idx" ON "StudentPost"("studentId", "createdAt");

-- AddForeignKey
ALTER TABLE "StudentPost" ADD CONSTRAINT "StudentPost_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

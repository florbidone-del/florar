-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "slotId" TEXT,
ADD COLUMN     "weekday" INTEGER;

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "attachmentType" TEXT,
ADD COLUMN     "attachmentUrl" TEXT;

-- CreateTable
CREATE TABLE "PostLike" (
    "id" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "actorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "postType" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "actorKey" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostLike_postType_postId_idx" ON "PostLike"("postType", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "PostLike_postType_postId_actorKey_key" ON "PostLike"("postType", "postId", "actorKey");

-- CreateIndex
CREATE INDEX "PostComment_postType_postId_createdAt_idx" ON "PostComment"("postType", "postId", "createdAt");

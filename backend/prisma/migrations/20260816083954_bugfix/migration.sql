/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `staff` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `change` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "change" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "staff" ADD COLUMN     "userId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "staff_userId_key" ON "staff"("userId");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

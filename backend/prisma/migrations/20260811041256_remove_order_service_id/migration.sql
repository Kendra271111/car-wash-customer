/*
  Warnings:

  - You are about to drop the column `serviceId` on the `orders` table. All the data in the column will be lost.
  - Added the required column `serviceId` to the `order_items` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_serviceId_fkey";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "serviceId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "orders" DROP COLUMN "serviceId";

-- AlterTable
ALTER TABLE "services" ALTER COLUMN "qty" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

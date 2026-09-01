-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_staffId_fkey";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "staffId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_customerId_fkey";

-- AlterTable
ALTER TABLE "vehicles" ALTER COLUMN "customerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

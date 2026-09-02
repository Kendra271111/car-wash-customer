-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "midtransOrderId" TEXT,
ADD COLUMN     "notes" TEXT,
ALTER COLUMN "method" DROP NOT NULL;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "password" TEXT,
ADD COLUMN     "pfp" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';

-- CreateEnum
CREATE TYPE "VaultStatus" AS ENUM ('ACTIVE', 'CLAIMABLE', 'CLAIMED');

-- AlterTable
ALTER TABLE "Vault" ADD COLUMN     "status" "VaultStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Vault_status_idx" ON "Vault"("status");

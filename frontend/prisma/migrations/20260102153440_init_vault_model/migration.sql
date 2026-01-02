-- CreateTable
CREATE TABLE "Vault" (
    "id" TEXT NOT NULL,
    "txId" TEXT NOT NULL,
    "ownerAddress" TEXT NOT NULL,
    "ownerPubkey" TEXT NOT NULL,
    "nomineeAddress" TEXT NOT NULL,
    "lockedAmount" DOUBLE PRECISION NOT NULL,
    "lockedAmountSatoshis" BIGINT NOT NULL,
    "inactivityTimeout" TEXT NOT NULL,
    "inactivityTimeoutBlocks" INTEGER NOT NULL,
    "appVerificationKey" TEXT NOT NULL,
    "spell" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "claimedTxId" TEXT,

    CONSTRAINT "Vault_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vault_txId_key" ON "Vault"("txId");

-- CreateIndex
CREATE INDEX "Vault_nomineeAddress_idx" ON "Vault"("nomineeAddress");

-- CreateIndex
CREATE INDEX "Vault_ownerAddress_idx" ON "Vault"("ownerAddress");

-- CreateIndex
CREATE INDEX "Vault_createdAt_idx" ON "Vault"("createdAt");

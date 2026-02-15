-- CreateTable
CREATE TABLE "WhaleTransaction" (
    "id" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockchain" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUsd" DOUBLE PRECISION NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromOwner" TEXT,
    "fromType" TEXT,
    "toAddress" TEXT NOT NULL,
    "toOwner" TEXT,
    "toType" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "blockNumber" INTEGER,
    "confirmations" INTEGER,
    "transactionType" TEXT NOT NULL,
    "significance" TEXT NOT NULL DEFAULT 'medium',
    "alertSent" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'blockchain-api',
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhaleTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhaleWallet" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "blockchain" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "exchange" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastSeen" TIMESTAMP(3),
    "totalTxCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhaleWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhaleActivitySummary" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "exchangeInflow" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "exchangeOutflow" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netFlow" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inflowTxCount" INTEGER NOT NULL DEFAULT 0,
    "outflowTxCount" INTEGER NOT NULL DEFAULT 0,
    "largestTxAmount" DOUBLE PRECISION,
    "largestTxHash" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhaleActivitySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhaleTransaction_txHash_key" ON "WhaleTransaction"("txHash");

-- CreateIndex
CREATE INDEX "WhaleTransaction_symbol_timestamp_idx" ON "WhaleTransaction"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "WhaleTransaction_transactionType_timestamp_idx" ON "WhaleTransaction"("transactionType", "timestamp");

-- CreateIndex
CREATE INDEX "WhaleTransaction_blockchain_timestamp_idx" ON "WhaleTransaction"("blockchain", "timestamp");

-- CreateIndex
CREATE INDEX "WhaleTransaction_fromOwner_idx" ON "WhaleTransaction"("fromOwner");

-- CreateIndex
CREATE INDEX "WhaleTransaction_toOwner_idx" ON "WhaleTransaction"("toOwner");

-- CreateIndex
CREATE INDEX "WhaleTransaction_significance_idx" ON "WhaleTransaction"("significance");

-- CreateIndex
CREATE UNIQUE INDEX "WhaleWallet_address_key" ON "WhaleWallet"("address");

-- CreateIndex
CREATE INDEX "WhaleWallet_blockchain_ownerType_idx" ON "WhaleWallet"("blockchain", "ownerType");

-- CreateIndex
CREATE INDEX "WhaleWallet_exchange_idx" ON "WhaleWallet"("exchange");

-- CreateIndex
CREATE INDEX "WhaleActivitySummary_symbol_timeframe_idx" ON "WhaleActivitySummary"("symbol", "timeframe");

-- CreateIndex
CREATE INDEX "WhaleActivitySummary_periodStart_idx" ON "WhaleActivitySummary"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "WhaleActivitySummary_symbol_timeframe_periodStart_key" ON "WhaleActivitySummary"("symbol", "timeframe", "periodStart");

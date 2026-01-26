-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('ANALYST', 'PRO', 'INSTITUTIONAL');

-- CreateEnum
CREATE TYPE "ExchangeName" AS ENUM ('BINANCE', 'COINBASE', 'KRAKEN', 'BYBIT', 'OKX', 'BITFINEX', 'KUCOIN', 'GATEIO', 'HUOBI', 'BITGET');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyToken" TEXT,
    "emailVerifyExpiry" TIMESTAMP(3),
    "resetPasswordToken" TEXT,
    "resetPasswordExpiry" TIMESTAMP(3),
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'ANALYST',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exchange" "ExchangeName" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiSecret" TEXT NOT NULL,
    "passphrase" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingSignal" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "symbol" TEXT NOT NULL,
    "exchange" "ExchangeName" NOT NULL,
    "signalType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indicators" JSONB NOT NULL,
    "reason" TEXT,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "executionPrice" DOUBLE PRECISION,
    "executionTime" TIMESTAMP(3),

    CONSTRAINT "TradingSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange" "ExchangeName",
    "condition" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketData" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange" "ExchangeName" NOT NULL,
    "timeframe" TEXT NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "indicators" JSONB,

    CONSTRAINT "MarketData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiquidationZone" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchange" "ExchangeName" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "side" TEXT NOT NULL,
    "estimatedLiquidity" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredAt" TIMESTAMP(3),

    CONSTRAINT "LiquidationZone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "ExchangeApiKey_userId_idx" ON "ExchangeApiKey"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeApiKey_userId_exchange_key" ON "ExchangeApiKey"("userId", "exchange");

-- CreateIndex
CREATE INDEX "TradingSignal_symbol_exchange_idx" ON "TradingSignal"("symbol", "exchange");

-- CreateIndex
CREATE INDEX "TradingSignal_timestamp_idx" ON "TradingSignal"("timestamp");

-- CreateIndex
CREATE INDEX "TradingSignal_userId_idx" ON "TradingSignal"("userId");

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- CreateIndex
CREATE INDEX "Alert_isActive_idx" ON "Alert"("isActive");

-- CreateIndex
CREATE INDEX "MarketData_symbol_exchange_timeframe_idx" ON "MarketData"("symbol", "exchange", "timeframe");

-- CreateIndex
CREATE INDEX "MarketData_timestamp_idx" ON "MarketData"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "MarketData_symbol_exchange_timeframe_timestamp_key" ON "MarketData"("symbol", "exchange", "timeframe", "timestamp");

-- CreateIndex
CREATE INDEX "LiquidationZone_symbol_exchange_idx" ON "LiquidationZone"("symbol", "exchange");

-- CreateIndex
CREATE INDEX "LiquidationZone_detectedAt_idx" ON "LiquidationZone"("detectedAt");

-- AddForeignKey
ALTER TABLE "ExchangeApiKey" ADD CONSTRAINT "ExchangeApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingSignal" ADD CONSTRAINT "TradingSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

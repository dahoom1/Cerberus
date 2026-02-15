-- AlterTable
ALTER TABLE "TradingSignal" ADD COLUMN     "inverseSentiment" DOUBLE PRECISION,
ADD COLUMN     "newsScore" DOUBLE PRECISION,
ADD COLUMN     "newsWeight" DOUBLE PRECISION,
ADD COLUMN     "sentimentScore" DOUBLE PRECISION,
ADD COLUMN     "sentimentWeight" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "SentimentData" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sentiment" DOUBLE PRECISION NOT NULL,
    "inverseSentiment" DOUBLE PRECISION NOT NULL,
    "volume" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawData" JSONB,

    CONSTRAINT "SentimentData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "sentiment" DOUBLE PRECISION NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "summary" TEXT,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalPerformance" (
    "id" TEXT NOT NULL,
    "signalId" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION,
    "currentPnL" DOUBLE PRECISION,
    "highestPrice" DOUBLE PRECISION,
    "lowestPrice" DOUBLE PRECISION,
    "weekEndPrice" DOUBLE PRECISION,
    "directionCorrect" BOOLEAN,
    "priceChange" DOUBLE PRECISION,
    "accuracyScore" DOUBLE PRECISION,
    "performanceTier" TEXT,
    "trackingStarted" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackingEnded" TIMESTAMP(3),
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignalPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopCoin" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marketCapRank" INTEGER NOT NULL,
    "marketCap" DOUBLE PRECISION NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TopCoin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentimentData_symbol_timestamp_idx" ON "SentimentData"("symbol", "timestamp");

-- CreateIndex
CREATE INDEX "SentimentData_source_symbol_idx" ON "SentimentData"("source", "symbol");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_url_key" ON "NewsArticle"("url");

-- CreateIndex
CREATE INDEX "NewsArticle_symbol_publishedAt_idx" ON "NewsArticle"("symbol", "publishedAt");

-- CreateIndex
CREATE INDEX "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SignalPerformance_signalId_key" ON "SignalPerformance"("signalId");

-- CreateIndex
CREATE INDEX "SignalPerformance_signalId_idx" ON "SignalPerformance"("signalId");

-- CreateIndex
CREATE INDEX "SignalPerformance_performanceTier_idx" ON "SignalPerformance"("performanceTier");

-- CreateIndex
CREATE UNIQUE INDEX "TopCoin_symbol_key" ON "TopCoin"("symbol");

-- CreateIndex
CREATE INDEX "TopCoin_marketCapRank_idx" ON "TopCoin"("marketCapRank");

-- AddForeignKey
ALTER TABLE "SignalPerformance" ADD CONSTRAINT "SignalPerformance_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "TradingSignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

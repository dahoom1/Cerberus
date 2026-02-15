-- AlterTable
ALTER TABLE "LiquidationZone" ADD COLUMN     "heatmapData" JSONB,
ADD COLUMN     "reasoning" JSONB,
ADD COLUMN     "stopLoss1" DOUBLE PRECISION,
ADD COLUMN     "stopLoss2" DOUBLE PRECISION,
ADD COLUMN     "suggestion" TEXT,
ADD COLUMN     "takeProfit1" DOUBLE PRECISION,
ADD COLUMN     "takeProfit2" DOUBLE PRECISION;

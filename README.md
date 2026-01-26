# Crypto Trading Intelligence Platform

AI-powered cryptocurrency trading intelligence platform with real-time market analysis, technical indicators, liquidation hunt detection, and automated trading signals.

## Tech Stack

### Frontend
- React 18+ with TypeScript
- Redux Toolkit for state management
- Tailwind CSS + shadcn/ui
- TradingView Lightweight Charts
- Socket.io-client for real-time updates

### Backend
- Node.js 18+ with TypeScript
- Express.js
- PostgreSQL + Prisma ORM
- Redis for caching
- Socket.io for WebSockets
- Bull for job queues
- CCXT for exchange connectivity

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
- Copy `.env.example` to `.env` in both `backend/` and `frontend/` directories
- Configure database, Redis, and API keys

4. Set up database:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

5. Start development servers:
```bash
npm run dev
```

## Project Structure

```
.
├── backend/          # Node.js/Express backend
├── frontend/         # React frontend
└── README.md
```

## Features

- User authentication & management
- Multi-exchange connectivity (Binance, Coinbase, Kraken, etc.)
- 50+ technical indicators
- Liquidation hunt detection
- Real-time market data
- Trading signals generation
- API key management
- Subscription tiers

## License

MIT

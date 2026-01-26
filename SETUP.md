# Setup Guide

## Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+
- Redis 6+ (optional but recommended)

## Installation Steps

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE crypto_trading;
```

2. Configure environment variables in `backend/.env`:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials
```

3. Run Prisma migrations:
```bash
cd backend
npx prisma migrate dev
npx prisma generate
```

### 3. Redis Setup (Optional)

If you want to use Redis for caching and sessions:

```bash
# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
redis-server
```

Update `backend/.env` with Redis connection details.

### 4. Environment Configuration

#### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/crypto_trading
JWT_SECRET=your-super-secret-jwt-key
REDIS_HOST=localhost
REDIS_PORT=6379
FRONTEND_URL=http://localhost:3000
```

#### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

### 5. Email Configuration (Optional)

For email verification and password reset, configure SMTP in `backend/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@tradingplatform.com
```

### 6. Start Development Servers

#### Option 1: Run separately
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

#### Option 2: Run from root (if concurrently is installed)
```bash
npm run dev
```

### 7. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/health

## Production Deployment

### Backend Deployment

1. Build the backend:
```bash
cd backend
npm run build
```

2. Set up PM2:
```bash
npm install -g pm2
pm2 start dist/index.js --name crypto-trading-api
```

3. Configure Nginx (reverse proxy):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

4. Set up SSL with Let's Encrypt:
```bash
sudo certbot --nginx -d your-domain.com
```

### Frontend Deployment

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Serve with Nginx:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Features Implemented

✅ User Authentication (JWT, registration, login, password reset)
✅ Exchange Connectivity (CCXT integration for 10+ exchanges)
✅ Technical Indicators Engine (50+ indicators)
✅ Liquidation Hunt Detection
✅ Real-time WebSocket Updates
✅ Trading Signal Generation
✅ API Key Management (encrypted storage)
✅ User Profile Management
✅ Subscription Tier System

## Next Steps

1. Add ML/AI models for signal generation
2. Implement auto-trading execution
3. Add more advanced charting
4. Integrate Glassnode API for on-chain analytics
5. Add backtesting capabilities
6. Implement portfolio tracking
7. Add alert notifications (email, SMS, push)

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check DATABASE_URL in `.env`
- Ensure database exists: `psql -l`

### Port Already in Use
- Change ports in `.env` files
- Kill process: `lsof -ti:5000 | xargs kill`

### CCXT Exchange Errors
- Some exchanges require API keys for certain endpoints
- Check exchange-specific requirements in CCXT documentation

## Support

For issues or questions, please check the documentation or create an issue in the repository.

# Deployment Guide - Trading Platform

This guide covers deploying your trading platform to the cloud with multiple hosting options.

---

## 🚀 Option 1: Railway (Recommended - Easiest)

**Pros:**
- ✅ Free tier ($5 monthly credit)
- ✅ PostgreSQL database included
- ✅ Auto-deploys from GitHub
- ✅ WebSocket support
- ✅ Simple setup (5 minutes)

**Cost:** ~$10-20/month after free tier

### Setup Railway

#### 1. Prepare Your Code

First, push your code to GitHub:

```bash
cd /Users/abdulrahmanal-omrani/Trading\ CCXT+

# Initialize git (if not already done)
git add .
git commit -m "Prepare for deployment"
git push origin main
```

#### 2. Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

#### 3. Deploy Backend + Database

1. Click "Deploy from GitHub repo"
2. Select your repository
3. Choose the `backend` folder as root directory
4. Railway will auto-detect Node.js

**Add PostgreSQL:**
1. Click "New" → "Database" → "PostgreSQL"
2. Railway automatically creates `DATABASE_URL` variable

**Configure Backend Environment:**

Go to backend service → Variables → Add:

```env
NODE_ENV=production
PORT=5001
DATABASE_URL=${DATABASE_URL}  # Auto-provided by Railway
JWT_SECRET=your-super-secret-jwt-key-change-this
```

**Add Build Command:**

Go to Settings → Build & Deploy:
- Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
- Start Command: `npm start`

#### 4. Deploy Frontend

1. Click "New" → "GitHub Repo" (same repo)
2. Choose `frontend` folder as root directory
3. Railway auto-detects Vite

**Configure Frontend Environment:**

Go to frontend service → Variables → Add:

```env
VITE_API_URL=https://your-backend-url.railway.app/api
VITE_WS_URL=https://your-backend-url.railway.app
```

**Note:** Replace `your-backend-url` with the actual Railway backend URL (found in backend service → Settings → Domain)

**Add Build Settings:**

- Build Command: `npm install && npm run build`
- Start Command: `npm run preview`

Or use static hosting (recommended):
- Build Command: `npm install && npm run build`
- Output Directory: `dist`
- Set as Static Site

#### 5. Setup Custom Domain (Optional)

In each service → Settings → Generate Domain

Or add your own domain:
- Settings → Custom Domain → Add your domain
- Update DNS records as shown

#### 6. Database Migration

Railway will run migrations automatically on first deploy. If not:

1. Click on PostgreSQL service
2. Copy `DATABASE_URL` from Variables
3. Run locally:

```bash
cd backend
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## 🌐 Option 2: Vercel + Render

**Frontend on Vercel (Free)**
**Backend + DB on Render (Free tier available)**

### Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repo
3. Configure:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. Add Environment Variables:
```env
VITE_API_URL=https://your-app.onrender.com/api
VITE_WS_URL=https://your-app.onrender.com
```

5. Deploy!

### Deploy Backend to Render

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Configure:
   - Name: `trading-backend`
   - Root Directory: `backend`
   - Runtime: Node
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm start`

5. Add Environment Variables:
```env
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://...  # From Render PostgreSQL
JWT_SECRET=your-secret-key
```

6. Create PostgreSQL Database:
   - Dashboard → New → PostgreSQL
   - Copy Internal Database URL
   - Add to backend service as `DATABASE_URL`

---

## 💰 Option 3: DigitalOcean App Platform

**Cost:** ~$12/month (includes everything)

### Deploy on DigitalOcean

1. Go to [digitalocean.com](https://www.digitalocean.com/products/app-platform)
2. Create account (get $200 credit with student/new user)
3. Click "Create App" → GitHub

4. **Configure Components:**

**Backend:**
- Type: Web Service
- Source: `/backend`
- Build Command: `npm install && npx prisma generate`
- Run Command: `npm start`
- HTTP Port: 5001
- Environment Variables:
  ```env
  NODE_ENV=production
  DATABASE_URL=${db.DATABASE_URL}
  JWT_SECRET=your-secret
  ```

**Frontend:**
- Type: Static Site
- Source: `/frontend`
- Build Command: `npm install && npm run build`
- Output Directory: `dist`
- Environment Variables:
  ```env
  VITE_API_URL=${backend.PUBLIC_URL}/api
  VITE_WS_URL=${backend.PUBLIC_URL}
  ```

**Database:**
- Add Database → PostgreSQL
- Plan: Basic ($12/month)

5. Click "Create Resources"

---

## 🐳 Option 4: Docker + Any Cloud (Most Flexible)

For advanced users who want full control.

### Create Docker Files

**Backend Dockerfile:**

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

EXPOSE 5001

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

**Frontend Dockerfile:**

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Frontend nginx.conf:**

Create `frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Docker Compose:**

Create `docker-compose.yml` in root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: trading
      POSTGRES_PASSWORD: your-password
      POSTGRES_DB: trading_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "5001:5001"
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://trading:your-password@postgres:5432/trading_db
      JWT_SECRET: your-secret-key
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

Deploy to:
- **AWS EC2**: Launch instance, install Docker, run `docker-compose up -d`
- **Google Cloud Run**: Push to Container Registry, deploy
- **Azure Container Instances**: Push to ACR, deploy

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

### Backend

- [ ] Update `backend/package.json` scripts:
```json
{
  "scripts": {
    "start": "node dist/index.js",
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "migrate": "npx prisma migrate deploy"
  }
}
```

- [ ] Add to `backend/.gitignore`:
```
node_modules/
.env
dist/
*.log
```

- [ ] Create `backend/.env.example`:
```env
NODE_ENV=production
PORT=5001
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=change-this-secret
```

### Frontend

- [ ] Update CORS in `backend/src/index.ts`:
```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

- [ ] Add to `frontend/.gitignore`:
```
node_modules/
dist/
.env
.env.local
```

### Security

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Enable HTTPS (most platforms auto-provide SSL)
- [ ] Set secure CORS origins (not `*` in production)
- [ ] Add rate limiting to API endpoints
- [ ] Review API keys for CCXT exchanges

---

## 🔒 Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` files
   - Use platform secret managers
   - Rotate JWT secrets regularly

2. **Database:**
   - Enable SSL connections
   - Use strong passwords
   - Regular backups (most platforms auto-backup)

3. **API Protection:**
   - Add rate limiting (express-rate-limit)
   - Validate all inputs
   - Use helmet.js for security headers

4. **Monitoring:**
   - Enable platform logs
   - Set up error alerts
   - Monitor resource usage

---

## 💡 Cost Comparison

| Platform | Free Tier | Paid Cost | Best For |
|----------|-----------|-----------|----------|
| **Railway** | $5 credit | ~$15/mo | Quick setup, all-in-one |
| **Vercel + Render** | Limited free | ~$7/mo | Separate frontend/backend |
| **DigitalOcean** | $200 credit | ~$12/mo | Stable pricing, predictable |
| **Heroku** | Limited | ~$16/mo | Simple but expensive |
| **AWS/GCP** | 12mo free | Variable | Enterprise, scalable |

---

## 🎯 Recommended Path

**For Beginners:**
→ Railway (easiest, all-in-one)

**For Free Hosting:**
→ Vercel (frontend) + Render free tier (backend)

**For Production:**
→ DigitalOcean App Platform (stable, predictable)

**For Scale:**
→ AWS/GCP with Docker + Kubernetes

---

## 🆘 Troubleshooting

### Database Connection Errors
```bash
# Test connection string locally
cd backend
npx prisma db pull
```

### Build Failures
```bash
# Check Node version (should be 18+)
node --version

# Clear cache
rm -rf node_modules package-lock.json
npm install
```

### CORS Errors
Add to backend:
```typescript
app.use(cors({
  origin: ['https://yourfrontend.vercel.app', 'http://localhost:5173'],
  credentials: true
}));
```

### WebSocket Issues
Ensure platform supports WebSocket connections:
- Railway: ✅ Supported
- Render: ✅ Supported
- Vercel: ❌ Not for backend (use Render/Railway for backend)

---

## 📞 Support

- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- DigitalOcean Docs: https://docs.digitalocean.com

---

**Ready to deploy?** Start with Railway for the easiest experience!

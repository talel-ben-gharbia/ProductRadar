# ProductRadar

A full-stack e-commerce intelligence and price monitoring platform with a consumer shopping experience, B2B analytics suite, and admin panel.

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | PHP 8.4+, Symfony 8.0, Doctrine ORM, PostgreSQL 18, Redis 7 |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui |
| **ML** | Python, FastAPI, XGBoost (price prediction) |
| **Auth** | Firebase Google OAuth (B2C), HMAC (B2B), API keys (Admin) |
| **Payments** | Stripe |
| **Infrastructure** | Docker / Docker Compose |

## Features

### 🛒 B2C (Consumer)
- Browse products with category navigation
- Price history charts and "Best Time to Buy" AI predictions
- Product comparison, favorites, price drop / stock alerts
- Google OAuth login and premium subscription plans via Stripe
- Customer reviews

### 📊 B2B (Brands & Retailers)
- Competitor pricing monitoring and distribution coverage
- Share-of-shelf analytics, reviews sentiment analysis
- Sponsored product ad campaigns and watchlists
- Custom reports, price dispersion analysis
- AI-powered competitor comparison assistant

### 🔧 Admin Panel
- Product quality control (merge/split duplicates)
- Scraping workflow management (n8n integration, manual trigger, logs)
- User, seller, category, subscription management
- Review moderation (batch approve/reject)
- B2B brand and company verification workflows
- System health monitoring, activity logs, data export

## Quick Start

### Prerequisites
- Docker Desktop
- PHP 8.4+ with `pdo_pgsql`, `intl`, `zip`
- Composer 2.x
- Node.js 20+

### Setup

```bash
# 1. Start PostgreSQL
docker compose up -d db

# 2. Backend
cd backend
composer install
php bin/console doctrine:migrations:migrate
php bin/console cache:clear
php -S 0.0.0.0:8000 -t public

# 3. Frontend
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

### Environment Variables

**`backend/.env.local`**
```
DATABASE_URL="postgresql://app:secret@127.0.0.1:5432/app?charset=utf8"
STRIPE_SECRET_KEY=sk_...
FIREBASE_CREDENTIALS=path/to/firebase.json
B2B_AUTH_SECRET=...
ADMIN_API_KEY=...
WEBHOOK_API_KEY=...
N8N_MANUAL_SCRAPE_WEBHOOK_URL=...
MAILER_DSN=smtp://localhost:1025
```

**`frontend/.env.local`**
```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
REDIS_URL=redis://localhost:6379
SESSION_SECRET=...
B2B_AUTH_SECRET=...
```

## Project Structure

```
ProductRadar/
├── backend/           # Symfony API (controllers, entities, services, migrations)
│   └── PriceRecomendationModel/  # Python ML microservice (FastAPI + XGBoost)
├── frontend/          # Next.js BFF (App Router pages, components, API routes)
└── docker-compose.yml # Development infrastructure
```

## Deployment

```bash
docker compose -f docker-compose.server.yml up -d
```

## Useful Commands

```bash
php bin/console debug:router              # List API routes
php bin/console make:migration             # Create DB migration
php bin/console doctrine:migrations:migrate # Apply migrations
npm run build                              # Frontend production build
npm run lint / format / typecheck          # Code quality
```

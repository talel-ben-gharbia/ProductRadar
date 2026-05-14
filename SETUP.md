# ProductRadar — Setup Guide

## 1. Installer les outils

| Outil | Lien |
|-------|------|
| **Docker Desktop** | https://www.docker.com/products/docker-desktop |
| **PHP 8.4+** | https://windows.php.net/download/ |
| **Composer 2.x** | https://getcomposer.org/download/ |
| **Node.js 20+** | https://nodejs.org/ |

Vérifie que PHP a les extensions `pdo_pgsql`, `intl`, `zip` activées dans `php.ini`.

---

## 2. Lancer PostgreSQL

```bash
docker compose up -d db
```

La base de données tourne sur `127.0.0.1:5432` — utilisateur `postgres`, mot de passe `0000`.

---

## 3. Backend

```bash
cd backend
composer install
php bin/console doctrine:migrations:migrate
php bin/console cache:clear
```

### Démarrer

```bash
php -S 0.0.0.0:8000 -t public
```

Vérifie : http://127.0.0.1:8000/api/system/health

---

## 4. Cache (Redis)

Le cache est **optionnel** en développement. Par défaut, Symfony utilise le système de fichiers.

Si tu veux Redis :
1. Active le service dans `docker-compose.yml` (décommente `redis`)
2. Lance-le : `docker compose up -d redis`

---

## 5. Mailpit (emails en local)

Pour capturer les emails sans les envoyer vraiment :

```bash
docker run -d --name mailpit -p 1025:1025 -p 8025:8025 axllent/mailpit
```

- SMTP : `localhost:1025`
- Interface web : http://localhost:8025

Dans `backend/.env.local`, mets :
```ini
MAILER_DSN=smtp://localhost:1025
```

---

## 6. Frontend

```bash
cd frontend
npm install
npm run dev
```

Ouvre http://localhost:3000.

---

## 7. Fichiers .env.local essentiels

### backend/.env.local

```ini
APP_ENV=dev
APP_DEBUG=1
DATABASE_URL="postgresql://postgres:0000@127.0.0.1:5432/productRadar?serverVersion=18&charset=utf8"
B2B_AUTH_SECRET=votre-secret-b2b-ici
FIREBASE_WEB_API_KEY=votre-firebase-web-api-key-ici
STRIPE_SECRET_KEY=sk_test_votre-cle-secrete-stripe-ici
STRIPE_WEBHOOK_SECRET=whsec_votre-webhook-secret-stripe-ici
MAILER_DSN=smtp://localhost:1025
B2B_NOTIFICATIONS_FROM=noreply@productradar.tn
```

### frontend/.env.local

```ini
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_FIREBASE_API_KEY=votre-firebase-api-key-ici
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-projet-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-projet.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=1:votre-app-id
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_votre-cle-publique-stripe-ici
B2B_AUTH_SECRET=votre-secret-b2b-ici
ADMIN_SESSION_SECRET=dev-session-secret-change-in-production
B2C_SESSION_SECRET=dev-b2c-session-secret-change-in-production
```

---

## 8. Démarrage rapide

```bash
# Terminal 1 : PostgreSQL
docker compose up -d db

# Terminal 2 : Backend
cd backend
php -S 0.0.0.0:8000 -t public

# Terminal 3 : Frontend
cd frontend
npm run dev
```

Ouvre http://localhost:3000.

---

## 9. Problèmes courants

| Problème | Solution |
|----------|----------|
| `composer install` échoue | Vérifie PHP 8.4+ et extensions `pdo_pgsql`, `intl`, `zip` dans `php.ini` |
| Connexion BD refusée | Vérifie que `docker ps` montre `productrdar-db` |
| `migrations:migrate` échoue | Vérifie `DATABASE_URL` dans `backend/.env.local` |
| Erreur B2B "Invalid HMAC" | `B2B_AUTH_SECRET` doit être identique dans les deux `.env.local` |

---

## 10. Commandes utiles

```bash
php bin/console debug:router          # Lister les routes API
php bin/console make:migration        # Créer une migration
php bin/console doctrine:migrations:migrate  # Appliquer les migrations
php bin/console cache:clear           # Vider le cache backend
```

# Ariary Web — Next.js + MySQL

Application budget (personnel / couple / entreprise) avec API Next.js, MySQL (Prisma), auth cookie JWT, sync temps réel via SSE.

## Stack

- **Next.js 16** (App Router)
- **MySQL 8** + **Prisma**
- **JWT httpOnly** (`jose` + `bcryptjs`)
- **react-icons**, design Ariary
- **SSE** `/api/stream` pour rafraîchir sans F5

## Démarrage

```bash
# 1. MySQL (Docker OU XAMPP/WAMP/MySQL local)
docker compose up -d
# Sans Docker : créer une base `ariary` et un user, puis ajuster DATABASE_URL dans `.env`

# 2. Dépendances + schéma
npm install
npm run db:generate
npm run db:push

# 3. App
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

`DATABASE_URL` exemple : `mysql://ariary:ariary@localhost:3306/ariary`  
Variables : voir `.env.example`.

## Structure

```
src/
  app/api/          Routes API
  app/app/          Pages authentifiées
  components/       UI + layout réutilisables
  lib/              Prisma, auth, validators, math
prisma/             Schéma MySQL
```

## Comptes

Créer un compte via `/register` (personnel, couple ou entreprise).

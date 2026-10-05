# PokéCard Market

Socle technique du projet. Les fonctionnalités métier (catalogue, collection, alertes, administration) ne sont pas encore développées.

## Stack

- Frontend : Next.js, React, TypeScript, Tailwind CSS
- Backend : NestJS, TypeScript
- Base : PostgreSQL 16, Prisma
- Qualité : ESLint, Prettier, TypeScript strict
- Tests : Jest et Supertest pour l’API, Vitest pour le frontend, Playwright préparé pour le parcours navigateur
- Infrastructure : Docker, Docker Compose

## Prérequis

- Node.js 22
- pnpm 10
- Docker et Docker Compose

## Démarrage avec Docker

```bash
cp .env.example .env
docker compose up --build
```

- Application : http://localhost:3000
- API : http://localhost:3001/api/v1/health
- OpenAPI : http://localhost:3001/api/docs
- PostgreSQL : `localhost:5432`

Le conteneur API applique les migrations Prisma au démarrage. Le worker partage la même image et reste inactif : l’import des prix n’est pas implémenté.

## Démarrage local

```bash
cp .env.example .env
docker compose up -d postgres
pnpm install
pnpm db:migrate
pnpm dev
```

## Vérifications

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm db:validate
```

Les tests d’intégration appellent `GET /api/v1/health` contre PostgreSQL. Playwright ouvre la page d’accueil.

Les variables sont documentées dans `.env.example`. Ne commitez pas `.env`. `ADMIN_EMAIL`, `ADMIN_PASSWORD` et `POKEMON_TCG_API_KEY` sont réservées aux prochaines étapes.

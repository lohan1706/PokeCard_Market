# PokéCard Market

Socle technique du projet, avec l’authentification par session. Le catalogue, la collection et les alertes ne sont pas encore développés.

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
pnpm db:seed
pnpm dev
```

## Authentification

Les mots de passe nouveaux sont hachés en Argon2id. Les comptes de démonstration, hachés en scrypt, restent valides et sont convertis à la première connexion. La session est un cookie `HttpOnly` nommé `pcm_session`. Seul son empreinte SHA-256 est stockée. Les routes protégées exigent ce cookie. `GET /api/v1/admin/summary` est réservé au rôle `ADMIN`.

| Méthode | Route                   |
| ------- | ----------------------- |
| `POST`  | `/api/v1/auth/register` |
| `POST`  | `/api/v1/auth/login`    |
| `POST`  | `/api/v1/auth/logout`   |
| `GET`   | `/api/v1/auth/me`       |
| `GET`   | `/api/v1/dashboard`     |
| `GET`   | `/api/v1/admin/summary` |

Pages : `/register`, `/login`, `/dashboard`, `/admin`.

## Données de démonstration

`pnpm db:seed` est idempotent. Il insère un catalogue fictif, sans appel réseau : 2 extensions, 9 cartes, leurs variantes, le prix courant et 45 jours d'historique. La source est `SEED`, distincte d'un futur import réel.

| Compte                              | Mot de passe         | Rôle  |
| ----------------------------------- | -------------------- | ----- |
| `camille.admin@demo.pokecard.local` | `DemoAdmin!2026`     | ADMIN |
| `lea.martin@demo.pokecard.local`    | `DemoCollector!2026` | USER  |
| `noah.bernard@demo.pokecard.local`  | `DemoCollector!2026` | USER  |

## Vérifications

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:integration
pnpm test:e2e
pnpm db:validate
```

Les tests d’intégration appellent la santé de l’API et le parcours d’authentification contre PostgreSQL. Playwright couvre la page d’accueil, l’inscription, la connexion, le tableau de bord et la déconnexion.

Les variables sont documentées dans `.env.example`. Ne commitez pas `.env`. `ADMIN_EMAIL`, `ADMIN_PASSWORD` et `POKEMON_TCG_API_KEY` sont réservées aux prochaines étapes.

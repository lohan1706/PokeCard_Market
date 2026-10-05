# Architecture

PokéCard Market est un monorepo. Le socle livre l’infrastructure, le schéma de données validé, un point de santé et l’authentification par session.

## Applications

| Chemin                   | Rôle                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `apps/web`               | Next.js. Le navigateur reste sur cette origine. `/api/v1/*` est réécrit vers NestJS.    |
| `apps/api`               | NestJS. Préfixe `/api/v1`, validation d’environnement, Prisma, santé, document OpenAPI. |
| `apps/api/src/worker.ts` | Processus séparé, prêt pour l’import quotidien. Il ne collecte encore aucun prix.       |

Le frontend appelle l’API en same-origin. `API_INTERNAL_URL` désigne NestJS depuis le serveur Next.js (`http://localhost:3001` en local, `http://api:3001` dans Compose).

## Backend

Le démarrage valide `DATABASE_URL`, `API_PORT` et `WEB_ORIGIN`. Prisma est branché avec l’adaptateur PostgreSQL. `GET /api/v1/health` exécute `SELECT 1` et répond `503` si la base est injoignable.

`auth` ouvre une session opaque. `dashboard` et `admin` appliquent les rôles `USER` et `ADMIN`. Les modules encore absents : `users`, `catalog`, `prices`, `collection`, `watchlist`, `alerts`.

## Données

Le schéma Prisma reprend le modèle validé.

| Modèle                                                      | Rôle                                              |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `Role`, `User`                                              | Compte et rôle unique                             |
| `Set`, `Card`, `Variant`, `CardVariant`                     | Catalogue. La déclinaison est l’unité cotée       |
| `PriceProvider`, `Price`, `PriceHistory`                    | Cote courante et historique quotidien             |
| `Condition`, `Collection`, `CollectionItem`                 | Collection et estimation par état                 |
| `WatchlistItem`, `PriceAlert`, `AlertEvent`, `Notification` | Suivi, seuil, historisation, notification interne |
| `CollectionValuation`                                       | Valeur quotidienne du portefeuille                |
| `Session`, `PasswordResetToken`                             | Session opaque et jeton de réinitialisation       |
| `IngestionRun`, `AuditLog`                                  | Import et journal d’administration                |

Les montants sont des `numeric`. Les instants sont des `timestamptz`. Le jour de cote est un `date`. L’e-mail est un `citext`. L’index de recherche sur `Card.name` est un GIN trigram. Des index partiels couvrent les alertes actives et les notifications non lues. Les contraintes de quantité, de seuil, de montants non négatifs et de couple prix/devise d’acquisition sont dans la migration initiale.

`Price` et `PriceHistory` restent deux tables : la première sert les lectures courantes, la seconde conserve un enregistrement par jour, source et devise.

## Conteneurs

`docker-compose.yml` démarre PostgreSQL, l’API, le worker et le web. L’entrypoint API lance `prisma migrate deploy` puis le processus. Les secrets restent dans l’environnement.

## Tests

| Commande                | Périmètre                                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `pnpm test`             | Jest sur l’environnement, les mots de passe, les gardes et la santé ; Vitest sur le frontend |
| `pnpm test:integration` | Supertest contre NestJS et PostgreSQL, y compris l’authentification                          |
| `pnpm test:e2e`         | Playwright : accueil, inscription, connexion, tableau de bord, déconnexion                   |

## Authentification

L’inscription crée un compte `USER` et une collection vide. La connexion vérifie Argon2id, ou le scrypt historique du seed, puis pose le cookie `pcm_session`. La déconnexion révoque la session. `GET /auth/me` renvoie l’utilisateur courant, sans secret. Un garde global refuse les routes non marquées publiques. Le garde de rôles limite l’administration.

Le frontend parle à l’API en same-origin. `proxy.ts` redirige vers `/login` lorsqu’il manque le cookie. Les pages relisent ensuite la session auprès de NestJS.

## Hors périmètre

Import Pokémon TCG, collection, watchlist, alertes et administration complète restent à développer.

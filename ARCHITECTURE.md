# Architecture

PokéCard Market est un monorepo. Cette étape livre l’infrastructure, le schéma de données validé et un point de santé. Aucun module métier n’est implémenté.

## Applications

| Chemin                   | Rôle                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------- |
| `apps/web`               | Next.js. Le navigateur reste sur cette origine. `/api/v1/*` est réécrit vers NestJS.    |
| `apps/api`               | NestJS. Préfixe `/api/v1`, validation d’environnement, Prisma, santé, document OpenAPI. |
| `apps/api/src/worker.ts` | Processus séparé, prêt pour l’import quotidien. Il ne collecte encore aucun prix.       |

Le frontend appelle l’API en same-origin. `API_INTERNAL_URL` désigne NestJS depuis le serveur Next.js (`http://localhost:3001` en local, `http://api:3001` dans Compose).

## Backend

Le démarrage valide `DATABASE_URL`, `API_PORT` et `WEB_ORIGIN`. Prisma est branché avec l’adaptateur PostgreSQL. `GET /api/v1/health` exécute `SELECT 1` et répond `503` si la base est injoignable.

Les modules prévus ensuite, sans être créés ici : `auth`, `users`, `catalog`, `prices`, `collection`, `watchlist`, `alerts`, `dashboard`, `admin`.

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

| Commande                | Périmètre                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm test`             | Jest sur la validation d’environnement et la sonde de santé ; Vitest sur la construction d’URL |
| `pnpm test:integration` | Supertest contre NestJS et PostgreSQL                                                          |
| `pnpm test:e2e`         | Playwright, page d’accueil                                                                     |

## Hors périmètre de cette étape

Authentification, rôles appliqués aux routes, import Pokémon TCG, collection, watchlist, alertes, dashboard et administration restent à développer sur ce socle.

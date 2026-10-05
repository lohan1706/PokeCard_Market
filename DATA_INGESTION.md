# Ingestion

La chaîne est la même pour chaque fournisseur :

```
DataProvider
  → Normalizer
  → Validation
  → Upsert
```

`DemoProvider` lit des fixtures locales. `TcgdexProvider` parle à l’API JSON documentée dans `DATA_SOURCES.md`. Aucun des deux ne parse de HTML. Le reste de l’application ne voit que les types `NormalizedSet`, `NormalizedCard` et `NormalizedPrice`.

## Synchronisation

Routes réservées au rôle `ADMIN` :

- `POST /api/v1/admin/sync/sets`
- `POST /api/v1/admin/sync/cards`
- `POST /api/v1/admin/sync/prices`
- `GET /api/v1/admin/sync/status`
- `GET /api/v1/admin/sync/errors`

Le corps accepte `provider` (`DEMO` ou `TCGDEX`), `setCode`, `limit` (1 à 20), `language` et `cursor`. Les cartes et les prix exigent `setCode`. Une requête ne suit pas le curseur toute seule : `nextCursor` est seulement renvoyé. Il n’y a pas de cron. `apps/api/src/worker.ts` reste inactif.

`provider=TCGDEX` répond `409` tant que `TCGDEX_SYNC_ENABLED` n’est pas `true`. Un fournisseur dont `PriceProvider.isActive` est faux est aussi refusé. Cette phase ne lance aucun import réel.

Chaque appel crée un `IngestionRun` : type, statut, dates, volumes vus, prix écrits, ignorés, erreurs. Le motif d’arrêt global tient dans `error`. Les erreurs d’item vont dans `IngestionError`. Les ambiguïtés vont dans `ImportConflict`. Un `AuditLog` enregistre l’acteur et les compteurs, pas le payload.

## Langues

`Card` et `Set` gardent le nom de la langue principale, celui que le catalogue lit déjà. `CardTranslation` et `SetTranslation` portent les autres langues : `language`, `name`, description ou série, données localisées, URL d’images, identifiant source.

Une extension internationale partage un identifiant de set et un numéro de collection d’une langue à l’autre : une ligne `Card`, plusieurs traductions. Une édition dont le code, la numérotation ou le pool diffèrent, typiquement un set japonais, reste une autre ligne `Set` et d’autres lignes `Card`. Le normalizer ne recolle pas ces produits.

Le numéro affiché reste celui de la source (`025`). La comparaison interne retire les zéros de tête (`25`) et conserve un suffixe (`25a`). `TG01` n’est pas réécrit en nombre.

## Variantes et prix

Une variante n’est créée que si la source la confirme (`normal`, `reverse`, `holo`, `firstEdition` à `true`). `foil` et `wPromo` ne deviennent pas des variantes. Un prix dont la variante n’existe pas sur la carte est une erreur, pas une création.

`Price` est le dernier cours. `PriceHistory` garde un enregistrement par variante, fournisseur, devise, condition et jour UTC. Un second passage le même jour met à jour cette ligne et passe `isCorrected` à vrai si le montant change. Les jours précédents restent. Les montants sont des `numeric(12,2)`. Les calculs internes passent par des centimes entiers. Un nombre JSON n’est converti qu’une fois, à la frontière, vers deux décimales.

La condition vide devient `UNSPECIFIED`. Les libellés connus (`Near Mint`, `LP`, `Heavily Played`, …) passent par `mapCondition`. Une valeur inconnue est rejetée. `ConditionMap` permet une correspondance par fournisseur sans l’inventer dans le code. Les prix TCGdex n’annoncent pas d’état : ils restent `UNSPECIFIED`. `avg` alimente `market`, `low` alimente `low`. `trend` n’est pas copié dans `mid`. Les moyennes glissantes ne fabriquent pas de jours d’historique.

L’unicité du cours inclut `conditionCode`, avec la valeur `UNSPECIFIED` pour les lignes `SEED` existantes.

## Déduplication

1. `ExternalIdentity` (`provider`, type, identifiant externe) met à jour la ligne déjà liée.
2. Sinon, le même code de set et le même numéro normalisé désignent la même carte.
3. Deux candidats, ou un set déjà présent sans identité de ce fournisseur, produisent un `ImportConflict`. Aucune fusion.
4. Le catalogue `demo:` / `SEED` n’est pas rattaché à `DEMO` ni à `TCGDEX`.

`Card.externalId` reste unique et reçoit `DEMO:<id>` ou, plus tard, `TCGDEX:<id>`, dans la limite de 64 caractères. L’identifiant source complet est dans `ExternalIdentity`.

## Données brutes

`ImportRecord` conserve le dernier payload par `(provider, type, externalId)`, tronqué au-delà de 32 000 caractères. Ce n’est pas un journal de toutes les réponses HTTP.

## Erreurs et sécurité

La validation refuse une langue inconnue, une devise qui n’est pas trois lettres, un montant négatif ou trop précis, une date future ou illisible, un identifiant vide. Les URL stockées sont en `https` et limitées à `example.test` pour les fixtures, ou à `assets.tcgdex.net` et `api.tcgdex.net` pour TCGdex. Les secrets ne sont pas journalisés : le client HTTP ne garde que le code de statut. Les routes d’administration passent par le garde de session et le rôle `ADMIN`.

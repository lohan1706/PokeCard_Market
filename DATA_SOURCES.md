# Sources de données

Vérifié le 5 octobre 2026, avant tout appel d’import. Aucune de ces sources n’a été interrogée par les tests. `TCGDEX_SYNC_ENABLED` reste `false` : le provider TCGdex existe, mais la route d’administration refuse un appel réel.

## Décision

| Source                               | Mode retenu                   | Import                          |
| ------------------------------------ | ----------------------------- | ------------------------------- |
| Démonstration locale                 | Fixtures dans le dépôt        | Autorisé, sans réseau           |
| TCGdex                               | API JSON HTTPS, GET seulement | Code prêt, appel réel désactivé |
| Scrydex                              | API à clé, non branchée       | Inactif                         |
| pokemontcg.io                        | API dépréciée                 | Non retenue                     |
| Cardmarket                           | API soumise à accord écrit    | Aucun provider, aucun scraping  |
| HTML de sites marchands ou officiels | —                             | Aucun scraper                   |

## TCGdex

Documentation lue :

- [Présentation](https://tcgdex.dev/)
- [REST](https://tcgdex.dev/rest) : HTTPS, requêtes GET, JSON, codes HTTP standards. La v2 est l’API courante.
- [FAQ](https://tcgdex.dev/faq) : pas de clé ; pas de plafond chiffré publié ; mettre en cache plutôt que recharger les mêmes données ; les prix peuvent manquer, retarder ou associer deux raretés à la même annonce.
- [Carte](https://tcgdex.dev/reference/card), [set](https://tcgdex.dev/rest/set), [prix](https://tcgdex.dev/markets-prices), [images](https://tcgdex.dev/assets)
- Dépôt [tcgdex/cards-database](https://github.com/tcgdex/cards-database) : licence MIT, et mention explicite d’absence d’affiliation avec Nintendo ou The Pokémon Company.

`https://api.tcgdex.net/robots.txt`, lu le 5 octobre 2026, contient :

```
User-agent: *
Disallow: /

# Please note that this is for Crawlers only
# You can logically use robots to use the API
```

Le fichier interdit l’indexation aux crawlers et indique que l’usage de l’API reste prévu. Ce n’est pas un feu vert pour télécharger tout le catalogue, ni pour réutiliser librement les visuels ou les prix.

### Ce que la base MIT couvre, et ce qu’elle ne couvre pas

La licence MIT du dépôt autorise l’usage du logiciel et des données de la base, avec conservation de la notice. Elle ne transfère pas les droits sur les illustrations Pokémon. Les images restent des œuvres de leurs ayants droit. L’application ne copie pas les fichiers image : elle ne stocke une URL `https://assets.tcgdex.net/...` que si un import réel est un jour activé.

Les prix Cardmarket et TCGplayer présents dans TCGdex sont des agrégats redistribués par TCGdex. Les utiliser via TCGdex n’est pas un accès à l’API Cardmarket et n’autorise pas à présenter ces montants comme une cote officielle. La FAQ signale des écarts connus tant que `variants_detailed` n’est pas en place.

### Données disponibles

- Sets, cartes, série, numéro local, rareté, catégorie, PV, types, attaques, illustrateur, faiblesse, retraite, marque de régulation.
- Variantes booléennes : `normal`, `reverse`, `holo`, `firstEdition`. `true` signifie que l’impression est connue. `wPromo` n’est pas converti en variante interne.
- Langues publiées : anglais, français, espagnol, italien, portugais brésilien, allemand, japonais, chinois traditionnel, indonésien, thaï. Le coréen et le chinois simplifié sont annoncés, pas livrés. La couverture varie selon la langue.
- Prix indicatifs : bloc Cardmarket en EUR (`avg`, `low`, et un bloc holo) et bloc TCGplayer en USD (`low`, `mid`, `high`, `market`). `trend`, `avg1`, `avg7` et `avg30` ne sont pas écrits comme des jours d’historique.

Les chemins de langue utilisés par le provider sont ceux documentés par l’API : `fr`, `en`, `ja`, `de`, `es`, `it`, `pt`, `zh-tw`. L’indonésien et le thaï ne sont pas importés tant qu’ils ne font pas partie du référentiel interne.

### Limites techniques imposées par le code

- Un seul lot par requête d’administration, 20 éléments au maximum, 5 par défaut.
- Les cartes et les prix exigent un `setCode`.
- Délai entre requêtes, trois tentatives avec backoff sur 429 et 5xx, arrêt immédiat sur 401 ou 403, timeout de 10 secondes.
- Identifiants limités à une classe de caractères sûre, sans changement de chemin.
- Redirections HTTP refusées.
- User-Agent : `PokecardMarket/0.1 (bounded ingestion)`.

## Scrydex et pokemontcg.io

pokemontcg.io est dépréciée au profit de Scrydex. Les nouvelles inscriptions sont fermées. Scrydex demande une clé et, à la date de cette note, publie l’anglais et le japonais. Les autres langues et les prix Cardmarket n’y sont pas disponibles. Aucune clé n’est lue ni stockée. Le provider n’existe pas dans le code.

## Cardmarket

Les conditions générales de Cardmarket réservent l’API à la gestion du contenu du vendeur et exigent un accord écrit préalable pour présenter les cartes et leurs prix. Le projet ne crée pas de provider Cardmarket et ne télécharge pas le site.

## Seed

`SEED` reste le catalogue fictif déjà en base. `DEMO` est un second fournisseur, alimenté uniquement par `apps/api/src/ingestion/fixtures/demo-raw.ts`. Les deux ne sont pas fusionnés.

export const DEMO_HISTORY_DAYS = 45;
export const DEMO_CURRENCY = 'USD';

export const demoRoles = [
  { code: 'USER', label: 'Collectionneur' },
  { code: 'ADMIN', label: 'Administrateur' },
] as const;

export const demoUsers = [
  {
    email: 'camille.admin@demo.pokecard.local',
    displayName: 'Camille Admin',
    roleCode: 'ADMIN',
    password: 'DemoAdmin!2026',
    salt: 'pokecard-demo-admin-salt',
  },
  {
    email: 'lea.martin@demo.pokecard.local',
    displayName: 'Léa Martin',
    roleCode: 'USER',
    password: 'DemoCollector!2026',
    salt: 'pokecard-demo-lea-salt',
  },
  {
    email: 'noah.bernard@demo.pokecard.local',
    displayName: 'Noah Bernard',
    roleCode: 'USER',
    password: 'DemoCollector!2026',
    salt: 'pokecard-demo-noah-salt',
  },
] as const;

export const demoVariants = [
  { code: 'NORMAL', name: 'Normale', sortOrder: 1, fallbackCoefficient: '1.0000' },
  { code: 'HOLO', name: 'Holo', sortOrder: 2, fallbackCoefficient: '1.0000' },
  { code: 'REVERSE', name: 'Reverse', sortOrder: 3, fallbackCoefficient: '1.0000' },
  { code: 'FIRST_EDITION', name: 'First edition', sortOrder: 4, fallbackCoefficient: '1.0000' },
] as const;

export const demoSets = [
  {
    code: 'LUM1',
    name: 'Lumen Démo',
    series: 'Série démo',
    language: 'fr',
    releaseDate: '2024-02-02',
  },
  {
    code: 'BRM1',
    name: 'Brume Démo',
    series: 'Série démo',
    language: 'fr',
    releaseDate: '2025-01-17',
  },
] as const;

export type DemoPrinting = {
  variantCode: (typeof demoVariants)[number]['code'];
  anchor: number;
  seed: number;
};

export type DemoCard = {
  setCode: (typeof demoSets)[number]['code'];
  number: string;
  name: string;
  rarity: string;
  supertype: string;
  subtypes: string[];
  hp: number | null;
  printings: DemoPrinting[];
};

export const demoCards: DemoCard[] = [
  {
    setCode: 'LUM1',
    number: '001',
    name: 'Lumisprite',
    rarity: 'Common',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    hp: 60,
    printings: [{ variantCode: 'NORMAL', anchor: 0.4, seed: 101 }],
  },
  {
    setCode: 'LUM1',
    number: '004',
    name: 'Brasillon',
    rarity: 'Rare Holo',
    supertype: 'Pokémon',
    subtypes: ['Stage 1'],
    hp: 120,
    printings: [{ variantCode: 'HOLO', anchor: 4.8, seed: 104 }],
  },
  {
    setCode: 'LUM1',
    number: '012',
    name: 'Voltige',
    rarity: 'Uncommon',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    hp: 80,
    printings: [
      { variantCode: 'NORMAL', anchor: 1.15, seed: 112 },
      { variantCode: 'REVERSE', anchor: 1.7, seed: 113 },
    ],
  },
  {
    setCode: 'LUM1',
    number: '025',
    name: 'Nacrelle',
    rarity: 'Ultra Rare',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    hp: 160,
    printings: [{ variantCode: 'HOLO', anchor: 27.5, seed: 125 }],
  },
  {
    setCode: 'LUM1',
    number: '186',
    name: 'Cendragon',
    rarity: 'Secret Rare',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    hp: 220,
    printings: [{ variantCode: 'HOLO', anchor: 96, seed: 186 }],
  },
  {
    setCode: 'BRM1',
    number: '003',
    name: 'Brumette',
    rarity: 'Common',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    hp: 50,
    printings: [{ variantCode: 'NORMAL', anchor: 0.28, seed: 203 }],
  },
  {
    setCode: 'BRM1',
    number: '017',
    name: 'Marée',
    rarity: 'Rare',
    supertype: 'Pokémon',
    subtypes: ['Stage 1'],
    hp: 130,
    printings: [
      { variantCode: 'NORMAL', anchor: 2.05, seed: 217 },
      { variantCode: 'HOLO', anchor: 6.4, seed: 218 },
    ],
  },
  {
    setCode: 'BRM1',
    number: '044',
    name: 'Orageon',
    rarity: 'Ultra Rare',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    hp: 180,
    printings: [{ variantCode: 'HOLO', anchor: 41, seed: 244 }],
  },
  {
    setCode: 'BRM1',
    number: '198',
    name: 'Éclat-Noir',
    rarity: 'Secret Rare',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    hp: 240,
    printings: [{ variantCode: 'HOLO', anchor: 118, seed: 298 }],
  },
];

export function demoExternalId(setCode: string, number: string): string {
  return `demo:${setCode}:${number}`;
}

export const demoPricedVariantCount = demoCards.reduce(
  (total, card) => total + card.printings.length,
  0,
);

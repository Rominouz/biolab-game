import type {
  CultureMediumDefinition,
  CultureMediumId,
  StandardBranchWeightsPpm,
} from '../types/game.types.ts';

const EQUAL_BRANCH_WEIGHTS: StandardBranchWeightsPpm = Object.freeze({
  BRANCH_I: 250_000,
  BRANCH_II: 250_000,
  BRANCH_III: 250_000,
  BRANCH_IV: 250_000,
});

const BACILLI_FAVORED_WEIGHTS: StandardBranchWeightsPpm = Object.freeze({
  BRANCH_I: 550_000,
  BRANCH_II: 150_000,
  BRANCH_III: 150_000,
  BRANCH_IV: 150_000,
});

const COCCI_FAVORED_WEIGHTS: StandardBranchWeightsPpm = Object.freeze({
  BRANCH_I: 150_000,
  BRANCH_II: 550_000,
  BRANCH_III: 150_000,
  BRANCH_IV: 150_000,
});

const SPIRILLA_FAVORED_WEIGHTS: StandardBranchWeightsPpm = Object.freeze({
  BRANCH_I: 150_000,
  BRANCH_II: 150_000,
  BRANCH_III: 550_000,
  BRANCH_IV: 150_000,
});

/**
 * Section 1 de specs.md — Gamme Complète des Milieux de Culture
 * Arbitrages #5 & #6 : Somme exacte de 1_000_000 ppm (100.0000 %) par soustraction
 * du taux Secret sur la tranche la plus fréquente des milieux 1 à 6.
 */
export const CULTURE_MEDIA: readonly CultureMediumDefinition[] = Object.freeze([
  Object.freeze({
    id: 'MEDIUM_1_ORDINARY_AGAR',
    index: 1,
    nameFr: 'Gélose Nutritive Ordinaire',
    costBio: 50,
    requiresMythicSacrifice: false,
    profileDescriptionFr: 'Milieu starter standard. Idéal pour accumuler du stock de base.',
    standardBranchWeightsPpm: EQUAL_BRANCH_WEIGHTS,
    dropTable: Object.freeze([
      Object.freeze({ rarity: 'COMMON', displayPercentage: 74.6993, weightPpm: 746_993 }),
      Object.freeze({ rarity: 'UNCOMMON', displayPercentage: 20.0, weightPpm: 200_000 }),
      Object.freeze({ rarity: 'RARE', displayPercentage: 5.0, weightPpm: 50_000 }),
      Object.freeze({ rarity: 'EPIC', displayPercentage: 0.3, weightPpm: 3_000 }),
      Object.freeze({ rarity: 'LEGENDARY', displayPercentage: 0.0005, weightPpm: 5 }),
      Object.freeze({ rarity: 'MYTHIC', displayPercentage: 0, weightPpm: 0 }),
      Object.freeze({ rarity: 'SECRET', displayPercentage: 0.0002, weightPpm: 2 }),
    ]),
  }),
  Object.freeze({
    id: 'MEDIUM_2_BRAIN_HEART_BROTH',
    index: 2,
    nameFr: 'Bouillon Cœur-Cervelle Enrichi',
    costBio: 25_000,
    requiresMythicSacrifice: false,
    profileDescriptionFr: 'Favorise les Bacilles et le métabolisme rapide.',
    standardBranchWeightsPpm: BACILLI_FAVORED_WEIGHTS,
    dropTable: Object.freeze([
      Object.freeze({ rarity: 'COMMON', displayPercentage: 47.9995, weightPpm: 479_995 }),
      Object.freeze({ rarity: 'UNCOMMON', displayPercentage: 37.0, weightPpm: 370_000 }),
      Object.freeze({ rarity: 'RARE', displayPercentage: 12.0, weightPpm: 120_000 }),
      Object.freeze({ rarity: 'EPIC', displayPercentage: 2.8, weightPpm: 28_000 }),
      Object.freeze({ rarity: 'LEGENDARY', displayPercentage: 0.1995, weightPpm: 1_995 }),
      Object.freeze({ rarity: 'MYTHIC', displayPercentage: 0.0005, weightPpm: 5 }),
      Object.freeze({ rarity: 'SECRET', displayPercentage: 0.0005, weightPpm: 5 }),
    ]),
  }),
  Object.freeze({
    id: 'MEDIUM_3_SHEEP_BLOOD_AGAR',
    index: 3,
    nameFr: 'Gélose Sang-Mouton Sélective',
    costBio: 95_000,
    requiresMythicSacrifice: false,
    profileDescriptionFr: 'Milieu hautement nutritif, cible les Cocques et les biofilms denses.',
    standardBranchWeightsPpm: COCCI_FAVORED_WEIGHTS,
    dropTable: Object.freeze([
      Object.freeze({ rarity: 'COMMON', displayPercentage: 30.0, weightPpm: 300_000 }),
      Object.freeze({ rarity: 'UNCOMMON', displayPercentage: 44.9993, weightPpm: 449_993 }),
      Object.freeze({ rarity: 'RARE', displayPercentage: 20.0, weightPpm: 200_000 }),
      Object.freeze({ rarity: 'EPIC', displayPercentage: 4.5, weightPpm: 45_000 }),
      Object.freeze({ rarity: 'LEGENDARY', displayPercentage: 0.499, weightPpm: 4_990 }),
      Object.freeze({ rarity: 'MYTHIC', displayPercentage: 0.001, weightPpm: 10 }),
      Object.freeze({ rarity: 'SECRET', displayPercentage: 0.0007, weightPpm: 7 }),
    ]),
  }),
  Object.freeze({
    id: 'MEDIUM_4_CHOCOLATE_ISOVITALEX',
    index: 4,
    nameFr: 'Gélose Chocolat & IsoVitaleX',
    costBio: 350_000,
    requiresMythicSacrifice: false,
    profileDescriptionFr: 'Élimine quasiment les déchets cellulaires ordinaires.',
    standardBranchWeightsPpm: EQUAL_BRANCH_WEIGHTS,
    dropTable: Object.freeze([
      Object.freeze({ rarity: 'COMMON', displayPercentage: 12.0, weightPpm: 120_000 }),
      Object.freeze({ rarity: 'UNCOMMON', displayPercentage: 47.999, weightPpm: 479_990 }),
      Object.freeze({ rarity: 'RARE', displayPercentage: 32.0, weightPpm: 320_000 }),
      Object.freeze({ rarity: 'EPIC', displayPercentage: 7.0, weightPpm: 70_000 }),
      Object.freeze({ rarity: 'LEGENDARY', displayPercentage: 0.98, weightPpm: 9_800 }),
      Object.freeze({ rarity: 'MYTHIC', displayPercentage: 0.02, weightPpm: 200 }),
      Object.freeze({ rarity: 'SECRET', displayPercentage: 0.001, weightPpm: 10 }),
    ]),
  }),
  Object.freeze({
    id: 'MEDIUM_5_HYPERSALINE_VOLCANIC',
    index: 5,
    nameFr: 'Bouillon Hyper-Salin Volcanique',
    costBio: 1_200_000,
    requiresMythicSacrifice: false,
    profileDescriptionFr: 'Milieu extrême réservé aux thermophiles et halophiles.',
    standardBranchWeightsPpm: SPIRILLA_FAVORED_WEIGHTS,
    dropTable: Object.freeze([
      Object.freeze({ rarity: 'COMMON', displayPercentage: 0, weightPpm: 0 }),
      Object.freeze({ rarity: 'UNCOMMON', displayPercentage: 35.0, weightPpm: 350_000 }),
      Object.freeze({ rarity: 'RARE', displayPercentage: 44.998, weightPpm: 449_980 }),
      Object.freeze({ rarity: 'EPIC', displayPercentage: 16.5, weightPpm: 165_000 }),
      Object.freeze({ rarity: 'LEGENDARY', displayPercentage: 3.4, weightPpm: 34_000 }),
      Object.freeze({ rarity: 'MYTHIC', displayPercentage: 0.1, weightPpm: 1_000 }),
      Object.freeze({ rarity: 'SECRET', displayPercentage: 0.002, weightPpm: 20 }),
    ]),
  }),
  Object.freeze({
    id: 'MEDIUM_6_CRYO_ABYSSAL_SERUM',
    index: 6,
    nameFr: 'Sérum Cryo-Abyssal',
    costBio: 4_500_000,
    requiresMythicSacrifice: false,
    profileDescriptionFr: "Milieu cryogénique d'élite, aucun tirage sous le rang Rare.",
    standardBranchWeightsPpm: EQUAL_BRANCH_WEIGHTS,
    dropTable: Object.freeze([
      Object.freeze({ rarity: 'COMMON', displayPercentage: 0, weightPpm: 0 }),
      Object.freeze({ rarity: 'UNCOMMON', displayPercentage: 0, weightPpm: 0 }),
      Object.freeze({ rarity: 'RARE', displayPercentage: 54.996, weightPpm: 549_960 }),
      Object.freeze({ rarity: 'EPIC', displayPercentage: 35.0, weightPpm: 350_000 }),
      Object.freeze({ rarity: 'LEGENDARY', displayPercentage: 8.8, weightPpm: 88_000 }),
      Object.freeze({ rarity: 'MYTHIC', displayPercentage: 1.2, weightPpm: 12_000 }),
      Object.freeze({ rarity: 'SECRET', displayPercentage: 0.004, weightPpm: 40 }),
    ]),
  }),
  Object.freeze({
    id: 'MEDIUM_7_RADIO_ISOTOPIC_AGAR',
    index: 7,
    nameFr: "Gel d'Agar Radio-Isotopique",
    costBio: 15_000_000,
    requiresMythicSacrifice: true,
    profileDescriptionFr: 'Conçu pour forcer la rupture de chaîne ADN et la mutagenèse.',
    standardBranchWeightsPpm: EQUAL_BRANCH_WEIGHTS,
    dropTable: Object.freeze([
      Object.freeze({ rarity: 'COMMON', displayPercentage: 0, weightPpm: 0 }),
      Object.freeze({ rarity: 'UNCOMMON', displayPercentage: 0, weightPpm: 0 }),
      Object.freeze({ rarity: 'RARE', displayPercentage: 20.0, weightPpm: 200_000 }),
      Object.freeze({ rarity: 'EPIC', displayPercentage: 57.0, weightPpm: 570_000 }),
      Object.freeze({ rarity: 'LEGENDARY', displayPercentage: 18.0, weightPpm: 180_000 }),
      Object.freeze({ rarity: 'MYTHIC', displayPercentage: 4.992, weightPpm: 49_920 }),
      Object.freeze({ rarity: 'SECRET', displayPercentage: 0.008, weightPpm: 80 }),
    ]),
  }),
]);

export const CULTURE_MEDIA_BY_ID: Readonly<Record<CultureMediumId, CultureMediumDefinition>> =
  Object.freeze(
    Object.fromEntries(CULTURE_MEDIA.map((m) => [m.id, m])) as Record<
      CultureMediumId,
      CultureMediumDefinition
    >
  );

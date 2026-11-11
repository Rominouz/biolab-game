import type { FactoryTierDefinition, FactoryTierLevel } from '../types/game.types.ts';

/**
 * Section 4.B & Section 5.A de specs.md — Paliers d'Usine, Coûts, Scénographie & Charges Fixes
 */
export const FACTORY_TIERS: readonly FactoryTierDefinition[] = Object.freeze([
  Object.freeze({
    level: 1,
    nameFr: 'Établi de Garage DIY',
    unlockCostBio: 0,
    unlockCostPr: 0,
    incubatorSlots: 4,
    cryoTubeSlots: 2,
    fixedOverheadBioPerSec: 0.5,
    palette: Object.freeze({
      wallsHex: '#1E2421',
      floorHex: '#2B2D24',
      neonHex: '#22C55E',
    }),
    benchDescriptionFr:
      "Établi en contreplaqué taché, tubes à essai dans des boîtes d'œufs, vieille télé CRT monochrome 12\".",
    cryoDescriptionFr:
      "Vieux congélateur ménager d'occasion fermé par une chaîne, givre épais.",
  }),
  Object.freeze({
    level: 2,
    nameFr: 'Annexe Universitaire',
    unlockCostBio: 150_000,
    unlockCostPr: 500,
    incubatorSlots: 6,
    cryoTubeSlots: 4,
    fixedOverheadBioPerSec: 15,
    palette: Object.freeze({
      wallsHex: '#22302A',
      floorHex: '#0D1C16',
      neonHex: '#E2E8F0',
    }),
    benchDescriptionFr:
      'Paillasses en résine phénolique, bec Bunsen sur gaz de ville, étagères de registres cornés et tableau de craie.',
    cryoDescriptionFr:
      'Caisson mural en inox brossé avec hublots ronds et manomètres de vapeur.',
  }),
  Object.freeze({
    level: 3,
    nameFr: 'Pôle Pharmaceutique',
    unlockCostBio: 1_800_000,
    unlockCostPr: 4_500,
    incubatorSlots: 8,
    cryoTubeSlots: 8,
    fixedOverheadBioPerSec: 140,
    palette: Object.freeze({
      wallsHex: '#0B192C',
      floorHex: '#071322',
      neonHex: '#00E5FF',
    }),
    benchDescriptionFr:
      'Hotte à flux laminaire UV germicide, bras micrométriques, doubles moniteurs à graphiques vectoriels ambrés.',
    cryoDescriptionFr:
      'Salle blanche pressurisée, cuves titane avec affichage numérique à DEL ambrée.',
  }),
  Object.freeze({
    level: 4,
    nameFr: 'Bio-Usine Industrielle',
    unlockCostBio: 12_000_000,
    unlockCostPr: 25_000,
    incubatorSlots: 10,
    cryoTubeSlots: 12,
    fixedOverheadBioPerSec: 1_200,
    palette: Object.freeze({
      wallsHex: '#141C1A',
      floorHex: '#0A110E',
      neonHex: '#FFB703',
    }),
    benchDescriptionFr:
      'Tuyauteries chromées massives, centrifugeuses au sol, pupitre de commande industriel à gros boutons rétro.',
    cryoDescriptionFr:
      "Chambre forte à -196 °C, paniers de tubes motorisés émergeant d'un brouillard dense.",
  }),
  Object.freeze({
    level: 5,
    nameFr: 'Complexe Bunker BSL-4',
    unlockCostBio: 85_000_000,
    unlockCostPr: 150_000,
    incubatorSlots: 12,
    cryoTubeSlots: 18,
    fixedOverheadBioPerSec: 8_500,
    palette: Object.freeze({
      wallsHex: '#111618',
      floorHex: '#1D0A10',
      neonHex: '#FF0055',
    }),
    benchDescriptionFr:
      'Sas de décontamination acide, scaphandres pressurisés, triple vitrage blindé, console holographique CRT centrale.',
    cryoDescriptionFr:
      'Cryo-matrice sub-zéro circulaire : capsules automatisées plongeant dans un vortex liquide lumineux.',
  }),
]);

export const FACTORY_TIERS_BY_LEVEL: Readonly<Record<FactoryTierLevel, FactoryTierDefinition>> =
  Object.freeze(
    Object.fromEntries(FACTORY_TIERS.map((t) => [t.level, t])) as Record<
      FactoryTierLevel,
      FactoryTierDefinition
    >
  );

import type { Rarity, RarityVisualDefinition } from '../types/game.types.ts';

/**
 * Section 2 & Section 3.A de specs.md — Charte Graphique & Palette Rétro-Labo (Fixe & Immuable)
 */
export const LAB_THEME_COLORS = Object.freeze({
  darkPhosphorBackground: '#060807',
  phthaloGlassSurface: '#0B1612',
  screenBorderFrame: '#152A22',
  monospaceTextPhosphor: '#A7F3D0',
  cryoVaporCyan: '#00E5FF',
  logbookFountainPenInk: '#1E3A8A',
} as const);

export const RARITY_ORDER: readonly Rarity[] = Object.freeze([
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
  'MYTHIC',
  'SECRET',
]);

export const RARITY_VISUALS: Readonly<Record<Rarity, RarityVisualDefinition>> = Object.freeze({
  COMMON: Object.freeze({
    id: 'COMMON',
    labelFr: 'Commun',
    colorHex: '#E2E8F0',
    growthTimeRangeSeconds: Object.freeze([15, 30] as const),
    animationTitleFr: 'Germination simple',
    animationDescriptionFr:
      "Petit amas circulaire opaque qui s'étale lentement du centre vers les bords.",
  }),
  UNCOMMON: Object.freeze({
    id: 'UNCOMMON',
    labelFr: 'Peu Commun',
    colorHex: '#22C55E',
    growthTimeRangeSeconds: Object.freeze([45, 60] as const),
    animationTitleFr: 'Pulsation mitotique',
    animationDescriptionFr:
      "La colonie pulse au rythme d'un battement cardiaque régulier, micro-bulles d'oxygène vert néon.",
  }),
  RARE: Object.freeze({
    id: 'RARE',
    labelFr: 'Rare',
    colorHex: '#00E5FF',
    growthTimeRangeSeconds: Object.freeze([120, 180] as const),
    animationTitleFr: 'Filaments & Réseau',
    animationDescriptionFr:
      "Tentacules fractales s'étendant sur la gélose, halo cyan translucide.",
  }),
  EPIC: Object.freeze({
    id: 'EPIC',
    labelFr: 'Épique',
    colorHex: '#BD00FF',
    growthTimeRangeSeconds: Object.freeze([300, 420] as const),
    animationTitleFr: 'Bioluminescence',
    animationDescriptionFr:
      'Noyau violet intense, étincelles orbitales et ondulations à la surface.',
  }),
  LEGENDARY: Object.freeze({
    id: 'LEGENDARY',
    labelFr: 'Légendaire',
    colorHex: '#FFB703',
    growthTimeRangeSeconds: Object.freeze([600, 900] as const),
    animationTitleFr: 'Géométrie Cristalline',
    animationDescriptionFr:
      'Structures polygonales ambrées, micro-arcs dorés crépitant entre les amas.',
  }),
  MYTHIC: Object.freeze({
    id: 'MYTHIC',
    labelFr: 'Mythique',
    colorHex: '#FF0055',
    growthTimeRangeSeconds: Object.freeze([1500, 1800] as const),
    animationTitleFr: "Vortex d'Alarme BSL-4",
    animationDescriptionFr:
      'Micro-vibrations de la boîte, bouillonnement carmin et décharges gazeuses.',
  }),
  SECRET: Object.freeze({
    id: 'SECRET',
    labelFr: 'Secret',
    colorHex: '#EC4899',
    secondaryColorHex: '#38BDF8',
    growthTimeRangeSeconds: Object.freeze([2700, 3600] as const),
    animationTitleFr: 'Distorsion & Glitch Astral',
    animationDescriptionFr:
      'Aberration chromatique CRT, lentille gravitationnelle et traînées stellaires.',
  }),
});

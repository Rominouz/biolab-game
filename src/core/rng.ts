import { PPM_BASE } from '../data/constants.data.ts';

/**
 * Générateur de nombres pseudo-aléatoires déterministe (Mulberry32) et injectable.
 * Permet des tirages exacts en PPM (parties par million, base 1_000_000).
 */
export interface RngService {
  /** Retourne un flottant dans [0, 1[ */
  nextFloat(): number;
  /** Retourne un entier dans [0, PPM_BASE - 1] (soit 0 à 999_999) */
  nextPpmRoll(): number;
  /** Retourne un entier dans [minInclusive, maxExclusive[ */
  nextInt(minInclusive: number, maxExclusive: number): number;
  /** Sélectionne un élément selon une liste de poids en PPM dont la somme vaut PPM_BASE */
  pickWeightedPpm<T>(items: readonly { readonly item: T; readonly weightPpm: number }[]): T;
  /** Sélectionne un élément de façon équiprobable dans un tableau non vide */
  pickUniform<T>(items: readonly T[]): T;
}

export function createSeededRng(seed: number): RngService {
  let state = seed >>> 0;

  function nextFloat(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  }

  function nextPpmRoll(): number {
    return Math.floor(nextFloat() * PPM_BASE);
  }

  function nextInt(minInclusive: number, maxExclusive: number): number {
    if (maxExclusive <= minInclusive) {
      throw new Error(`Bornes invalides pour nextInt: [${String(minInclusive)}, ${String(maxExclusive)}[`);
    }
    const span = maxExclusive - minInclusive;
    return minInclusive + Math.floor(nextFloat() * span);
  }

  function pickWeightedPpm<T>(items: readonly { readonly item: T; readonly weightPpm: number }[]): T {
    if (items.length === 0) {
      throw new Error('Impossible de tirer dans une table pondérée vide');
    }

    const totalWeight = items.reduce((acc, entry) => acc + entry.weightPpm, 0);
    if (totalWeight <= 0) {
      throw new Error('La somme des poids PPM doit être strictement positive');
    }

    const roll = Math.floor(nextFloat() * totalWeight);
    let cumulative = 0;

    for (const entry of items) {
      if (entry.weightPpm <= 0) {
        continue;
      }
      cumulative += entry.weightPpm;
      if (roll < cumulative) {
        return entry.item;
      }
    }

    const lastNonZero = [...items].reverse().find((e) => e.weightPpm > 0);
    if (!lastNonZero) {
      throw new Error('Aucune entrée avec un poids positif trouvée');
    }
    return lastNonZero.item;
  }

  function pickUniform<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Impossible de tirer dans un tableau vide');
    }
    const index = nextInt(0, items.length);
    const chosen = items[index];
    if (chosen === undefined) {
      throw new Error('Index hors bornes lors du tirage uniforme');
    }
    return chosen;
  }

  return {
    nextFloat,
    nextPpmRoll,
    nextInt,
    pickWeightedPpm,
    pickUniform,
  };
}

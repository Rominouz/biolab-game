import { GAME_CONSTANTS } from '../data/constants.data.ts';

/**
 * Fonctions mathématiques pures et sécurisées de BIOLAB (Section 3.B & Section 5.B de specs.md)
 */

export function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * Section 5.B : Rendements décroissants de monoculture (Étouffement de Niche)
 * Pour N colonies identiques actives simultanément : Rendement Individuel = Rendement Théorique * (1 / sqrt(N))
 */
export function computeNicheMultiplier(identicalColonyCount: number): number {
  if (!Number.isFinite(identicalColonyCount) || identicalColonyCount <= 1) {
    return 1.0;
  }
  return 1 / Math.sqrt(identicalColonyCount);
}

/**
 * Section 3.B.3 : Coût d'Incinération Rapide (Autoclave Flash)
 * Coût d'Évacuation = 15 Bio * sqrt(Multiplicateur Souche)
 */
export function computeFlashAutoclaveCost(strainMultiplier: number): number {
  if (!Number.isFinite(strainMultiplier) || strainMultiplier <= 0) {
    return 0;
  }
  return Number(
    (
      GAME_CONSTANTS.WASTE.flashAutoclaveBaseFactorBio * Math.sqrt(strainMultiplier)
    ).toFixed(2)
  );
}

/**
 * Section 3.B.3 : Bioréacteur de recyclage (restitue 10 % de la valeur du milieu d'origine)
 */
export function computeBioreactorCompostRefund(mediumCostBio: number): number {
  if (!Number.isFinite(mediumCostBio) || mediumCostBio <= 0) {
    return 0;
  }
  return Number((mediumCostBio * GAME_CONSTANTS.WASTE.bioreactorCompostRefundRatio).toFixed(2));
}

/**
 * Arrondi propre à 4 décimales pour éviter la dérive flottante IEEE 754 sur les soldes continus
 */
export function roundCurrency(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 10_000) / 10_000;
}

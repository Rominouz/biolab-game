import { FACTORY_TIERS_BY_LEVEL } from '../data/factory.data.ts';
import { GAME_CONSTANTS } from '../data/constants.data.ts';
import { STRAINS_BY_ID } from '../data/strains.data.ts';
import type { EventBus } from '../core/event-bus.ts';
import { clamp, computeNicheMultiplier, roundCurrency } from '../core/math.ts';
import type {
  ColonyIncubatorSlot,
  EconomySnapshot,
  GameState,
  IncubatorSlot,
} from '../types/game-state.types.ts';
import { evaluateCryoChamberMetrics } from './cryo.system.ts';
import { computeActiveTechModifiers } from './tech.system.ts';
import { computeActiveTrophyModifiers } from './trophies.system.ts';

/**
 * Retourne les emplacements directement voisins (gauche et droite en disposition 1D horizontale, Arbitrage #8)
 */
function getAdjacentSlots(
  slots: readonly IncubatorSlot[],
  slotIndex: number
): readonly IncubatorSlot[] {
  const result: IncubatorSlot[] = [];
  const left = slots[slotIndex - 1];
  const right = slots[slotIndex + 1];
  if (left !== undefined) {
    result.push(left);
  }
  if (right !== undefined) {
    result.push(right);
  }
  return result;
}

/**
 * Calcule le multiplicateur effectif de chaque emplacement en résolvant l'effet d'Actinomyces bovis
 * ("aligne son multiplicateur sur la boîte adjacente la plus rentable") sans récursion infinie.
 */
function resolveSlotBaseMultipliers(slots: readonly IncubatorSlot[]): readonly number[] {
  const intrinsicMultipliers = slots.map((slot) => {
    if (slot.status !== 'COLONY') {
      return 0;
    }
    const strain = STRAINS_BY_ID[slot.strainId];
    return strain ? strain.multiplier : 0;
  });

  return slots.map((slot, index) => {
    if (slot.status !== 'COLONY') {
      return 0;
    }
    const base = intrinsicMultipliers[index] ?? 0;
    if (slot.strainId !== 'ACTINOMYCES_BOVIS') {
      return base;
    }
    const leftMult = intrinsicMultipliers[index - 1] ?? 0;
    const rightMult = intrinsicMultipliers[index + 1] ?? 0;
    return Math.max(base, leftMult, rightMult);
  });
}

/**
 * Calcule le snapshot économique complet de la paillasse, de la cryo et de l'usine à l'instant t,
 * en intégrant tous les modificateurs des Phases 2, 3 et 4 (Souches, Techs PR, Trophées et Micro-Événements).
 */
export function evaluateEconomySnapshot(state: GameState): EconomySnapshot {
  const slots = state.incubatorSlots;
  const resolvedMultipliers = resolveSlotBaseMultipliers(slots);
  const techMods = computeActiveTechModifiers(state);
  const trophyMods = computeActiveTrophyModifiers(state);

  const speciesCounts = new Map<string, number>();
  let totalCocciSynergyUnits = 0;
  let hasDeinococcusGenesis = false;
  let hasSarcinaPrismatica = false;
  let hasVoidSpirillum = false;

  for (const slot of slots) {
    if (slot.status !== 'COLONY') {
      continue;
    }
    speciesCounts.set(slot.strainId, (speciesCounts.get(slot.strainId) ?? 0) + 1);

    const strain = STRAINS_BY_ID[slot.strainId];
    if (!strain) {
      continue;
    }

    if (strain.branch === 'BRANCH_II') {
      totalCocciSynergyUnits += 1;
    } else if (slot.strainId === 'QUANTUM_COCCUS') {
      totalCocciSynergyUnits += 2;
    }

    if (slot.strainId === 'DEINOCOCCUS_GENESIS') {
      hasDeinococcusGenesis = true;
    }
    if (slot.strainId === 'SARCINA_PRISMATICA') {
      hasSarcinaPrismatica = true;
    }
    if (slot.strainId === 'VOID_SPIRILLUM') {
      hasVoidSpirillum = true;
    }
  }

  const globalGenesisMultiplier = hasDeinococcusGenesis ? 10.0 : 1.0;
  // Événement B4 (Bulle de Fermentation) : +10 % Bio/s pendant 45 s
  const b4GlobalBoostMultiplier =
    state.benchBuffs.b4BioBoostRemainingSeconds > 0 ? 1.1 : 1.0;
  // Trophée #15 (La Spirale de Plasmide Fossile) : les multiplicateurs de symbiose de biofilm gagnent +2 %
  const trophy15SynergyBonus = trophyMods.biofilmSynergyBonusRatio;

  let benchGrossBioPerSec = 0;
  let passivePrPerSec = 0;

  const slotEffectiveBioPerSec = slots.map((slot, index) => {
    if (slot.status !== 'COLONY') {
      return 0;
    }

    if (state.isPaused && slot.strainId !== 'CLOSTRIDIUM_BUTYRICUM') {
      return 0;
    }

    const strain = STRAINS_BY_ID[slot.strainId];
    if (!strain) {
      return 0;
    }

    const baseMult = resolvedMultipliers[index] ?? strain.multiplier;
    const rawProduction =
      baseMult * GAME_CONSTANTS.BASE_BIO_PER_SECOND * slot.maturityRatio;

    const neighbors = getAdjacentSlots(slots, index);
    let additiveBonus = 0;

    for (const neighbor of neighbors) {
      if (neighbor.status !== 'COLONY') {
        continue;
      }
      if (neighbor.strainId === 'LACTOBACILLUS_FERMENTI' && strain.branch === 'BRANCH_I') {
        additiveBonus += 0.1 + trophy15SynergyBonus;
      }
      if (neighbor.strainId === 'PSEUDOMONAS_FLUORESCENS') {
        additiveBonus += 0.2 + trophy15SynergyBonus;
      }
    }

    if (slot.strainId === 'STREPTOCOCCUS_LACTIS') {
      const otherCocciUnits = Math.max(0, totalCocciSynergyUnits - 1);
      additiveBonus += (0.15 + trophy15SynergyBonus) * otherCocciUnits;
    }

    if (slot.strainId === 'NECRO_SPORE_OBLIVION' && slot.absorbedWasteCount > 0) {
      additiveBonus += 0.02 * slot.absorbedWasteCount;
    }

    const hasToxicNeighbor = neighbors.some((n) => n.status === 'WASTE' && n.isToxic);
    const isImmuneToWaste = slot.strainId === 'MICROCOCCUS_LUTEUS';
    const isProtectedByStreptomycesAlbus = neighbors.some(
      (n): n is ColonyIncubatorSlot =>
        n.status === 'COLONY' && n.strainId === 'STREPTOMYCES_ALBUS'
    );

    const toxicityFactor =
      hasToxicNeighbor && !isImmuneToWaste && !isProtectedByStreptomycesAlbus
        ? 1 - GAME_CONSTANTS.WASTE.adjacentYieldPenaltyRatio
        : 1.0;

    const sameSpeciesCount = speciesCounts.get(slot.strainId) ?? 1;
    const nicheFactor = computeNicheMultiplier(sameSpeciesCount);

    // Événement B8 (Effusion Métabolique Spontanée) : double la génération de cette boîte pendant 30 s
    const isB8Doubled =
      state.benchBuffs.b8DoubledSlotRemainingSeconds > 0 &&
      state.benchBuffs.b8DoubledSlotIndex === index;
    const b8SlotMultiplier = isB8Doubled ? 2.0 : 1.0;

    const effectiveBio =
      rawProduction *
      (1 + additiveBonus) *
      toxicityFactor *
      nicheFactor *
      globalGenesisMultiplier *
      b4GlobalBoostMultiplier *
      b8SlotMultiplier;

    benchGrossBioPerSec += effectiveBio;

    if (slot.strainId === 'GEOBACTER_ELECTRONICA') {
      // Trophée #12 : +10 % de Points de Recherche (PR) passifs
      passivePrPerSec +=
        effectiveBio * 0.05 * (1 + trophyMods.passivePrBonusRatio);
    }

    return roundCurrency(effectiveBio);
  });

  const cryoMetrics = evaluateCryoChamberMetrics(state);
  const grossBioPerSec =
    benchGrossBioPerSec + (state.isPaused ? 0 : cryoMetrics.totalCryoProductionBioPerSec);

  const tierDef = FACTORY_TIERS_BY_LEVEL[state.factoryTier];
  let fixedOverheadBioPerSec = tierDef.fixedOverheadBioPerSec;

  // Événement B7 (Lecture Aiguille Stable) : charges fixes annulées pendant 60 s
  const isB7ZeroOverhead = state.benchBuffs.b7ZeroFixedOverheadRemainingSeconds > 0;

  if (hasVoidSpirillum || isB7ZeroOverhead) {
    fixedOverheadBioPerSec = 0;
  } else {
    // Sarcina prismatica (-15 %) + Tech S3 (-20 %) + Trophée #08 (-6 %)
    const totalOverheadReduction =
      (hasSarcinaPrismatica ? 0.15 : 0) +
      techMods.fixedOverheadReductionRatio +
      trophyMods.fixedOverheadReductionRatio;
    fixedOverheadBioPerSec =
      fixedOverheadBioPerSec * clamp(1 - totalOverheadReduction, 0, 1);
  }

  const cryoUpkeepBioPerSec = cryoMetrics.totalCryoUpkeepBioPerSec;
  const netBioPerSec = roundCurrency(
    grossBioPerSec - fixedOverheadBioPerSec - cryoUpkeepBioPerSec
  );

  return {
    grossBioPerSec: roundCurrency(grossBioPerSec),
    passivePrPerSec: roundCurrency(passivePrPerSec),
    fixedOverheadBioPerSec: roundCurrency(fixedOverheadBioPerSec),
    cryoUpkeepBioPerSec: roundCurrency(cryoUpkeepBioPerSec),
    netBioPerSec,
    slotEffectiveBioPerSec,
  };
}

/**
 * Applique les flux économiques sur un pas de temps dtSeconds et met à jour l'état de Sous-Tension (Arbitrage #9 & Trophée #16).
 */
export function advanceEconomyTick(
  state: GameState,
  dtSeconds: number,
  eventBus?: EventBus
): GameState {
  const snapshot = evaluateEconomySnapshot(state);

  if (dtSeconds <= 0) {
    return {
      ...state,
      economy: snapshot,
    };
  }

  if (state.isPaused) {
    const pausedBioGain = snapshot.grossBioPerSec * dtSeconds;
    return {
      ...state,
      bio: roundCurrency(state.bio + pausedBioGain),
      economy: snapshot,
      stats: {
        ...state.stats,
        totalBioEarned: roundCurrency(state.stats.totalBioEarned + pausedBioGain),
      },
    };
  }

  const deltaBio = snapshot.netBioPerSec * dtSeconds;
  const grossEarned = snapshot.grossBioPerSec * dtSeconds;
  const prEarned = snapshot.passivePrPerSec * dtSeconds;

  const nextBioRaw = state.bio + deltaBio;
  const nextBio = nextBioRaw <= 0 ? 0 : roundCurrency(nextBioRaw);
  const nextPr = roundCurrency(state.pr + prEarned);

  const trophyMods = computeActiveTrophyModifiers(state);
  // Arbitrage #9 & Trophée #16 (L'Éprouvette d'Anti-Matière : supprime le risque de mise en sous-tension)
  const nextIsUndervoltage =
    !trophyMods.preventsUndervoltage && nextBio === 0 && snapshot.netBioPerSec < 0;

  const survivedUndervoltage =
    Boolean(state.stats.hasSurvivedUndervoltage) ||
    (state.isUndervoltage && !nextIsUndervoltage);

  if (nextIsUndervoltage !== state.isUndervoltage && eventBus) {
    eventBus.emit({
      type: 'UNDERVOLTAGE_CHANGED',
      isUndervoltage: nextIsUndervoltage,
    });
  }

  return {
    ...state,
    bio: nextBio,
    pr: nextPr,
    isUndervoltage: nextIsUndervoltage,
    economy: snapshot,
    stats: {
      ...state.stats,
      totalBioEarned: roundCurrency(state.stats.totalBioEarned + Math.max(0, grossEarned)),
      totalPrEarned: roundCurrency(state.stats.totalPrEarned + prEarned),
      totalObservationSeconds: roundCurrency(state.stats.totalObservationSeconds + dtSeconds),
      hasSurvivedUndervoltage: survivedUndervoltage,
    },
  };
}

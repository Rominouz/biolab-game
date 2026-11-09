import { GAME_CONSTANTS } from '../data/constants.data.ts';
import { STRAINS_BY_ID } from '../data/strains.data.ts';
import type { EventBus } from '../core/event-bus.ts';
import { clamp, roundCurrency } from '../core/math.ts';
import type {
  ColonyIncubatorSlot,
  CryoTubeSlot,
  FrozenCryoTubeSlot,
  GameState,
  IncubatorSlot,
} from '../types/game-state.types.ts';
import { computeActiveTechModifiers } from './tech.system.ts';

/**
 * Transfère une colonie de la paillasse vers un tube libre de la Chambre Cryogénique.
 * Fige intégralement son temps de pousse et sa durée de vie adulte.
 */
export function moveColonyToCryoTube(
  state: GameState,
  fromSlotIndex: number,
  toTubeIndex: number,
  eventBus?: EventBus
): GameState {
  const sourceSlot = state.incubatorSlots[fromSlotIndex];
  if (!sourceSlot || sourceSlot.status !== 'COLONY') {
    throw new Error(`Aucune colonie active sur l'incubateur ${String(fromSlotIndex)}`);
  }

  const targetTube = state.cryoSlots[toTubeIndex];
  if (!targetTube) {
    throw new Error(`Tube cryogénique invalide : ${String(toTubeIndex)}`);
  }
  if (targetTube.status !== 'EMPTY') {
    throw new Error(`Le tube cryogénique ${String(toTubeIndex)} est déjà occupé`);
  }

  const frozenSlot: FrozenCryoTubeSlot = {
    status: 'FROZEN',
    tubeIndex: toTubeIndex,
    storedColony: { ...sourceSlot },
    frozenDurationSeconds: 0,
  };

  const updatedIncubators: IncubatorSlot[] = state.incubatorSlots.map((s, idx) =>
    idx === fromSlotIndex ? { status: 'EMPTY', slotIndex: fromSlotIndex } : s
  );

  const updatedCryoSlots: CryoTubeSlot[] = state.cryoSlots.map((t, idx) =>
    idx === toTubeIndex ? frozenSlot : t
  );

  if (eventBus) {
    eventBus.emit({
      type: 'COLONY_FROZEN_IN_CRYO',
      fromSlotIndex,
      toTubeIndex,
      strainId: sourceSlot.strainId,
    });
  }

  return {
    ...state,
    incubatorSlots: updatedIncubators,
    cryoSlots: updatedCryoSlots,
  };
}

/**
 * Décongèle une colonie depuis un cryo-tube vers un incubateur libre de la paillasse.
 * Préserve son état exact et cumule le temps passé en cryo dans `cryoStabilizedSeconds`.
 */
export function thawColonyFromCryoTube(
  state: GameState,
  fromTubeIndex: number,
  toSlotIndex: number,
  eventBus?: EventBus
): GameState {
  const sourceTube = state.cryoSlots[fromTubeIndex];
  if (!sourceTube || sourceTube.status !== 'FROZEN') {
    throw new Error(`Aucune colonie congelée dans le tube ${String(fromTubeIndex)}`);
  }

  const targetSlot = state.incubatorSlots[toSlotIndex];
  if (!targetSlot) {
    throw new Error(`Emplacement d'incubateur invalide : ${String(toSlotIndex)}`);
  }
  if (targetSlot.status !== 'EMPTY') {
    throw new Error(`L'incubateur ${String(toSlotIndex)} n'est pas vide`);
  }

  const previousStabilized = sourceTube.storedColony.cryoStabilizedSeconds ?? 0;
  const restoredColony: ColonyIncubatorSlot = {
    ...sourceTube.storedColony,
    slotIndex: toSlotIndex,
    cryoStabilizedSeconds: roundCurrency(previousStabilized + sourceTube.frozenDurationSeconds),
  };

  const updatedIncubators: IncubatorSlot[] = state.incubatorSlots.map((s, idx) =>
    idx === toSlotIndex ? restoredColony : s
  );

  const updatedCryoSlots: CryoTubeSlot[] = state.cryoSlots.map((t, idx) =>
    idx === fromTubeIndex ? { status: 'EMPTY', tubeIndex: fromTubeIndex } : t
  );

  if (eventBus) {
    eventBus.emit({
      type: 'COLONY_THAWED_FROM_CRYO',
      fromTubeIndex,
      toSlotIndex,
      strainId: restoredColony.strainId,
      frozenDurationSeconds: sourceTube.frozenDurationSeconds,
    });
  }

  return {
    ...state,
    incubatorSlots: updatedIncubators,
    cryoSlots: updatedCryoSlots,
  };
}

import { computeActiveTrophyModifiers } from './trophies.system.ts';

/**
 * Calcule le coût total d'entretien en azote liquide (Bio/s) et la production basale gelée (Tech C3 : 5 % Bio/s)
 * de l'ensemble des tubes actifs de la Chambre Cryogénique.
 * Intègre :
 * - Tech C1 (-25 %) + Tech C2 (-50 %) + Trophée #06 (-10 %) = jusqu'à -85 % de réduction
 * - Événement B10 (stoppe gratuitement la consommation d'azote pendant 90s)
 * - Incident M2 (surcoût de +15 % pendant 3 minutes si non résolu)
 */
export function evaluateCryoChamberMetrics(state: GameState): {
  readonly totalCryoUpkeepBioPerSec: number;
  readonly totalCryoProductionBioPerSec: number;
} {
  const techMods = computeActiveTechModifiers(state);
  const trophyMods = computeActiveTrophyModifiers(state);

  const isB10FreeActive = state.benchBuffs.b10ZeroCryoUpkeepRemainingSeconds > 0;
  const m2SurchargeMultiplier =
    state.benchBuffs.m2CryoSurchargeRemainingSeconds > 0 ? 1.15 : 1.0;

  const totalReduction =
    techMods.cryoUpkeepReductionRatio + trophyMods.cryoUpkeepReductionRatio;
  const globalUpkeepMultiplier = isB10FreeActive
    ? 0
    : clamp(1 - totalReduction, 0, 1) * m2SurchargeMultiplier;

  let totalUpkeep = 0;
  let totalProduction = 0;

  for (const tube of state.cryoSlots) {
    if (tube.status !== 'FROZEN') {
      continue;
    }
    const strain = STRAINS_BY_ID[tube.storedColony.strainId];
    if (!strain) {
      continue;
    }

    // Corynebacterium simplex : "divise ses propres frais de maintien cryogénique par 2"
    const strainSelfFactor =
      strain.effect.type === 'SELF_CRYO_UPKEEP_HALVED' ? strain.effect.value : 1.0;

    const tubeUpkeep = strain.cryoUpkeepBioPerSec * strainSelfFactor * globalUpkeepMultiplier;
    totalUpkeep += tubeUpkeep;

    if (techMods.cryoProductionRatio > 0) {
      const baseBioPerSec =
        strain.multiplier *
        GAME_CONSTANTS.BASE_BIO_PER_SECOND *
        tube.storedColony.maturityRatio;
      totalProduction += baseBioPerSec * techMods.cryoProductionRatio;
    }
  }

  return {
    totalCryoUpkeepBioPerSec: roundCurrency(totalUpkeep),
    totalCryoProductionBioPerSec: roundCurrency(totalProduction),
  };
}

/**
 * Fait progresser le compteur de durée de congélation de chaque tube occupé (pour [Stabilisation Cryo] et Trophée #06).
 */
export function advanceCryoChamberTick(state: GameState, dtSeconds: number): GameState {
  if (dtSeconds <= 0 || state.isPaused) {
    return state;
  }

  let maxFrozen = state.stats.maxCryoFrozenDurationSeconds ?? 0;
  let hasFrozenTubes = false;

  const updatedCryoSlots: CryoTubeSlot[] = state.cryoSlots.map((tube): CryoTubeSlot => {
    if (tube.status !== 'FROZEN') {
      return tube;
    }
    hasFrozenTubes = true;
    const nextDuration = tube.frozenDurationSeconds + dtSeconds;
    if (nextDuration > maxFrozen) {
      maxFrozen = nextDuration;
    }
    return {
      ...tube,
      frozenDurationSeconds: nextDuration,
    };
  });

  if (!hasFrozenTubes) {
    return state;
  }

  return {
    ...state,
    cryoSlots: updatedCryoSlots,
    stats: {
      ...state.stats,
      maxCryoFrozenDurationSeconds: roundCurrency(maxFrozen),
    },
  };
}

import { CULTURE_MEDIA_BY_ID } from '../data/media.data.ts';
import { GAME_CONSTANTS } from '../data/constants.data.ts';
import { STRAINS_BY_ID } from '../data/strains.data.ts';
import type { EventBus } from '../core/event-bus.ts';
import {
  computeBioreactorCompostRefund,
  computeFlashAutoclaveCost,
  roundCurrency,
} from '../core/math.ts';
import type {
  BioreactorTask,
  GameState,
  IncubatorSlot,
} from '../types/game-state.types.ts';
import { computeActiveTechModifiers } from './tech.system.ts';
import { computeActiveTrophyModifiers } from './trophies.system.ts';

/**
 * Vérifie si un emplacement donné a une colonie de Nocardia asteroides directement adjacente (gauche ou droite en 1D).
 * Nocardia asteroides : "détruire un bio-déchet adjacent rapporte un bonus de +200 Bio."
 */
function countAdjacentNocardiaColonies(
  slots: readonly IncubatorSlot[],
  targetSlotIndex: number
): number {
  let count = 0;
  const neighbors = [targetSlotIndex - 1, targetSlotIndex + 1];
  for (const idx of neighbors) {
    const neighbor = slots[idx];
    if (neighbor && neighbor.status === 'COLONY' && neighbor.strainId === 'NOCARDIA_ASTEROIDES') {
      count += 1;
    }
  }
  return count;
}

/**
 * Section 3.B.3 : Incinération Rapide (Autoclave Flash)
 * Coûte 15 Bio * sqrt(Multiplicateur Souche), réduit de 25 % si Trophée #14 est débloqué,
 * et majoré de +20 Bio si l'incident M5 (Suintement d'Agar) a expiré sans être résolu.
 */
export function evacuateWasteWithFlashAutoclave(
  state: GameState,
  slotIndex: number,
  eventBus?: EventBus
): GameState {
  const slot = state.incubatorSlots[slotIndex];
  if (!slot || slot.status !== 'WASTE') {
    throw new Error(`Aucun bio-déchet à l'emplacement ${String(slotIndex)}`);
  }

  const originStrain = STRAINS_BY_ID[slot.originStrainId];
  if (!originStrain) {
    throw new Error(`Souche d'origine inconnue : ${slot.originStrainId}`);
  }

  const trophyMods = computeActiveTrophyModifiers(state);
  const baseCost = computeFlashAutoclaveCost(originStrain.multiplier);
  const reducedCost = baseCost * (1 - trophyMods.flashAutoclaveCostReductionRatio);
  const m5Surcharge = state.benchBuffs.m5NextAutoclaveSurchargeBio;
  const costBio = roundCurrency(reducedCost + m5Surcharge);

  if (state.bio < costBio) {
    throw new Error(
      `Solde Bio insuffisant pour l'Autoclave Flash (${String(state.bio)} < ${String(costBio)} Bio)`
    );
  }

  const adjacentNocardiaCount = countAdjacentNocardiaColonies(state.incubatorSlots, slotIndex);
  const nocardiaBonusBio = adjacentNocardiaCount * 200;

  const updatedSlots: IncubatorSlot[] = state.incubatorSlots.map((s, idx) =>
    idx === slotIndex ? { status: 'EMPTY', slotIndex } : s
  );

  if (eventBus) {
    eventBus.emit({
      type: 'WASTE_AUTOCLAVED',
      slotIndex,
      originStrainId: slot.originStrainId,
      costBio,
      nocardiaBonusBio,
    });
  }

  return {
    ...state,
    bio: roundCurrency(state.bio - costBio + nocardiaBonusBio),
    incubatorSlots: updatedSlots,
    benchBuffs: {
      ...state.benchBuffs,
      m5NextAutoclaveSurchargeBio: 0,
    },
    stats: {
      ...state.stats,
      totalBioEarned: roundCurrency(state.stats.totalBioEarned + nocardiaBonusBio),
      totalAutoclavedWaste: state.stats.totalAutoclavedWaste + 1,
    },
  };
}

/**
 * Section 3.B.3 : Bioréacteur de Recyclage (Décontamination Lente)
 * Transfère gratuitement le résidu dans la cuve à boue biologique pour 90 secondes
 * (divisé par 2 avec Tech S2, accéléré de +20 % avec Trophée #11).
 * Libère l'emplacement d'incubateur et restituera 10 % du coût du milieu d'origine à la fin.
 */
export function startBioreactorRecycling(
  state: GameState,
  slotIndex: number,
  eventBus?: EventBus
): GameState {
  const slot = state.incubatorSlots[slotIndex];
  if (!slot || slot.status !== 'WASTE') {
    throw new Error(`Aucun bio-déchet à recycler à l'emplacement ${String(slotIndex)}`);
  }

  const originMedium = CULTURE_MEDIA_BY_ID[slot.originMediumId];
  const techMods = computeActiveTechModifiers(state);
  const trophyMods = computeActiveTrophyModifiers(state);

  const speedDivisor = 1 + trophyMods.wasteProcessingSpeedBonusRatio;
  const durationSeconds = roundCurrency(
    (GAME_CONSTANTS.WASTE.bioreactorRecycleDurationSeconds *
      techMods.bioreactorDurationMultiplier) /
      speedDivisor
  );
  const refundBioAmount = computeBioreactorCompostRefund(originMedium.costBio);

  const adjacentNocardiaCount = countAdjacentNocardiaColonies(state.incubatorSlots, slotIndex);
  const nocardiaBonusBio = adjacentNocardiaCount * 200;

  const taskId = `BIOREACTOR_${String(slotIndex)}_${String(state.stats.totalRecycledWaste + state.bioreactorTasks.length + 1)}`;

  const newTask: BioreactorTask = {
    taskId,
    originSlotIndex: slotIndex,
    originStrainId: slot.originStrainId,
    originMediumId: slot.originMediumId,
    remainingSeconds: durationSeconds,
    totalDurationSeconds: durationSeconds,
    refundBioAmount,
  };

  const updatedSlots: IncubatorSlot[] = state.incubatorSlots.map((s, idx) =>
    idx === slotIndex ? { status: 'EMPTY', slotIndex } : s
  );

  if (eventBus) {
    eventBus.emit({
      type: 'WASTE_RECYCLING_STARTED',
      slotIndex,
      taskId,
      durationSeconds,
    });
  }

  return {
    ...state,
    bio: roundCurrency(state.bio + nocardiaBonusBio),
    incubatorSlots: updatedSlots,
    bioreactorTasks: [...state.bioreactorTasks, newTask],
    stats: {
      ...state.stats,
      totalBioEarned: roundCurrency(state.stats.totalBioEarned + nocardiaBonusBio),
    },
  };
}

/**
 * Fait progresser :
 * 1. L'absorption automatique de Necro-Spore Oblivion (si présente sur la paillasse)
 * 2. Le timer de 60 s d'émanation toxique des déchets sur la paillasse
 * 3. Les tâches de recyclage dans le bioréacteur
 */
export function advanceWasteAndBioreactorTick(
  state: GameState,
  dtSeconds: number,
  eventBus?: EventBus
): GameState {
  if (dtSeconds <= 0 || state.isPaused) {
    return state;
  }

  let currentSlots: IncubatorSlot[] = [...state.incubatorSlots];
  let totalAutoclavedDelta = 0;

  // 1. Effet de Necro-Spore Oblivion : incinère automatiquement les déchets du labo et gagne +2 % de rendement par déchet absorbé
  const necroSporeSlotIndex = currentSlots.findIndex(
    (s) => s.status === 'COLONY' && s.strainId === 'NECRO_SPORE_OBLIVION'
  );

  if (necroSporeSlotIndex !== -1) {
    let absorbedNow = 0;
    currentSlots = currentSlots.map((slot): IncubatorSlot => {
      if (slot.status === 'WASTE') {
        absorbedNow += 1;
        if (eventBus) {
          eventBus.emit({
            type: 'WASTE_AUTO_ABSORBED',
            wasteSlotIndex: slot.slotIndex,
            absorberSlotIndex: necroSporeSlotIndex,
            absorberStrainId: 'NECRO_SPORE_OBLIVION',
          });
        }
        return {
          status: 'EMPTY',
          slotIndex: slot.slotIndex,
        };
      }
      return slot;
    });

    if (absorbedNow > 0) {
      totalAutoclavedDelta += absorbedNow;
      const necroSlot = currentSlots[necroSporeSlotIndex];
      if (necroSlot && necroSlot.status === 'COLONY') {
        currentSlots[necroSporeSlotIndex] = {
          ...necroSlot,
          absorbedWasteCount: necroSlot.absorbedWasteCount + absorbedNow,
        };
      }
    }
  }

  // 2. Avancement du timer de 60 s d'émanation toxique sur les déchets restants
  currentSlots = currentSlots.map((slot): IncubatorSlot => {
    if (slot.status !== 'WASTE') {
      return slot;
    }
    const nextElapsed = slot.necrosisElapsedSeconds + dtSeconds;
    const becomesToxicNow =
      !slot.isToxic && nextElapsed >= GAME_CONSTANTS.WASTE.toxicityDelaySeconds;

    if (becomesToxicNow && eventBus) {
      eventBus.emit({
        type: 'TOXIC_EMISSION_STARTED',
        slotIndex: slot.slotIndex,
        originStrainId: slot.originStrainId,
      });
    }

    return {
      ...slot,
      necrosisElapsedSeconds: nextElapsed,
      isToxic: slot.isToxic || becomesToxicNow,
    };
  });

  // 3. Avancement des tâches du Bioréacteur
  let totalRefundBio = 0;
  let completedTasksCount = 0;
  const remainingTasks: BioreactorTask[] = [];

  for (const task of state.bioreactorTasks) {
    const nextRemaining = task.remainingSeconds - dtSeconds;
    if (nextRemaining > 1e-9) {
      remainingTasks.push({
        ...task,
        remainingSeconds: nextRemaining,
      });
    } else {
      totalRefundBio += task.refundBioAmount;
      completedTasksCount += 1;
      if (eventBus) {
        eventBus.emit({
          type: 'WASTE_RECYCLING_COMPLETED',
          taskId: task.taskId,
          refundBio: task.refundBioAmount,
        });
      }
    }
  }

  return {
    ...state,
    bio: roundCurrency(state.bio + totalRefundBio),
    incubatorSlots: currentSlots,
    bioreactorTasks: remainingTasks,
    stats: {
      ...state.stats,
      totalBioEarned: roundCurrency(state.stats.totalBioEarned + totalRefundBio),
      totalAutoclavedWaste: state.stats.totalAutoclavedWaste + totalAutoclavedDelta,
      totalRecycledWaste: state.stats.totalRecycledWaste + completedTasksCount,
    },
  };
}

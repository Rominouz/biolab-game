import { FACTORY_TIERS_BY_LEVEL } from '../data/factory.data.ts';
import type { EventBus } from '../core/event-bus.ts';
import { roundCurrency } from '../core/math.ts';
import type {
  CryoTubeSlot,
  GameState,
  IncubatorSlot,
} from '../types/game-state.types.ts';
import type { FactoryTierLevel } from '../types/game.types.ts';

/**
 * Redimensionne le tableau de cryo-tubes pour correspondre à la capacité cible
 * (capacité du palier d'usine + 1 tube gratuit si Streptomyces coelicolor a été stabilisée),
 * sans altérer les tubes déjà occupés.
 */
export function syncCryoSlotsCapacity(state: GameState): readonly CryoTubeSlot[] {
  const tierDef = FACTORY_TIERS_BY_LEVEL[state.factoryTier];
  const extraCoelicolorSlot = state.hasUnlockedCoelicolorExtraCryoSlot ? 1 : 0;
  const targetCount = tierDef.cryoTubeSlots + extraCoelicolorSlot;

  if (state.cryoSlots.length >= targetCount) {
    return state.cryoSlots;
  }

  const additionalSlots: CryoTubeSlot[] = Array.from(
    { length: targetCount - state.cryoSlots.length },
    (_, offset): CryoTubeSlot => ({
      status: 'EMPTY',
      tubeIndex: state.cryoSlots.length + offset,
    })
  );

  return [...state.cryoSlots, ...additionalSlots];
}

/**
 * Débloque le palier supérieur d'infrastructure d'usine (Niv 2 à 5).
 * Étend immédiatement les emplacements d'incubateurs (4 -> 6 -> 8 -> 10 -> 12)
 * et de cryo-tubes (2 -> 4 -> 8 -> 12 -> 18).
 */
export function upgradeFactoryTier(state: GameState, eventBus?: EventBus): GameState {
  if (state.factoryTier >= 5) {
    throw new Error("L'usine a déjà atteint le palier maximal (Palier 5 : Complexe Bunker BSL-4)");
  }

  const nextLevel = (state.factoryTier + 1) as FactoryTierLevel;
  const nextTierDef = FACTORY_TIERS_BY_LEVEL[nextLevel];

  if (state.bio < nextTierDef.unlockCostBio) {
    throw new Error(
      `Solde Bio insuffisant pour débloquer ${nextTierDef.nameFr} (${String(state.bio)} < ${String(nextTierDef.unlockCostBio)} Bio)`
    );
  }

  if (state.pr < nextTierDef.unlockCostPr) {
    throw new Error(
      `Points de Recherche (PR) insuffisants pour débloquer ${nextTierDef.nameFr} (${String(state.pr)} < ${String(nextTierDef.unlockCostPr)} PR)`
    );
  }

  // Extension des emplacements d'incubateurs en conservant les boîtes existantes
  const currentIncubatorCount = state.incubatorSlots.length;
  const addedIncubators: IncubatorSlot[] = Array.from(
    { length: Math.max(0, nextTierDef.incubatorSlots - currentIncubatorCount) },
    (_, offset): IncubatorSlot => ({
      status: 'EMPTY',
      slotIndex: currentIncubatorCount + offset,
    })
  );

  const updatedState: GameState = {
    ...state,
    bio: roundCurrency(state.bio - nextTierDef.unlockCostBio),
    pr: roundCurrency(state.pr - nextTierDef.unlockCostPr),
    factoryTier: nextLevel,
    incubatorSlots: [...state.incubatorSlots, ...addedIncubators],
  };

  const updatedCryoSlots = syncCryoSlotsCapacity(updatedState);

  if (eventBus) {
    eventBus.emit({
      type: 'FACTORY_TIER_UNLOCKED',
      newTier: nextLevel,
      costBio: nextTierDef.unlockCostBio,
      costPr: nextTierDef.unlockCostPr,
    });
  }

  return {
    ...updatedState,
    cryoSlots: updatedCryoSlots,
  };
}

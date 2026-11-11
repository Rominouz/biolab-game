import { FACTORY_TIERS_BY_LEVEL } from '../data/factory.data.ts';
import { GAME_CONSTANTS } from '../data/constants.data.ts';
import { generateProceduralContract } from '../systems/contracts.system.ts';
import { createInitialBenchBuffsState } from '../systems/events.system.ts';
import type {
  EmptyCryoTubeSlot,
  EmptyIncubatorSlot,
  GameState,
} from '../types/game-state.types.ts';
import type { CultureMediumId } from '../types/game.types.ts';
import type { ContractBoardSlot } from '../types/meta.types.ts';
import { createSeededRng } from './rng.ts';

/**
 * Crée l'état initial d'une Nouvelle Partie conforme aux arbitrages de la Phase 0 :
 * - 150 Bio, 0 PR
 * - Usine Niveau 1 (4 emplacements d'incubateurs vides, 2 cryo-tubes vides, charges fixes de 0.5 Bio/s)
 * - 1 boîte de Gélose Nutritive Ordinaire offerte en stock
 * - 3 contrats initiaux générés sur le panneau d'affichage
 */
export function createInitialGameState(seed = 1984_0042): GameState {
  const tier1 = FACTORY_TIERS_BY_LEVEL[GAME_CONSTANTS.INITIAL_STATE.startingFactoryTier];
  const initRng = createSeededRng(seed);

  const incubatorSlots: EmptyIncubatorSlot[] = Array.from(
    { length: tier1.incubatorSlots },
    (_, slotIndex): EmptyIncubatorSlot => ({
      status: 'EMPTY',
      slotIndex,
    })
  );

  const cryoSlots: EmptyCryoTubeSlot[] = Array.from(
    { length: tier1.cryoTubeSlots },
    (_, tubeIndex): EmptyCryoTubeSlot => ({
      status: 'EMPTY',
      tubeIndex,
    })
  );

  const mediaInventory: Record<CultureMediumId, number> = {
    MEDIUM_1_ORDINARY_AGAR: GAME_CONSTANTS.INITIAL_STATE.freeOrdinaryAgarCount,
    MEDIUM_2_BRAIN_HEART_BROTH: 0,
    MEDIUM_3_SHEEP_BLOOD_AGAR: 0,
    MEDIUM_4_CHOCOLATE_ISOVITALEX: 0,
    MEDIUM_5_HYPERSALINE_VOLCANIC: 0,
    MEDIUM_6_CRYO_ABYSSAL_SERUM: 0,
    MEDIUM_7_RADIO_ISOTOPIC_AGAR: 0,
  };

  const contractBoard: readonly [ContractBoardSlot, ContractBoardSlot, ContractBoardSlot] = [
    {
      status: 'ACTIVE',
      slotIndex: 0,
      contract: generateProceduralContract(0, 1, tier1.level, initRng, 0),
    },
    {
      status: 'ACTIVE',
      slotIndex: 1,
      contract: generateProceduralContract(1, 2, tier1.level, initRng, 0),
    },
    {
      status: 'ACTIVE',
      slotIndex: 2,
      contract: generateProceduralContract(2, 3, tier1.level, initRng, 0),
    },
  ];

  return {
    bio: GAME_CONSTANTS.INITIAL_STATE.bio,
    pr: GAME_CONSTANTS.INITIAL_STATE.pr,
    factoryTier: tier1.level,
    isPaused: false,
    isUndervoltage: false,
    mediaInventory,
    incubatorSlots,
    cryoSlots,
    unlockedTechIds: [],
    unlockedTrophyIds: [],
    hasUnlockedCoelicolorExtraCryoSlot: false,
    bioreactorTasks: [],
    activeBenchEvent: null,
    nextBenchEventSpawnTimerSeconds: GAME_CONSTANTS.EVENTS.minSpawnIntervalSeconds,
    benchBuffs: createInitialBenchBuffsState(),
    contractBoard,
    nextContractSerial: 4,
    logbook: {
      entries: [],
      hybridizationCodex: [],
      freeNotesText: '',
    },
    economy: {
      grossBioPerSec: 0,
      passivePrPerSec: 0,
      fixedOverheadBioPerSec: tier1.fixedOverheadBioPerSec,
      cryoUpkeepBioPerSec: 0,
      netBioPerSec: -tier1.fixedOverheadBioPerSec,
      slotEffectiveBioPerSec: incubatorSlots.map(() => 0),
    },
    stats: {
      totalBioEarned: 0,
      totalPrEarned: 0,
      totalManualSeedings: 0,
      totalManualInjections: 0,
      totalAutoclavedWaste: 0,
      totalRecycledWaste: 0,
      totalObservationSeconds: 0,
      discoveredStrainIds: [],
      totalScissiparitySuccesses: 0,
      totalMutagenesisSuccessesWithoutLysis: 0,
      totalConjugationsCompleted: 0,
      maxCryoFrozenDurationSeconds: 0,
      totalContractsCompleted: 0,
      totalCivilianContractsCompleted: 0,
      totalVitalUrgencyContractsCompleted: 0,
      hasMaturedLegendaryStrain: false,
      hasStabilizedMythicWithoutCryo: false,
      hasSurvivedUndervoltage: false,
    },
  };
}

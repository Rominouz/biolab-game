import type { CultureMediumId, FactoryTierLevel, TechId, TrophyId } from './game.types.ts';
import type {
  ActiveBenchEvent,
  BenchBuffsState,
  ContractBoardSlot,
  LogbookState,
} from './meta.types.ts';

/**
 * BIOLAB — Modélisation de l'État Dynamique Complet du Laboratoire (Phases 2, 3 & 4)
 */

export interface EmptyIncubatorSlot {
  readonly status: 'EMPTY';
  readonly slotIndex: number;
}

export interface ColonyIncubatorSlot {
  readonly status: 'COLONY';
  readonly slotIndex: number;
  readonly strainId: string;
  readonly originMediumId: CultureMediumId;
  /** Temps de pousse accumulé en secondes */
  readonly growthElapsedSeconds: number;
  /** Temps total requis pour atteindre 100 % de maturité */
  readonly growthDurationSeconds: number;
  /** Ratio de maturité entre 0.0 et 1.0 */
  readonly maturityRatio: number;
  /** Vrai dès que maturityRatio === 1.0 */
  readonly isMature: boolean;
  /** Durée de vie adulte restante en secondes (décrémente une fois mature) */
  readonly adultLifespanRemainingSeconds: number;
  /** Durée de vie adulte initiale en secondes */
  readonly adultLifespanTotalSeconds: number;
  /** Cooldown restant avant la prochaine injection manuelle de nutriments (en secondes) */
  readonly manualInjectionCooldownSeconds: number;
  /** Nombre de déchets absorbés (pour Necro-Spore Oblivion : +2 % de rendement par déchet) */
  readonly absorbedWasteCount: number;
  /** Indique si la colonie est issue d'une mutation (pour les contrats Pureté Génétique) */
  readonly isMutated: boolean;
  /** Temps cumulé passé en Chambre Cryogénique (pour la contrainte [Stabilisation Cryo] de 2 min) */
  readonly cryoStabilizedSeconds?: number;
}

export interface WasteIncubatorSlot {
  readonly status: 'WASTE';
  readonly slotIndex: number;
  readonly originStrainId: string;
  readonly originMediumId: CultureMediumId;
  /** Temps écoulé depuis la nécrose en secondes */
  readonly necrosisElapsedSeconds: number;
  /** Vrai si necrosisElapsedSeconds >= 60 secondes (émanation toxique active : -25 % aux voisins) */
  readonly isToxic: boolean;
}

export type IncubatorSlot = EmptyIncubatorSlot | ColonyIncubatorSlot | WasteIncubatorSlot;

export interface EmptyCryoTubeSlot {
  readonly status: 'EMPTY';
  readonly tubeIndex: number;
}

export interface FrozenCryoTubeSlot {
  readonly status: 'FROZEN';
  readonly tubeIndex: number;
  /** Snapshot gelé de la colonie (vieillissement figé) */
  readonly storedColony: ColonyIncubatorSlot;
  /** Durée continue passée dans ce cryo-tube en secondes */
  readonly frozenDurationSeconds: number;
}

export type CryoTubeSlot = EmptyCryoTubeSlot | FrozenCryoTubeSlot;

export interface BioreactorTask {
  readonly taskId: string;
  readonly originSlotIndex: number;
  readonly originStrainId: string;
  readonly originMediumId: CultureMediumId;
  readonly remainingSeconds: number;
  readonly totalDurationSeconds: number;
  readonly refundBioAmount: number;
}

export interface EconomySnapshot {
  readonly grossBioPerSec: number;
  readonly passivePrPerSec: number;
  readonly fixedOverheadBioPerSec: number;
  readonly cryoUpkeepBioPerSec: number;
  readonly netBioPerSec: number;
  readonly slotEffectiveBioPerSec: readonly number[];
}

export interface LabStatistics {
  readonly totalBioEarned: number;
  readonly totalPrEarned: number;
  readonly totalManualSeedings: number;
  readonly totalManualInjections: number;
  readonly totalAutoclavedWaste: number;
  readonly totalRecycledWaste: number;
  readonly totalObservationSeconds: number;
  readonly discoveredStrainIds: readonly string[];
  readonly totalScissiparitySuccesses?: number;
  readonly totalMutagenesisSuccessesWithoutLysis?: number;
  readonly totalConjugationsCompleted?: number;
  readonly maxCryoFrozenDurationSeconds?: number;
  readonly totalContractsCompleted?: number;
  readonly totalCivilianContractsCompleted?: number;
  readonly totalVitalUrgencyContractsCompleted?: number;
  readonly hasMaturedLegendaryStrain?: boolean;
  readonly hasStabilizedMythicWithoutCryo?: boolean;
  readonly hasSurvivedUndervoltage?: boolean;
}

export interface GameState {
  readonly bio: number;
  readonly pr: number;
  readonly factoryTier: FactoryTierLevel;
  readonly isPaused: boolean;
  readonly isUndervoltage: boolean;
  readonly mediaInventory: Readonly<Record<CultureMediumId, number>>;
  readonly incubatorSlots: readonly IncubatorSlot[];
  readonly cryoSlots: readonly CryoTubeSlot[];
  readonly unlockedTechIds: readonly TechId[];
  readonly unlockedTrophyIds: readonly TrophyId[];
  readonly hasUnlockedCoelicolorExtraCryoSlot: boolean;
  readonly bioreactorTasks: readonly BioreactorTask[];
  readonly activeBenchEvent: ActiveBenchEvent | null;
  readonly nextBenchEventSpawnTimerSeconds: number;
  readonly benchBuffs: BenchBuffsState;
  readonly contractBoard: readonly [ContractBoardSlot, ContractBoardSlot, ContractBoardSlot];
  readonly nextContractSerial: number;
  readonly logbook: LogbookState;
  readonly economy: EconomySnapshot;
  readonly stats: LabStatistics;
}

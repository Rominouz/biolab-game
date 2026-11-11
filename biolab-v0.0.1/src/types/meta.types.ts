import type {
  BenchEventId,
  ContractConstraintId,
  ContractObjectiveType,
  CultureMediumId,
  SponsorId,
  StandardBranchId,
} from './game.types.ts';

/**
 * BIOLAB — Modélisation des Systèmes Dynamiques & Méta (Phase 4)
 * Contrats Procéduraux, Micro-Événements de Paillasse, Trophées & Journal de Bord Manuscrit
 */

export interface ActiveBenchEvent {
  readonly eventId: BenchEventId;
  readonly category: 'BENEFICIAL' | 'INCIDENT';
  readonly remainingDisplaySeconds: number;
  readonly totalDisplaySeconds: number;
  readonly currentClicks: number;
  readonly requiredClicks: number;
  /** Emplacement de boîte ciblé si applicable (ex: B1 Goutte de Condensat, B8 Effusion, M5 Suintement) */
  readonly targetSlotIndex?: number;
}

export interface BenchBuffsState {
  /** B2 : vitesse de pousse +20 % temporaire (30s) */
  readonly b2GrowthSpeedRemainingSeconds: number;
  /** B4 : +10 % Bio/s pendant 45s */
  readonly b4BioBoostRemainingSeconds: number;
  /** B6 : réduit de 15 % le coût de la prochaine division cellulaire mitotique */
  readonly b6NextDivisionDiscountActive: boolean;
  /** B7 : charges fixes d'usine annulées pendant 60s */
  readonly b7ZeroFixedOverheadRemainingSeconds: number;
  /** B8 : double la génération d'une boîte pendant 30s */
  readonly b8DoubledSlotIndex?: number;
  readonly b8DoubledSlotRemainingSeconds: number;
  /** B9 : +5 % de chance de mutation lors de la prochaine mutagenèse chimique */
  readonly b9NextMutagenesisBonusActive: boolean;
  /** B10 : stoppe gratuitement la consommation d'azote des cryo-tubes pendant 90s */
  readonly b10ZeroCryoUpkeepRemainingSeconds: number;

  /** M1 (malus si non résolu) : les temps de pousse du plateau augmentent de +10 % pendant 2 minutes (120s) */
  readonly m1SlowGrowthPenaltyRemainingSeconds: number;
  /** M2 (malus si non résolu) : surcoût d'entretien cryo de +15 % pendant 3 minutes (180s) */
  readonly m2CryoSurchargeRemainingSeconds: number;
  /** M3 (malus si non résolu) : risque de lyse en mitose augmenté de +3 % temporairement (120s) */
  readonly m3MitosisLysisPenaltyRemainingSeconds: number;
  /** M4 (malus si non résolu) : la prochaine boîte ensemencée démarre avec 10 % de vie adulte en moins */
  readonly m4NextSeededLifespanPenaltyActive: boolean;
  /** M5 (malus si non résolu) : l'évacuation du prochain résidu mort coûtera +20 Bio supplémentaire */
  readonly m5NextAutoclaveSurchargeBio: number;
}

export interface ProceduralContract {
  readonly id: string;
  readonly slotIndex: 0 | 1 | 2;
  readonly sponsorId: SponsorId;
  readonly objectiveType: ContractObjectiveType;
  readonly constraintId?: ContractConstraintId;
  /** Souche cible principale (pour Prélèvement Définitif, Extraction Continue, Course d'Incubation) */
  readonly targetStrainId: string;
  /** Souches parentes demandées si objectiveType === SPECIFIC_CHIMERA */
  readonly chimeraParentStrainIds?: readonly [string, string];
  /** Branche et nombre de souches requis si objectiveType === PLATEAU_SYMBIOSIS */
  readonly symbiosisTargetBranch?: StandardBranchId;
  readonly symbiosisRequiredCount?: 3 | 4;
  /** Temps maintenu accumulé pour CONTINUOUS_METABOLIC_EXTRACTION (objectif : 90s) */
  readonly extractionElapsedSeconds: number;
  readonly extractionRequiredSeconds: number;
  /** Compte à rebours restant si le contrat est chronométré (TIMED_INCUBATION_RACE ou [Urgence Vitale]) */
  readonly timeLimitRemainingSeconds?: number;
  readonly timeLimitTotalSeconds?: number;
  /** Indique si la Chimère Spécifique a été synthétisée depuis l'apparition du contrat */
  readonly chimeraValidated?: boolean;
  /** Récompenses calculées (incluant multiplicateur de contrainte) */
  readonly rewardBio: number;
  readonly rewardPr: number;
  readonly rewardMediumId?: CultureMediumId;
  readonly rewardMediumCount?: number;
}

export interface EmptyContractSlot {
  readonly status: 'RENEWING';
  readonly slotIndex: 0 | 1 | 2;
  readonly renewalRemainingSeconds: number;
}

export interface ActiveContractSlot {
  readonly status: 'ACTIVE';
  readonly slotIndex: 0 | 1 | 2;
  readonly contract: ProceduralContract;
}

export type ContractBoardSlot = EmptyContractSlot | ActiveContractSlot;

export interface LogbookEntry {
  readonly id: string;
  readonly timestampLabelFr: string;
  readonly category: 'DISCOVERY' | 'MUTATION' | 'UNDERVOLTAGE_SURVIVAL' | 'TROPHY' | 'CONTRACT';
  readonly messageFr: string;
}

export interface HybridizationCodexEntry {
  readonly pairKey: string;
  readonly parentAStrainId: string;
  readonly parentBStrainId: string;
  readonly attemptsCount: number;
  readonly successesCount: number;
  readonly observedOffspringStrainIds: readonly string[];
}

export interface LogbookState {
  readonly entries: readonly LogbookEntry[];
  readonly hybridizationCodex: readonly HybridizationCodexEntry[];
  readonly freeNotesText: string;
}

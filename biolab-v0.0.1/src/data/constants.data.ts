/**
 * Constantes globales d'équilibrage issues de specs.md et des arbitrages de Phase 0
 */

export const PPM_BASE = 1_000_000;

export const GAME_CONSTANTS = Object.freeze({
  /** Arbitrage #1 : 1.0 Bio/s pour le multiplicateur x1.0 */
  BASE_BIO_PER_SECOND: 1.0,

  /** Arbitrage #2 : Ressources de départ en nouvelle partie */
  INITIAL_STATE: Object.freeze({
    bio: 150,
    pr: 0,
    activeColonies: 0,
    freeOrdinaryAgarCount: 1,
    startingFactoryTier: 1 as const,
  }),

  /** Section 3.B : Sénescence & Bio-Déchets */
  WASTE: Object.freeze({
    toxicityDelaySeconds: 60,
    adjacentYieldPenaltyRatio: 0.25,
    flashAutoclaveBaseFactorBio: 15,
    bioreactorRecycleDurationSeconds: 90,
    bioreactorCompostRefundRatio: 0.1,
  }),

  /** Section 5 : Régulation économique & Sous-Tension */
  ECONOMY: Object.freeze({
    undervoltageGrowthSpeedMultiplier: 0.5,
  }),

  /** Section 7 : Micro-événements aléatoires de paillasse */
  EVENTS: Object.freeze({
    minSpawnIntervalSeconds: 180,
    maxSpawnIntervalSeconds: 300,
  }),

  /** Arbitrage #10 : Injection manuelle de nutriments */
  MANUAL_INJECTION: Object.freeze({
    costBio: 5,
    cooldownSeconds: 10,
    maturityBoostRatio: 0.05,
    rhodospirillumMaturityBoostRatio: 0.1,
  }),

  /** Section 10 & Arbitrages #3, #4, #7 : Protocoles de multiplication cellulaire */
  DIVISION: Object.freeze({
    SCISSIPARITY: Object.freeze({
      regularClonePpm: 900_000,
      spontaneousMutationPpm: 20_000,
      cellularLysisPpm: 80_000,
    }),
    MUTAGENESIS: Object.freeze({
      bioCostScissiparityMultiplier: 4,
      prCost: 15,
      standardClonePpm: 650_000,
      upwardMutationOneRankPpm: 199_000,
      superJumpTwoRanksPpm: 1_000,
      totalLysisPpm: 150_000,
    }),
    CONJUGATION: Object.freeze({
      bioCostPerMultiplierSum: 1_500,
      parentAStructureInheritancePpm: 500_000,
      parentBStructureInheritancePpm: 500_000,
      minRankOutcomePpm: 700_000,
      maxRankOutcomePpm: 200_000,
      totalLysisPpm: 100_000,
      doubleLegendaryToMythicPpm: 50_000,
      threeChannelMatrixHigherRankBonusPpm: 100_000,
    }),
  }),

  /** Section 11 & Arbitrage #11 : Contrats dynamiques procéduraux */
  CONTRACTS: Object.freeze({
    maxSimultaneousContracts: 3,
    emptySlotRenewalSeconds: 120,
    baseBioRewardPerMultiplier: 120,
    basePrRewardPerMultiplier: 3,
    continuousExtractionDurationSeconds: 90,
    timedRaceGrowthDurationMultiplier: 2,
    vitalUrgencyTimeLimitSeconds: 180,
    cryoStabilizationRequiredSeconds: 120,
  }),
});

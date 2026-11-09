import {
  CONTRACT_CONSTRAINTS,
  CONTRACT_CONSTRAINTS_BY_ID,
  CONTRACT_OBJECTIVES,
  CONTRACT_SPONSORS,
} from '../data/contracts.data.ts';
import { GAME_CONSTANTS } from '../data/constants.data.ts';
import { STRAINS, STRAINS_BY_ID } from '../data/strains.data.ts';
import type { EventBus } from '../core/event-bus.ts';
import { roundCurrency } from '../core/math.ts';
import type { RngService } from '../core/rng.ts';
import type {
  ColonyIncubatorSlot,
  GameState,
  IncubatorSlot,
} from '../types/game-state.types.ts';
import type {
  ContractConstraintId,
  CultureMediumId,
  Rarity,
  StandardBranchId,
} from '../types/game.types.ts';
import type {
  ContractBoardSlot,
  ProceduralContract,
} from '../types/meta.types.ts';
import { computeActiveTrophyModifiers } from './trophies.system.ts';

const ALLOWED_RARITIES_BY_FACTORY_TIER: Readonly<Record<number, readonly Rarity[]>> = {
  1: ['COMMON', 'UNCOMMON'],
  2: ['COMMON', 'UNCOMMON', 'RARE'],
  3: ['UNCOMMON', 'RARE', 'EPIC'],
  4: ['RARE', 'EPIC', 'LEGENDARY'],
  5: ['RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],
};

const STANDARD_BRANCHES: readonly StandardBranchId[] = [
  'BRANCH_I',
  'BRANCH_II',
  'BRANCH_III',
  'BRANCH_IV',
];

/**
 * Génère un contrat procédural calibré selon le palier d'usine actuel (Section 11 & Arbitrage #11).
 */
export function generateProceduralContract(
  slotIndex: 0 | 1 | 2,
  serialNumber: number,
  factoryTier: number,
  rng: RngService,
  trophyCountdownBonusSeconds = 0
): ProceduralContract {
  const sponsor = rng.pickUniform(CONTRACT_SPONSORS);
  const objective = rng.pickUniform(CONTRACT_OBJECTIVES);

  // 50 % de chance d'avoir une contrainte de validation
  const hasConstraint = rng.nextFloat() < 0.5;
  const constraint = hasConstraint ? rng.pickUniform(CONTRACT_CONSTRAINTS) : undefined;
  const constraintId: ContractConstraintId | undefined = constraint?.id;

  const allowedRarities = ALLOWED_RARITIES_BY_FACTORY_TIER[factoryTier] ?? ['COMMON'];
  const candidateStrains = STRAINS.filter(
    (s) =>
      allowedRarities.includes(s.rarity) &&
      (constraintId !== 'ECONOMIC_CULTURE' || s.rarity !== 'MYTHIC')
  );
  const targetStrain =
    candidateStrains.length > 0 ? rng.pickUniform(candidateStrains) : STRAINS[0]!;

  const constraintMult = constraint ? constraint.rewardMultiplier : 1.0;

  // Arbitrage #11 : Base Bio = Multiplicateur * 120 Bio ; Base PR = Multiplicateur * 3 PR
  let baseBio =
    targetStrain.multiplier *
    GAME_CONSTANTS.CONTRACTS.baseBioRewardPerMultiplier *
    constraintMult;
  let basePr =
    targetStrain.multiplier *
    GAME_CONSTANTS.CONTRACTS.basePrRewardPerMultiplier *
    constraintMult;

  let rewardMediumId: CultureMediumId | undefined;
  let rewardMediumCount: number | undefined;

  if (sponsor.id === 'REGIONAL_HOSPITALS') {
    baseBio *= 1.25;
  } else if (sponsor.id === 'MILITARY_AEROSPACE_AGENCIES') {
    basePr *= 2.0;
    baseBio *= 0.25;
  } else if (sponsor.id === 'AGRO_FOOD_COOPS') {
    rewardMediumId = factoryTier >= 3 ? 'MEDIUM_3_SHEEP_BLOOD_AGAR' : 'MEDIUM_2_BRAIN_HEART_BROTH';
    rewardMediumCount = 1;
  } else if (sponsor.id === 'CLANDESTINE_LABS') {
    baseBio *= 1.4;
    basePr *= 1.4;
  }

  let timeLimitTotalSeconds: number | undefined;
  if (constraintId === 'VITAL_URGENCY') {
    timeLimitTotalSeconds =
      GAME_CONSTANTS.CONTRACTS.vitalUrgencyTimeLimitSeconds + trophyCountdownBonusSeconds;
  } else if (objective.type === 'TIMED_INCUBATION_RACE') {
    timeLimitTotalSeconds =
      targetStrain.growthDurationSeconds *
        GAME_CONSTANTS.CONTRACTS.timedRaceGrowthDurationMultiplier +
      trophyCountdownBonusSeconds;
  }

  const symbiosisTargetBranch = rng.pickUniform(STANDARD_BRANCHES);
  const symbiosisRequiredCount: 3 | 4 = factoryTier >= 2 && rng.nextFloat() < 0.5 ? 4 : 3;

  const secondChimeraStrain = rng.pickUniform(candidateStrains);

  return {
    id: `CONTRACT_${String(serialNumber)}`,
    slotIndex,
    sponsorId: sponsor.id,
    objectiveType: objective.type,
    ...(constraintId !== undefined ? { constraintId } : {}),
    targetStrainId: targetStrain.id,
    ...(objective.type === 'SPECIFIC_CHIMERA'
      ? { chimeraParentStrainIds: [targetStrain.id, secondChimeraStrain.id] as const }
      : {}),
    ...(objective.type === 'PLATEAU_SYMBIOSIS'
      ? { symbiosisTargetBranch, symbiosisRequiredCount }
      : {}),
    extractionElapsedSeconds: 0,
    extractionRequiredSeconds: GAME_CONSTANTS.CONTRACTS.continuousExtractionDurationSeconds,
    ...(timeLimitTotalSeconds !== undefined
      ? {
          timeLimitRemainingSeconds: timeLimitTotalSeconds,
          timeLimitTotalSeconds,
        }
      : {}),
    rewardBio: Math.round(baseBio),
    rewardPr: Math.max(1, Math.round(basePr)),
    ...(rewardMediumId !== undefined ? { rewardMediumId, rewardMediumCount } : {}),
  };
}

/**
 * Vérifie si une colonie sur la paillasse respecte la contrainte de validation du contrat.
 */
export function doesColonySatisfyContractConstraint(
  colony: ColonyIncubatorSlot,
  constraintId?: ContractConstraintId
): boolean {
  if (!constraintId) {
    return true;
  }
  switch (constraintId) {
    case 'GENETIC_PURITY':
      return !colony.isMutated;
    case 'CRYO_STABILIZATION':
      return (
        (colony.cryoStabilizedSeconds ?? 0) + 1e-9 >=
        GAME_CONSTANTS.CONTRACTS.cryoStabilizationRequiredSeconds
      );
    case 'ECONOMIC_CULTURE':
      return colony.originMediumId === 'MEDIUM_1_ORDINARY_AGAR';
    case 'VITAL_URGENCY':
      return true;
  }
}

/**
 * Valide et livre un contrat actif sur l'emplacement `boardSlotIndex` (0, 1 ou 2).
 * Pour DEFINITIVE_SAMPLING, consomme la boîte mature correspondante.
 */
export function completeContract(
  state: GameState,
  boardSlotIndex: 0 | 1 | 2,
  targetIncubatorSlotIndex?: number,
  eventBus?: EventBus
): GameState {
  const boardSlot = state.contractBoard[boardSlotIndex];
  if (!boardSlot || boardSlot.status !== 'ACTIVE') {
    throw new Error(`Aucun contrat actif à l'emplacement ${String(boardSlotIndex)}`);
  }

  const contract = boardSlot.contract;
  let updatedIncubators: IncubatorSlot[] = [...state.incubatorSlots];

  // Vérification de l'objectif et de la contrainte
  if (
    contract.objectiveType === 'DEFINITIVE_SAMPLING' ||
    contract.objectiveType === 'TIMED_INCUBATION_RACE'
  ) {
    const candidateSlot =
      targetIncubatorSlotIndex !== undefined
        ? state.incubatorSlots[targetIncubatorSlotIndex]
        : state.incubatorSlots.find(
            (s): s is ColonyIncubatorSlot =>
              s.status === 'COLONY' &&
              s.isMature &&
              s.strainId === contract.targetStrainId &&
              doesColonySatisfyContractConstraint(s, contract.constraintId)
          );

    if (
      !candidateSlot ||
      candidateSlot.status !== 'COLONY' ||
      !candidateSlot.isMature ||
      candidateSlot.strainId !== contract.targetStrainId
    ) {
      throw new Error(
        `Aucune colonie mature de ${contract.targetStrainId} disponible pour valider ce contrat`
      );
    }

    if (!doesColonySatisfyContractConstraint(candidateSlot, contract.constraintId)) {
      const constraintLabel = contract.constraintId
        ? CONTRACT_CONSTRAINTS_BY_ID[contract.constraintId].labelFr
        : '';
      throw new Error(`La colonie ne respecte pas la contrainte ${constraintLabel}`);
    }

    if (contract.objectiveType === 'DEFINITIVE_SAMPLING') {
      updatedIncubators[candidateSlot.slotIndex] = {
        status: 'EMPTY',
        slotIndex: candidateSlot.slotIndex,
      };
    }
  } else if (contract.objectiveType === 'CONTINUOUS_METABOLIC_EXTRACTION') {
    if (contract.extractionElapsedSeconds + 1e-9 < contract.extractionRequiredSeconds) {
      throw new Error(
        `Extraction métabolique incomplète (${String(Math.floor(contract.extractionElapsedSeconds))}s / ${String(contract.extractionRequiredSeconds)}s)`
      );
    }
  } else if (contract.objectiveType === 'PLATEAU_SYMBIOSIS') {
    const requiredBranch = contract.symbiosisTargetBranch ?? 'BRANCH_I';
    const requiredCount = contract.symbiosisRequiredCount ?? 3;
    const matchingMatureColonies = state.incubatorSlots.filter((s): s is ColonyIncubatorSlot => {
      if (s.status !== 'COLONY' || !s.isMature) return false;
      const strain = STRAINS_BY_ID[s.strainId];
      return (
        strain?.branch === requiredBranch &&
        doesColonySatisfyContractConstraint(s, contract.constraintId)
      );
    });
    if (matchingMatureColonies.length < requiredCount) {
      throw new Error(
        `Symbiose de plateau insuffisante (${String(matchingMatureColonies.length)} / ${String(requiredCount)} colonies matures de ${requiredBranch})`
      );
    }
  } else if (contract.objectiveType === 'SPECIFIC_CHIMERA') {
    const hasMatchingMutatedColony = state.incubatorSlots.some(
      (s) =>
        s.status === 'COLONY' &&
        s.isMature &&
        s.isMutated &&
        s.strainId === contract.targetStrainId
    );
    if (!contract.chimeraValidated && !hasMatchingMutatedColony) {
      throw new Error('La chimère demandée n’a pas encore été synthétisée et amenée à maturité');
    }
  }

  // Calcul des bonus de rémunération :
  // - Staphylococcus aureus : +12 % sur la valeur de vente des contrats médicaux (REGIONAL_HOSPITALS)
  // - Trophée #05 : +5 % de Bio-crédits sur tous les contrats
  const hasStaphAureus = state.incubatorSlots.some(
    (s) => s.status === 'COLONY' && s.strainId === 'STAPHYLOCOCCUS_AUREUS'
  );
  const trophyMods = computeActiveTrophyModifiers(state);

  const medicalBonus =
    hasStaphAureus && contract.sponsorId === 'REGIONAL_HOSPITALS' ? 0.12 : 0;
  const totalBioMultiplier = 1 + medicalBonus + trophyMods.contractBioRewardBonusRatio;

  const finalRewardBio = roundCurrency(contract.rewardBio * totalBioMultiplier);
  const finalRewardPr = contract.rewardPr;

  let updatedInventory = state.mediaInventory;
  if (contract.rewardMediumId && contract.rewardMediumCount) {
    updatedInventory = {
      ...updatedInventory,
      [contract.rewardMediumId]:
        (updatedInventory[contract.rewardMediumId] ?? 0) + contract.rewardMediumCount,
    };
  }

  const nextBoard: [ContractBoardSlot, ContractBoardSlot, ContractBoardSlot] = [
    state.contractBoard[0],
    state.contractBoard[1],
    state.contractBoard[2],
  ];
  nextBoard[boardSlotIndex] = {
    status: 'RENEWING',
    slotIndex: boardSlotIndex,
    renewalRemainingSeconds: GAME_CONSTANTS.CONTRACTS.emptySlotRenewalSeconds,
  };

  const isCivilianSponsor =
    contract.sponsorId === 'REGIONAL_HOSPITALS' || contract.sponsorId === 'AGRO_FOOD_COOPS';
  const isVitalUrgency = contract.constraintId === 'VITAL_URGENCY';

  if (eventBus) {
    eventBus.emit({
      type: 'CONTRACT_COMPLETED',
      contractId: contract.id,
      rewardBio: finalRewardBio,
      rewardPr: finalRewardPr,
    });
  }

  return {
    ...state,
    bio: roundCurrency(state.bio + finalRewardBio),
    pr: roundCurrency(state.pr + finalRewardPr),
    mediaInventory: updatedInventory,
    incubatorSlots: updatedIncubators,
    contractBoard: nextBoard,
    stats: {
      ...state.stats,
      totalBioEarned: roundCurrency(state.stats.totalBioEarned + finalRewardBio),
      totalPrEarned: roundCurrency(state.stats.totalPrEarned + finalRewardPr),
      totalContractsCompleted: (state.stats.totalContractsCompleted ?? 0) + 1,
      totalCivilianContractsCompleted:
        (state.stats.totalCivilianContractsCompleted ?? 0) + (isCivilianSponsor ? 1 : 0),
      totalVitalUrgencyContractsCompleted:
        (state.stats.totalVitalUrgencyContractsCompleted ?? 0) + (isVitalUrgency ? 1 : 0),
    },
  };
}

/**
 * Fait progresser :
 * 1. Les timers de renouvellement de 120s des emplacements de contrats vides
 * 2. Les comptes à rebours des contrats chronométrés
 * 3. La jauge d'Extraction Métabolique Continue (90s) lorsqu'une colonie mature éligible est active sur la paillasse
 */
export function advanceContractsTick(
  state: GameState,
  dtSeconds: number,
  rng: RngService,
  eventBus?: EventBus
): GameState {
  if (dtSeconds <= 0 || state.isPaused) {
    return state;
  }

  const trophyMods = computeActiveTrophyModifiers(state);
  let nextSerial = state.nextContractSerial;

  const updatedBoard = state.contractBoard.map((slot): ContractBoardSlot => {
    if (slot.status === 'RENEWING') {
      const nextRenewal = slot.renewalRemainingSeconds - dtSeconds;
      if (nextRenewal > 1e-9) {
        return {
          ...slot,
          renewalRemainingSeconds: nextRenewal,
        };
      }
      const generated = generateProceduralContract(
        slot.slotIndex,
        nextSerial,
        state.factoryTier,
        rng,
        trophyMods.contractCountdownBonusSeconds
      );
      nextSerial += 1;
      return {
        status: 'ACTIVE',
        slotIndex: slot.slotIndex,
        contract: generated,
      };
    }

    // Slot ACTIVE
    let contract = slot.contract;

    // 1. Vérification du compte à rebours si le contrat est chronométré
    if (contract.timeLimitRemainingSeconds !== undefined) {
      const nextTimeLimit = contract.timeLimitRemainingSeconds - dtSeconds;
      if (nextTimeLimit <= 1e-9) {
        if (eventBus) {
          eventBus.emit({
            type: 'CONTRACT_EXPIRED',
            contractId: contract.id,
          });
        }
        return {
          status: 'RENEWING',
          slotIndex: slot.slotIndex,
          renewalRemainingSeconds: GAME_CONSTANTS.CONTRACTS.emptySlotRenewalSeconds,
        };
      }
      contract = {
        ...contract,
        timeLimitRemainingSeconds: nextTimeLimit,
      };
    }

    // 2. Progression de l'Extraction Métabolique Continue (90s)
    if (contract.objectiveType === 'CONTINUOUS_METABOLIC_EXTRACTION') {
      const hasMatchingActiveAdult = state.incubatorSlots.some(
        (s) =>
          s.status === 'COLONY' &&
          s.isMature &&
          s.strainId === contract.targetStrainId &&
          doesColonySatisfyContractConstraint(s, contract.constraintId)
      );
      if (hasMatchingActiveAdult) {
        contract = {
          ...contract,
          extractionElapsedSeconds: Math.min(
            contract.extractionRequiredSeconds,
            contract.extractionElapsedSeconds + dtSeconds
          ),
        };
      }
    }

    return {
      ...slot,
      contract,
    };
  }) as unknown as readonly [ContractBoardSlot, ContractBoardSlot, ContractBoardSlot];

  return {
    ...state,
    contractBoard: updatedBoard,
    nextContractSerial: nextSerial,
  };
}

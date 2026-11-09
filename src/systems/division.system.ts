import { GAME_CONSTANTS, PPM_BASE } from '../data/constants.data.ts';
import { RARITY_ORDER } from '../data/theme.data.ts';
import { STRAINS, STRAINS_BY_ID } from '../data/strains.data.ts';
import type { DivisionOutcomeType, EventBus } from '../core/event-bus.ts';
import { clamp, roundCurrency } from '../core/math.ts';
import type { RngService } from '../core/rng.ts';
import type {
  ColonyIncubatorSlot,
  GameState,
  IncubatorSlot,
} from '../types/game-state.types.ts';
import type { BranchId, Rarity, StrainDefinition } from '../types/game.types.ts';
import { recordHybridizationInCodex } from './logbook.system.ts';
import {
  computeActiveTechModifiers,
  computeEffectiveAdultLifespanSeconds,
} from './tech.system.ts';
import { computeActiveTrophyModifiers } from './trophies.system.ts';

const TECH_T2_LYSIS_PPM = 40_000;

/**
 * Calcule le facteur d'accélération globale de division cellulaire (Spirillum minus : +5 % vitesse de pousse sur les divisions).
 */
function getDivisionGrowthDurationMultiplier(state: GameState): number {
  const hasSpirillumMinus = state.incubatorSlots.some(
    (s) => s.status === 'COLONY' && s.strainId === 'SPIRILLUM_MINUS'
  );
  return hasSpirillumMinus ? 1 / 1.05 : 1.0;
}

/**
 * Résout la souche obtenue lorsqu'une souche subit un saut de +rankDelta rangs (1 ou 2 rangs) au sein de sa branche.
 */
export function resolveUpwardMutatedStrain(
  baseStrain: StrainDefinition,
  rankDelta: 1 | 2,
  rng: RngService
): StrainDefinition {
  const currentRarityIdx = RARITY_ORDER.indexOf(baseStrain.rarity);
  const targetRarityIdx = Math.min(RARITY_ORDER.length - 1, currentRarityIdx + rankDelta);
  const targetRarity: Rarity = RARITY_ORDER[targetRarityIdx] ?? 'SECRET';

  if (targetRarity === 'MYTHIC') {
    const mythics = STRAINS.filter((s) => s.branch === 'BRANCH_V_MYTHIC');
    return rng.pickUniform(mythics);
  }

  if (targetRarity === 'SECRET') {
    const secrets = STRAINS.filter((s) => s.branch === 'BRANCH_SECRET');
    return rng.pickUniform(secrets);
  }

  const candidate = STRAINS.find(
    (s) => s.branch === baseStrain.branch && s.rarity === targetRarity
  );
  if (candidate) {
    return candidate;
  }

  return baseStrain;
}

function createOffspringColonySlot(
  slotIndex: number,
  strain: StrainDefinition,
  originMediumId: ColonyIncubatorSlot['originMediumId'],
  isMutated: boolean,
  state: GameState
): ColonyIncubatorSlot {
  const growthDurationMultiplier = getDivisionGrowthDurationMultiplier(state);
  const effectiveGrowthSeconds =
    Math.round(strain.growthDurationSeconds * growthDurationMultiplier * 100) / 100;
  const effectiveAdultSeconds = computeEffectiveAdultLifespanSeconds(
    strain.adultLifespanSeconds,
    strain.rarity,
    state,
    strain.branch
  );

  return {
    status: 'COLONY',
    slotIndex,
    strainId: strain.id,
    originMediumId,
    growthElapsedSeconds: 0,
    growthDurationSeconds: effectiveGrowthSeconds,
    maturityRatio: 0,
    isMature: false,
    adultLifespanRemainingSeconds: effectiveAdultSeconds,
    adultLifespanTotalSeconds: effectiveAdultSeconds,
    manualInjectionCooldownSeconds: 0,
    absorbedWasteCount: 0,
    isMutated,
  };
}

/**
 * Section 10.A & Arbitrage #3 : Scissiparité Végétative (Clonage Stable)
 * Intègre :
 * - Tech M1 (coût Bio divisé par 2)
 * - Trophée #04 (coût Bio réduit de 5 %)
 * - Événement B6 (coût Bio réduit de 15 % sur la prochaine division mitotique)
 * - Tech T2 (lyse abaissée à 4 %)
 * - Trophée #07 (+1 % chance de mutation spontanée)
 * - Incident M3 (+3 % risque de lyse en mitose si non résolu)
 */
export function performScissiparity(
  state: GameState,
  sourceSlotIndex: number,
  targetSlotIndex: number,
  rng: RngService,
  eventBus?: EventBus
): GameState {
  const sourceSlot = state.incubatorSlots[sourceSlotIndex];
  if (!sourceSlot || sourceSlot.status !== 'COLONY') {
    throw new Error(`Aucune colonie donneuse à l'emplacement ${String(sourceSlotIndex)}`);
  }
  if (!sourceSlot.isMature) {
    throw new Error('Impossible de diviser une colonie avant 100 % de maturité');
  }

  const targetSlot = state.incubatorSlots[targetSlotIndex];
  if (!targetSlot || targetSlot.status !== 'EMPTY') {
    throw new Error(`L'emplacement cible ${String(targetSlotIndex)} n'est pas libre`);
  }

  const strain = STRAINS_BY_ID[sourceSlot.strainId];
  if (!strain) {
    throw new Error(`Souche inconnue : ${sourceSlot.strainId}`);
  }

  const techMods = computeActiveTechModifiers(state);
  const trophyMods = computeActiveTrophyModifiers(state);

  const b6Factor = state.benchBuffs.b6NextDivisionDiscountActive ? 0.85 : 1.0;
  const trophy04Factor = 1 - trophyMods.scissiparityBioCostReductionRatio;

  const bioCost = roundCurrency(
    strain.scissiparityCostBio *
      techMods.scissiparityBioCostMultiplier *
      trophy04Factor *
      b6Factor
  );
  const prCost = strain.scissiparityCostPr;

  if (state.bio < bioCost) {
    throw new Error(
      `Solde Bio insuffisant pour la scissiparité (${String(state.bio)} < ${String(bioCost)} Bio)`
    );
  }
  if (state.pr < prCost) {
    throw new Error(
      `Points de Recherche (PR) insuffisants pour la scissiparité (${String(state.pr)} < ${String(prCost)} PR)`
    );
  }

  const baseLysisPpm = techMods.hasStabilizedHistonesT2
    ? TECH_T2_LYSIS_PPM
    : GAME_CONSTANTS.DIVISION.SCISSIPARITY.cellularLysisPpm;
  const m3LysisPenaltyPpm =
    state.benchBuffs.m3MitosisLysisPenaltyRemainingSeconds > 0 ? 30_000 : 0;
  const lysisPpm = clamp(baseLysisPpm + m3LysisPenaltyPpm, 0, PPM_BASE);

  const mutationPpm = clamp(
    GAME_CONSTANTS.DIVISION.SCISSIPARITY.spontaneousMutationPpm +
      Math.round(trophyMods.mitosisMutationBonusRatio * PPM_BASE),
    0,
    PPM_BASE - lysisPpm
  );
  const clonePpm = PPM_BASE - lysisPpm - mutationPpm;

  const outcome = rng.pickWeightedPpm<DivisionOutcomeType>([
    { item: 'REGULAR_CLONE', weightPpm: clonePpm },
    { item: 'SPONTANEOUS_MUTATION', weightPpm: mutationPpm },
    { item: 'LYSIS_FAILURE', weightPpm: lysisPpm },
  ]);

  let updatedSlots: IncubatorSlot[] = [...state.incubatorSlots];
  let resultingStrain: StrainDefinition | undefined;

  if (outcome === 'REGULAR_CLONE') {
    resultingStrain = strain;
    updatedSlots[targetSlotIndex] = createOffspringColonySlot(
      targetSlotIndex,
      strain,
      sourceSlot.originMediumId,
      sourceSlot.isMutated,
      state
    );
  } else if (outcome === 'SPONTANEOUS_MUTATION') {
    resultingStrain = resolveUpwardMutatedStrain(strain, 1, rng);
    updatedSlots[targetSlotIndex] = createOffspringColonySlot(
      targetSlotIndex,
      resultingStrain,
      sourceSlot.originMediumId,
      true,
      state
    );
  }

  const discoveredStrainIds =
    resultingStrain && !state.stats.discoveredStrainIds.includes(resultingStrain.id)
      ? [...state.stats.discoveredStrainIds, resultingStrain.id]
      : state.stats.discoveredStrainIds;

  if (eventBus) {
    eventBus.emit({
      type: 'DIVISION_COMPLETED',
      method: 'SCISSIPARITY',
      outcome,
      ...(resultingStrain
        ? { targetSlotIndex, resultingStrainId: resultingStrain.id }
        : {}),
    });
  }

  return {
    ...state,
    bio: roundCurrency(state.bio - bioCost),
    pr: roundCurrency(state.pr - prCost),
    incubatorSlots: updatedSlots,
    benchBuffs: {
      ...state.benchBuffs,
      b6NextDivisionDiscountActive: false,
    },
    stats: {
      ...state.stats,
      discoveredStrainIds,
      totalScissiparitySuccesses:
        (state.stats.totalScissiparitySuccesses ?? 0) + (outcome !== 'LYSIS_FAILURE' ? 1 : 0),
    },
  };
}

/**
 * Section 10.B & Arbitrage #4 : Mutagenèse Chimique & Rayons UV (Pari Risqué)
 * Intègre :
 * - Deinococcus radiodurans (annule le risque d'échec mortel en mutagenèse UV : 0 % lyse)
 * - Trophée #09 (taux d'échec de mutagenèse réduit de 2 %)
 * - Événement B9 (+5 % de chance de mutation lors de la prochaine mutagenèse chimique)
 */
export function performMutagenesis(
  state: GameState,
  sourceSlotIndex: number,
  targetSlotIndex: number,
  rng: RngService,
  eventBus?: EventBus
): GameState {
  const sourceSlot = state.incubatorSlots[sourceSlotIndex];
  if (!sourceSlot || sourceSlot.status !== 'COLONY') {
    throw new Error(`Aucune colonie donneuse à l'emplacement ${String(sourceSlotIndex)}`);
  }
  if (!sourceSlot.isMature) {
    throw new Error('Impossible de soumettre une colonie à la mutagenèse avant 100 % de maturité');
  }

  const targetSlot = state.incubatorSlots[targetSlotIndex];
  if (!targetSlot || targetSlot.status !== 'EMPTY') {
    throw new Error(`L'emplacement cible ${String(targetSlotIndex)} n'est pas libre`);
  }

  const strain = STRAINS_BY_ID[sourceSlot.strainId];
  if (!strain) {
    throw new Error(`Souche inconnue : ${sourceSlot.strainId}`);
  }

  const trophyMods = computeActiveTrophyModifiers(state);
  const bioCost = roundCurrency(
    strain.scissiparityCostBio * GAME_CONSTANTS.DIVISION.MUTAGENESIS.bioCostScissiparityMultiplier
  );
  const prCost = strain.scissiparityCostPr + GAME_CONSTANTS.DIVISION.MUTAGENESIS.prCost;

  if (state.bio < bioCost) {
    throw new Error(
      `Solde Bio insuffisant pour la mutagenèse UV (${String(state.bio)} < ${String(bioCost)} Bio)`
    );
  }
  if (state.pr < prCost) {
    throw new Error(
      `Points de Recherche (PR) insuffisants pour la mutagenèse UV (${String(state.pr)} < ${String(prCost)} PR)`
    );
  }

  const hasDeinococcusRadiodurans = state.incubatorSlots.some(
    (s) => s.status === 'COLONY' && s.strainId === 'DEINOCOCCUS_RADIODURANS'
  );

  const trophy09ReductionPpm = Math.round(trophyMods.mutagenesisLysisReductionRatio * PPM_BASE);
  const lysisPpm = hasDeinococcusRadiodurans
    ? 0
    : Math.max(0, GAME_CONSTANTS.DIVISION.MUTAGENESIS.totalLysisPpm - trophy09ReductionPpm);

  const b9BonusPpm = state.benchBuffs.b9NextMutagenesisBonusActive ? 50_000 : 0;
  const upwardOnePpm =
    GAME_CONSTANTS.DIVISION.MUTAGENESIS.upwardMutationOneRankPpm + b9BonusPpm;
  const superJumpTwoPpm = GAME_CONSTANTS.DIVISION.MUTAGENESIS.superJumpTwoRanksPpm;
  const clonePpm = Math.max(0, PPM_BASE - lysisPpm - upwardOnePpm - superJumpTwoPpm);

  const outcome = rng.pickWeightedPpm<DivisionOutcomeType>([
    { item: 'REGULAR_CLONE', weightPpm: clonePpm },
    { item: 'SPONTANEOUS_MUTATION', weightPpm: upwardOnePpm },
    { item: 'SUPER_JUMP_MUTATION', weightPpm: superJumpTwoPpm },
    { item: 'LYSIS_FAILURE', weightPpm: lysisPpm },
  ]);

  let updatedSlots: IncubatorSlot[] = [...state.incubatorSlots];
  let resultingStrain: StrainDefinition | undefined;

  if (outcome === 'REGULAR_CLONE') {
    resultingStrain = strain;
    updatedSlots[targetSlotIndex] = createOffspringColonySlot(
      targetSlotIndex,
      strain,
      sourceSlot.originMediumId,
      sourceSlot.isMutated,
      state
    );
  } else if (outcome === 'SPONTANEOUS_MUTATION') {
    resultingStrain = resolveUpwardMutatedStrain(strain, 1, rng);
    updatedSlots[targetSlotIndex] = createOffspringColonySlot(
      targetSlotIndex,
      resultingStrain,
      sourceSlot.originMediumId,
      true,
      state
    );
  } else if (outcome === 'SUPER_JUMP_MUTATION') {
    resultingStrain = resolveUpwardMutatedStrain(strain, 2, rng);
    updatedSlots[targetSlotIndex] = createOffspringColonySlot(
      targetSlotIndex,
      resultingStrain,
      sourceSlot.originMediumId,
      true,
      state
    );
  }

  const discoveredStrainIds =
    resultingStrain && !state.stats.discoveredStrainIds.includes(resultingStrain.id)
      ? [...state.stats.discoveredStrainIds, resultingStrain.id]
      : state.stats.discoveredStrainIds;

  if (eventBus) {
    eventBus.emit({
      type: 'DIVISION_COMPLETED',
      method: 'MUTAGENESIS',
      outcome,
      ...(resultingStrain
        ? { targetSlotIndex, resultingStrainId: resultingStrain.id }
        : {}),
    });
  }

  return {
    ...state,
    bio: roundCurrency(state.bio - bioCost),
    pr: roundCurrency(state.pr - prCost),
    incubatorSlots: updatedSlots,
    benchBuffs: {
      ...state.benchBuffs,
      b9NextMutagenesisBonusActive: false,
    },
    stats: {
      ...state.stats,
      discoveredStrainIds,
      totalMutagenesisSuccessesWithoutLysis:
        (state.stats.totalMutagenesisSuccessesWithoutLysis ?? 0) +
        (outcome !== 'LYSIS_FAILURE' ? 1 : 0),
    },
  };
}

/**
 * Section 10.C & Arbitrage #7 : Conjugaison Thermochimique (Hybridation)
 */
export function performConjugation(
  state: GameState,
  parentSlotIndices: readonly number[],
  targetSlotIndex: number,
  rng: RngService,
  eventBus?: EventBus
): GameState {
  const uniqueIndices = new Set(parentSlotIndices);
  if (uniqueIndices.size !== parentSlotIndices.length) {
    throw new Error('Les emplacements parents doivent être distincts');
  }

  const techMods = computeActiveTechModifiers(state);
  if (parentSlotIndices.length === 3 && !techMods.canConjugateThreeStrains) {
    throw new Error(
      'La conjugaison à 3 souches requiert la technologie M3 (Matrice à Trois Canaux)'
    );
  }
  if (parentSlotIndices.length !== 2 && parentSlotIndices.length !== 3) {
    throw new Error('La conjugaison requiert exactement 2 (ou 3 avec M3) souches parentes');
  }

  const parentColonies: ColonyIncubatorSlot[] = [];
  const parentStrains: StrainDefinition[] = [];

  for (const idx of parentSlotIndices) {
    const slot = state.incubatorSlots[idx];
    if (!slot || slot.status !== 'COLONY') {
      throw new Error(`Aucune colonie active à l'emplacement parent ${String(idx)}`);
    }
    if (!slot.isMature) {
      throw new Error(
        `La colonie parente à l'emplacement ${String(idx)} n'est pas à 100 % de maturité`
      );
    }
    const strain = STRAINS_BY_ID[slot.strainId];
    if (!strain) {
      throw new Error(`Souche parente inconnue : ${slot.strainId}`);
    }
    parentColonies.push(slot);
    parentStrains.push(strain);
  }

  const hasPlasmidusInfinitum = state.incubatorSlots.some(
    (s) => s.status === 'COLONY' && s.strainId === 'PLASMIDUS_INFINITUM'
  );

  const targetSlot = state.incubatorSlots[targetSlotIndex];
  const isTargetAmongConsumedParents =
    !hasPlasmidusInfinitum && parentSlotIndices.includes(targetSlotIndex);
  if (!targetSlot || (targetSlot.status !== 'EMPTY' && !isTargetAmongConsumedParents)) {
    throw new Error(`L'emplacement cible ${String(targetSlotIndex)} n'est pas disponible`);
  }

  const multiplierSum = parentStrains.reduce((acc, s) => acc + s.multiplier, 0);
  const bioCost = roundCurrency(
    multiplierSum * GAME_CONSTANTS.DIVISION.CONJUGATION.bioCostPerMultiplierSum
  );

  if (state.bio < bioCost) {
    throw new Error(
      `Solde Bio insuffisant pour la conjugaison (${String(state.bio)} < ${String(bioCost)} Bio)`
    );
  }

  const hasPyrodictiumAbyssi = state.incubatorSlots.some(
    (s) => s.status === 'COLONY' && s.strainId === 'PYRODICTIUM_ABYSSI'
  );
  const hasThermusAquaticus = state.incubatorSlots.some(
    (s) => s.status === 'COLONY' && s.strainId === 'THERMUS_AQUATICUS'
  );

  const lysisPpm = hasPlasmidusInfinitum
    ? 0
    : GAME_CONSTANTS.DIVISION.CONJUGATION.totalLysisPpm;

  const legendaryCount = parentStrains.filter((s) => s.rarity === 'LEGENDARY').length;
  const mythicChimeraPpm =
    legendaryCount >= 2 ? GAME_CONSTANTS.DIVISION.CONJUGATION.doubleLegendaryToMythicPpm : 0;

  let higherRankBonusPpm = Math.round(techMods.conjugationHigherRankBonusRatio * PPM_BASE);
  if (parentSlotIndices.length === 3) {
    higherRankBonusPpm +=
      GAME_CONSTANTS.DIVISION.CONJUGATION.threeChannelMatrixHigherRankBonusPpm;
  }
  if (hasPyrodictiumAbyssi) {
    higherRankBonusPpm += Math.round(0.25 * PPM_BASE);
  }

  const rawMaxRankPpm =
    GAME_CONSTANTS.DIVISION.CONJUGATION.maxRankOutcomePpm + higherRankBonusPpm;
  const availableNonLysisPpm = PPM_BASE - lysisPpm - mythicChimeraPpm;
  const maxRankPpm = clamp(rawMaxRankPpm, 0, availableNonLysisPpm);
  const minRankPpm = Math.max(0, availableNonLysisPpm - maxRankPpm);

  const rollOutcome = rng.pickWeightedPpm<
    'MIN_RANK' | 'HIGHER_RANK' | 'MYTHIC_CHIMERA' | 'LYSIS_FAILURE'
  >([
    { item: 'MIN_RANK', weightPpm: minRankPpm },
    { item: 'HIGHER_RANK', weightPpm: maxRankPpm },
    { item: 'MYTHIC_CHIMERA', weightPpm: mythicChimeraPpm },
    { item: 'LYSIS_FAILURE', weightPpm: lysisPpm },
  ]);

  let updatedSlots: IncubatorSlot[] = [...state.incubatorSlots];

  if (!hasPlasmidusInfinitum) {
    for (const parentIdx of parentSlotIndices) {
      updatedSlots[parentIdx] = {
        status: 'EMPTY',
        slotIndex: parentIdx,
      };
    }
  }

  let resultingStrain: StrainDefinition | undefined;
  let eventOutcome: DivisionOutcomeType = 'LYSIS_FAILURE';

  if (rollOutcome === 'MYTHIC_CHIMERA') {
    eventOutcome = 'MYTHIC_CHIMERA';
    const mythics = STRAINS.filter((s) => s.branch === 'BRANCH_V_MYTHIC');
    resultingStrain = rng.pickUniform(mythics);
  } else if (rollOutcome === 'MIN_RANK' || rollOutcome === 'HIGHER_RANK') {
    eventOutcome = 'HYBRID_OFFSPRING';
    const inheritedParent = rng.pickUniform(parentStrains);
    const inheritedBranch: BranchId = inheritedParent.branch;

    const rarityIndices = parentStrains.map((s) => RARITY_ORDER.indexOf(s.rarity));
    const minRarityIdx = Math.min(...rarityIndices);
    const maxRarityIdx = Math.max(...rarityIndices);

    let targetRarityIdx = rollOutcome === 'MIN_RANK' ? minRarityIdx : maxRarityIdx;
    if (rollOutcome === 'HIGHER_RANK' && minRarityIdx === maxRarityIdx) {
      targetRarityIdx = Math.min(RARITY_ORDER.length - 1, maxRarityIdx + 1);
    }

    const targetRarity = RARITY_ORDER[targetRarityIdx] ?? 'COMMON';
    const candidateInBranch = STRAINS.find(
      (s) => s.branch === inheritedBranch && s.rarity === targetRarity
    );

    if (candidateInBranch) {
      resultingStrain = candidateInBranch;
    } else if (targetRarity === 'MYTHIC') {
      resultingStrain = rng.pickUniform(STRAINS.filter((s) => s.branch === 'BRANCH_V_MYTHIC'));
    } else if (targetRarity === 'SECRET') {
      resultingStrain = rng.pickUniform(STRAINS.filter((s) => s.branch === 'BRANCH_SECRET'));
    } else {
      resultingStrain = inheritedParent;
    }
  }

  let unlockedCoelicolor = state.hasUnlockedCoelicolorExtraCryoSlot;

  if (resultingStrain) {
    const firstParent = parentColonies[0]!;
    let offspring = createOffspringColonySlot(
      targetSlotIndex,
      resultingStrain,
      firstParent.originMediumId,
      true,
      state
    );

    if (hasThermusAquaticus) {
      offspring = {
        ...offspring,
        growthDurationSeconds: Math.round(offspring.growthDurationSeconds * 0.5 * 100) / 100,
      };
    }

    updatedSlots[targetSlotIndex] = offspring;

    if (resultingStrain.id === 'STREPTOMYCES_COELICOLOR') {
      unlockedCoelicolor = true;
    }
  }

  const discoveredStrainIds =
    resultingStrain && !state.stats.discoveredStrainIds.includes(resultingStrain.id)
      ? [...state.stats.discoveredStrainIds, resultingStrain.id]
      : state.stats.discoveredStrainIds;

  // Marque les contrats SPECIFIC_CHIMERA correspondants comme validés
  const parentSet = new Set(parentStrains.map((s) => s.id));
  const updatedContractBoard = state.contractBoard.map((slot) => {
    if (slot.status !== 'ACTIVE' || slot.contract.objectiveType !== 'SPECIFIC_CHIMERA') {
      return slot;
    }
    const reqParents = slot.contract.chimeraParentStrainIds;
    if (
      resultingStrain &&
      reqParents &&
      parentSet.has(reqParents[0]) &&
      parentSet.has(reqParents[1])
    ) {
      return {
        ...slot,
        contract: {
          ...slot.contract,
          chimeraValidated: true,
        },
      };
    }
    return slot;
  }) as unknown as GameState['contractBoard'];

  if (eventBus) {
    eventBus.emit({
      type: 'DIVISION_COMPLETED',
      method: 'CONJUGATION',
      outcome: eventOutcome,
      ...(resultingStrain
        ? { targetSlotIndex, resultingStrainId: resultingStrain.id }
        : {}),
    });
  }

  const stateBeforeCodex: GameState = {
    ...state,
    bio: roundCurrency(state.bio - bioCost),
    incubatorSlots: updatedSlots,
    contractBoard: updatedContractBoard,
    hasUnlockedCoelicolorExtraCryoSlot: unlockedCoelicolor,
    stats: {
      ...state.stats,
      discoveredStrainIds,
      totalConjugationsCompleted:
        (state.stats.totalConjugationsCompleted ?? 0) + (resultingStrain ? 1 : 0),
    },
  };

  return recordHybridizationInCodex(
    stateBeforeCodex,
    parentStrains[0]!.id,
    parentStrains[1]!.id,
    resultingStrain?.id
  );
}

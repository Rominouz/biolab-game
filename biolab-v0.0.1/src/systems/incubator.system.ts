import { CULTURE_MEDIA_BY_ID } from '../data/media.data.ts';
import { GAME_CONSTANTS, PPM_BASE } from '../data/constants.data.ts';
import { STRAINS, STRAINS_BY_ID } from '../data/strains.data.ts';
import type { EventBus } from '../core/event-bus.ts';
import { clamp, roundCurrency } from '../core/math.ts';
import type { RngService } from '../core/rng.ts';
import type {
  ColonyIncubatorSlot,
  GameState,
  IncubatorSlot,
  WasteIncubatorSlot,
} from '../types/game-state.types.ts';
import type {
  CultureMediumDefinition,
  CultureMediumId,
  Rarity,
  StandardBranchId,
  StrainDefinition,
} from '../types/game.types.ts';
import { syncCryoSlotsCapacity } from './factory.system.ts';
import {
  computeActiveTechModifiers,
  computeEffectiveAdultLifespanSeconds,
} from './tech.system.ts';
import { computeActiveTrophyModifiers } from './trophies.system.ts';

/**
 * Calcule la table de drop ajustée en tenant compte de :
 * - Halobacterium salinarum (+7 % relatif sur le palier Rare)
 * - Tech S1 Centrifugeuse de Précision (+10 % de chance relative sur les paliers Rare et Épique)
 * Les hausses relatives sont prélevées sur la tranche la plus fréquente du milieu afin de garder une somme exacte de 1_000_000 ppm.
 */
function buildAdjustedDropTable(
  medium: CultureMediumDefinition,
  hasHalobacteriumActive: boolean,
  rareAndEpicTechBonusRatio: number
): readonly { readonly item: Rarity; readonly weightPpm: number }[] {
  if (!hasHalobacteriumActive && rareAndEpicTechBonusRatio <= 0) {
    return medium.dropTable.map((entry) => ({
      item: entry.rarity,
      weightPpm: entry.weightPpm,
    }));
  }

  const rareEntry = medium.dropTable.find((e) => e.rarity === 'RARE');
  const epicEntry = medium.dropTable.find((e) => e.rarity === 'EPIC');

  const rareRatioBoost =
    (hasHalobacteriumActive ? 0.07 : 0) + rareAndEpicTechBonusRatio;
  const epicRatioBoost = rareAndEpicTechBonusRatio;

  const rareBoostPpm =
    rareEntry && rareEntry.weightPpm > 0 ? Math.round(rareEntry.weightPpm * rareRatioBoost) : 0;
  const epicBoostPpm =
    epicEntry && epicEntry.weightPpm > 0 ? Math.round(epicEntry.weightPpm * epicRatioBoost) : 0;
  const totalDesiredBoost = rareBoostPpm + epicBoostPpm;

  if (totalDesiredBoost <= 0) {
    return medium.dropTable.map((entry) => ({
      item: entry.rarity,
      weightPpm: entry.weightPpm,
    }));
  }

  // Trouve la tranche (hors Rare et Épique) ayant le poids le plus élevé pour absorber le boost
  let donorRarity: Rarity = 'COMMON';
  let maxDonorWeight = -1;
  for (const entry of medium.dropTable) {
    if (entry.rarity !== 'RARE' && entry.rarity !== 'EPIC' && entry.weightPpm > maxDonorWeight) {
      maxDonorWeight = entry.weightPpm;
      donorRarity = entry.rarity;
    }
  }

  if (maxDonorWeight <= 0) {
    return medium.dropTable.map((entry) => ({
      item: entry.rarity,
      weightPpm: entry.weightPpm,
    }));
  }

  const scale = totalDesiredBoost > maxDonorWeight ? maxDonorWeight / totalDesiredBoost : 1.0;
  const actualRareBoost = Math.round(rareBoostPpm * scale);
  const actualEpicBoost = Math.min(
    maxDonorWeight - actualRareBoost,
    Math.round(epicBoostPpm * scale)
  );
  const totalActualBoost = actualRareBoost + actualEpicBoost;

  return medium.dropTable.map((entry) => {
    if (entry.rarity === 'RARE') {
      return { item: entry.rarity, weightPpm: entry.weightPpm + actualRareBoost };
    }
    if (entry.rarity === 'EPIC') {
      return { item: entry.rarity, weightPpm: entry.weightPpm + actualEpicBoost };
    }
    if (entry.rarity === donorRarity) {
      return { item: entry.rarity, weightPpm: entry.weightPpm - totalActualBoost };
    }
    return { item: entry.rarity, weightPpm: entry.weightPpm };
  });
}

/**
 * Tire au sort une souche selon le milieu de culture et l'état actuel de la paillasse
 */
export function rollStrainFromMedium(
  mediumId: CultureMediumId,
  state: GameState,
  rng: RngService
): StrainDefinition {
  const medium = CULTURE_MEDIA_BY_ID[mediumId];

  const hasHalobacteriumActive = state.incubatorSlots.some(
    (s) => s.status === 'COLONY' && s.strainId === 'HALOBACTERIUM_SALINARUM'
  );
  const techMods = computeActiveTechModifiers(state);

  const dropTable = buildAdjustedDropTable(
    medium,
    hasHalobacteriumActive,
    techMods.rareAndEpicRelativeDropBonusRatio
  );
  const pickedRarity = rng.pickWeightedPpm(dropTable);

  if (pickedRarity === 'MYTHIC') {
    const mythics = STRAINS.filter((s) => s.branch === 'BRANCH_V_MYTHIC');
    return rng.pickUniform(mythics);
  }

  if (pickedRarity === 'SECRET') {
    const secrets = STRAINS.filter((s) => s.branch === 'BRANCH_SECRET');
    return rng.pickUniform(secrets);
  }

  const branchItems: { readonly item: StandardBranchId; readonly weightPpm: number }[] = [
    { item: 'BRANCH_I', weightPpm: medium.standardBranchWeightsPpm.BRANCH_I },
    { item: 'BRANCH_II', weightPpm: medium.standardBranchWeightsPpm.BRANCH_II },
    { item: 'BRANCH_III', weightPpm: medium.standardBranchWeightsPpm.BRANCH_III },
    { item: 'BRANCH_IV', weightPpm: medium.standardBranchWeightsPpm.BRANCH_IV },
  ];
  const pickedBranch = rng.pickWeightedPpm(branchItems);

  const matchingStrain = STRAINS.find(
    (s) => s.branch === pickedBranch && s.rarity === pickedRarity
  );
  if (!matchingStrain) {
    throw new Error(
      `Aucune souche trouvée pour la branche ${pickedBranch} et la rareté ${pickedRarity}`
    );
  }
  return matchingStrain;
}

export interface SeedColonyOptions {
  readonly slotIndex: number;
  readonly mediumId: CultureMediumId;
  /** Emplacement de la souche Mythique à sacrifier sur la paillasse si mediumId === MEDIUM_7_RADIO_ISOTOPIC_AGAR */
  readonly mythicSacrificeSlotIndex?: number;
  /** Ou index du tube cryogénique contenant la souche Mythique à sacrifier */
  readonly mythicSacrificeCryoTubeIndex?: number;
}

/**
 * Ensemence un incubateur vide avec le milieu choisi.
 * Utilise en priorité le stock de l'inventaire (`mediaInventory`), sinon achète le milieu en Bio
 * (45 Bio au lieu de 50 Bio pour la Gélose Ordinaire si Trophée #02 est débloqué).
 */
export function seedIncubatorSlot(
  state: GameState,
  options: SeedColonyOptions,
  rng: RngService,
  eventBus?: EventBus
): GameState {
  const targetSlot = state.incubatorSlots[options.slotIndex];
  if (!targetSlot) {
    throw new Error(`Emplacement d'incubateur invalide : ${String(options.slotIndex)}`);
  }
  if (targetSlot.status !== 'EMPTY') {
    throw new Error(
      `L'emplacement ${String(options.slotIndex)} n'est pas vide (${targetSlot.status})`
    );
  }

  const medium = CULTURE_MEDIA_BY_ID[options.mediumId];
  const trophyMods = computeActiveTrophyModifiers(state);
  const inStock = state.mediaInventory[options.mediumId] ?? 0;
  const usesInventory = inStock > 0;

  const baseMediumCost =
    options.mediumId === 'MEDIUM_1_ORDINARY_AGAR'
      ? trophyMods.ordinaryAgarCostBio
      : medium.costBio;
  const bioCost = usesInventory ? 0 : baseMediumCost;

  if (state.bio < bioCost) {
    throw new Error(
      `Solde Bio insuffisant pour ensemencer (${String(state.bio)} < ${String(bioCost)} Bio)`
    );
  }

  // Vérification du sacrifice Mythique pour le Milieu 7 (depuis la paillasse ou depuis un cryo-tube)
  let updatedSlots: IncubatorSlot[] = [...state.incubatorSlots];
  let updatedCryoSlots = [...state.cryoSlots];

  if (medium.requiresMythicSacrifice && !usesInventory) {
    if (options.mythicSacrificeSlotIndex !== undefined) {
      const sacrificeSlot = updatedSlots[options.mythicSacrificeSlotIndex];
      if (!sacrificeSlot || sacrificeSlot.status !== 'COLONY' || !sacrificeSlot.isMature) {
        throw new Error(
          'La souche Mythique sacrifiée doit être une colonie mature sur la paillasse'
        );
      }
      const sacrificeStrain = STRAINS_BY_ID[sacrificeSlot.strainId];
      if (!sacrificeStrain || sacrificeStrain.rarity !== 'MYTHIC') {
        throw new Error('La colonie sélectionnée pour le sacrifice n’est pas de rang Mythique');
      }
      updatedSlots[options.mythicSacrificeSlotIndex] = {
        status: 'EMPTY',
        slotIndex: options.mythicSacrificeSlotIndex,
      };
    } else if (options.mythicSacrificeCryoTubeIndex !== undefined) {
      const sacrificeTube = updatedCryoSlots[options.mythicSacrificeCryoTubeIndex];
      if (!sacrificeTube || sacrificeTube.status !== 'FROZEN') {
        throw new Error('Aucun tube cryogénique occupé à cet index pour le sacrifice Mythique');
      }
      const sacrificeStrain = STRAINS_BY_ID[sacrificeTube.storedColony.strainId];
      if (!sacrificeStrain || sacrificeStrain.rarity !== 'MYTHIC') {
        throw new Error('La souche cryogénisée sélectionnée n’est pas de rang Mythique');
      }
      updatedCryoSlots[options.mythicSacrificeCryoTubeIndex] = {
        status: 'EMPTY',
        tubeIndex: options.mythicSacrificeCryoTubeIndex,
      };
    } else {
      throw new Error('Le Gel Radio-Isotopique requiert le sacrifice d’une souche Mythique');
    }
  }

  const pickedStrain = rollStrainFromMedium(options.mediumId, state, rng);
  let effectiveAdultLifespan = computeEffectiveAdultLifespanSeconds(
    pickedStrain.adultLifespanSeconds,
    pickedStrain.rarity,
    state,
    pickedStrain.branch
  );

  // Incident M4 (Pipette Automatique Désaxée non résolue) : la prochaine boîte ensemencée démarre avec 10 % de vie adulte en moins
  const m4PenaltyActive = state.benchBuffs.m4NextSeededLifespanPenaltyActive;
  if (m4PenaltyActive) {
    effectiveAdultLifespan = roundCurrency(effectiveAdultLifespan * 0.9);
  }

  const newColony: ColonyIncubatorSlot = {
    status: 'COLONY',
    slotIndex: options.slotIndex,
    strainId: pickedStrain.id,
    originMediumId: options.mediumId,
    growthElapsedSeconds: 0,
    growthDurationSeconds: pickedStrain.growthDurationSeconds,
    maturityRatio: 0,
    isMature: false,
    adultLifespanRemainingSeconds: effectiveAdultLifespan,
    adultLifespanTotalSeconds: effectiveAdultLifespan,
    manualInjectionCooldownSeconds: 0,
    absorbedWasteCount: 0,
    isMutated: false,
  };

  updatedSlots[options.slotIndex] = newColony;

  // Vérifie l'effet d'Astro-Bacillus Radiata : 15 % de chance de doubler le résultat de tout ensemencement
  let doubledToSlotIndex: number | undefined;
  const hasAstroBacillus = state.incubatorSlots.some(
    (s) => s.status === 'COLONY' && s.strainId === 'ASTRO_BACILLUS_RADIATA' && s.isMature
  );
  if (hasAstroBacillus) {
    const emptyNeighborSlot = updatedSlots.find(
      (s) => s.status === 'EMPTY' && s.slotIndex !== options.slotIndex
    );
    if (emptyNeighborSlot && rng.nextPpmRoll() < Math.round(0.15 * PPM_BASE)) {
      doubledToSlotIndex = emptyNeighborSlot.slotIndex;
      updatedSlots[doubledToSlotIndex] = {
        ...newColony,
        slotIndex: doubledToSlotIndex,
      };
    }
  }

  const unlockedCoelicolor =
    state.hasUnlockedCoelicolorExtraCryoSlot || pickedStrain.id === 'STREPTOMYCES_COELICOLOR';

  const isNewDiscovery = !state.stats.discoveredStrainIds.includes(pickedStrain.id);
  const discoveredStrainIds = isNewDiscovery
    ? [...state.stats.discoveredStrainIds, pickedStrain.id]
    : state.stats.discoveredStrainIds;

  const updatedInventory = {
    ...state.mediaInventory,
    [options.mediumId]: usesInventory ? inStock - 1 : inStock,
  };

  if (eventBus) {
    eventBus.emit({
      type: 'COLONY_SEEDED',
      slotIndex: options.slotIndex,
      strainId: pickedStrain.id,
      mediumId: options.mediumId,
      isNewDiscovery,
      ...(doubledToSlotIndex !== undefined ? { doubledToSlotIndex } : {}),
    });
  }

  const intermediateState: GameState = {
    ...state,
    bio: roundCurrency(state.bio - bioCost),
    mediaInventory: updatedInventory,
    incubatorSlots: updatedSlots,
    cryoSlots: updatedCryoSlots,
    hasUnlockedCoelicolorExtraCryoSlot: unlockedCoelicolor,
    benchBuffs: {
      ...state.benchBuffs,
      m4NextSeededLifespanPenaltyActive: false,
    },
    stats: {
      ...state.stats,
      totalManualSeedings: state.stats.totalManualSeedings + 1,
      discoveredStrainIds,
    },
  };

  return {
    ...intermediateState,
    cryoSlots: syncCryoSlotsCapacity(intermediateState),
  };
}

/**
 * Arbitrage #10 : Injection manuelle de nutriments
 * Coût : 5 Bio, Cooldown : 10 s, accorde immédiatement +5 % de maturité (+10 % pour Rhodospirillum rubrum).
 */
export function injectManualNutrients(
  state: GameState,
  slotIndex: number,
  eventBus?: EventBus
): GameState {
  const slot = state.incubatorSlots[slotIndex];
  if (!slot || slot.status !== 'COLONY') {
    throw new Error(`Aucune colonie active à l'emplacement ${String(slotIndex)}`);
  }
  if (slot.isMature) {
    throw new Error('La colonie est déjà à 100 % de maturité');
  }
  if (slot.manualInjectionCooldownSeconds > 0) {
    throw new Error(
      `Injection en recharge (${String(slot.manualInjectionCooldownSeconds)}s restantes)`
    );
  }
  const cost = GAME_CONSTANTS.MANUAL_INJECTION.costBio;
  if (state.bio < cost) {
    throw new Error(
      `Bio insuffisant pour l'injection manuelle (${String(state.bio)} < ${String(cost)})`
    );
  }

  const hasRhodospirillum = state.incubatorSlots.some(
    (s) => s.status === 'COLONY' && s.strainId === 'RHODOSPIRILLUM_RUBRUM'
  );
  const boostRatio = hasRhodospirillum
    ? GAME_CONSTANTS.MANUAL_INJECTION.rhodospirillumMaturityBoostRatio
    : GAME_CONSTANTS.MANUAL_INJECTION.maturityBoostRatio;

  const addedSeconds = slot.growthDurationSeconds * boostRatio;
  const newElapsed = Math.min(slot.growthDurationSeconds, slot.growthElapsedSeconds + addedSeconds);
  const newMaturityRatio = clamp(newElapsed / slot.growthDurationSeconds, 0, 1);
  const reachedMaturityNow = !slot.isMature && newMaturityRatio >= 1;

  const updatedColony: ColonyIncubatorSlot = {
    ...slot,
    growthElapsedSeconds: newElapsed,
    maturityRatio: newMaturityRatio,
    isMature: newMaturityRatio >= 1,
    manualInjectionCooldownSeconds: GAME_CONSTANTS.MANUAL_INJECTION.cooldownSeconds,
  };

  const updatedSlots = state.incubatorSlots.map((s, idx) =>
    idx === slotIndex ? updatedColony : s
  );

  const strain = STRAINS_BY_ID[slot.strainId];
  const maturedLegendary =
    Boolean(state.stats.hasMaturedLegendaryStrain) ||
    (reachedMaturityNow && strain?.rarity === 'LEGENDARY');
  const stabilizedMythic =
    Boolean(state.stats.hasStabilizedMythicWithoutCryo) ||
    (reachedMaturityNow && strain?.rarity === 'MYTHIC' && (slot.cryoStabilizedSeconds ?? 0) === 0);

  if (eventBus) {
    eventBus.emit({
      type: 'NUTRIENT_INJECTED',
      slotIndex,
      strainId: slot.strainId,
      addedMaturityRatio: boostRatio,
    });
    if (reachedMaturityNow) {
      eventBus.emit({
        type: 'COLONY_REACHED_MATURITY',
        slotIndex,
        strainId: slot.strainId,
      });
    }
  }

  return {
    ...state,
    bio: roundCurrency(state.bio - cost),
    incubatorSlots: updatedSlots,
    stats: {
      ...state.stats,
      totalManualInjections: state.stats.totalManualInjections + 1,
      hasMaturedLegendaryStrain: maturedLegendary,
      hasStabilizedMythicWithoutCryo: stabilizedMythic,
    },
  };
}

/**
 * Fait progresser la croissance, le cooldown d'injection et la sénescence de toutes les colonies sur un pas de temps dtSeconds.
 * Intègre :
 * - Chronobacterium temporalis (+30 % vitesse de pousse)
 * - Trophée #01 (+5 % vitesse de pousse sur le rang Commun)
 * - Événement B2 (+20 % vitesse de pousse temporaire pendant 30s)
 * - Incident M1 (temps de pousse +10 % pendant 120s si non résolu)
 */
export function advanceIncubatorsTick(
  state: GameState,
  dtSeconds: number,
  eventBus?: EventBus
): GameState {
  if (dtSeconds <= 0 || state.isPaused) {
    return state;
  }

  const trophyMods = computeActiveTrophyModifiers(state);
  const hasChronobacterium = state.incubatorSlots.some(
    (s) => s.status === 'COLONY' && s.strainId === 'CHRONOBACTERIUM_TEMPORALIS'
  );
  const chronoBonus = hasChronobacterium ? 0.3 : 0;
  const b2Bonus = state.benchBuffs.b2GrowthSpeedRemainingSeconds > 0 ? 0.2 : 0;
  const m1SlowFactor = state.benchBuffs.m1SlowGrowthPenaltyRemainingSeconds > 0 ? 1 / 1.1 : 1.0;

  let maturedLegendary = Boolean(state.stats.hasMaturedLegendaryStrain);
  let stabilizedMythic = Boolean(state.stats.hasStabilizedMythicWithoutCryo);

  const updatedSlots: IncubatorSlot[] = state.incubatorSlots.map((slot): IncubatorSlot => {
    if (slot.status !== 'COLONY') {
      return slot;
    }

    const nextCooldown = Math.max(0, slot.manualInjectionCooldownSeconds - dtSeconds);
    const strain = STRAINS_BY_ID[slot.strainId];

    // Phase 1 : En croissance (< 100 % maturité)
    if (!slot.isMature) {
      const isImmuneToUndervoltage = slot.strainId === 'CLOSTRIDIUM_BUTYRICUM';
      const undervoltageFactor =
        state.isUndervoltage && !isImmuneToUndervoltage
          ? GAME_CONSTANTS.ECONOMY.undervoltageGrowthSpeedMultiplier
          : 1.0;

      const commonTrophyBonus =
        strain?.rarity === 'COMMON' ? trophyMods.commonGrowthSpeedBonusRatio : 0;
      const totalSpeedMultiplier =
        (1 + chronoBonus + b2Bonus + commonTrophyBonus) * m1SlowFactor * undervoltageFactor;

      const effectiveGrowthDelta = dtSeconds * totalSpeedMultiplier;
      const totalElapsed = slot.growthElapsedSeconds + effectiveGrowthDelta;

      if (totalElapsed + 1e-9 < slot.growthDurationSeconds) {
        const maturityRatio = clamp(totalElapsed / slot.growthDurationSeconds, 0, 1);
        return {
          ...slot,
          growthElapsedSeconds: totalElapsed,
          maturityRatio,
          manualInjectionCooldownSeconds: nextCooldown,
        };
      }

      // La colonie atteint 100 % de maturité pendant ce pas de temps
      const timeToFinishGrowth = Math.max(
        0,
        slot.growthDurationSeconds - slot.growthElapsedSeconds
      );
      const leftoverRealSeconds = Math.max(
        0,
        dtSeconds - timeToFinishGrowth / Math.max(1e-6, totalSpeedMultiplier)
      );

      if (strain?.rarity === 'LEGENDARY') {
        maturedLegendary = true;
      }
      if (strain?.rarity === 'MYTHIC' && (slot.cryoStabilizedSeconds ?? 0) === 0) {
        stabilizedMythic = true;
      }

      if (eventBus) {
        eventBus.emit({
          type: 'COLONY_REACHED_MATURITY',
          slotIndex: slot.slotIndex,
          strainId: slot.strainId,
        });
      }

      const remainingAdult = slot.adultLifespanRemainingSeconds - leftoverRealSeconds;
      if (remainingAdult > 1e-9) {
        return {
          ...slot,
          growthElapsedSeconds: slot.growthDurationSeconds,
          maturityRatio: 1.0,
          isMature: true,
          adultLifespanRemainingSeconds: remainingAdult,
          manualInjectionCooldownSeconds: 0,
        };
      }

      if (eventBus) {
        eventBus.emit({
          type: 'COLONY_NECROSED',
          slotIndex: slot.slotIndex,
          originStrainId: slot.strainId,
        });
      }
      const wasteOverlaySeconds = Math.max(0, -remainingAdult);
      const wasteSlot: WasteIncubatorSlot = {
        status: 'WASTE',
        slotIndex: slot.slotIndex,
        originStrainId: slot.strainId,
        originMediumId: slot.originMediumId,
        necrosisElapsedSeconds: wasteOverlaySeconds,
        isToxic: wasteOverlaySeconds + 1e-9 >= GAME_CONSTANTS.WASTE.toxicityDelaySeconds,
      };
      return wasteSlot;
    }

    // Phase 2 : Colonie mature -> décrémentation de la durée de vie adulte
    const nextAdultRemaining = slot.adultLifespanRemainingSeconds - dtSeconds;
    if (nextAdultRemaining > 1e-9) {
      return {
        ...slot,
        adultLifespanRemainingSeconds: nextAdultRemaining,
        manualInjectionCooldownSeconds: nextCooldown,
      };
    }

    // Mort cellulaire -> transformation en Masse Organique Nécrosée (Résidu Toxique)
    const necrosisOverflow = Math.max(0, -nextAdultRemaining);
    const becomesToxicImmediately =
      necrosisOverflow + 1e-9 >= GAME_CONSTANTS.WASTE.toxicityDelaySeconds;

    if (eventBus) {
      eventBus.emit({
        type: 'COLONY_NECROSED',
        slotIndex: slot.slotIndex,
        originStrainId: slot.strainId,
      });
      if (becomesToxicImmediately) {
        eventBus.emit({
          type: 'TOXIC_EMISSION_STARTED',
          slotIndex: slot.slotIndex,
          originStrainId: slot.strainId,
        });
      }
    }

    return {
      status: 'WASTE',
      slotIndex: slot.slotIndex,
      originStrainId: slot.strainId,
      originMediumId: slot.originMediumId,
      necrosisElapsedSeconds: necrosisOverflow,
      isToxic: becomesToxicImmediately,
    };
  });

  return {
    ...state,
    incubatorSlots: updatedSlots,
    stats: {
      ...state.stats,
      hasMaturedLegendaryStrain: maturedLegendary,
      hasStabilizedMythicWithoutCryo: stabilizedMythic,
    },
  };
}

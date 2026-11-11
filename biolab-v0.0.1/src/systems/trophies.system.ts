import { STRAINS, STRAINS_BY_ID } from '../data/strains.data.ts';
import { TECH_TREE } from '../data/tech.data.ts';
import { TROPHIES_BY_ID } from '../data/trophies.data.ts';
import type { EventBus } from '../core/event-bus.ts';
import type { GameState } from '../types/game-state.types.ts';
import type { TrophyId } from '../types/game.types.ts';

export interface ActiveTrophyModifiers {
  /** #01 : +5 % de vitesse de pousse sur le rang Commun */
  readonly commonGrowthSpeedBonusRatio: number;
  /** #02 : Coût de la gélose ordinaire réduit à 45 Bio (au lieu de 50 Bio) */
  readonly ordinaryAgarCostBio: number;
  /** #03 : Durée de vie adulte des Bacilles (Branche I) accrue de +10 % */
  readonly bacilliAdultLifespanBonusRatio: number;
  /** #04 : Coût en Bio de scissiparité réduit de 5 % */
  readonly scissiparityBioCostReductionRatio: number;
  /** #05 : +5 % de Bio-crédits sur tous les contrats */
  readonly contractBioRewardBonusRatio: number;
  /** #06 : Entretien cryogénique réduit de 10 % */
  readonly cryoUpkeepReductionRatio: number;
  /** #07 : Chance de mutation spontanée en mitose +1 % (+10_000 ppm) */
  readonly mitosisMutationBonusRatio: number;
  /** #08 : Frais fixes d'usine réduits de 6 % */
  readonly fixedOverheadReductionRatio: number;
  /** #09 : Taux d'échec de mutagenèse réduit de 2 % (-20_000 ppm) */
  readonly mutagenesisLysisReductionRatio: number;
  /** #10 : Les comptes à rebours de mission gagnent +25 secondes */
  readonly contractCountdownBonusSeconds: number;
  /** #11 : Vitesse de traitement des bio-déchets +20 % */
  readonly wasteProcessingSpeedBonusRatio: number;
  /** #12 : +10 % de Points de Recherche (PR) passifs */
  readonly passivePrBonusRatio: number;
  /** #13 : Durée de vie adulte des Mythiques prolongée de +1 min (60s) */
  readonly mythicExtraLifespanSeconds: number;
  /** #14 : Réduit le coût d'évacuation par autoclave de 25 % */
  readonly flashAutoclaveCostReductionRatio: number;
  /** #15 : Les multiplicateurs de symbiose de biofilm gagnent +2 % */
  readonly biofilmSynergyBonusRatio: number;
  /** #16 : Supprime le risque de mise en sous-tension du labo */
  readonly preventsUndervoltage: boolean;
}

export function hasTrophy(state: GameState, trophyId: TrophyId): boolean {
  return state.unlockedTrophyIds.includes(trophyId);
}

/**
 * Calcule l'ensemble des bonus permanents actifs provenant de l'Armoire des Distinctions.
 */
export function computeActiveTrophyModifiers(state: GameState): ActiveTrophyModifiers {
  return {
    commonGrowthSpeedBonusRatio: hasTrophy(state, 'TROPHY_01')
      ? TROPHIES_BY_ID.TROPHY_01.effectValue
      : 0,
    ordinaryAgarCostBio: hasTrophy(state, 'TROPHY_02')
      ? TROPHIES_BY_ID.TROPHY_02.effectValue
      : 50,
    bacilliAdultLifespanBonusRatio: hasTrophy(state, 'TROPHY_03')
      ? TROPHIES_BY_ID.TROPHY_03.effectValue
      : 0,
    scissiparityBioCostReductionRatio: hasTrophy(state, 'TROPHY_04')
      ? TROPHIES_BY_ID.TROPHY_04.effectValue
      : 0,
    contractBioRewardBonusRatio: hasTrophy(state, 'TROPHY_05')
      ? TROPHIES_BY_ID.TROPHY_05.effectValue
      : 0,
    cryoUpkeepReductionRatio: hasTrophy(state, 'TROPHY_06')
      ? TROPHIES_BY_ID.TROPHY_06.effectValue
      : 0,
    mitosisMutationBonusRatio: hasTrophy(state, 'TROPHY_07')
      ? TROPHIES_BY_ID.TROPHY_07.effectValue
      : 0,
    fixedOverheadReductionRatio: hasTrophy(state, 'TROPHY_08')
      ? TROPHIES_BY_ID.TROPHY_08.effectValue
      : 0,
    mutagenesisLysisReductionRatio: hasTrophy(state, 'TROPHY_09')
      ? TROPHIES_BY_ID.TROPHY_09.effectValue
      : 0,
    contractCountdownBonusSeconds: hasTrophy(state, 'TROPHY_10')
      ? TROPHIES_BY_ID.TROPHY_10.effectValue
      : 0,
    wasteProcessingSpeedBonusRatio: hasTrophy(state, 'TROPHY_11')
      ? TROPHIES_BY_ID.TROPHY_11.effectValue
      : 0,
    passivePrBonusRatio: hasTrophy(state, 'TROPHY_12')
      ? TROPHIES_BY_ID.TROPHY_12.effectValue
      : 0,
    mythicExtraLifespanSeconds: hasTrophy(state, 'TROPHY_13')
      ? TROPHIES_BY_ID.TROPHY_13.effectValue
      : 0,
    flashAutoclaveCostReductionRatio: hasTrophy(state, 'TROPHY_14')
      ? TROPHIES_BY_ID.TROPHY_14.effectValue
      : 0,
    biofilmSynergyBonusRatio: hasTrophy(state, 'TROPHY_15')
      ? TROPHIES_BY_ID.TROPHY_15.effectValue
      : 0,
    preventsUndervoltage: hasTrophy(state, 'TROPHY_16'),
  };
}

/**
 * Vérifie les conditions des 16 trophées historiques de BIOLAB et débloque ceux dont le défi est accompli.
 */
export function evaluateAndUnlockTrophies(state: GameState, eventBus?: EventBus): GameState {
  const newlyUnlocked: TrophyId[] = [];

  function check(id: TrophyId, condition: boolean): void {
    if (condition && !state.unlockedTrophyIds.includes(id) && !newlyUnlocked.includes(id)) {
      newlyUnlocked.push(id);
    }
  }

  // #01 : Réaliser 50 ensemencements manuels
  check('TROPHY_01', state.stats.totalManualSeedings >= 50);

  // #02 : Cumuler 10 000 Bio au cours de la partie
  check('TROPHY_02', state.stats.totalBioEarned >= 10_000 || state.bio >= 10_000);

  // #03 : Débloquer l'Annexe Universitaire (Palier 2)
  check('TROPHY_03', state.factoryTier >= 2);

  // #04 : Réussir une première mitose végétale sans lyse
  check('TROPHY_04', (state.stats.totalScissiparitySuccesses ?? 0) >= 1);

  // #05 : Compléter 25 contrats de commanditaires civils
  check('TROPHY_05', (state.stats.totalCivilianContractsCompleted ?? 0) >= 25);

  // #06 : Garder une colonie congelée pendant 2 heures (7 200 secondes)
  check('TROPHY_06', (state.stats.maxCryoFrozenDurationSeconds ?? 0) >= 7_200);

  // #07 : Découvrir une souche Rare dans chaque branche standard (I, II, III, IV)
  const rareStandardStrains = STRAINS.filter(
    (s) =>
      s.rarity === 'RARE' &&
      (s.branch === 'BRANCH_I' ||
        s.branch === 'BRANCH_II' ||
        s.branch === 'BRANCH_III' ||
        s.branch === 'BRANCH_IV')
  );
  const hasAllFourRareBranches = rareStandardStrains.every((s) =>
    state.stats.discoveredStrainIds.includes(s.id)
  );
  check('TROPHY_07', hasAllFourRareBranches);

  // #08 : Atteindre une production nette de 500 Bio/s
  check('TROPHY_08', state.economy.netBioPerSec >= 500);

  // #09 : Réaliser 15 mutagenèses chimiques sans échec
  check('TROPHY_09', (state.stats.totalMutagenesisSuccessesWithoutLysis ?? 0) >= 15);

  // #10 : Valider un contrat sous modificateur [Urgence Vitale]
  check('TROPHY_10', (state.stats.totalVitalUrgencyContractsCompleted ?? 0) >= 1);

  // #11 : Débloquer la Bio-Usine Industrielle (Palier 4)
  check('TROPHY_11', state.factoryTier >= 4);

  // #12 : Amener une bactérie Légendaire à 100 % de maturité
  const hasMaturedLegendaryOnBench = state.incubatorSlots.some((s) => {
    if (s.status !== 'COLONY' || !s.isMature) return false;
    return STRAINS_BY_ID[s.strainId]?.rarity === 'LEGENDARY';
  });
  check(
    'TROPHY_12',
    Boolean(state.stats.hasMaturedLegendaryStrain) || hasMaturedLegendaryOnBench
  );

  // #13 : Stabiliser une souche Mythique sans la cryogéniser
  const hasStabilizedMythicOnBench = state.incubatorSlots.some((s) => {
    if (s.status !== 'COLONY' || !s.isMature) return false;
    const isMythic = STRAINS_BY_ID[s.strainId]?.rarity === 'MYTHIC';
    const neverCryo = (s.cryoStabilizedSeconds ?? 0) === 0;
    return isMythic && neverCryo;
  });
  check(
    'TROPHY_13',
    Boolean(state.stats.hasStabilizedMythicWithoutCryo) || hasStabilizedMythicOnBench
  );

  // #14 : Débloquer le Complexe Bunker BSL-4 (Palier 5)
  check('TROPHY_14', state.factoryTier >= 5);

  // #15 : Compléter 100 % des technologies de l'arbre PR (12 technologies)
  check('TROPHY_15', state.unlockedTechIds.length >= TECH_TREE.length);

  // #16 : Isoler n'importe quel Organisme Cosmique Secret
  const hasDiscoveredSecret = state.stats.discoveredStrainIds.some(
    (id) => STRAINS_BY_ID[id]?.rarity === 'SECRET'
  );
  check('TROPHY_16', hasDiscoveredSecret);

  if (newlyUnlocked.length === 0) {
    return state;
  }

  for (const id of newlyUnlocked) {
    const def = TROPHIES_BY_ID[id];
    if (eventBus) {
      eventBus.emit({
        type: 'TROPHY_UNLOCKED',
        trophyId: id,
        nameFr: def.nameFr,
      });
    }
  }

  const nextUnlockedTrophyIds = [...state.unlockedTrophyIds, ...newlyUnlocked];
  const preventsUndervoltageNow = nextUnlockedTrophyIds.includes('TROPHY_16');

  return {
    ...state,
    unlockedTrophyIds: nextUnlockedTrophyIds,
    isUndervoltage: preventsUndervoltageNow ? false : state.isUndervoltage,
  };
}

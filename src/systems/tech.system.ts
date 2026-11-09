import { TECH_BY_ID, TECH_TREE } from '../data/tech.data.ts';
import type { EventBus } from '../core/event-bus.ts';
import { roundCurrency } from '../core/math.ts';
import type { GameState } from '../types/game-state.types.ts';
import type { BranchId, Rarity, TechId } from '../types/game.types.ts';
import { computeActiveTrophyModifiers } from './trophies.system.ts';

export interface ActiveTechModifiers {
  /** T1 (+15 % sur toutes les cultures) */
  readonly universalLifespanBonusRatio: number;
  /** T2 (Risque de lyse en mitose abaissé à 4 % au lieu de 8 %) */
  readonly hasStabilizedHistonesT2: boolean;
  /** T3 (Double la durée de vie adulte des Légendaires et Mythiques) */
  readonly hasEternalLongevityT3: boolean;
  /** C1 (-25 %) + C2 (-50 %) = jusqu'à -75 % sur l'entretien cryo */
  readonly cryoUpkeepReductionRatio: number;
  /** C3 (Les souches cryogénisées produisent 5 % de leur Bio/s) */
  readonly cryoProductionRatio: number;
  /** S1 (+10 % de chance relative sur les paliers Rare et Épique) */
  readonly rareAndEpicRelativeDropBonusRatio: number;
  /** S2 (Divise par 2 le temps de recyclage des bio-déchets : 45s au lieu de 90s) */
  readonly bioreactorDurationMultiplier: number;
  /** S3 (Réduit les charges fixes d'usine de 20 %) */
  readonly fixedOverheadReductionRatio: number;
  /** M1 (Divise le coût en Bio de scissiparité par 2) */
  readonly scissiparityBioCostMultiplier: number;
  /** M2 (+10 % de probabilité de rang supérieur en croisement) */
  readonly conjugationHigherRankBonusRatio: number;
  /** M3 (Permet de conjuguer 3 souches en une seule opération) */
  readonly canConjugateThreeStrains: boolean;
}

export function hasTech(state: GameState, techId: TechId): boolean {
  return state.unlockedTechIds.includes(techId);
}

/**
 * Calcule l'ensemble des modificateurs actifs issus de l'Arbre Technologique PR.
 */
export function computeActiveTechModifiers(state: GameState): ActiveTechModifiers {
  const hasT1 = hasTech(state, 'T1');
  const hasT2 = hasTech(state, 'T2');
  const hasT3 = hasTech(state, 'T3');

  const hasC1 = hasTech(state, 'C1');
  const hasC2 = hasTech(state, 'C2');
  const hasC3 = hasTech(state, 'C3');

  const hasS1 = hasTech(state, 'S1');
  const hasS2 = hasTech(state, 'S2');
  const hasS3 = hasTech(state, 'S3');

  const hasM1 = hasTech(state, 'M1');
  const hasM2 = hasTech(state, 'M2');
  const hasM3 = hasTech(state, 'M3');

  // Arbitrage Phase 0 : C1 (-25 %) et C2 (-50 %) s'additionnent (-75 % total)
  const cryoUpkeepReductionRatio =
    (hasC1 ? TECH_BY_ID.C1.modifierValue : 0) + (hasC2 ? TECH_BY_ID.C2.modifierValue : 0);

  return {
    universalLifespanBonusRatio: hasT1 ? TECH_BY_ID.T1.modifierValue : 0,
    hasStabilizedHistonesT2: hasT2,
    hasEternalLongevityT3: hasT3,
    cryoUpkeepReductionRatio,
    cryoProductionRatio: hasC3 ? TECH_BY_ID.C3.modifierValue : 0,
    rareAndEpicRelativeDropBonusRatio: hasS1 ? TECH_BY_ID.S1.modifierValue : 0,
    bioreactorDurationMultiplier: hasS2 ? TECH_BY_ID.S2.modifierValue : 1.0,
    fixedOverheadReductionRatio: hasS3 ? TECH_BY_ID.S3.modifierValue : 0,
    scissiparityBioCostMultiplier: hasM1 ? TECH_BY_ID.M1.modifierValue : 1.0,
    conjugationHigherRankBonusRatio: hasM2 ? TECH_BY_ID.M2.modifierValue : 0,
    canConjugateThreeStrains: hasM3,
  };
}

/**
 * Calcule la durée de vie adulte initiale d'une souche en tenant compte de :
 * - Tech T1 (+15 % sur toutes les cultures)
 * - Tech T3 (x2 sur Légendaire et Mythique)
 * - Trophée #03 (+10 % sur les Bacilles — Branche I)
 * - Trophée #13 (+60 secondes sur les Mythiques)
 */
export function computeEffectiveAdultLifespanSeconds(
  baseLifespanSeconds: number,
  rarity: Rarity,
  state: GameState,
  branch?: BranchId
): number {
  const mods = computeActiveTechModifiers(state);
  const trophyMods = computeActiveTrophyModifiers(state);

  const bacilliBonus = branch === 'BRANCH_I' ? trophyMods.bacilliAdultLifespanBonusRatio : 0;
  let lifespan =
    baseLifespanSeconds * (1 + mods.universalLifespanBonusRatio + bacilliBonus);

  if (mods.hasEternalLongevityT3 && (rarity === 'LEGENDARY' || rarity === 'MYTHIC')) {
    lifespan *= 2.0;
  }

  if (rarity === 'MYTHIC' && trophyMods.mythicExtraLifespanSeconds > 0) {
    lifespan += trophyMods.mythicExtraLifespanSeconds;
  }

  return Math.round(lifespan * 100) / 100;
}

/**
 * Débloque une technologie de l'Arbre PR en vérifiant :
 * 1. Qu'elle n'est pas déjà débloquée
 * 2. Que le palier précédent de la même branche est débloqué (Tier 1 -> Tier 2 -> Tier 3)
 * 3. Que le joueur possède suffisamment de PR
 */
export function unlockTech(state: GameState, techId: TechId, eventBus?: EventBus): GameState {
  const tech = TECH_BY_ID[techId];
  if (!tech) {
    throw new Error(`Technologie inconnue : ${String(techId)}`);
  }

  if (hasTech(state, techId)) {
    throw new Error(`La technologie ${techId} (${tech.nameFr}) est déjà débloquée`);
  }

  if (tech.tier > 1) {
    const prerequisiteTier = (tech.tier - 1) as 1 | 2;
    const prerequisiteTech = TECH_TREE.find(
      (t) => t.branch === tech.branch && t.tier === prerequisiteTier
    );
    if (prerequisiteTech && !hasTech(state, prerequisiteTech.id)) {
      throw new Error(
        `Prérequis manquant : vous devez d'abord débloquer ${prerequisiteTech.id} (${prerequisiteTech.nameFr})`
      );
    }
  }

  if (state.pr < tech.costPr) {
    throw new Error(
      `Points de Recherche (PR) insuffisants pour ${tech.nameFr} (${String(state.pr)} < ${String(tech.costPr)} PR)`
    );
  }

  if (eventBus) {
    eventBus.emit({
      type: 'TECH_UNLOCKED',
      techId,
      costPr: tech.costPr,
    });
  }

  return {
    ...state,
    pr: roundCurrency(state.pr - tech.costPr),
    unlockedTechIds: [...state.unlockedTechIds, techId],
  };
}

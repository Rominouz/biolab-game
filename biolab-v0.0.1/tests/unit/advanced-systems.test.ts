import { describe, expect, it } from './test-harness.ts';
import { createInitialGameState } from '../../src/core/initial-state.ts';
import { createSimulationEngine } from '../../src/systems/simulation-engine.ts';
import type { ColonyIncubatorSlot } from '../../src/types/game-state.types.ts';

function createMatureColony(
  slotIndex: number,
  strainId: string,
  growthDurationSeconds = 20,
  adultLifespanSeconds = 2100
): ColonyIncubatorSlot {
  return {
    status: 'COLONY',
    slotIndex,
    strainId,
    originMediumId: 'MEDIUM_1_ORDINARY_AGAR',
    growthElapsedSeconds: growthDurationSeconds,
    growthDurationSeconds,
    maturityRatio: 1.0,
    isMature: true,
    adultLifespanRemainingSeconds: adultLifespanSeconds,
    adultLifespanTotalSeconds: adultLifespanSeconds,
    manualInjectionCooldownSeconds: 0,
    absorbedWasteCount: 0,
    isMutated: false,
  };
}

describe('Phase 3 — Systèmes Avancés (Cryogénie, Multiplication, Arbre PR & Usine)', () => {
  describe('1. Chambre Cryogénique & Technologies Thermiques (C1, C2, C3)', () => {
    it('fige le vieillissement en cryo-tube, applique les frais d’azote et cumule le temps de stabilisation', () => {
      const baseState = createInitialGameState();
      // Lactobacillus fermenti : multiplicateur 3.2, entretien cryo = 3.0 Bio/s, vie restante = 500s
      const colony = createMatureColony(0, 'LACTOBACILLUS_FERMENTI', 50, 500);
      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          bio: 1_000,
          pr: 5_000,
          incubatorSlots: [
            colony,
            baseState.incubatorSlots[1]!,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });

      // Congélation dans le tube 0
      const afterFreeze = engine.freezeColony(0, 0);
      expect(afterFreeze.incubatorSlots[0]?.status).toBe('EMPTY');
      expect(afterFreeze.cryoSlots[0]?.status).toBe('FROZEN');
      expect(afterFreeze.economy.cryoUpkeepBioPerSec).toBe(3.0);

      // Avance de 120 secondes : le temps congelé monte à 120s, mais la durée de vie adulte reste figée à 500s
      const after120s = engine.tick(120);
      const tube0 = after120s.cryoSlots[0];
      if (tube0?.status === 'FROZEN') {
        expect(tube0.frozenDurationSeconds).toBeCloseTo(120, 2);
        expect(tube0.storedColony.adultLifespanRemainingSeconds).toBe(500);
      }

      // Déblocage de C1 (-25 %, 400 PR) puis C2 (-50 %, 3500 PR) -> -75 % cumulé (Arbitrage Phase 0)
      engine.unlockTechnology('C1');
      expect(engine.getState().economy.cryoUpkeepBioPerSec).toBe(2.25); // 3.0 * 0.75

      engine.unlockTechnology('C2');
      expect(engine.getState().economy.cryoUpkeepBioPerSec).toBe(0.75); // 3.0 * 0.25

      // Décongélation vers l'emplacement 2 de la paillasse
      const afterThaw = engine.thawColony(0, 2);
      expect(afterThaw.cryoSlots[0]?.status).toBe('EMPTY');
      const thawedSlot = afterThaw.incubatorSlots[2];
      expect(thawedSlot?.status).toBe('COLONY');
      if (thawedSlot?.status === 'COLONY') {
        expect(thawedSlot.cryoStabilizedSeconds).toBeCloseTo(120, 2);
        expect(thawedSlot.adultLifespanRemainingSeconds).toBe(500);
      }
    });

    it('divise par 2 l’entretien cryo de Corynebacterium simplex et produit 5 % en cryo avec la Tech C3', () => {
      const baseState = createInitialGameState();
      // Corynebacterium simplex : entretien cryo 0.5 Bio/s -> divisé par 2 = 0.25 Bio/s
      // Geobacter electronica : multiplicateur 110 -> avec C3 (5 %) produit 5.5 Bio/s même congelée
      const coryne = createMatureColony(0, 'CORYNEBACTERIUM_SIMPLEX', 22, 2160);
      const geobacter = createMatureColony(1, 'GEOBACTER_ELECTRONICA', 720, 720);

      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          bio: 50_000,
          pr: 40_000,
          incubatorSlots: [
            coryne,
            geobacter,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });

      engine.freezeColony(0, 0);
      expect(engine.getState().economy.cryoUpkeepBioPerSec).toBe(0.25);

      engine.freezeColony(1, 1);
      // Débloque C1 -> C2 -> C3
      engine.unlockTechnology('C1');
      engine.unlockTechnology('C2');
      const afterC3 = engine.unlockTechnology('C3');

      // Production en cryo : (1.1 + 110) * 0.05 = 5.555 Bio/s
      expect(afterC3.economy.grossBioPerSec).toBeCloseTo(5.555, 3);
    });
  });

  describe('2. Protocoles de Multiplication (Scissiparité, Mutagenèse UV & Conjugaison)', () => {
    it('exécute la Scissiparité Végétative au coût fixe de la souche (divisé par 2 avec Tech M1)', () => {
      const baseState = createInitialGameState();
      // Lactobacillus fermenti : coût scissiparité = 80 Bio (40 Bio avec M1)
      const donor = createMatureColony(0, 'LACTOBACILLUS_FERMENTI', 50, 300);

      const engine = createSimulationEngine({
        seed: 7,
        initialState: {
          ...baseState,
          bio: 500,
          pr: 1_000,
          incubatorSlots: [
            donor,
            baseState.incubatorSlots[1]!,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });

      engine.unlockTechnology('M1'); // 500 PR -> coût scissiparité divisé par 2 (80 -> 40 Bio)
      const afterSciss = engine.scissiparity(0, 1);
      expect(afterSciss.bio).toBe(460); // 500 - 40 Bio
      expect(afterSciss.incubatorSlots[0]?.status).toBe('COLONY'); // Mère intacte
      expect(afterSciss.incubatorSlots[1]?.status).toBe('COLONY'); // Fille créée à 0 % de maturité
    });

    it('exécute la Mutagenèse UV (coût Scissiparité * 4 + 15 PR) et annule le risque de lyse avec Deinococcus radiodurans', () => {
      const baseState = createInitialGameState();
      // Bacillus subtilis : coût scissiparité 12 Bio -> Mutagenèse = 12 * 4 = 48 Bio + 15 PR
      const bacillus = createMatureColony(0, 'BACILLUS_SUBTILIS', 20, 2100);
      const deinococcus = createMatureColony(1, 'DEINOCOCCUS_RADIODURANS', 390, 1080);

      const engine = createSimulationEngine({
        seed: 999,
        initialState: {
          ...baseState,
          bio: 500,
          pr: 100,
          incubatorSlots: [
            bacillus,
            deinococcus,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });

      // Avec Deinococcus radiodurans actif, 0 % de lyse : la boîte fille (slot 2) est garantie d'être créée
      const afterMuta = engine.mutagenesis(0, 2);
      expect(afterMuta.bio).toBe(452); // 500 - 48 Bio
      expect(afterMuta.pr).toBe(85); // 100 - 15 PR
      expect(afterMuta.incubatorSlots[2]?.status).toBe('COLONY');
    });

    it('exécute la Conjugaison (consomme les parents sauf avec Plasmidus Infinitum, supporte 3 parents avec M3)', () => {
      const baseState = createInitialGameState();
      // Parent A : Bacillus subtilis (x1.0), Parent B : Micrococcus luteus (x1.2)
      // Coût = (1.0 + 1.2) * 1500 = 3 300 Bio
      const parentA = createMatureColony(0, 'BACILLUS_SUBTILIS', 20, 2100);
      const parentB = createMatureColony(1, 'MICROCOCCUS_LUTEUS', 25, 2040);

      const engine = createSimulationEngine({
        seed: 12,
        initialState: {
          ...baseState,
          bio: 10_000,
          incubatorSlots: [
            parentA,
            parentB,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });

      const afterConj = engine.conjugate([0, 1], 2);
      expect(afterConj.bio).toBe(6_700); // 10 000 - 3 300 Bio
      // Les deux parents (slots 0 et 1) ont été consommés
      expect(afterConj.incubatorSlots[0]?.status).toBe('EMPTY');
      expect(afterConj.incubatorSlots[1]?.status).toBe('EMPTY');

      // Test avec Plasmidus Infinitum active : garantit 100 % de réussite sans détruire les parents
      const plasmidus = createMatureColony(3, 'PLASMIDUS_INFINITUM', 3300, 300);
      const engineWithPlasmidus = createSimulationEngine({
        seed: 99,
        initialState: {
          ...baseState,
          bio: 50_000,
          incubatorSlots: [parentA, parentB, baseState.incubatorSlots[2]!, plasmidus],
        },
      });

      const afterSafeConj = engineWithPlasmidus.conjugate([0, 1], 2);
      expect(afterSafeConj.incubatorSlots[0]?.status).toBe('COLONY'); // Parent A préservé
      expect(afterSafeConj.incubatorSlots[1]?.status).toBe('COLONY'); // Parent B préservé
      expect(afterSafeConj.incubatorSlots[2]?.status).toBe('COLONY'); // Hybride garanti à 100 %
    });
  });

  describe('3. Arbre Technologique PR & Paliers d’Usine (Niv 1 à 5)', () => {
    it('impose l’ordre séquentiel des technologies dans chaque branche et applique T1/T3/S2/S3', () => {
      const baseState = createInitialGameState();
      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          bio: 500_000,
          pr: 100_000,
        },
      });

      // Débloquer T1 (250 PR) -> T2 (1200 PR) -> T3 (15000 PR)
      engine.unlockTechnology('T1');
      engine.unlockTechnology('T2');
      engine.unlockTechnology('T3');

      // Débloquer S1 (800 PR) -> S2 (6000 PR) -> S3 (50000 PR : -20 % charges fixes)
      engine.unlockTechnology('S1');
      engine.unlockTechnology('S2');
      const afterS3 = engine.unlockTechnology('S3');

      // Charges fixes Niv 1 (0.5 Bio/s) réduites de 20 % = 0.4 Bio/s
      expect(afterS3.economy.fixedOverheadBioPerSec).toBe(0.4);
    });

    it('débloque séquentiellement les Paliers d’Usine 2 à 5 et étend les boîtes (4 -> 12) et cryo-tubes (2 -> 18)', () => {
      const baseState = createInitialGameState();
      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          bio: 200_000_000,
          pr: 300_000,
        },
      });

      // Passage au Palier 2 (Annexe Universitaire : 150 000 Bio + 500 PR -> 6 boîtes, 4 cryo-tubes)
      const tier2 = engine.upgradeFactory();
      expect(tier2.factoryTier).toBe(2);
      expect(tier2.incubatorSlots).toHaveLength(6);
      expect(tier2.cryoSlots).toHaveLength(4);
      expect(tier2.economy.fixedOverheadBioPerSec).toBe(15);

      // Passage aux Paliers 3, 4 et 5
      engine.upgradeFactory(); // Palier 3 (8 boîtes / 8 tubes)
      engine.upgradeFactory(); // Palier 4 (10 boîtes / 12 tubes)
      const tier5 = engine.upgradeFactory(); // Palier 5 (12 boîtes / 18 tubes)

      expect(tier5.factoryTier).toBe(5);
      expect(tier5.incubatorSlots).toHaveLength(12);
      expect(tier5.cryoSlots).toHaveLength(18);
      expect(tier5.economy.fixedOverheadBioPerSec).toBe(8_500);
    });
  });
});

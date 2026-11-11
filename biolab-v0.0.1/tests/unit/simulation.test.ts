import { describe, expect, it } from './test-harness.ts';
import { createInitialGameState } from '../../src/core/initial-state.ts';
import { evaluateEconomySnapshot } from '../../src/systems/economy.system.ts';
import { createSimulationEngine } from '../../src/systems/simulation-engine.ts';
import type { ColonyIncubatorSlot, GameState } from '../../src/types/game-state.types.ts';

function createCustomColonySlot(
  slotIndex: number,
  strainId: string,
  growthDurationSeconds: number,
  adultLifespanSeconds: number,
  maturityRatio = 1.0
): ColonyIncubatorSlot {
  return {
    status: 'COLONY',
    slotIndex,
    strainId,
    originMediumId: 'MEDIUM_1_ORDINARY_AGAR',
    growthElapsedSeconds: growthDurationSeconds * maturityRatio,
    growthDurationSeconds,
    maturityRatio,
    isMature: maturityRatio >= 1.0,
    adultLifespanRemainingSeconds: adultLifespanSeconds,
    adultLifespanTotalSeconds: adultLifespanSeconds,
    manualInjectionCooldownSeconds: 0,
    absorbedWasteCount: 0,
    isMutated: false,
  };
}

describe('Phase 2 — Simulation de la Paillasse, Cycle Biologique, Déchets & Économie', () => {
  describe('1. État Initial & Ensemencement', () => {
    it('initialise une nouvelle partie avec 150 Bio, 0 PR, 4 boîtes vides et 1 Gélose Ordinaire offerte', () => {
      const state = createInitialGameState();
      expect(state.bio).toBe(150);
      expect(state.pr).toBe(0);
      expect(state.incubatorSlots).toHaveLength(4);
      expect(state.mediaInventory.MEDIUM_1_ORDINARY_AGAR).toBe(1);
      expect(state.economy.fixedOverheadBioPerSec).toBe(0.5);
      expect(state.economy.netBioPerSec).toBe(-0.5);
      expect(state.isUndervoltage).toBe(false);
    });

    it('utilise la Gélose Ordinaire gratuite en stock lors du premier ensemencement, puis facture 50 Bio', () => {
      const engine = createSimulationEngine({ seed: 101 });

      // 1er ensemencement : utilise le stock gratuit (150 Bio conservés)
      const afterFirstSeed = engine.seedColony({
        slotIndex: 0,
        mediumId: 'MEDIUM_1_ORDINARY_AGAR',
      });
      expect(afterFirstSeed.bio).toBe(150);
      expect(afterFirstSeed.mediaInventory.MEDIUM_1_ORDINARY_AGAR).toBe(0);
      expect(afterFirstSeed.incubatorSlots[0]?.status).toBe('COLONY');

      // 2e ensemencement : achète le milieu pour 50 Bio (150 -> 100 Bio)
      const afterSecondSeed = engine.seedColony({
        slotIndex: 1,
        mediumId: 'MEDIUM_1_ORDINARY_AGAR',
      });
      expect(afterSecondSeed.bio).toBe(100);
      expect(afterSecondSeed.incubatorSlots[1]?.status).toBe('COLONY');
      expect(afterSecondSeed.stats.totalManualSeedings).toBe(2);
    });
  });

  describe('2. Croissance Proportionnelle, Injection Manuelle & Maturité', () => {
    it('produit du Bio/s proportionnellement à la jauge de maturité (ex: 30 % pousse -> 30 % Bio/s)', () => {
      const baseState = createInitialGameState();
      // Bacillus subtilis : multiplicateur 1.0, pousse 20s -> à 30% de maturité = 0.3 Bio/s brut
      const colonyAt30Percent = createCustomColonySlot(0, 'BACILLUS_SUBTILIS', 20, 2100, 0.3);
      const customState: GameState = {
        ...baseState,
        incubatorSlots: [
          colonyAt30Percent,
          baseState.incubatorSlots[1]!,
          baseState.incubatorSlots[2]!,
          baseState.incubatorSlots[3]!,
        ],
      };

      const snapshot = evaluateEconomySnapshot(customState);
      expect(snapshot.grossBioPerSec).toBe(0.3);
      // Net = 0.3 - 0.5 (charges fixes Niv 1) = -0.2 Bio/s
      expect(snapshot.netBioPerSec).toBe(-0.2);
    });

    it('applique l’injection manuelle de nutriments (5 Bio, cooldown 10s, +5 % ou +10 % avec Rhodospirillum rubrum)', () => {
      const baseState = createInitialGameState();
      const growingBacillus = createCustomColonySlot(0, 'BACILLUS_SUBTILIS', 20, 2100, 0.2);
      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          incubatorSlots: [
            growingBacillus,
            baseState.incubatorSlots[1]!,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });

      // Injection standard : -5 Bio, +5 % maturité (0.20 -> 0.25), cooldown 10s
      const afterInject = engine.injectNutrients(0);
      expect(afterInject.bio).toBe(145);
      const slot0 = afterInject.incubatorSlots[0];
      expect(slot0?.status).toBe('COLONY');
      if (slot0?.status === 'COLONY') {
        expect(slot0.maturityRatio).toBeCloseTo(0.25, 4);
        expect(slot0.manualInjectionCooldownSeconds).toBe(10);
      }

      // Avec Rhodospirillum rubrum sur le plateau : double le gain (+10 %)
      const rhodoSlot = createCustomColonySlot(1, 'RHODOSPIRILLUM_RUBRUM', 45, 1560, 0.5);
      const engineWithRhodo = createSimulationEngine({
        initialState: {
          ...baseState,
          incubatorSlots: [
            growingBacillus,
            rhodoSlot,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });
      const afterRhodoInject = engineWithRhodo.injectNutrients(0);
      const boostedSlot0 = afterRhodoInject.incubatorSlots[0];
      if (boostedSlot0?.status === 'COLONY') {
        expect(boostedSlot0.maturityRatio).toBeCloseTo(0.3, 4);
      }
    });
  });

  describe('3. Sénescence, Bio-Déchets, Toxines (60s), Autoclave Flash & Bioréacteur (90s)', () => {
    it('transforme une colonie en déchet à la fin de sa vie adulte et déclenche la toxicité (-25 %) après 60s', () => {
      const baseState = createInitialGameState();
      // Slot 0 : colonie en fin de vie (il reste 2 secondes de vie adulte)
      const dyingBacillus = createCustomColonySlot(0, 'BACILLUS_SUBTILIS', 20, 2, 1.0);
      // Slot 1 (voisin direct) : Lactobacillus fermenti mature (multiplicateur 3.2 -> 3.2 Bio/s)
      const neighborLacto = createCustomColonySlot(1, 'LACTOBACILLUS_FERMENTI', 50, 1680, 1.0);

      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          incubatorSlots: [
            dyingBacillus,
            neighborLacto,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });

      // Avance de 5 secondes : Slot 0 est mort depuis 3 secondes (< 60s : pas encore toxique)
      const afterDeath = engine.tick(5);
      const wasteSlot = afterDeath.incubatorSlots[0];
      expect(wasteSlot?.status).toBe('WASTE');
      if (wasteSlot?.status === 'WASTE') {
        expect(wasteSlot.isToxic).toBe(false);
      }
      // Le voisin produit toujours 100 % de ses 3.2 Bio/s
      expect(afterDeath.economy.slotEffectiveBioPerSec[1]).toBe(3.2);

      // Avance de 60 secondes supplémentaires : le déchet dépasse 60s et devient toxique (-25 % sur le voisin)
      const after60s = engine.tick(60);
      const toxicSlot = after60s.incubatorSlots[0];
      if (toxicSlot?.status === 'WASTE') {
        expect(toxicSlot.isToxic).toBe(true);
      }
      // 3.2 * 0.75 = 2.4 Bio/s
      expect(after60s.economy.slotEffectiveBioPerSec[1]).toBe(2.4);

      // Test de l'Autoclave Flash sur le déchet de Bacillus subtilis (coût = 15 * sqrt(1.0) = 15 Bio)
      const bioBeforeAutoclave = after60s.bio;
      const afterAutoclave = engine.flashAutoclaveWaste(0);
      expect(afterAutoclave.incubatorSlots[0]?.status).toBe('EMPTY');
      expect(afterAutoclave.bio).toBeCloseTo(bioBeforeAutoclave - 15, 2);
      // Le voisin retrouve immédiatement ses 3.2 Bio/s
      expect(afterAutoclave.economy.slotEffectiveBioPerSec[1]).toBe(3.2);
    });

    it('gère le Bioréacteur de recyclage en 90s avec restitution de 10 % du coût du milieu', () => {
      const baseState = createInitialGameState();
      const dyingBacillus = createCustomColonySlot(0, 'BACILLUS_SUBTILIS', 20, 1, 1.0);
      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          incubatorSlots: [
            dyingBacillus,
            baseState.incubatorSlots[1]!,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });

      engine.tick(2); // La colonie meurt
      const afterStartRecycle = engine.recycleWasteInBioreactor(0);
      expect(afterStartRecycle.incubatorSlots[0]?.status).toBe('EMPTY');
      expect(afterStartRecycle.bioreactorTasks).toHaveLength(1);
      expect(afterStartRecycle.bioreactorTasks[0]?.remainingSeconds).toBe(90);

      // Avance de 90s : la tâche se termine et restitue 10 % de 50 Bio = 5 Bio
      // Pendant 90s sans colonie, les charges fixes de 0.5 Bio/s ont consommé 45 Bio
      const bioBefore90s = afterStartRecycle.bio;
      const after90s = engine.tick(90);
      expect(after90s.bioreactorTasks).toHaveLength(0);
      expect(after90s.stats.totalRecycledWaste).toBe(1);
      expect(after90s.bio).toBeCloseTo(bioBefore90s - 45 + 5, 2);
    });
  });

  describe('4. Synergies 1D, Étouffement de Niche & Sous-Tension (Arbitrages #8 et #9)', () => {
    it('applique l’Étouffement de Niche (1/sqrt(N)) et les synergies d’adjacence 1D (Pseudomonas, Actinomyces)', () => {
      const baseState = createInitialGameState();
      // 4 Bacillus subtilis matures identiques -> chacun produit 1.0 * (1 / sqrt(4)) = 0.5 Bio/s, total = 2.0 Bio/s
      const fourIdenticalState: GameState = {
        ...baseState,
        incubatorSlots: [
          createCustomColonySlot(0, 'BACILLUS_SUBTILIS', 20, 1000, 1.0),
          createCustomColonySlot(1, 'BACILLUS_SUBTILIS', 20, 1000, 1.0),
          createCustomColonySlot(2, 'BACILLUS_SUBTILIS', 20, 1000, 1.0),
          createCustomColonySlot(3, 'BACILLUS_SUBTILIS', 20, 1000, 1.0),
        ],
      };
      const monoSnapshot = evaluateEconomySnapshot(fourIdenticalState);
      expect(monoSnapshot.grossBioPerSec).toBe(2.0);

      // Synergie 1D : Slot 0 = Pseudomonas fluorescens (x28, donne +20 % aux voisins)
      // Slot 1 = Actinomyces bovis (x9.5, mais aligne son multiplicateur sur son voisin le plus rentable -> x28, et reçoit +20 % de Pseudomonas = 28 * 1.2 = 33.6 Bio/s)
      const synergyState: GameState = {
        ...baseState,
        incubatorSlots: [
          createCustomColonySlot(0, 'PSEUDOMONAS_FLUORESCENS', 360, 1000, 1.0),
          createCustomColonySlot(1, 'ACTINOMYCES_BOVIS', 150, 1000, 1.0),
          baseState.incubatorSlots[2]!,
          baseState.incubatorSlots[3]!,
        ],
      };
      const synergySnapshot = evaluateEconomySnapshot(synergyState);
      expect(synergySnapshot.slotEffectiveBioPerSec[0]).toBe(28.0);
      expect(synergySnapshot.slotEffectiveBioPerSec[1]).toBe(33.6);
      expect(synergySnapshot.grossBioPerSec).toBe(61.6);
    });

    it('déclenche la Sous-Tension uniquement quand Bio === 0 ET flux net < 0, divisant la pousse par 2 (sauf Clostridium butyricum)', () => {
      const baseState = createInitialGameState();
      // Deux colonies en début de pousse (0% maturité) : Slot 0 = Bacillus subtilis (20s), Slot 1 = Clostridium butyricum (150s)
      // Trésorerie initiale basse : 1 Bio. Charges fixes : 0.5 Bio/s.
      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          bio: 1.0,
          incubatorSlots: [
            createCustomColonySlot(0, 'BACILLUS_SUBTILIS', 20, 1000, 0),
            createCustomColonySlot(1, 'CLOSTRIDIUM_BUTYRICUM', 150, 1000, 0),
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });

      // Tant que Bio > 0, pas de sous-tension même si le flux net est négatif (-0.5 Bio/s)
      const after1s = engine.tick(1);
      expect(after1s.bio).toBeGreaterThan(0);
      expect(after1s.isUndervoltage).toBe(false);

      // On vide la réserve de Bio et on place une colonie à 0% sur un palier aux charges élevées (Niv 3 : 140 Bio/s)
      const engineUndervoltage = createSimulationEngine({
        initialState: {
          ...baseState,
          bio: 0,
          factoryTier: 3,
          isUndervoltage: true,
          incubatorSlots: [
            createCustomColonySlot(0, 'BACILLUS_SUBTILIS', 20, 1000, 0),
            createCustomColonySlot(1, 'CLOSTRIDIUM_BUTYRICUM', 150, 1000, 0),
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });

      // En 10 secondes réelles sous-tension :
      // - Bacillus subtilis pousse à 50 % de vitesse -> +5s de pousse (5 / 20 = 25 % de maturité)
      // - Clostridium butyricum est immunisé -> +10s de pousse (10 / 150)
      const after10sUndervoltage = engineUndervoltage.tick(10);
      const slotBacillus = after10sUndervoltage.incubatorSlots[0];
      const slotClostridium = after10sUndervoltage.incubatorSlots[1];

      if (slotBacillus?.status === 'COLONY' && slotClostridium?.status === 'COLONY') {
        expect(slotBacillus.growthElapsedSeconds).toBeCloseTo(5, 2);
        expect(slotBacillus.maturityRatio).toBeCloseTo(0.25, 3);
        expect(slotClostridium.growthElapsedSeconds).toBeCloseTo(10, 2);
      }
    });
  });
});

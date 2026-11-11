import { describe, expect, it } from './test-harness.ts';
import { createInitialGameState } from '../../src/core/initial-state.ts';
import { TECH_TREE } from '../../src/data/tech.data.ts';
import { createSimulationEngine } from '../../src/systems/simulation-engine.ts';
import type { ColonyIncubatorSlot } from '../../src/types/game-state.types.ts';
import type { ContractBoardSlot } from '../../src/types/meta.types.ts';

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

describe('Phase 4 — Systèmes Dynamiques & Méta (Trophées, Micro-Événements, Contrats & Journal)', () => {
  describe('1. Armoire des Distinctions (16 Trophées & Bonus Permanents)', () => {
    it('débloque automatiquement les trophées (#02, #03, #08, #15, #16) et applique leurs bonus', () => {
      const baseState = createInitialGameState();
      // On place Deinococcus Genesis (Secret, x5000 -> décuple à x50 000 Bio/s !) et on donne 10 000 Bio
      const genesis = createMatureColony(0, 'DEINOCOCCUS_GENESIS', 3000, 300);

      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          bio: 500_000,
          pr: 300_000,
          unlockedTechIds: TECH_TREE.map((t) => t.id),
          incubatorSlots: [
            genesis,
            baseState.incubatorSlots[1]!,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
          stats: {
            ...baseState.stats,
            totalBioEarned: 15_000,
            discoveredStrainIds: ['DEINOCOCCUS_GENESIS'],
          },
        },
      });

      // Passage au Palier 2 d'usine -> déclenche l'évaluation des trophées
      const afterUpgrade = engine.upgradeFactory();

      // #02 (10 000 Bio cumulés), #03 (Palier 2), #08 (Production nette >= 500 Bio/s),
      // #15 (100 % des 12 technologies PR), #16 (Organisme Secret isolé)
      expect(afterUpgrade.unlockedTrophyIds.includes('TROPHY_02')).toBe(true);
      expect(afterUpgrade.unlockedTrophyIds.includes('TROPHY_03')).toBe(true);
      expect(afterUpgrade.unlockedTrophyIds.includes('TROPHY_08')).toBe(true);
      expect(afterUpgrade.unlockedTrophyIds.includes('TROPHY_15')).toBe(true);
      expect(afterUpgrade.unlockedTrophyIds.includes('TROPHY_16')).toBe(true);

      // Vérifie l'effet du Trophée #02 : la Gélose Ordinaire coûte désormais 45 Bio (au lieu de 50 Bio)
      // On vide d'abord le stock gratuit en ensemençant le slot 1, puis on ensemence le slot 2
      engine.seedColony({ slotIndex: 1, mediumId: 'MEDIUM_1_ORDINARY_AGAR' });
      const bioBeforePaidSeed = engine.getState().bio;
      const afterPaidSeed = engine.seedColony({
        slotIndex: 2,
        mediumId: 'MEDIUM_1_ORDINARY_AGAR',
      });
      expect(afterPaidSeed.bio).toBe(bioBeforePaidSeed - 45);
    });
  });

  describe('2. Micro-Événements Bénéfiques (B1-B10) & Micro-Incidents (M1-M5)', () => {
    it('active et résout les événements bénéfiques (B4 +10 % Bio/s, B5 financement, B7 0 charges fixes)', () => {
      const baseState = createInitialGameState();
      const bacillus = createMatureColony(0, 'BACILLUS_SUBTILIS', 20, 2100);
      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          incubatorSlots: [
            bacillus,
            baseState.incubatorSlots[1]!,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
        },
      });

      // B4 : Bulle de Fermentation -> clic donne +10 % Bio/s pendant 45s (1.0 -> 1.1 Bio/s)
      engine.triggerBenchEvent('B4');
      const afterB4Click = engine.clickActiveBenchEvent();
      expect(afterB4Click.activeBenchEvent).toBe(null);
      expect(afterB4Click.benchBuffs.b4BioBoostRemainingSeconds).toBe(45);
      expect(afterB4Click.economy.grossBioPerSec).toBe(1.1);

      // B7 : Lecture Aiguille Stable -> clic annule les charges fixes d'usine pendant 60s
      engine.triggerBenchEvent('B7');
      const afterB7Click = engine.clickActiveBenchEvent();
      expect(afterB7Click.economy.fixedOverheadBioPerSec).toBe(0);

      // B5 : Visite du Facteur Scientifique -> +50 Bio au Palier 1
      const bioBeforeB5 = afterB7Click.bio;
      engine.triggerBenchEvent('B5');
      const afterB5Click = engine.clickActiveBenchEvent();
      expect(afterB5Click.bio).toBe(bioBeforeB5 + 50);
    });

    it('exige 3 clics pour résoudre l’incident M2 (Givre Épais) et inflige le malus si un incident expire', () => {
      const engine = createSimulationEngine();

      // M2 : Givre Épais sur Manomètre Cryo (3 clics requis, 40s imparties)
      engine.triggerBenchEvent('M2');
      engine.clickActiveBenchEvent(); // 1/3
      expect(engine.getState().activeBenchEvent?.currentClicks).toBe(1);
      engine.clickActiveBenchEvent(); // 2/3
      expect(engine.getState().activeBenchEvent?.currentClicks).toBe(2);
      const afterResolvedM2 = engine.clickActiveBenchEvent(); // 3/3 -> résolu sans malus !
      expect(afterResolvedM2.activeBenchEvent).toBe(null);
      expect(afterResolvedM2.benchBuffs.m2CryoSurchargeRemainingSeconds).toBe(0);

      // M1 : Bouchon de Suie (45s imparties). Si le joueur l'ignore pendant 46s -> malus de 120s
      engine.triggerBenchEvent('M1');
      const afterIgnoredM1 = engine.tick(46);
      expect(afterIgnoredM1.activeBenchEvent).toBe(null);
      expect(afterIgnoredM1.benchBuffs.m1SlowGrowthPenaltyRemainingSeconds).toBeGreaterThan(118);
    });
  });

  describe('3. Contrats Dynamiques Procéduraux (Livraison, Extraction 90s & Renouvellement 120s)', () => {
    it('valide un contrat de Prélèvement Définitif avec bonus médical (+12 % Staphylococcus aureus) et renouvelle le slot après 120s', () => {
      const baseState = createInitialGameState();
      const targetBacillus = createMatureColony(0, 'BACILLUS_SUBTILIS', 20, 2100);
      const staphAureus = createMatureColony(1, 'STAPHYLOCOCCUS_AUREUS', 165, 1260);

      const customContractSlot0: ContractBoardSlot = {
        status: 'ACTIVE',
        slotIndex: 0,
        contract: {
          id: 'CONTRACT_TEST_1',
          slotIndex: 0,
          sponsorId: 'REGIONAL_HOSPITALS',
          objectiveType: 'DEFINITIVE_SAMPLING',
          targetStrainId: 'BACILLUS_SUBTILIS',
          extractionElapsedSeconds: 0,
          extractionRequiredSeconds: 90,
          rewardBio: 100,
          rewardPr: 5,
        },
      };

      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          incubatorSlots: [
            targetBacillus,
            staphAureus,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
          contractBoard: [
            customContractSlot0,
            baseState.contractBoard[1],
            baseState.contractBoard[2],
          ],
        },
      });

      const bioBefore = engine.getState().bio;
      // Validation du contrat 0 : consomme la boîte 0, octroie 100 Bio * 1.12 (Staphylococcus aureus) = 112 Bio et 5 PR
      const afterValidate = engine.validateContract(0, 0);
      expect(afterValidate.incubatorSlots[0]?.status).toBe('EMPTY');
      expect(afterValidate.bio).toBe(bioBefore + 112);
      expect(afterValidate.pr).toBe(5);
      expect(afterValidate.contractBoard[0].status).toBe('RENEWING');

      // Après 120s, un nouveau contrat procédural est généré sur l'emplacement 0
      const after120s = engine.tick(120);
      expect(after120s.contractBoard[0].status).toBe('ACTIVE');
    });

    it('fait progresser et valide une Extraction Métabolique Continue (90s) sans consommer la colonie', () => {
      const baseState = createInitialGameState();
      const matureBacillus = createMatureColony(0, 'BACILLUS_SUBTILIS', 20, 2100);

      const extractionSlot: ContractBoardSlot = {
        status: 'ACTIVE',
        slotIndex: 1,
        contract: {
          id: 'CONTRACT_EXTRACTION_90',
          slotIndex: 1,
          sponsorId: 'MILITARY_AEROSPACE_AGENCIES',
          objectiveType: 'CONTINUOUS_METABOLIC_EXTRACTION',
          targetStrainId: 'BACILLUS_SUBTILIS',
          extractionElapsedSeconds: 0,
          extractionRequiredSeconds: 90,
          rewardBio: 50,
          rewardPr: 25,
        },
      };

      const engine = createSimulationEngine({
        initialState: {
          ...baseState,
          incubatorSlots: [
            matureBacillus,
            baseState.incubatorSlots[1]!,
            baseState.incubatorSlots[2]!,
            baseState.incubatorSlots[3]!,
          ],
          contractBoard: [
            baseState.contractBoard[0],
            extractionSlot,
            baseState.contractBoard[2],
          ],
        },
      });

      engine.tick(90);
      const afterValidation = engine.validateContract(1);
      // La colonie est conservée sur la paillasse !
      expect(afterValidation.incubatorSlots[0]?.status).toBe('COLONY');
      expect(afterValidation.pr).toBe(25);
    });
  });

  describe('4. Journal de Bord Manuscrit (Encre d’Archivage, Codex & Notes Sécurisées)', () => {
    it('rédige automatiquement des entrées datées lors des découvertes et assainit les notes libres du chercheur', () => {
      const engine = createSimulationEngine({ seed: 2026 });

      // Ensemencement d'une première boîte -> nouvelle espèce découverte -> entrée automatique dans les Annales
      const afterSeed = engine.seedColony({
        slotIndex: 0,
        mediumId: 'MEDIUM_1_ORDINARY_AGAR',
      });
      expect(afterSeed.logbook.entries.length).toBeGreaterThanOrEqual(1);
      expect(afterSeed.logbook.entries[0]?.category).toBe('DISCOVERY');
      expect(afterSeed.logbook.entries[0]?.timestampLabelFr).toMatch(/^\[12 Octobre/);

      // Saisie de notes libres avec tentative d'injection de chevrons HTML -> assainissement automatique
      const afterNotes = engine.setResearcherNotes(
        'Garder 2 Cryo-tubes <script>alert(1)</script> pour ce soir'
      );
      expect(afterNotes.logbook.freeNotesText).toBe(
        'Garder 2 Cryo-tubes scriptalert(1)/script pour ce soir'
      );
    });
  });
});

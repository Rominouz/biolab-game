import { createInitialGameState } from '../../src/core/initial-state.ts';
import {
  BioLabStorageService,
  exportSaveToJson,
  importSaveFromJson,
} from '../../src/storage/indexeddb.service.ts';
import { createSimulationEngine } from '../../src/systems/simulation-engine.ts';
import { describe, expect, it } from './test-harness.ts';

describe('Phase 7 — Parcours Joueur Complet & Recette Globale BIOLAB', () => {
  it('exécute un scénario de jeu complet de A à Z (démarrage -> ensemencement -> croissance -> cryo -> division -> contrats -> usine -> sauvegarde/restauration)', async () => {
    // 1. Initialisation d'une nouvelle partie (Arbitrage #2)
    const storage = new BioLabStorageService();
    const initial = createInitialGameState(1984);
    expect(initial.bio).toBe(150);
    expect(initial.pr).toBe(0);
    expect(initial.factoryTier).toBe(1);
    expect(initial.incubatorSlots.length).toBe(4);
    expect(initial.cryoSlots.length).toBe(2);
    expect(initial.mediaInventory.MEDIUM_1_ORDINARY_AGAR).toBe(1);

    const engine = createSimulationEngine({
      seed: 1984,
      initialState: initial,
    });

    // 2. Premier ensemencement dans la boîte 0 (utilise la gélose offerte)
    engine.seedColony({ slotIndex: 0, mediumId: 'MEDIUM_1_ORDINARY_AGAR' });
    let state = engine.getState();
    expect(state.mediaInventory.MEDIUM_1_ORDINARY_AGAR).toBe(0);
    expect(state.bio).toBe(150); // Gratuit car en stock
    expect(state.incubatorSlots[0]?.status).toBe('COLONY');

    // 3. Injection manuelle de nutriments pendant la croissance (+5% maturité)
    engine.injectNutrients(0);
    state = engine.getState();
    expect(state.bio).toBe(145); // Coût : 5 Bio
    expect((state.incubatorSlots[0] as { maturityRatio: number }).maturityRatio).toBeGreaterThanOrEqual(0.05);

    // 4. Avancement du temps jusqu'à maturité complète
    state = engine.tick(40);
    const slot0Mature = state.incubatorSlots[0];
    expect(slot0Mature?.status).toBe('COLONY');
    if (slot0Mature?.status === 'COLONY') {
      expect(slot0Mature.isMature).toBe(true);
      expect(slot0Mature.maturityRatio).toBe(1.0);
    }

    // 5. Cryogénisation : transfert de la boîte 0 vers le tube 0 (fige le vieillissement)
    engine.freezeColony(0, 0);
    state = engine.getState();
    expect(state.incubatorSlots[0]?.status).toBe('EMPTY');
    expect(state.cryoSlots[0]?.status).toBe('FROZEN');

    // 6. Décongélation : retour du tube 0 vers la boîte 0
    engine.thawColony(0, 0);
    state = engine.getState();
    expect(state.incubatorSlots[0]?.status).toBe('COLONY');
    expect(state.cryoSlots[0]?.status).toBe('EMPTY');

    // 7. Deuxième ensemencement (facturé au prix catalogue de 50 Bio)
    engine.seedColony({ slotIndex: 1, mediumId: 'MEDIUM_1_ORDINARY_AGAR' });
    state = engine.getState();
    expect(state.incubatorSlots[1]?.status).toBe('COLONY');

    // 8. Multiplication cellulaire : Scissiparité de la boîte 0 vers la boîte vide 2
    state = {
      ...state,
      bio: 50_000,
      pr: 10_000,
    };
    const engineMulti = createSimulationEngine({ seed: 1984, initialState: state });
    engineMulti.scissiparity(0, 2);
    state = engineMulti.getState();
    expect(state.incubatorSlots[2]?.status).toBe('COLONY');

    // 9. Avancement pour amener la nouvelle colonie issue de scissiparité à maturité
    engineMulti.tick(40);

    // 10. Conjugaison d'hybridation : croise les boîtes 0 et 2 vers la boîte 0
    // (consomme les parents et libère une boîte)
    engineMulti.conjugate([0, 2], 0);
    state = engineMulti.getState();
    expect(state.incubatorSlots[0]?.status).toBe('COLONY');
    expect(state.incubatorSlots[2]?.status).toBe('EMPTY');

    // 11. Extension d'infrastructure : passage au Palier 2 (Annexe Universitaire)
    state = {
      ...state,
      bio: 200_000,
      pr: 1_000,
    };
    const engineFactory = createSimulationEngine({ seed: 1984, initialState: state });
    engineFactory.upgradeFactory();
    state = engineFactory.getState();
    expect(state.factoryTier).toBe(2);
    expect(state.incubatorSlots.length).toBe(6); // 4 -> 6 boîtes
    expect(state.cryoSlots.length).toBe(4); // 2 -> 4 tubes

    // 12. Recherche Technologique PR : déblocage de T1
    engineFactory.unlockTechnology('T1');
    state = engineFactory.getState();
    expect(state.unlockedTechIds.includes('T1')).toBe(true);

    // 13. Interaction avec Micro-Événement de Paillasse
    engineFactory.triggerBenchEvent('B4');
    state = engineFactory.getState();
    expect(state.activeBenchEvent?.eventId).toBe('B4');
    engineFactory.clickActiveBenchEvent();
    state = engineFactory.getState();
    expect(state.benchBuffs.b4BioBoostRemainingSeconds).toBe(45);

    // 14. Validation d'un contrat procédural (Prélèvement Définitif)
    const targetStrain = 'BACILLUS_SUBTILIS';
    const activeContractSlot = {
      status: 'ACTIVE' as const,
      slotIndex: 0 as const,
      contract: {
        id: 'CONTRACT_TEST_1',
        slotIndex: 0 as const,
        sponsorId: 'REGIONAL_HOSPITALS' as const,
        objectiveType: 'DEFINITIVE_SAMPLING' as const,
        targetStrainId: targetStrain,
        extractionElapsedSeconds: 0,
        extractionRequiredSeconds: 0,
        rewardBio: 120,
        rewardPr: 3,
      },
    };
    state = {
      ...state,
      contractBoard: [activeContractSlot, state.contractBoard[1]!, state.contractBoard[2]!],
      incubatorSlots: [
        ...state.incubatorSlots.slice(0, 5),
        {
          status: 'COLONY',
          slotIndex: 5,
          strainId: targetStrain,
          originMediumId: 'MEDIUM_1_ORDINARY_AGAR',
          growthElapsedSeconds: 30,
          growthDurationSeconds: 30,
          maturityRatio: 1.0,
          isMature: true,
          adultLifespanRemainingSeconds: 60,
          adultLifespanTotalSeconds: 60,
          manualInjectionCooldownSeconds: 0,
          absorbedWasteCount: 0,
          isMutated: false,
        },
      ],
    };
    const engineContract = createSimulationEngine({ seed: 1984, initialState: state });
    engineContract.validateContract(0, 5);
    state = engineContract.getState();
    expect(state.stats.totalContractsCompleted).toBe(1);

    // 15. Journal de Bord & Codex d'Hybridation
    engineFactory.setResearcherNotes('Recette de conjugaison concluante.');
    state = engineFactory.getState();
    expect(state.logbook.freeNotesText).toBe('Recette de conjugaison concluante.');
    expect(state.logbook.hybridizationCodex.length).toBeGreaterThan(0);
    expect(state.logbook.entries.length).toBeGreaterThan(0);

    // 16. Persistance IndexedDB & Export/Import JSON sécurisé
    const saveRes = await storage.saveGame(state, 'autosave');
    expect(saveRes.ok).toBe(true);

    const exportRes = exportSaveToJson(state, 'autosave');
    expect(exportRes.ok).toBe(true);
    if (!exportRes.ok) return;

    const importRes = importSaveFromJson(exportRes.value);
    expect(importRes.ok).toBe(true);
    if (!importRes.ok) return;

    expect(importRes.value.factoryTier).toBe(2);
    expect(importRes.value.incubatorSlots.length).toBe(6);
    expect(importRes.value.unlockedTechIds.includes('T1')).toBe(true);
    expect(importRes.value.logbook.freeNotesText).toBe('Recette de conjugaison concluante.');
    expect(importRes.value.economy.netBioPerSec).toBe(state.economy.netBioPerSec);
  });
});

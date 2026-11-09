import { createInitialGameState } from '../../src/core/initial-state.ts';
import {
  BioLabStorageService,
  exportSaveToJson,
  importSaveFromJson,
} from '../../src/storage/indexeddb.service.ts';
import {
  computeStateChecksum,
  validateGameState,
  validateSaveEnvelope,
} from '../../src/storage/validator.ts';
import { createSimulationEngine } from '../../src/systems/simulation-engine.ts';
import { describe, expect, it } from './test-harness.ts';

describe('Phase 5 — Sauvegarde Sécurisée IndexedDB & Validateur de Schéma', () => {
  it('sauvegarde, liste, charge et supprime une partie complète via BioLabStorageService (fallback mémoire Node.js)', async () => {
    const storage = new BioLabStorageService();
    const initial = createInitialGameState(1984);
    const engine = createSimulationEngine({
      seed: 1984,
      initialState: {
        ...initial,
        bio: 200_000,
        pr: 1_000,
      },
    });

    // Évolution de la partie : Palier 2, Tech T1, Ensemencement, Pousse, Cryo, Notes
    engine.upgradeFactory();
    engine.unlockTechnology('T1');
    engine.seedColony({ slotIndex: 0, mediumId: 'MEDIUM_1_ORDINARY_AGAR' });
    engine.tick(35);
    engine.freezeColony(0, 0);
    const state = engine.setResearcherNotes('Observation stable sur la souche n°1.');

    const saveRes = await storage.saveGame(state, 'manual_1');
    expect(saveRes.ok).toBe(true);

    const summaries = await storage.listSaves();
    expect(summaries.length).toBe(1);
    expect(summaries[0]?.slotId).toBe('manual_1');
    expect(summaries[0]?.factoryTier).toBe(2);

    const loadRes = await storage.loadGame('manual_1');
    expect(loadRes.ok).toBe(true);
    if (loadRes.ok) {
      expect(loadRes.value.factoryTier).toBe(2);
      expect(loadRes.value.unlockedTechIds.includes('T1')).toBe(true);
      expect(loadRes.value.cryoSlots[0]?.status).toBe('FROZEN');
      expect(loadRes.value.logbook.freeNotesText).toBe('Observation stable sur la souche n°1.');
    }

    await storage.deleteSave('manual_1');
    const afterDelete = await storage.loadGame('manual_1');
    expect(afterDelete.ok).toBe(false);
  });

  it("exporte et réimporte une sauvegarde JSON signée et recalcule l'économie automatiquement", () => {
    const engine = createSimulationEngine({ seed: 42 });
    engine.seedColony({ slotIndex: 0, mediumId: 'MEDIUM_1_ORDINARY_AGAR' });
    const state = engine.tick(35);

    const exportRes = exportSaveToJson(state, 'autosave');
    expect(exportRes.ok).toBe(true);
    if (!exportRes.ok) return;

    const importRes = importSaveFromJson(exportRes.value);
    expect(importRes.ok).toBe(true);
    if (!importRes.ok) return;

    expect(importRes.value.bio).toBe(state.bio);
    expect(importRes.value.economy.netBioPerSec).toBe(state.economy.netBioPerSec);
    expect(importRes.value.incubatorSlots[0]?.status).toBe('COLONY');
  });

  it('rejette un JSON dont le solde Bio a été falsifié manuellement (échec du checksum FNV-1a)', () => {
    const state = createInitialGameState(1984);
    const exportRes = exportSaveToJson(state, 'autosave');
    expect(exportRes.ok).toBe(true);
    if (!exportRes.ok) return;

    // Falsification manuelle du solde Bio dans le texte JSON sans mettre à jour le checksum
    const tamperedJson = exportRes.value.replace('"bio": 150', '"bio": 9999999');
    const importRes = importSaveFromJson(tamperedJson);
    expect(importRes.ok).toBe(false);
    if (!importRes.ok) {
      expect(importRes.errorCode).toBe('CHECKSUM_MISMATCH');
    }
  });

  it('rejette les valeurs numériques invalides (NaN, Infinity, valeurs négatives, ratios hors bornes)', () => {
    const base = createInitialGameState(1984);

    const nanBio = validateGameState({ ...base, bio: Number.NaN });
    expect(nanBio.ok).toBe(false);
    if (!nanBio.ok) expect(nanBio.errorCode).toBe('INVALID_NUMBER');

    const infPr = validateGameState({ ...base, pr: Number.POSITIVE_INFINITY });
    expect(infPr.ok).toBe(false);
    if (!infPr.ok) expect(infPr.errorCode).toBe('INVALID_NUMBER');

    const negBio = validateGameState({ ...base, bio: -0.01 });
    expect(negBio.ok).toBe(false);
    if (!negBio.ok) expect(negBio.errorCode).toBe('INVALID_NUMBER');

    // Ratio de maturité > 1.0 dans une colonie
    const engine = createSimulationEngine({ seed: 7 });
    const seeded = engine.seedColony({ slotIndex: 0, mediumId: 'MEDIUM_1_ORDINARY_AGAR' });
    const slot0 = seeded.incubatorSlots[0];
    if (slot0?.status === 'COLONY') {
      const invalidSlot = { ...slot0, maturityRatio: 1.5 };
      const badMaturity = validateGameState({
        ...seeded,
        incubatorSlots: [invalidSlot, ...seeded.incubatorSlots.slice(1)],
      });
      expect(badMaturity.ok).toBe(false);
      if (!badMaturity.ok) expect(badMaturity.errorCode).toBe('OUT_OF_BOUNDS');
    }
  });

  it('rejette les identifiants référentiels inconnus (souche, milieu, technologie, trophée, palier usine)', () => {
    const base = createInitialGameState(1984);

    // Palier d'usine inexistant
    const badTier = validateGameState({ ...base, factoryTier: 99 as unknown as 1 });
    expect(badTier.ok).toBe(false);
    if (!badTier.ok) expect(badTier.errorCode).toBe('OUT_OF_BOUNDS');

    // Technologie forgée
    const badTech = validateGameState({
      ...base,
      unlockedTechIds: ['TECH_HACK_99' as unknown as 'T1'],
    });
    expect(badTech.ok).toBe(false);
    if (!badTech.ok) expect(badTech.errorCode).toBe('UNKNOWN_IDENTIFIER');

    // Trophée forgé
    const badTrophy = validateGameState({
      ...base,
      unlockedTrophyIds: ['TROPHY_99' as unknown as 'TROPHY_01'],
    });
    expect(badTrophy.ok).toBe(false);
    if (!badTrophy.ok) expect(badTrophy.errorCode).toBe('UNKNOWN_IDENTIFIER');

    // Souche forgée dans discoveredStrainIds
    const badStrain = validateGameState({
      ...base,
      stats: {
        ...base.stats,
        discoveredStrainIds: ['UNKNOWN_VIRUS_X'],
      },
    });
    expect(badStrain.ok).toBe(false);
    if (!badStrain.ok) expect(badStrain.errorCode).toBe('UNKNOWN_IDENTIFIER');
  });

  it('rejette toute incohérence de capacité physique (incubateurs, cryo-tubes, tableau de contrats)', () => {
    const base = createInitialGameState(1984);

    // Trop d'incubateurs pour le Palier 1 (attendu 4)
    const wrongIncubators = validateGameState({
      ...base,
      incubatorSlots: [...base.incubatorSlots, { status: 'EMPTY', slotIndex: 4 }],
    });
    expect(wrongIncubators.ok).toBe(false);
    if (!wrongIncubators.ok) expect(wrongIncubators.errorCode).toBe('CAPACITY_MISMATCH');

    // Trop de cryo-tubes pour le Palier 1 sans bonus Coelicolor (attendu 2)
    const wrongCryo = validateGameState({
      ...base,
      cryoSlots: [...base.cryoSlots, { status: 'EMPTY', tubeIndex: 2 }],
    });
    expect(wrongCryo.ok).toBe(false);
    if (!wrongCryo.ok) expect(wrongCryo.errorCode).toBe('CAPACITY_MISMATCH');
  });

  it('bloque les tentatives de pollution de prototype (__proto__) et nettoie les balises XSS dans le journal', () => {
    const maliciousJson =
      '{"magic":"BIOLAB_SAVE","schemaVersion":1,"__proto__":{"isAdmin":true},"state":{}}';
    const protoRes = importSaveFromJson(maliciousJson);
    expect(protoRes.ok).toBe(false);
    if (!protoRes.ok) {
      expect(protoRes.errorCode).toBe('PROTOTYPE_POLLUTION_DETECTED');
    }

    // Injection de balises HTML dans le journal de bord d'une enveloppe signée
    const base = createInitialGameState(1984);
    const stateWithRawHtml: typeof base = {
      ...base,
      logbook: {
        ...base.logbook,
        freeNotesText: '<script>evil()</script>Notes légitimes',
      },
    };
    const checksum = computeStateChecksum(stateWithRawHtml);
    const envelopeRes = validateSaveEnvelope(
      {
        magic: 'BIOLAB_SAVE',
        schemaVersion: 1,
        savedAtIso: '2026-10-12T14:22:00.000Z',
        slotId: 'autosave',
        checksum,
        state: stateWithRawHtml,
      },
      { verifyChecksum: false }
    );
    expect(envelopeRes.ok).toBe(true);
    if (envelopeRes.ok) {
      expect(envelopeRes.value.state.logbook.freeNotesText.includes('<')).toBe(false);
      expect(envelopeRes.value.state.logbook.freeNotesText.includes('>')).toBe(false);
      expect(envelopeRes.value.state.logbook.freeNotesText).toBe('scriptevil()/scriptNotes légitimes');
    }
  });
});

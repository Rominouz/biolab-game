import { describe, expect, it } from './test-harness.ts';
import {
  BENCH_EVENTS,
  BENCH_EVENTS_BY_ID,
  BENEFICIAL_EVENTS,
  CONTRACT_CONSTRAINTS,
  CONTRACT_OBJECTIVES,
  CONTRACT_SPONSORS,
  CULTURE_MEDIA,
  CULTURE_MEDIA_BY_ID,
  FACTORY_TIERS,
  FACTORY_TIERS_BY_LEVEL,
  GAME_CONSTANTS,
  INCIDENT_EVENTS,
  LAB_THEME_COLORS,
  PPM_BASE,
  RARITY_ORDER,
  RARITY_VISUALS,
  STRAINS,
  STRAINS_BY_ID,
  TECH_BY_ID,
  TECH_TREE,
  TROPHIES,
  TROPHIES_BY_ID,
} from '../../src/data/index.ts';
import { getStaticCatalogSummary } from '../../src/main.ts';

describe('Phase 1 — Intégrité des Données Statiques BIOLAB', () => {
  describe('1. Milieux de Culture & Probabilités PPM', () => {
    it('contient exactement les 7 milieux de culture ordonnés de 1 à 7', () => {
      expect(CULTURE_MEDIA).toHaveLength(7);
      expect(CULTURE_MEDIA.map((m) => m.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('garantit une somme exacte de 1_000_000 ppm (100.0000 %) pour chaque milieu', () => {
      for (const medium of CULTURE_MEDIA) {
        const totalPpm = medium.dropTable.reduce((acc, entry) => acc + entry.weightPpm, 0);
        expect(totalPpm, `Somme PPM invalide pour ${medium.nameFr}`).toBe(PPM_BASE);

        const totalPercentage = medium.dropTable.reduce(
          (acc, entry) => acc + entry.displayPercentage,
          0
        );
        expect(totalPercentage).toBeCloseTo(100, 6);
      }
    });

    it('applique la pondération de branches exacte par milieu (Arbitrage #6)', () => {
      for (const medium of CULTURE_MEDIA) {
        const weights = medium.standardBranchWeightsPpm;
        const sumWeights =
          weights.BRANCH_I + weights.BRANCH_II + weights.BRANCH_III + weights.BRANCH_IV;
        expect(sumWeights).toBe(PPM_BASE);
      }

      // Milieu 2 : 55 % Bacilles (Branche I)
      expect(
        CULTURE_MEDIA_BY_ID.MEDIUM_2_BRAIN_HEART_BROTH.standardBranchWeightsPpm.BRANCH_I
      ).toBe(550_000);
      // Milieu 3 : 55 % Cocques (Branche II)
      expect(
        CULTURE_MEDIA_BY_ID.MEDIUM_3_SHEEP_BLOOD_AGAR.standardBranchWeightsPpm.BRANCH_II
      ).toBe(550_000);
      // Milieu 5 : 55 % Spirilles (Branche III)
      expect(
        CULTURE_MEDIA_BY_ID.MEDIUM_5_HYPERSALINE_VOLCANIC.standardBranchWeightsPpm.BRANCH_III
      ).toBe(550_000);
    });

    it('vérifie les coûts fixes et le sacrifice Mythique du Milieu 7', () => {
      expect(CULTURE_MEDIA.map((m) => m.costBio)).toEqual([
        50, 25_000, 95_000, 350_000, 1_200_000, 4_500_000, 15_000_000,
      ]);
      expect(
        CULTURE_MEDIA.filter((m) => m.requiresMythicSacrifice).map((m) => m.id)
      ).toEqual(['MEDIUM_7_RADIO_ISOTOPIC_AGAR']);
    });
  });

  describe('2. Charte Graphique & Raretés', () => {
    it('définit les 7 raretés avec des codes couleurs hexadécimaux valides', () => {
      expect(RARITY_ORDER).toHaveLength(7);
      const hexRegex = /^#[0-9A-F]{6}$/i;
      for (const rarity of RARITY_ORDER) {
        const visual = RARITY_VISUALS[rarity];
        expect(visual.colorHex).toMatch(hexRegex);
        expect(visual.growthTimeRangeSeconds[0]).toBeLessThan(visual.growthTimeRangeSeconds[1]);
      }
      expect(LAB_THEME_COLORS.darkPhosphorBackground).toBe('#060807');
      expect(RARITY_VISUALS.SECRET.secondaryColorHex).toBe('#38BDF8');
    });
  });

  describe('3. Catalogue des 27 Souches Phylogénétiques', () => {
    it('contient exactement 27 souches (20 standards + 4 mythiques + 3 secrets)', () => {
      expect(STRAINS).toHaveLength(27);
      expect(STRAINS.filter((s) => s.branch === 'BRANCH_I')).toHaveLength(5);
      expect(STRAINS.filter((s) => s.branch === 'BRANCH_II')).toHaveLength(5);
      expect(STRAINS.filter((s) => s.branch === 'BRANCH_III')).toHaveLength(5);
      expect(STRAINS.filter((s) => s.branch === 'BRANCH_IV')).toHaveLength(5);
      expect(STRAINS.filter((s) => s.branch === 'BRANCH_V_MYTHIC')).toHaveLength(4);
      expect(STRAINS.filter((s) => s.branch === 'BRANCH_SECRET')).toHaveLength(3);
    });

    it('vérifie que le temps de pousse de chaque souche est compris dans la plage de sa rareté', () => {
      for (const strain of STRAINS) {
        const [minSec, maxSec] = RARITY_VISUALS[strain.rarity].growthTimeRangeSeconds;
        expect(
          strain.growthDurationSeconds,
          `${strain.scientificName} hors plage de pousse (${strain.growthDurationSeconds}s)`
        ).toBeGreaterThanOrEqual(minSec);
        expect(strain.growthDurationSeconds).toBeLessThanOrEqual(maxSec);
      }
    });

    it("vérifie les coûts de scissiparité, d'entretien cryo et d'autoclave flash (15 * sqrt(M))", () => {
      for (const strain of STRAINS) {
        expect(strain.multiplier).toBeGreaterThanOrEqual(1.0);
        expect(strain.cryoUpkeepBioPerSec).toBeGreaterThan(0);
        expect(strain.scissiparityCostBio).toBeGreaterThan(0);

        const expectedAutoclave = Number((15 * Math.sqrt(strain.multiplier)).toFixed(2));
        expect(strain.flashAutoclaveCostBio).toBe(expectedAutoclave);

        if (strain.rarity === 'MYTHIC' || strain.rarity === 'SECRET') {
          expect(strain.scissiparityCostPr).toBeGreaterThan(0);
        } else {
          expect(strain.scissiparityCostPr).toBe(0);
        }
      }
      expect(STRAINS_BY_ID['BACILLUS_SUBTILIS']?.multiplier).toBe(1.0);
      expect(STRAINS_BY_ID['VOID_SPIRILLUM']?.multiplier).toBe(12_000.0);
    });
  });

  describe("4. Paliers d'Usine & Charges d'Exploitation", () => {
    it('contient les 5 paliers avec progression stricte des coûts, boîtes, cryo et charges', () => {
      expect(FACTORY_TIERS).toHaveLength(5);
      expect(FACTORY_TIERS.map((t) => t.incubatorSlots)).toEqual([4, 6, 8, 10, 12]);
      expect(FACTORY_TIERS.map((t) => t.cryoTubeSlots)).toEqual([2, 4, 8, 12, 18]);
      expect(FACTORY_TIERS.map((t) => t.fixedOverheadBioPerSec)).toEqual([
        0.5, 15, 140, 1_200, 8_500,
      ]);
      expect(FACTORY_TIERS_BY_LEVEL[1].unlockCostBio).toBe(0);
      expect(FACTORY_TIERS_BY_LEVEL[5].unlockCostBio).toBe(85_000_000);
      expect(FACTORY_TIERS_BY_LEVEL[5].unlockCostPr).toBe(150_000);
    });
  });

  describe('5. Arbre Technologique PR (12 Technologies)', () => {
    it('contient 12 technologies réparties en 4 branches de 3 paliers pour un total de 190 650 PR', () => {
      expect(TECH_TREE).toHaveLength(12);
      const totalPrCost = TECH_TREE.reduce((acc, t) => acc + t.costPr, 0);
      expect(totalPrCost).toBe(190_650);
      expect(TECH_BY_ID.T2.modifierValue).toBe(0.04);
      expect(TECH_BY_ID.C1.modifierValue + TECH_BY_ID.C2.modifierValue).toBe(0.75);
    });
  });

  describe('6. Armoire des Distinctions (16 Trophées)', () => {
    it('contient les 16 trophées numérotés de 1 à 16', () => {
      expect(TROPHIES).toHaveLength(16);
      expect(TROPHIES.map((t) => t.number)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      ]);
      expect(TROPHIES_BY_ID.TROPHY_02.effectValue).toBe(45);
      expect(TROPHIES_BY_ID.TROPHY_16.shelf).toBe('UPPER_BELL_RARE_ANOMALY');
    });
  });

  describe('7. Micro-Événements de Paillasse (10 Bénéfiques + 5 Incidents)', () => {
    it('contient les 15 événements avec leurs durées exactes du tableau', () => {
      expect(BENEFICIAL_EVENTS).toHaveLength(10);
      expect(INCIDENT_EVENTS).toHaveLength(5);
      expect(BENCH_EVENTS).toHaveLength(15);
      expect(INCIDENT_EVENTS.map((e) => e.displayDurationSeconds)).toEqual([45, 40, 50, 45, 45]);
      expect(BENCH_EVENTS_BY_ID.M2.requiredClicks).toBe(3);
    });
  });

  describe('8. Contrats Procéduraux & Constantes d’Arbitrage Phase 0', () => {
    it('valide les commanditaires, objectifs, contraintes et arbitrages de départ', () => {
      expect(CONTRACT_SPONSORS).toHaveLength(4);
      expect(CONTRACT_OBJECTIVES).toHaveLength(5);
      expect(CONTRACT_CONSTRAINTS).toHaveLength(4);

      // Sommes PPM de multiplication
      const sciss = GAME_CONSTANTS.DIVISION.SCISSIPARITY;
      expect(sciss.regularClonePpm + sciss.spontaneousMutationPpm + sciss.cellularLysisPpm).toBe(
        PPM_BASE
      );

      const muta = GAME_CONSTANTS.DIVISION.MUTAGENESIS;
      expect(
        muta.standardClonePpm +
          muta.upwardMutationOneRankPpm +
          muta.superJumpTwoRanksPpm +
          muta.totalLysisPpm
      ).toBe(PPM_BASE);

      const conj = GAME_CONSTANTS.DIVISION.CONJUGATION;
      expect(conj.minRankOutcomePpm + conj.maxRankOutcomePpm + conj.totalLysisPpm).toBe(PPM_BASE);

      // Résumé du point d'entrée
      const summary = getStaticCatalogSummary();
      expect(summary).toEqual({
        mediaCount: 7,
        strainsCount: 27,
        factoryTiersCount: 5,
        techCount: 12,
        trophiesCount: 16,
        eventsCount: 15,
        startingBio: 150,
      });
    });
  });
});

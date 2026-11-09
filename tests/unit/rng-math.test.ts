import { describe, expect, it } from './test-harness.ts';
import {
  clamp,
  computeBioreactorCompostRefund,
  computeFlashAutoclaveCost,
  computeNicheMultiplier,
  isNonNegativeFinite,
  roundCurrency,
} from '../../src/core/math.ts';
import { createSeededRng } from '../../src/core/rng.ts';
import { PPM_BASE } from '../../src/data/constants.data.ts';

describe('Phase 2 — Utilitaires RNG Déterministe & Formules Mathématiques', () => {
  describe('1. Générateur Aléatoire Déterministe (Mulberry32 / PPM)', () => {
    it('produit exactement la même séquence pour une même graine (seed)', () => {
      const rngA = createSeededRng(123456);
      const rngB = createSeededRng(123456);

      for (let i = 0; i < 50; i++) {
        expect(rngA.nextPpmRoll()).toBe(rngB.nextPpmRoll());
      }
    });

    it('génère des tirages PPM strictement bornés entre 0 et 999_999', () => {
      const rng = createSeededRng(998877);
      for (let i = 0; i < 500; i++) {
        const roll = rng.nextPpmRoll();
        expect(roll).toBeGreaterThanOrEqual(0);
        expect(roll).toBeLessThan(PPM_BASE);
      }
    });

    it('respecte la pondération en PPM lors de tirages répétés', () => {
      const rng = createSeededRng(42);
      const table = [
        { item: 'A', weightPpm: 750_000 },
        { item: 'B', weightPpm: 250_000 },
        { item: 'ZERO', weightPpm: 0 },
      ] as const;

      let countA = 0;
      let countB = 0;
      let countZero = 0;
      const iterations = 2000;

      for (let i = 0; i < iterations; i++) {
        const picked = rng.pickWeightedPpm(table);
        if (picked === 'A') countA++;
        else if (picked === 'B') countB++;
        else countZero++;
      }

      expect(countZero).toBe(0);
      expect(countA / iterations).toBeCloseTo(0.75, 1);
      expect(countB / iterations).toBeCloseTo(0.25, 1);
    });
  });

  describe('2. Formules Mathématiques de Régulation Économique', () => {
    it('calcule correctement l’Étouffement de Niche (1 / sqrt(N)) de la Section 5.B', () => {
      expect(computeNicheMultiplier(1)).toBe(1.0);
      expect(computeNicheMultiplier(2)).toBeCloseTo(0.7071, 4);
      expect(computeNicheMultiplier(2) * 2).toBeCloseTo(1.4142, 4);
      expect(computeNicheMultiplier(3)).toBeCloseTo(0.57735, 4);
      expect(computeNicheMultiplier(3) * 3).toBeCloseTo(1.732, 3);
      expect(computeNicheMultiplier(4)).toBe(0.5);
      expect(computeNicheMultiplier(4) * 4).toBe(2.0);
    });

    it('calcule le coût d’Autoclave Flash (15 * sqrt(Multiplicateur)) et le remboursement Bioréacteur (10 %)', () => {
      expect(computeFlashAutoclaveCost(1.0)).toBe(15.0);
      expect(computeFlashAutoclaveCost(9.0)).toBe(45.0);
      expect(computeFlashAutoclaveCost(10.0)).toBe(47.43);
      expect(computeFlashAutoclaveCost(900.0)).toBe(450.0);

      expect(computeBioreactorCompostRefund(50)).toBe(5);
      expect(computeBioreactorCompostRefund(25_000)).toBe(2_500);
      expect(computeBioreactorCompostRefund(15_000_000)).toBe(1_500_000);
    });

    it('valide les fonctions de sécurité numérique (clamp, isNonNegativeFinite, roundCurrency)', () => {
      expect(isNonNegativeFinite(0)).toBe(true);
      expect(isNonNegativeFinite(150.5)).toBe(true);
      expect(isNonNegativeFinite(-1)).toBe(false);
      expect(isNonNegativeFinite(Number.NaN)).toBe(false);
      expect(isNonNegativeFinite(Number.POSITIVE_INFINITY)).toBe(false);

      expect(clamp(1.5, 0, 1)).toBe(1);
      expect(clamp(-0.2, 0, 1)).toBe(0);
      expect(roundCurrency(149.99999999999997)).toBe(150);
    });
  });
});

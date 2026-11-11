import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

type ExpectValue = unknown;

interface ExpectChain {
  toBe(expected: unknown): void;
  toEqual(expected: unknown): void;
  toHaveLength(expected: number): void;
  toBeCloseTo(expected: number, precision?: number): void;
  toBeGreaterThan(expected: number): void;
  toBeGreaterThanOrEqual(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeLessThanOrEqual(expected: number): void;
  toMatch(expected: RegExp | string): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeDefined(): void;
  toBeUndefined(): void;
}

export function expect(actual: ExpectValue, message?: string): ExpectChain {
  return {
    toBe(expected: unknown): void {
      assert.strictEqual(actual, expected, message);
    },
    toEqual(expected: unknown): void {
      assert.deepStrictEqual(actual, expected, message);
    },
    toHaveLength(expected: number): void {
      assert.ok(
        actual !== null &&
          actual !== undefined &&
          typeof (actual as { length?: unknown }).length === 'number',
        message ?? 'Expected value to have a numeric length property'
      );
      assert.strictEqual((actual as { length: number }).length, expected, message);
    },
    toBeCloseTo(expected: number, precision = 2): void {
      assert.strictEqual(typeof actual, 'number', message);
      const diff = Math.abs((actual as number) - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      assert.ok(
        diff <= tolerance,
        message ?? `Expected ${String(actual)} to be close to ${String(expected)} (diff: ${String(diff)})`
      );
    },
    toBeGreaterThan(expected: number): void {
      assert.strictEqual(typeof actual, 'number', message);
      assert.ok(
        (actual as number) > expected,
        message ?? `Expected ${String(actual)} > ${String(expected)}`
      );
    },
    toBeGreaterThanOrEqual(expected: number): void {
      assert.strictEqual(typeof actual, 'number', message);
      assert.ok(
        (actual as number) >= expected,
        message ?? `Expected ${String(actual)} >= ${String(expected)}`
      );
    },
    toBeLessThan(expected: number): void {
      assert.strictEqual(typeof actual, 'number', message);
      assert.ok(
        (actual as number) < expected,
        message ?? `Expected ${String(actual)} < ${String(expected)}`
      );
    },
    toBeLessThanOrEqual(expected: number): void {
      assert.strictEqual(typeof actual, 'number', message);
      assert.ok(
        (actual as number) <= expected,
        message ?? `Expected ${String(actual)} <= ${String(expected)}`
      );
    },
    toMatch(expected: RegExp | string): void {
      assert.strictEqual(typeof actual, 'string', message);
      if (typeof expected === 'string') {
        assert.ok((actual as string).includes(expected), message);
      } else {
        assert.match(actual as string, expected, message);
      }
    },
    toBeTruthy(): void {
      assert.ok(Boolean(actual), message);
    },
    toBeFalsy(): void {
      assert.ok(!actual, message);
    },
    toBeDefined(): void {
      assert.notStrictEqual(actual, undefined, message);
    },
    toBeUndefined(): void {
      assert.strictEqual(actual, undefined, message);
    },
  };
}

export { describe, it };

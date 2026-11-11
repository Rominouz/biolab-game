declare module 'node:assert/strict' {
  function ok(value: unknown, message?: string | Error): asserts value;
  function strictEqual<T>(actual: unknown, expected: T, message?: string | Error): asserts actual is T;
  function notStrictEqual(actual: unknown, expected: unknown, message?: string | Error): void;
  function deepStrictEqual<T>(actual: unknown, expected: T, message?: string | Error): asserts actual is T;
  function match(string: string, regexp: RegExp, message?: string | Error): void;
  const assert: {
    ok: typeof ok;
    strictEqual: typeof strictEqual;
    notStrictEqual: typeof notStrictEqual;
    deepStrictEqual: typeof deepStrictEqual;
    match: typeof match;
  };
  export default assert;
}

declare module 'node:test' {
  export function describe(name: string, fn: () => void | Promise<void>): Promise<void>;
  export function it(name: string, fn: () => void | Promise<void>): Promise<void>;
}

import {
  BENCH_EVENTS_BY_ID,
  CONTRACT_CONSTRAINTS_BY_ID,
  CONTRACT_OBJECTIVES_BY_TYPE,
  CONTRACT_SPONSORS_BY_ID,
  CULTURE_MEDIA,
  CULTURE_MEDIA_BY_ID,
  FACTORY_TIERS_BY_LEVEL,
  STRAINS_BY_ID,
  TECH_BY_ID,
  TROPHIES_BY_ID,
} from '../data/index.ts';
import { evaluateEconomySnapshot } from '../systems/economy.system.ts';
import { sanitizeResearcherNotes } from '../systems/logbook.system.ts';
import type {
  BioreactorTask,
  ColonyIncubatorSlot,
  CryoTubeSlot,
  GameState,
  IncubatorSlot,
  LabStatistics,
} from '../types/game-state.types.ts';
import type {
  BenchEventId,
  ContractConstraintId,
  ContractObjectiveType,
  CultureMediumId,
  FactoryTierLevel,
  SponsorId,
  StandardBranchId,
  TechId,
  TrophyId,
} from '../types/game.types.ts';
import type {
  ActiveBenchEvent,
  BenchBuffsState,
  ContractBoardSlot,
  HybridizationCodexEntry,
  LogbookEntry,
  LogbookState,
  ProceduralContract,
} from '../types/meta.types.ts';

export const SAVE_MAGIC = 'BIOLAB_SAVE' as const;
export const CURRENT_SAVE_SCHEMA_VERSION = 1 as const;
export const MAX_IMPORT_JSON_BYTES = 512 * 1024; // 512 Ko max

export type SaveValidationErrorCode =
  | 'INVALID_JSON'
  | 'PAYLOAD_TOO_LARGE'
  | 'PROTOTYPE_POLLUTION_DETECTED'
  | 'INVALID_ENVELOPE'
  | 'UNSUPPORTED_VERSION'
  | 'CHECKSUM_MISMATCH'
  | 'INVALID_NUMBER'
  | 'OUT_OF_BOUNDS'
  | 'UNKNOWN_IDENTIFIER'
  | 'CAPACITY_MISMATCH'
  | 'MALFORMED_STRUCTURE';

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly errorCode: SaveValidationErrorCode;
      readonly errorMessageFr: string;
      readonly fieldPath?: string;
    };

export interface SaveEnvelope {
  readonly magic: typeof SAVE_MAGIC;
  readonly schemaVersion: typeof CURRENT_SAVE_SCHEMA_VERSION;
  readonly savedAtIso: string;
  readonly slotId: string;
  readonly checksum: string;
  readonly state: GameState;
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const VALID_STANDARD_BRANCHES = new Set<StandardBranchId>([
  'BRANCH_I',
  'BRANCH_II',
  'BRANCH_III',
  'BRANCH_IV',
]);
const VALID_LOGBOOK_CATEGORIES = new Set<LogbookEntry['category']>([
  'DISCOVERY',
  'MUTATION',
  'UNDERVOLTAGE_SURVIVAL',
  'TROPHY',
  'CONTRACT',
]);

function fail<T>(
  errorCode: SaveValidationErrorCode,
  errorMessageFr: string,
  fieldPath?: string
): ValidationResult<T> {
  return {
    ok: false,
    errorCode,
    errorMessageFr,
    fieldPath,
  };
}

function isPlainRecord(val: unknown): val is Record<string, unknown> {
  if (typeof val !== 'object' || val === null || Array.isArray(val)) {
    return false;
  }
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * Inspecte récursivement une valeur désérialisée pour détecter toute clé interdite
 * (__proto__, constructor, prototype).
 */
export function hasPrototypePollutionKey(val: unknown): boolean {
  if (typeof val !== 'object' || val === null) {
    return false;
  }
  if (Array.isArray(val)) {
    return val.some((item) => hasPrototypePollutionKey(item));
  }
  const ownKeys = Object.getOwnPropertyNames(val);
  for (const key of ownKeys) {
    if (FORBIDDEN_KEYS.has(key)) {
      return true;
    }
    const child = (val as Record<string, unknown>)[key];
    if (hasPrototypePollutionKey(child)) {
      return true;
    }
  }
  return false;
}

function isFiniteNumberInRange(
  val: unknown,
  min: number,
  max = Number.MAX_SAFE_INTEGER
): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= min && val <= max;
}

function isNonNegativeInteger(val: unknown, max = Number.MAX_SAFE_INTEGER): val is number {
  return (
    typeof val === 'number' &&
    Number.isFinite(val) &&
    Number.isInteger(val) &&
    val >= 0 &&
    val <= max
  );
}

/**
 * Sérialisation JSON canonique (clés triées par ordre alphabétique)
 * afin que le calcul du checksum FNV-1a soit 100 % déterministe.
 */
export function canonicalJsonStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalJsonStringify(item)).join(',') + ']';
  }
  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record)
    .filter((k) => record[k] !== undefined)
    .sort();
  const entries = sortedKeys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJsonStringify(record[k])}`
  );
  return '{' + entries.join(',') + '}';
}

/**
 * Calcule une empreinte FNV-1a 32 bits déterministe en hexadécimal (8 caractères)
 * sur l'état du jeu hors snapshot économique dérivé.
 */
export function computeStateChecksum(state: GameState): string {
  const { economy: _ignoredEconomy, ...canonicalPayload } = state;
  const serialized = canonicalJsonStringify(canonicalPayload);
  let hash = 0x811c9dc5;
  for (let i = 0; i < serialized.length; i++) {
    hash ^= serialized.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function validateColonySlot(
  raw: Record<string, unknown>,
  expectedSlotIndex: number,
  fieldPath: string
): ValidationResult<ColonyIncubatorSlot> {
  if (raw.slotIndex !== expectedSlotIndex) {
    return fail(
      'MALFORMED_STRUCTURE',
      `Indice d'incubateur incohérent (${String(raw.slotIndex)} != ${String(expectedSlotIndex)})`,
      `${fieldPath}.slotIndex`
    );
  }
  if (typeof raw.strainId !== 'string' || !(raw.strainId in STRAINS_BY_ID)) {
    return fail(
      'UNKNOWN_IDENTIFIER',
      `Souche inconnue dans l'incubateur : ${String(raw.strainId)}`,
      `${fieldPath}.strainId`
    );
  }
  if (typeof raw.originMediumId !== 'string' || !(raw.originMediumId in CULTURE_MEDIA_BY_ID)) {
    return fail(
      'UNKNOWN_IDENTIFIER',
      `Milieu d'origine inconnu : ${String(raw.originMediumId)}`,
      `${fieldPath}.originMediumId`
    );
  }
  if (!isFiniteNumberInRange(raw.growthElapsedSeconds, 0)) {
    return fail(
      'INVALID_NUMBER',
      'growthElapsedSeconds invalide ou négatif',
      `${fieldPath}.growthElapsedSeconds`
    );
  }
  if (!isFiniteNumberInRange(raw.growthDurationSeconds, 0.1)) {
    return fail(
      'INVALID_NUMBER',
      'growthDurationSeconds invalide',
      `${fieldPath}.growthDurationSeconds`
    );
  }
  if (!isFiniteNumberInRange(raw.maturityRatio, 0, 1)) {
    return fail(
      'OUT_OF_BOUNDS',
      'maturityRatio doit être compris entre 0.0 et 1.0',
      `${fieldPath}.maturityRatio`
    );
  }
  if (typeof raw.isMature !== 'boolean') {
    return fail('MALFORMED_STRUCTURE', 'isMature doit être un booléen', `${fieldPath}.isMature`);
  }
  if (!isFiniteNumberInRange(raw.adultLifespanRemainingSeconds, 0)) {
    return fail(
      'INVALID_NUMBER',
      'adultLifespanRemainingSeconds invalide ou négatif',
      `${fieldPath}.adultLifespanRemainingSeconds`
    );
  }
  if (!isFiniteNumberInRange(raw.adultLifespanTotalSeconds, 0.1)) {
    return fail(
      'INVALID_NUMBER',
      'adultLifespanTotalSeconds invalide',
      `${fieldPath}.adultLifespanTotalSeconds`
    );
  }
  if (!isFiniteNumberInRange(raw.manualInjectionCooldownSeconds, 0)) {
    return fail(
      'INVALID_NUMBER',
      'manualInjectionCooldownSeconds invalide',
      `${fieldPath}.manualInjectionCooldownSeconds`
    );
  }
  if (!isNonNegativeInteger(raw.absorbedWasteCount)) {
    return fail(
      'INVALID_NUMBER',
      'absorbedWasteCount doit être un entier positif ou nul',
      `${fieldPath}.absorbedWasteCount`
    );
  }
  if (typeof raw.isMutated !== 'boolean') {
    return fail('MALFORMED_STRUCTURE', 'isMutated doit être un booléen', `${fieldPath}.isMutated`);
  }
  if (
    raw.cryoStabilizedSeconds !== undefined &&
    !isFiniteNumberInRange(raw.cryoStabilizedSeconds, 0)
  ) {
    return fail(
      'INVALID_NUMBER',
      'cryoStabilizedSeconds invalide',
      `${fieldPath}.cryoStabilizedSeconds`
    );
  }

  return {
    ok: true,
    value: {
      status: 'COLONY',
      slotIndex: expectedSlotIndex,
      strainId: raw.strainId,
      originMediumId: raw.originMediumId as CultureMediumId,
      growthElapsedSeconds: raw.growthElapsedSeconds,
      growthDurationSeconds: raw.growthDurationSeconds,
      maturityRatio: raw.maturityRatio,
      isMature: raw.isMature,
      adultLifespanRemainingSeconds: raw.adultLifespanRemainingSeconds,
      adultLifespanTotalSeconds: raw.adultLifespanTotalSeconds,
      manualInjectionCooldownSeconds: raw.manualInjectionCooldownSeconds,
      absorbedWasteCount: raw.absorbedWasteCount,
      isMutated: raw.isMutated,
      ...(raw.cryoStabilizedSeconds !== undefined
        ? { cryoStabilizedSeconds: raw.cryoStabilizedSeconds }
        : {}),
    },
  };
}

function validateIncubatorSlot(
  raw: unknown,
  expectedSlotIndex: number,
  fieldPath: string
): ValidationResult<IncubatorSlot> {
  if (!isPlainRecord(raw)) {
    return fail('MALFORMED_STRUCTURE', 'Slot incubateur malformé', fieldPath);
  }
  if (raw.slotIndex !== expectedSlotIndex) {
    return fail(
      'MALFORMED_STRUCTURE',
      `Indice d'incubateur incohérent (${String(raw.slotIndex)} != ${String(expectedSlotIndex)})`,
      `${fieldPath}.slotIndex`
    );
  }

  if (raw.status === 'EMPTY') {
    return {
      ok: true,
      value: {
        status: 'EMPTY',
        slotIndex: expectedSlotIndex,
      },
    };
  }

  if (raw.status === 'COLONY') {
    return validateColonySlot(raw, expectedSlotIndex, fieldPath);
  }

  if (raw.status === 'WASTE') {
    if (typeof raw.originStrainId !== 'string' || !(raw.originStrainId in STRAINS_BY_ID)) {
      return fail(
        'UNKNOWN_IDENTIFIER',
        `Souche d'origine du déchet inconnue : ${String(raw.originStrainId)}`,
        `${fieldPath}.originStrainId`
      );
    }
    if (typeof raw.originMediumId !== 'string' || !(raw.originMediumId in CULTURE_MEDIA_BY_ID)) {
      return fail(
        'UNKNOWN_IDENTIFIER',
        `Milieu d'origine du déchet inconnu : ${String(raw.originMediumId)}`,
        `${fieldPath}.originMediumId`
      );
    }
    if (!isFiniteNumberInRange(raw.necrosisElapsedSeconds, 0)) {
      return fail(
        'INVALID_NUMBER',
        'necrosisElapsedSeconds invalide',
        `${fieldPath}.necrosisElapsedSeconds`
      );
    }
    if (typeof raw.isToxic !== 'boolean') {
      return fail('MALFORMED_STRUCTURE', 'isToxic doit être un booléen', `${fieldPath}.isToxic`);
    }
    return {
      ok: true,
      value: {
        status: 'WASTE',
        slotIndex: expectedSlotIndex,
        originStrainId: raw.originStrainId,
        originMediumId: raw.originMediumId as CultureMediumId,
        necrosisElapsedSeconds: raw.necrosisElapsedSeconds,
        isToxic: raw.isToxic,
      },
    };
  }

  return fail(
    'MALFORMED_STRUCTURE',
    `Statut d'incubateur inconnu : ${String(raw.status)}`,
    `${fieldPath}.status`
  );
}

function validateCryoSlot(
  raw: unknown,
  expectedTubeIndex: number,
  fieldPath: string
): ValidationResult<CryoTubeSlot> {
  if (!isPlainRecord(raw)) {
    return fail('MALFORMED_STRUCTURE', 'Tube cryogénique malformé', fieldPath);
  }
  if (raw.tubeIndex !== expectedTubeIndex) {
    return fail(
      'MALFORMED_STRUCTURE',
      `Indice de tube cryo incohérent (${String(raw.tubeIndex)} != ${String(expectedTubeIndex)})`,
      `${fieldPath}.tubeIndex`
    );
  }

  if (raw.status === 'EMPTY') {
    return {
      ok: true,
      value: {
        status: 'EMPTY',
        tubeIndex: expectedTubeIndex,
      },
    };
  }

  if (raw.status === 'FROZEN') {
    if (!isPlainRecord(raw.storedColony)) {
      return fail(
        'MALFORMED_STRUCTURE',
        'Colonie stockée en cryo malformée',
        `${fieldPath}.storedColony`
      );
    }
    const storedSlotIndex =
      typeof raw.storedColony.slotIndex === 'number' && Number.isInteger(raw.storedColony.slotIndex)
        ? raw.storedColony.slotIndex
        : 0;
    const colonyCheck = validateColonySlot(
      raw.storedColony,
      storedSlotIndex,
      `${fieldPath}.storedColony`
    );
    if (!colonyCheck.ok) {
      return colonyCheck;
    }
    if (!isFiniteNumberInRange(raw.frozenDurationSeconds, 0)) {
      return fail(
        'INVALID_NUMBER',
        'frozenDurationSeconds invalide',
        `${fieldPath}.frozenDurationSeconds`
      );
    }
    return {
      ok: true,
      value: {
        status: 'FROZEN',
        tubeIndex: expectedTubeIndex,
        storedColony: colonyCheck.value,
        frozenDurationSeconds: raw.frozenDurationSeconds,
      },
    };
  }

  return fail(
    'MALFORMED_STRUCTURE',
    `Statut de tube cryo inconnu : ${String(raw.status)}`,
    `${fieldPath}.status`
  );
}

function validateBioreactorTasks(raw: unknown): ValidationResult<readonly BioreactorTask[]> {
  if (!Array.isArray(raw)) {
    return fail(
      'MALFORMED_STRUCTURE',
      'bioreactorTasks doit être un tableau',
      'state.bioreactorTasks'
    );
  }
  const tasks: BioreactorTask[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    const path = `state.bioreactorTasks[${String(i)}]`;
    if (!isPlainRecord(item)) {
      return fail('MALFORMED_STRUCTURE', 'Tâche bioréacteur malformée', path);
    }
    if (typeof item.taskId !== 'string' || item.taskId.length === 0 || item.taskId.length > 64) {
      return fail('MALFORMED_STRUCTURE', 'taskId invalide', `${path}.taskId`);
    }
    if (!isNonNegativeInteger(item.originSlotIndex, 100)) {
      return fail('INVALID_NUMBER', 'originSlotIndex invalide', `${path}.originSlotIndex`);
    }
    if (typeof item.originStrainId !== 'string' || !(item.originStrainId in STRAINS_BY_ID)) {
      return fail(
        'UNKNOWN_IDENTIFIER',
        `Souche de tâche bioréacteur inconnue : ${String(item.originStrainId)}`,
        `${path}.originStrainId`
      );
    }
    if (typeof item.originMediumId !== 'string' || !(item.originMediumId in CULTURE_MEDIA_BY_ID)) {
      return fail(
        'UNKNOWN_IDENTIFIER',
        `Milieu de tâche bioréacteur inconnu : ${String(item.originMediumId)}`,
        `${path}.originMediumId`
      );
    }
    if (!isFiniteNumberInRange(item.remainingSeconds, 0)) {
      return fail('INVALID_NUMBER', 'remainingSeconds invalide', `${path}.remainingSeconds`);
    }
    if (!isFiniteNumberInRange(item.totalDurationSeconds, 0.1)) {
      return fail(
        'INVALID_NUMBER',
        'totalDurationSeconds invalide',
        `${path}.totalDurationSeconds`
      );
    }
    if (!isFiniteNumberInRange(item.refundBioAmount, 0)) {
      return fail('INVALID_NUMBER', 'refundBioAmount invalide', `${path}.refundBioAmount`);
    }
    tasks.push({
      taskId: sanitizeResearcherNotes(item.taskId),
      originSlotIndex: item.originSlotIndex,
      originStrainId: item.originStrainId,
      originMediumId: item.originMediumId as CultureMediumId,
      remainingSeconds: item.remainingSeconds,
      totalDurationSeconds: item.totalDurationSeconds,
      refundBioAmount: item.refundBioAmount,
    });
  }
  return { ok: true, value: tasks };
}

function validateActiveBenchEvent(raw: unknown): ValidationResult<ActiveBenchEvent | null> {
  if (raw === null) {
    return { ok: true, value: null };
  }
  if (!isPlainRecord(raw)) {
    return fail(
      'MALFORMED_STRUCTURE',
      'activeBenchEvent malformé',
      'state.activeBenchEvent'
    );
  }
  if (typeof raw.eventId !== 'string' || !(raw.eventId in BENCH_EVENTS_BY_ID)) {
    return fail(
      'UNKNOWN_IDENTIFIER',
      `Événement de paillasse inconnu : ${String(raw.eventId)}`,
      'state.activeBenchEvent.eventId'
    );
  }
  if (raw.category !== 'BENEFICIAL' && raw.category !== 'INCIDENT') {
    return fail(
      'MALFORMED_STRUCTURE',
      'Catégorie événement invalide',
      'state.activeBenchEvent.category'
    );
  }
  if (!isFiniteNumberInRange(raw.remainingDisplaySeconds, 0)) {
    return fail(
      'INVALID_NUMBER',
      'remainingDisplaySeconds invalide',
      'state.activeBenchEvent.remainingDisplaySeconds'
    );
  }
  if (!isFiniteNumberInRange(raw.totalDisplaySeconds, 0.1)) {
    return fail(
      'INVALID_NUMBER',
      'totalDisplaySeconds invalide',
      'state.activeBenchEvent.totalDisplaySeconds'
    );
  }
  if (!isNonNegativeInteger(raw.currentClicks, 1000)) {
    return fail(
      'INVALID_NUMBER',
      'currentClicks invalide',
      'state.activeBenchEvent.currentClicks'
    );
  }
  if (!isNonNegativeInteger(raw.requiredClicks, 1000)) {
    return fail(
      'INVALID_NUMBER',
      'requiredClicks invalide',
      'state.activeBenchEvent.requiredClicks'
    );
  }
  if (raw.targetSlotIndex !== undefined && !isNonNegativeInteger(raw.targetSlotIndex, 100)) {
    return fail(
      'INVALID_NUMBER',
      'targetSlotIndex invalide',
      'state.activeBenchEvent.targetSlotIndex'
    );
  }

  return {
    ok: true,
    value: {
      eventId: raw.eventId as BenchEventId,
      category: raw.category,
      remainingDisplaySeconds: raw.remainingDisplaySeconds,
      totalDisplaySeconds: raw.totalDisplaySeconds,
      currentClicks: raw.currentClicks,
      requiredClicks: raw.requiredClicks,
      ...(raw.targetSlotIndex !== undefined ? { targetSlotIndex: raw.targetSlotIndex } : {}),
    },
  };
}

function validateBenchBuffs(raw: unknown): ValidationResult<BenchBuffsState> {
  if (!isPlainRecord(raw)) {
    return fail('MALFORMED_STRUCTURE', 'benchBuffs malformé', 'state.benchBuffs');
  }
  const numericFields = [
    'b2GrowthSpeedRemainingSeconds',
    'b4BioBoostRemainingSeconds',
    'b7ZeroFixedOverheadRemainingSeconds',
    'b8DoubledSlotRemainingSeconds',
    'b10ZeroCryoUpkeepRemainingSeconds',
    'm1SlowGrowthPenaltyRemainingSeconds',
    'm2CryoSurchargeRemainingSeconds',
    'm3MitosisLysisPenaltyRemainingSeconds',
    'm5NextAutoclaveSurchargeBio',
  ] as const;

  for (const field of numericFields) {
    if (!isFiniteNumberInRange(raw[field], 0)) {
      return fail('INVALID_NUMBER', `${field} invalide`, `state.benchBuffs.${field}`);
    }
  }

  const boolFields = [
    'b6NextDivisionDiscountActive',
    'b9NextMutagenesisBonusActive',
    'm4NextSeededLifespanPenaltyActive',
  ] as const;

  for (const field of boolFields) {
    if (typeof raw[field] !== 'boolean') {
      return fail(
        'MALFORMED_STRUCTURE',
        `${field} doit être un booléen`,
        `state.benchBuffs.${field}`
      );
    }
  }

  if (
    raw.b8DoubledSlotIndex !== undefined &&
    !isNonNegativeInteger(raw.b8DoubledSlotIndex, 100)
  ) {
    return fail(
      'INVALID_NUMBER',
      'b8DoubledSlotIndex invalide',
      'state.benchBuffs.b8DoubledSlotIndex'
    );
  }

  return {
    ok: true,
    value: {
      b2GrowthSpeedRemainingSeconds: raw.b2GrowthSpeedRemainingSeconds as number,
      b4BioBoostRemainingSeconds: raw.b4BioBoostRemainingSeconds as number,
      b6NextDivisionDiscountActive: raw.b6NextDivisionDiscountActive as boolean,
      b7ZeroFixedOverheadRemainingSeconds: raw.b7ZeroFixedOverheadRemainingSeconds as number,
      ...(raw.b8DoubledSlotIndex !== undefined
        ? { b8DoubledSlotIndex: raw.b8DoubledSlotIndex as number }
        : {}),
      b8DoubledSlotRemainingSeconds: raw.b8DoubledSlotRemainingSeconds as number,
      b9NextMutagenesisBonusActive: raw.b9NextMutagenesisBonusActive as boolean,
      b10ZeroCryoUpkeepRemainingSeconds: raw.b10ZeroCryoUpkeepRemainingSeconds as number,
      m1SlowGrowthPenaltyRemainingSeconds: raw.m1SlowGrowthPenaltyRemainingSeconds as number,
      m2CryoSurchargeRemainingSeconds: raw.m2CryoSurchargeRemainingSeconds as number,
      m3MitosisLysisPenaltyRemainingSeconds: raw.m3MitosisLysisPenaltyRemainingSeconds as number,
      m4NextSeededLifespanPenaltyActive: raw.m4NextSeededLifespanPenaltyActive as boolean,
      m5NextAutoclaveSurchargeBio: raw.m5NextAutoclaveSurchargeBio as number,
    },
  };
}

function validateProceduralContract(
  raw: unknown,
  expectedSlotIndex: 0 | 1 | 2,
  fieldPath: string
): ValidationResult<ProceduralContract> {
  if (!isPlainRecord(raw)) {
    return fail('MALFORMED_STRUCTURE', 'Contrat malformé', fieldPath);
  }
  if (typeof raw.id !== 'string' || raw.id.length === 0 || raw.id.length > 64) {
    return fail('MALFORMED_STRUCTURE', 'Identifiant de contrat invalide', `${fieldPath}.id`);
  }
  if (raw.slotIndex !== expectedSlotIndex) {
    return fail(
      'MALFORMED_STRUCTURE',
      'slotIndex de contrat incohérent',
      `${fieldPath}.slotIndex`
    );
  }
  if (typeof raw.sponsorId !== 'string' || !(raw.sponsorId in CONTRACT_SPONSORS_BY_ID)) {
    return fail(
      'UNKNOWN_IDENTIFIER',
      `Commanditaire inconnu : ${String(raw.sponsorId)}`,
      `${fieldPath}.sponsorId`
    );
  }
  if (
    typeof raw.objectiveType !== 'string' ||
    !(raw.objectiveType in CONTRACT_OBJECTIVES_BY_TYPE)
  ) {
    return fail(
      'UNKNOWN_IDENTIFIER',
      `Type d'objectif de contrat inconnu : ${String(raw.objectiveType)}`,
      `${fieldPath}.objectiveType`
    );
  }
  if (
    raw.constraintId !== undefined &&
    (typeof raw.constraintId !== 'string' || !(raw.constraintId in CONTRACT_CONSTRAINTS_BY_ID))
  ) {
    return fail(
      'UNKNOWN_IDENTIFIER',
      `Contrainte de contrat inconnue : ${String(raw.constraintId)}`,
      `${fieldPath}.constraintId`
    );
  }
  if (typeof raw.targetStrainId !== 'string' || !(raw.targetStrainId in STRAINS_BY_ID)) {
    return fail(
      'UNKNOWN_IDENTIFIER',
      `Souche cible de contrat inconnue : ${String(raw.targetStrainId)}`,
      `${fieldPath}.targetStrainId`
    );
  }

  let chimeraParents: readonly [string, string] | undefined;
  if (raw.chimeraParentStrainIds !== undefined) {
    if (
      !Array.isArray(raw.chimeraParentStrainIds) ||
      raw.chimeraParentStrainIds.length !== 2 ||
      typeof raw.chimeraParentStrainIds[0] !== 'string' ||
      typeof raw.chimeraParentStrainIds[1] !== 'string' ||
      !(raw.chimeraParentStrainIds[0] in STRAINS_BY_ID) ||
      !(raw.chimeraParentStrainIds[1] in STRAINS_BY_ID)
    ) {
      return fail(
        'UNKNOWN_IDENTIFIER',
        'chimeraParentStrainIds invalide',
        `${fieldPath}.chimeraParentStrainIds`
      );
    }
    chimeraParents = [raw.chimeraParentStrainIds[0], raw.chimeraParentStrainIds[1]];
  }

  if (
    raw.symbiosisTargetBranch !== undefined &&
    (typeof raw.symbiosisTargetBranch !== 'string' ||
      !VALID_STANDARD_BRANCHES.has(raw.symbiosisTargetBranch as StandardBranchId))
  ) {
    return fail(
      'UNKNOWN_IDENTIFIER',
      'symbiosisTargetBranch invalide',
      `${fieldPath}.symbiosisTargetBranch`
    );
  }

  if (
    raw.symbiosisRequiredCount !== undefined &&
    raw.symbiosisRequiredCount !== 3 &&
    raw.symbiosisRequiredCount !== 4
  ) {
    return fail(
      'OUT_OF_BOUNDS',
      'symbiosisRequiredCount doit valoir 3 ou 4',
      `${fieldPath}.symbiosisRequiredCount`
    );
  }

  if (!isFiniteNumberInRange(raw.extractionElapsedSeconds, 0)) {
    return fail(
      'INVALID_NUMBER',
      'extractionElapsedSeconds invalide',
      `${fieldPath}.extractionElapsedSeconds`
    );
  }
  if (!isFiniteNumberInRange(raw.extractionRequiredSeconds, 0)) {
    return fail(
      'INVALID_NUMBER',
      'extractionRequiredSeconds invalide',
      `${fieldPath}.extractionRequiredSeconds`
    );
  }
  if (
    raw.timeLimitRemainingSeconds !== undefined &&
    !isFiniteNumberInRange(raw.timeLimitRemainingSeconds, 0)
  ) {
    return fail(
      'INVALID_NUMBER',
      'timeLimitRemainingSeconds invalide',
      `${fieldPath}.timeLimitRemainingSeconds`
    );
  }
  if (
    raw.timeLimitTotalSeconds !== undefined &&
    !isFiniteNumberInRange(raw.timeLimitTotalSeconds, 0.1)
  ) {
    return fail(
      'INVALID_NUMBER',
      'timeLimitTotalSeconds invalide',
      `${fieldPath}.timeLimitTotalSeconds`
    );
  }
  if (raw.chimeraValidated !== undefined && typeof raw.chimeraValidated !== 'boolean') {
    return fail(
      'MALFORMED_STRUCTURE',
      'chimeraValidated doit être un booléen',
      `${fieldPath}.chimeraValidated`
    );
  }
  if (!isFiniteNumberInRange(raw.rewardBio, 0)) {
    return fail('INVALID_NUMBER', 'rewardBio invalide', `${fieldPath}.rewardBio`);
  }
  if (!isFiniteNumberInRange(raw.rewardPr, 0)) {
    return fail('INVALID_NUMBER', 'rewardPr invalide', `${fieldPath}.rewardPr`);
  }
  if (
    raw.rewardMediumId !== undefined &&
    (typeof raw.rewardMediumId !== 'string' || !(raw.rewardMediumId in CULTURE_MEDIA_BY_ID))
  ) {
    return fail(
      'UNKNOWN_IDENTIFIER',
      `rewardMediumId inconnu : ${String(raw.rewardMediumId)}`,
      `${fieldPath}.rewardMediumId`
    );
  }
  if (raw.rewardMediumCount !== undefined && !isNonNegativeInteger(raw.rewardMediumCount, 100)) {
    return fail('INVALID_NUMBER', 'rewardMediumCount invalide', `${fieldPath}.rewardMediumCount`);
  }

  return {
    ok: true,
    value: {
      id: sanitizeResearcherNotes(raw.id),
      slotIndex: expectedSlotIndex,
      sponsorId: raw.sponsorId as SponsorId,
      objectiveType: raw.objectiveType as ContractObjectiveType,
      ...(raw.constraintId !== undefined
        ? { constraintId: raw.constraintId as ContractConstraintId }
        : {}),
      targetStrainId: raw.targetStrainId,
      ...(chimeraParents !== undefined ? { chimeraParentStrainIds: chimeraParents } : {}),
      ...(raw.symbiosisTargetBranch !== undefined
        ? { symbiosisTargetBranch: raw.symbiosisTargetBranch as StandardBranchId }
        : {}),
      ...(raw.symbiosisRequiredCount !== undefined
        ? { symbiosisRequiredCount: raw.symbiosisRequiredCount }
        : {}),
      extractionElapsedSeconds: raw.extractionElapsedSeconds,
      extractionRequiredSeconds: raw.extractionRequiredSeconds,
      ...(raw.timeLimitRemainingSeconds !== undefined
        ? { timeLimitRemainingSeconds: raw.timeLimitRemainingSeconds }
        : {}),
      ...(raw.timeLimitTotalSeconds !== undefined
        ? { timeLimitTotalSeconds: raw.timeLimitTotalSeconds }
        : {}),
      ...(raw.chimeraValidated !== undefined ? { chimeraValidated: raw.chimeraValidated } : {}),
      rewardBio: raw.rewardBio,
      rewardPr: raw.rewardPr,
      ...(raw.rewardMediumId !== undefined
        ? { rewardMediumId: raw.rewardMediumId as CultureMediumId }
        : {}),
      ...(raw.rewardMediumCount !== undefined ? { rewardMediumCount: raw.rewardMediumCount } : {}),
    },
  };
}

function validateContractBoard(
  raw: unknown
): ValidationResult<readonly [ContractBoardSlot, ContractBoardSlot, ContractBoardSlot]> {
  if (!Array.isArray(raw) || raw.length !== 3) {
    return fail(
      'CAPACITY_MISMATCH',
      'contractBoard doit contenir exactement 3 emplacements',
      'state.contractBoard'
    );
  }

  const slots: ContractBoardSlot[] = [];
  for (let i = 0; i < 3; i++) {
    const expectedIdx = i as 0 | 1 | 2;
    const item = raw[i];
    const path = `state.contractBoard[${String(i)}]`;
    if (!isPlainRecord(item) || item.slotIndex !== expectedIdx) {
      return fail('MALFORMED_STRUCTURE', 'Emplacement de contrat malformé', path);
    }

    if (item.status === 'RENEWING') {
      if (!isFiniteNumberInRange(item.renewalRemainingSeconds, 0)) {
        return fail(
          'INVALID_NUMBER',
          'renewalRemainingSeconds invalide',
          `${path}.renewalRemainingSeconds`
        );
      }
      slots.push({
        status: 'RENEWING',
        slotIndex: expectedIdx,
        renewalRemainingSeconds: item.renewalRemainingSeconds,
      });
    } else if (item.status === 'ACTIVE') {
      const contractCheck = validateProceduralContract(
        item.contract,
        expectedIdx,
        `${path}.contract`
      );
      if (!contractCheck.ok) {
        return contractCheck;
      }
      slots.push({
        status: 'ACTIVE',
        slotIndex: expectedIdx,
        contract: contractCheck.value,
      });
    } else {
      return fail(
        'MALFORMED_STRUCTURE',
        `Statut de slot contrat inconnu : ${String(item.status)}`,
        `${path}.status`
      );
    }
  }

  return {
    ok: true,
    value: [slots[0]!, slots[1]!, slots[2]!],
  };
}

function validateLogbook(raw: unknown): ValidationResult<LogbookState> {
  if (!isPlainRecord(raw)) {
    return fail('MALFORMED_STRUCTURE', 'logbook malformé', 'state.logbook');
  }
  if (!Array.isArray(raw.entries)) {
    return fail(
      'MALFORMED_STRUCTURE',
      'logbook.entries doit être un tableau',
      'state.logbook.entries'
    );
  }
  if (!Array.isArray(raw.hybridizationCodex)) {
    return fail(
      'MALFORMED_STRUCTURE',
      'logbook.hybridizationCodex doit être un tableau',
      'state.logbook.hybridizationCodex'
    );
  }
  if (typeof raw.freeNotesText !== 'string') {
    return fail(
      'MALFORMED_STRUCTURE',
      'logbook.freeNotesText doit être une chaîne',
      'state.logbook.freeNotesText'
    );
  }

  const sanitizedEntries: LogbookEntry[] = [];
  for (let i = 0; i < raw.entries.length; i++) {
    const entry = raw.entries[i];
    const path = `state.logbook.entries[${String(i)}]`;
    if (!isPlainRecord(entry)) {
      return fail('MALFORMED_STRUCTURE', 'Entrée de journal malformée', path);
    }
    if (typeof entry.id !== 'string' || typeof entry.timestampLabelFr !== 'string') {
      return fail('MALFORMED_STRUCTURE', 'Métadonnées entrée journal invalides', path);
    }
    if (
      typeof entry.category !== 'string' ||
      !VALID_LOGBOOK_CATEGORIES.has(entry.category as LogbookEntry['category'])
    ) {
      return fail('MALFORMED_STRUCTURE', 'Catégorie entrée journal invalide', `${path}.category`);
    }
    if (typeof entry.messageFr !== 'string') {
      return fail('MALFORMED_STRUCTURE', 'Message entrée journal invalide', `${path}.messageFr`);
    }
    sanitizedEntries.push({
      id: sanitizeResearcherNotes(entry.id).slice(0, 64),
      timestampLabelFr: sanitizeResearcherNotes(entry.timestampLabelFr).slice(0, 64),
      category: entry.category as LogbookEntry['category'],
      messageFr: sanitizeResearcherNotes(entry.messageFr).slice(0, 500),
    });
  }

  const sanitizedCodex: HybridizationCodexEntry[] = [];
  for (let i = 0; i < raw.hybridizationCodex.length; i++) {
    const codex = raw.hybridizationCodex[i];
    const path = `state.logbook.hybridizationCodex[${String(i)}]`;
    if (!isPlainRecord(codex)) {
      return fail('MALFORMED_STRUCTURE', 'Entrée codex hybridation malformée', path);
    }
    if (
      typeof codex.parentAStrainId !== 'string' ||
      !(codex.parentAStrainId in STRAINS_BY_ID) ||
      typeof codex.parentBStrainId !== 'string' ||
      !(codex.parentBStrainId in STRAINS_BY_ID)
    ) {
      return fail(
        'UNKNOWN_IDENTIFIER',
        'Parents du codex hybridation inconnus',
        `${path}.parentStrainIds`
      );
    }
    if (typeof codex.pairKey !== 'string' || codex.pairKey.length === 0) {
      return fail('MALFORMED_STRUCTURE', 'pairKey invalide', `${path}.pairKey`);
    }
    if (!isNonNegativeInteger(codex.attemptsCount) || !isNonNegativeInteger(codex.successesCount)) {
      return fail('INVALID_NUMBER', 'Compteurs codex invalides', path);
    }
    if (!Array.isArray(codex.observedOffspringStrainIds)) {
      return fail(
        'MALFORMED_STRUCTURE',
        'observedOffspringStrainIds doit être un tableau',
        `${path}.observedOffspringStrainIds`
      );
    }
    const offspringIds: string[] = [];
    for (const offId of codex.observedOffspringStrainIds) {
      if (typeof offId !== 'string' || !(offId in STRAINS_BY_ID)) {
        return fail(
          'UNKNOWN_IDENTIFIER',
          `Descendant codex inconnu : ${String(offId)}`,
          `${path}.observedOffspringStrainIds`
        );
      }
      offspringIds.push(offId);
    }
    sanitizedCodex.push({
      pairKey: sanitizeResearcherNotes(codex.pairKey).slice(0, 128),
      parentAStrainId: codex.parentAStrainId,
      parentBStrainId: codex.parentBStrainId,
      attemptsCount: codex.attemptsCount,
      successesCount: codex.successesCount,
      observedOffspringStrainIds: offspringIds,
    });
  }

  return {
    ok: true,
    value: {
      entries: sanitizedEntries,
      hybridizationCodex: sanitizedCodex,
      freeNotesText: sanitizeResearcherNotes(raw.freeNotesText),
    },
  };
}

function validateStats(raw: unknown): ValidationResult<LabStatistics> {
  if (!isPlainRecord(raw)) {
    return fail('MALFORMED_STRUCTURE', 'stats malformé', 'state.stats');
  }
  const requiredNumFields = [
    'totalBioEarned',
    'totalPrEarned',
    'totalManualSeedings',
    'totalManualInjections',
    'totalAutoclavedWaste',
    'totalRecycledWaste',
    'totalObservationSeconds',
  ] as const;

  for (const field of requiredNumFields) {
    if (!isFiniteNumberInRange(raw[field], 0)) {
      return fail('INVALID_NUMBER', `stats.${field} invalide ou négatif`, `state.stats.${field}`);
    }
  }

  if (!Array.isArray(raw.discoveredStrainIds)) {
    return fail(
      'MALFORMED_STRUCTURE',
      'discoveredStrainIds doit être un tableau',
      'state.stats.discoveredStrainIds'
    );
  }

  const discovered: string[] = [];
  const seen = new Set<string>();
  for (const id of raw.discoveredStrainIds) {
    if (typeof id !== 'string' || !(id in STRAINS_BY_ID)) {
      return fail(
        'UNKNOWN_IDENTIFIER',
        `Souche découverte inconnue : ${String(id)}`,
        'state.stats.discoveredStrainIds'
      );
    }
    if (!seen.has(id)) {
      seen.add(id);
      discovered.push(id);
    }
  }

  const optionalNumFields = [
    'totalScissiparitySuccesses',
    'totalMutagenesisSuccessesWithoutLysis',
    'totalConjugationsCompleted',
    'maxCryoFrozenDurationSeconds',
    'totalContractsCompleted',
    'totalCivilianContractsCompleted',
    'totalVitalUrgencyContractsCompleted',
  ] as const;

  for (const field of optionalNumFields) {
    if (raw[field] !== undefined && !isFiniteNumberInRange(raw[field], 0)) {
      return fail('INVALID_NUMBER', `stats.${field} invalide`, `state.stats.${field}`);
    }
  }

  const optionalBoolFields = [
    'hasMaturedLegendaryStrain',
    'hasStabilizedMythicWithoutCryo',
    'hasSurvivedUndervoltage',
  ] as const;

  for (const field of optionalBoolFields) {
    if (raw[field] !== undefined && typeof raw[field] !== 'boolean') {
      return fail(
        'MALFORMED_STRUCTURE',
        `stats.${field} doit être un booléen`,
        `state.stats.${field}`
      );
    }
  }

  return {
    ok: true,
    value: {
      totalBioEarned: raw.totalBioEarned as number,
      totalPrEarned: raw.totalPrEarned as number,
      totalManualSeedings: raw.totalManualSeedings as number,
      totalManualInjections: raw.totalManualInjections as number,
      totalAutoclavedWaste: raw.totalAutoclavedWaste as number,
      totalRecycledWaste: raw.totalRecycledWaste as number,
      totalObservationSeconds: raw.totalObservationSeconds as number,
      discoveredStrainIds: discovered,
      ...(raw.totalScissiparitySuccesses !== undefined
        ? { totalScissiparitySuccesses: raw.totalScissiparitySuccesses as number }
        : {}),
      ...(raw.totalMutagenesisSuccessesWithoutLysis !== undefined
        ? {
            totalMutagenesisSuccessesWithoutLysis:
              raw.totalMutagenesisSuccessesWithoutLysis as number,
          }
        : {}),
      ...(raw.totalConjugationsCompleted !== undefined
        ? { totalConjugationsCompleted: raw.totalConjugationsCompleted as number }
        : {}),
      ...(raw.maxCryoFrozenDurationSeconds !== undefined
        ? { maxCryoFrozenDurationSeconds: raw.maxCryoFrozenDurationSeconds as number }
        : {}),
      ...(raw.totalContractsCompleted !== undefined
        ? { totalContractsCompleted: raw.totalContractsCompleted as number }
        : {}),
      ...(raw.totalCivilianContractsCompleted !== undefined
        ? { totalCivilianContractsCompleted: raw.totalCivilianContractsCompleted as number }
        : {}),
      ...(raw.totalVitalUrgencyContractsCompleted !== undefined
        ? {
            totalVitalUrgencyContractsCompleted:
              raw.totalVitalUrgencyContractsCompleted as number,
          }
        : {}),
      ...(raw.hasMaturedLegendaryStrain !== undefined
        ? { hasMaturedLegendaryStrain: raw.hasMaturedLegendaryStrain as boolean }
        : {}),
      ...(raw.hasStabilizedMythicWithoutCryo !== undefined
        ? { hasStabilizedMythicWithoutCryo: raw.hasStabilizedMythicWithoutCryo as boolean }
        : {}),
      ...(raw.hasSurvivedUndervoltage !== undefined
        ? { hasSurvivedUndervoltage: raw.hasSurvivedUndervoltage as boolean }
        : {}),
    },
  };
}

/**
 * Valide intégralement un objet GameState inconnu, vérifie les bornes numériques,
 * les identifiants référentiels, la capacité physique et recalcule l'économie.
 */
export function validateGameState(input: unknown): ValidationResult<GameState> {
  if (hasPrototypePollutionKey(input)) {
    return fail(
      'PROTOTYPE_POLLUTION_DETECTED',
      'Tentative de pollution de prototype détectée dans la sauvegarde'
    );
  }

  if (!isPlainRecord(input)) {
    return fail('MALFORMED_STRUCTURE', "L'état du jeu doit être un objet JSON valide", 'state');
  }

  if (!isFiniteNumberInRange(input.bio, 0)) {
    return fail(
      'INVALID_NUMBER',
      'Solde Bio invalide, négatif ou non fini',
      'state.bio'
    );
  }

  if (!isFiniteNumberInRange(input.pr, 0)) {
    return fail('INVALID_NUMBER', 'Solde PR invalide, négatif ou non fini', 'state.pr');
  }

  if (
    typeof input.factoryTier !== 'number' ||
    !Number.isInteger(input.factoryTier) ||
    !(input.factoryTier in FACTORY_TIERS_BY_LEVEL)
  ) {
    return fail(
      'OUT_OF_BOUNDS',
      `Palier d'usine invalide : ${String(input.factoryTier)} (attendu 1..5)`,
      'state.factoryTier'
    );
  }
  const factoryTier = input.factoryTier as FactoryTierLevel;
  const tierDef = FACTORY_TIERS_BY_LEVEL[factoryTier];

  if (typeof input.isPaused !== 'boolean') {
    return fail('MALFORMED_STRUCTURE', 'isPaused doit être un booléen', 'state.isPaused');
  }
  if (typeof input.isUndervoltage !== 'boolean') {
    return fail(
      'MALFORMED_STRUCTURE',
      'isUndervoltage doit être un booléen',
      'state.isUndervoltage'
    );
  }
  if (typeof input.hasUnlockedCoelicolorExtraCryoSlot !== 'boolean') {
    return fail(
      'MALFORMED_STRUCTURE',
      'hasUnlockedCoelicolorExtraCryoSlot doit être un booléen',
      'state.hasUnlockedCoelicolorExtraCryoSlot'
    );
  }

  // Inventaire des milieux de culture
  if (!isPlainRecord(input.mediaInventory)) {
    return fail(
      'MALFORMED_STRUCTURE',
      'mediaInventory doit être un objet dictionnaire',
      'state.mediaInventory'
    );
  }
  const mediaInventoryKeys = Object.keys(input.mediaInventory);
  if (mediaInventoryKeys.length !== CULTURE_MEDIA.length) {
    return fail(
      'MALFORMED_STRUCTURE',
      'mediaInventory ne contient pas exactement les 7 milieux de culture',
      'state.mediaInventory'
    );
  }
  const validatedMediaInventory = {} as Record<CultureMediumId, number>;
  for (const key of mediaInventoryKeys) {
    if (!(key in CULTURE_MEDIA_BY_ID)) {
      return fail(
        'UNKNOWN_IDENTIFIER',
        `Milieu de culture inconnu dans mediaInventory : ${key}`,
        `state.mediaInventory.${key}`
      );
    }
    const count = input.mediaInventory[key];
    if (!isNonNegativeInteger(count)) {
      return fail(
        'INVALID_NUMBER',
        `Quantité invalide pour le milieu ${key}`,
        `state.mediaInventory.${key}`
      );
    }
    validatedMediaInventory[key as CultureMediumId] = count;
  }

  // Technologies débloquées
  if (!Array.isArray(input.unlockedTechIds)) {
    return fail(
      'MALFORMED_STRUCTURE',
      'unlockedTechIds doit être un tableau',
      'state.unlockedTechIds'
    );
  }
  const unlockedTechIds: TechId[] = [];
  const seenTechs = new Set<string>();
  for (const rawTech of input.unlockedTechIds) {
    if (typeof rawTech !== 'string' || !(rawTech in TECH_BY_ID)) {
      return fail(
        'UNKNOWN_IDENTIFIER',
        `Technologie inconnue : ${String(rawTech)}`,
        'state.unlockedTechIds'
      );
    }
    if (!seenTechs.has(rawTech)) {
      seenTechs.add(rawTech);
      unlockedTechIds.push(rawTech as TechId);
    }
  }

  // Trophées débloqués
  if (!Array.isArray(input.unlockedTrophyIds)) {
    return fail(
      'MALFORMED_STRUCTURE',
      'unlockedTrophyIds doit être un tableau',
      'state.unlockedTrophyIds'
    );
  }
  const unlockedTrophyIds: TrophyId[] = [];
  const seenTrophies = new Set<string>();
  for (const rawTrophy of input.unlockedTrophyIds) {
    if (typeof rawTrophy !== 'string' || !(rawTrophy in TROPHIES_BY_ID)) {
      return fail(
        'UNKNOWN_IDENTIFIER',
        `Trophée inconnu : ${String(rawTrophy)}`,
        'state.unlockedTrophyIds'
      );
    }
    if (!seenTrophies.has(rawTrophy)) {
      seenTrophies.add(rawTrophy);
      unlockedTrophyIds.push(rawTrophy as TrophyId);
    }
  }

  // Validation des emplacements d'incubateurs par rapport au palier d'usine
  if (!Array.isArray(input.incubatorSlots)) {
    return fail(
      'MALFORMED_STRUCTURE',
      'incubatorSlots doit être un tableau',
      'state.incubatorSlots'
    );
  }
  if (input.incubatorSlots.length !== tierDef.incubatorSlots) {
    return fail(
      'CAPACITY_MISMATCH',
      `Nombre d'incubateurs incohérent pour le palier ${String(factoryTier)} (${String(input.incubatorSlots.length)} != ${String(tierDef.incubatorSlots)})`,
      'state.incubatorSlots'
    );
  }
  const incubatorSlots: IncubatorSlot[] = [];
  for (let i = 0; i < input.incubatorSlots.length; i++) {
    const slotRes = validateIncubatorSlot(
      input.incubatorSlots[i],
      i,
      `state.incubatorSlots[${String(i)}]`
    );
    if (!slotRes.ok) {
      return slotRes;
    }
    incubatorSlots.push(slotRes.value);
  }

  // Validation des cryo-tubes (capacité palier + bonus Streptomyces coelicolor éventuel)
  if (!Array.isArray(input.cryoSlots)) {
    return fail('MALFORMED_STRUCTURE', 'cryoSlots doit être un tableau', 'state.cryoSlots');
  }
  const expectedCryoCount =
    tierDef.cryoTubeSlots + (input.hasUnlockedCoelicolorExtraCryoSlot ? 1 : 0);
  if (input.cryoSlots.length !== expectedCryoCount) {
    return fail(
      'CAPACITY_MISMATCH',
      `Nombre de cryo-tubes incohérent (${String(input.cryoSlots.length)} != ${String(expectedCryoCount)})`,
      'state.cryoSlots'
    );
  }
  const cryoSlots: CryoTubeSlot[] = [];
  for (let i = 0; i < input.cryoSlots.length; i++) {
    const cryoRes = validateCryoSlot(input.cryoSlots[i], i, `state.cryoSlots[${String(i)}]`);
    if (!cryoRes.ok) {
      return cryoRes;
    }
    cryoSlots.push(cryoRes.value);
  }

  const bioreactorRes = validateBioreactorTasks(input.bioreactorTasks);
  if (!bioreactorRes.ok) {
    return bioreactorRes;
  }

  const benchEventRes = validateActiveBenchEvent(input.activeBenchEvent);
  if (!benchEventRes.ok) {
    return benchEventRes;
  }

  if (!isFiniteNumberInRange(input.nextBenchEventSpawnTimerSeconds, 0)) {
    return fail(
      'INVALID_NUMBER',
      'nextBenchEventSpawnTimerSeconds invalide',
      'state.nextBenchEventSpawnTimerSeconds'
    );
  }

  const benchBuffsRes = validateBenchBuffs(input.benchBuffs);
  if (!benchBuffsRes.ok) {
    return benchBuffsRes;
  }

  const contractBoardRes = validateContractBoard(input.contractBoard);
  if (!contractBoardRes.ok) {
    return contractBoardRes;
  }

  if (!isNonNegativeInteger(input.nextContractSerial) || input.nextContractSerial < 1) {
    return fail(
      'INVALID_NUMBER',
      'nextContractSerial doit être un entier >= 1',
      'state.nextContractSerial'
    );
  }

  const logbookRes = validateLogbook(input.logbook);
  if (!logbookRes.ok) {
    return logbookRes;
  }

  const statsRes = validateStats(input.stats);
  if (!statsRes.ok) {
    return statsRes;
  }

  const baseValidatedState: GameState = {
    bio: input.bio,
    pr: input.pr,
    factoryTier,
    isPaused: input.isPaused,
    isUndervoltage: input.isUndervoltage,
    mediaInventory: validatedMediaInventory,
    incubatorSlots,
    cryoSlots,
    unlockedTechIds,
    unlockedTrophyIds,
    hasUnlockedCoelicolorExtraCryoSlot: input.hasUnlockedCoelicolorExtraCryoSlot,
    bioreactorTasks: bioreactorRes.value,
    activeBenchEvent: benchEventRes.value,
    nextBenchEventSpawnTimerSeconds: input.nextBenchEventSpawnTimerSeconds,
    benchBuffs: benchBuffsRes.value,
    contractBoard: contractBoardRes.value,
    nextContractSerial: input.nextContractSerial,
    logbook: logbookRes.value,
    economy: {
      grossBioPerSec: 0,
      passivePrPerSec: 0,
      fixedOverheadBioPerSec: 0,
      cryoUpkeepBioPerSec: 0,
      netBioPerSec: 0,
      slotEffectiveBioPerSec: [],
    },
    stats: statsRes.value,
  };

  // Recalcul systématique de l'économie pour empêcher toute falsification des flux
  const finalState: GameState = {
    ...baseValidatedState,
    economy: evaluateEconomySnapshot(baseValidatedState),
  };
  return {
    ok: true,
    value: finalState,
  };
}

/**
 * Valide une enveloppe de sauvegarde complète (magic, schemaVersion, checksum et GameState).
 */
export function validateSaveEnvelope(
  input: unknown,
  options: { readonly verifyChecksum?: boolean } = {}
): ValidationResult<SaveEnvelope> {
  const verifyChecksum = options.verifyChecksum ?? true;

  if (hasPrototypePollutionKey(input)) {
    return fail(
      'PROTOTYPE_POLLUTION_DETECTED',
      'Tentative de pollution de prototype détectée dans la sauvegarde'
    );
  }

  if (!isPlainRecord(input)) {
    return fail('INVALID_ENVELOPE', "L'enveloppe de sauvegarde est invalide", 'envelope');
  }

  if (input.magic !== SAVE_MAGIC) {
    return fail(
      'INVALID_ENVELOPE',
      `Signature de sauvegarde invalide : ${String(input.magic)}`,
      'envelope.magic'
    );
  }

  if (input.schemaVersion !== CURRENT_SAVE_SCHEMA_VERSION) {
    return fail(
      'UNSUPPORTED_VERSION',
      `Version de schéma non supportée : ${String(input.schemaVersion)}`,
      'envelope.schemaVersion'
    );
  }

  if (typeof input.savedAtIso !== 'string' || input.savedAtIso.length === 0) {
    return fail('INVALID_ENVELOPE', 'Horodatage savedAtIso invalide', 'envelope.savedAtIso');
  }

  if (
    typeof input.slotId !== 'string' ||
    input.slotId.length === 0 ||
    input.slotId.length > 64 ||
    !/^[a-zA-Z0-9_-]+$/.test(input.slotId)
  ) {
    return fail('INVALID_ENVELOPE', 'Identifiant de slot invalide', 'envelope.slotId');
  }

  if (typeof input.checksum !== 'string' || !/^[0-9a-f]{8}$/.test(input.checksum)) {
    return fail('INVALID_ENVELOPE', 'Format de checksum invalide', 'envelope.checksum');
  }

  const stateRes = validateGameState(input.state);
  if (!stateRes.ok) {
    return stateRes;
  }

  const expectedChecksum = computeStateChecksum(stateRes.value);
  if (verifyChecksum && input.checksum !== expectedChecksum) {
    return fail(
      'CHECKSUM_MISMATCH',
      `Somme de contrôle (checksum) invalide : la sauvegarde a été altérée ou corrompue (${input.checksum} != ${expectedChecksum})`,
      'envelope.checksum'
    );
  }

  return {
    ok: true,
    value: {
      magic: SAVE_MAGIC,
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      savedAtIso: sanitizeResearcherNotes(input.savedAtIso).slice(0, 64),
      slotId: input.slotId,
      checksum: expectedChecksum,
      state: stateRes.value,
    },
  };
}

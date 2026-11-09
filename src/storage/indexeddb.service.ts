import type { GameState } from '../types/game-state.types.ts';
import type { FactoryTierLevel } from '../types/game.types.ts';
import {
  CURRENT_SAVE_SCHEMA_VERSION,
  MAX_IMPORT_JSON_BYTES,
  SAVE_MAGIC,
  computeStateChecksum,
  validateGameState,
  validateSaveEnvelope,
  type SaveEnvelope,
  type ValidationResult,
} from './validator.ts';

export const BIOLAB_DB_NAME = 'biolab_db';
export const BIOLAB_DB_VERSION = 1;
export const BIOLAB_SAVES_STORE = 'saves';
export const DEFAULT_AUTOSAVE_SLOT_ID = 'autosave';

export interface SaveSlotSummary {
  readonly slotId: string;
  readonly savedAtIso: string;
  readonly bio: number;
  readonly pr: number;
  readonly factoryTier: FactoryTierLevel;
  readonly discoveredStrainsCount: number;
  readonly unlockedTrophiesCount: number;
}

export interface StorageBackend {
  get(slotId: string): Promise<unknown | undefined>;
  put(slotId: string, envelope: SaveEnvelope): Promise<void>;
  delete(slotId: string): Promise<void>;
  clear(): Promise<void>;
  getAll(): Promise<readonly unknown[]>;
}

/**
 * Backend en mémoire utilisé automatiquement en environnement de test Node.js
 * ou lorsque IndexedDB est indisponible dans le navigateur.
 */
export class InMemoryStorageBackend implements StorageBackend {
  private readonly store = new Map<string, SaveEnvelope>();

  public async get(slotId: string): Promise<unknown | undefined> {
    const entry = this.store.get(slotId);
    if (!entry) {
      return undefined;
    }
    return JSON.parse(JSON.stringify(entry)) as unknown;
  }

  public async put(slotId: string, envelope: SaveEnvelope): Promise<void> {
    this.store.set(slotId, JSON.parse(JSON.stringify(envelope)) as SaveEnvelope);
  }

  public async delete(slotId: string): Promise<void> {
    this.store.delete(slotId);
  }

  public async clear(): Promise<void> {
    this.store.clear();
  }

  public async getAll(): Promise<readonly unknown[]> {
    return Array.from(this.store.values()).map(
      (entry) => JSON.parse(JSON.stringify(entry)) as unknown
    );
  }
}

/**
 * Backend IndexedDB natif pour la persistance locale dans le navigateur.
 */
export class IndexedDbStorageBackend implements StorageBackend {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }
    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = globalThis.indexedDB.open(BIOLAB_DB_NAME, BIOLAB_DB_VERSION);
      request.onupgradeneeded = (): void => {
        const db = request.result;
        if (!db.objectStoreNames.contains(BIOLAB_SAVES_STORE)) {
          db.createObjectStore(BIOLAB_SAVES_STORE, { keyPath: 'slotId' });
        }
      };
      request.onsuccess = (): void => {
        resolve(request.result);
      };
      request.onerror = (): void => {
        reject(request.error ?? new Error("Impossible d'ouvrir la base IndexedDB biolab_db"));
      };
    });
    return this.dbPromise;
  }

  public async get(slotId: string): Promise<unknown | undefined> {
    const db = await this.openDb();
    return new Promise<unknown | undefined>((resolve, reject) => {
      const tx = db.transaction(BIOLAB_SAVES_STORE, 'readonly');
      const store = tx.objectStore(BIOLAB_SAVES_STORE);
      const req = store.get(slotId);
      req.onsuccess = (): void => resolve(req.result as unknown | undefined);
      req.onerror = (): void =>
        reject(req.error ?? new Error(`Erreur de lecture IndexedDB (${slotId})`));
    });
  }

  public async put(slotId: string, envelope: SaveEnvelope): Promise<void> {
    const db = await this.openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BIOLAB_SAVES_STORE, 'readwrite');
      const store = tx.objectStore(BIOLAB_SAVES_STORE);
      const req = store.put({ ...envelope, slotId });
      req.onsuccess = (): void => resolve();
      req.onerror = (): void =>
        reject(req.error ?? new Error(`Erreur d'écriture IndexedDB (${slotId})`));
    });
  }

  public async delete(slotId: string): Promise<void> {
    const db = await this.openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BIOLAB_SAVES_STORE, 'readwrite');
      const store = tx.objectStore(BIOLAB_SAVES_STORE);
      const req = store.delete(slotId);
      req.onsuccess = (): void => resolve();
      req.onerror = (): void =>
        reject(req.error ?? new Error(`Erreur de suppression IndexedDB (${slotId})`));
    });
  }

  public async clear(): Promise<void> {
    const db = await this.openDb();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BIOLAB_SAVES_STORE, 'readwrite');
      const store = tx.objectStore(BIOLAB_SAVES_STORE);
      const req = store.clear();
      req.onsuccess = (): void => resolve();
      req.onerror = (): void =>
        reject(req.error ?? new Error('Erreur de vidage IndexedDB'));
    });
  }

  public async getAll(): Promise<readonly unknown[]> {
    const db = await this.openDb();
    return new Promise<readonly unknown[]>((resolve, reject) => {
      const tx = db.transaction(BIOLAB_SAVES_STORE, 'readonly');
      const store = tx.objectStore(BIOLAB_SAVES_STORE);
      const req = store.getAll();
      req.onsuccess = (): void => resolve((req.result as unknown[]) ?? []);
      req.onerror = (): void =>
        reject(req.error ?? new Error('Erreur de listage IndexedDB'));
    });
  }
}

/**
 * Construit et valide une enveloppe de sauvegarde complète à partir d'un GameState.
 */
export function createSaveEnvelope(
  state: GameState,
  slotId: string = DEFAULT_AUTOSAVE_SLOT_ID
): ValidationResult<SaveEnvelope> {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(slotId)) {
    return {
      ok: false,
      errorCode: 'INVALID_ENVELOPE',
      errorMessageFr: `Identifiant de slot invalide : ${slotId}`,
      fieldPath: 'envelope.slotId',
    };
  }

  const validatedStateRes = validateGameState(state);
  if (!validatedStateRes.ok) {
    return validatedStateRes;
  }

  const validatedState = validatedStateRes.value;
  const checksum = computeStateChecksum(validatedState);

  return {
    ok: true,
    value: {
      magic: SAVE_MAGIC,
      schemaVersion: CURRENT_SAVE_SCHEMA_VERSION,
      savedAtIso: new Date().toISOString(),
      slotId,
      checksum,
      state: validatedState,
    },
  };
}

/**
 * Exporte un GameState sous forme de chaîne JSON indentée et signée par checksum.
 */
export function exportSaveToJson(
  state: GameState,
  slotId: string = DEFAULT_AUTOSAVE_SLOT_ID
): ValidationResult<string> {
  const envelopeRes = createSaveEnvelope(state, slotId);
  if (!envelopeRes.ok) {
    return envelopeRes;
  }
  return {
    ok: true,
    value: JSON.stringify(envelopeRes.value, null, 2),
  };
}

const FORBIDDEN_RAW_JSON_KEY_REGEX = /"(?:__proto__|constructor|prototype)"\s*:/;

/**
 * Importe et valide strictement une chaîne JSON externe en vérifiant :
 * 1. La taille maximale (<= 512 Ko)
 * 2. L'absence de clés de pollution de prototype dans le texte brut
 * 3. La syntaxe JSON
 * 4. L'enveloppe, le checksum FNV-1a et toutes les contraintes de GameState
 */
export function importSaveFromJson(
  rawJson: string,
  options: { readonly verifyChecksum?: boolean } = {}
): ValidationResult<GameState> {
  if (typeof rawJson !== 'string' || rawJson.trim().length === 0) {
    return {
      ok: false,
      errorCode: 'INVALID_JSON',
      errorMessageFr: 'Le contenu JSON importé est vide ou invalide',
    };
  }

  if (rawJson.length > MAX_IMPORT_JSON_BYTES) {
    return {
      ok: false,
      errorCode: 'PAYLOAD_TOO_LARGE',
      errorMessageFr: `Fichier de sauvegarde trop volumineux (${String(rawJson.length)} octets > ${String(MAX_IMPORT_JSON_BYTES)} octets max)`,
    };
  }

  if (FORBIDDEN_RAW_JSON_KEY_REGEX.test(rawJson)) {
    return {
      ok: false,
      errorCode: 'PROTOTYPE_POLLUTION_DETECTED',
      errorMessageFr: 'Clé interdite (__proto__, constructor ou prototype) détectée dans le JSON',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      errorCode: 'INVALID_JSON',
      errorMessageFr: 'Syntaxe JSON invalide ou fichier tronqué',
    };
  }

  const envelopeRes = validateSaveEnvelope(parsed, options);
  if (!envelopeRes.ok) {
    return envelopeRes;
  }

  return {
    ok: true,
    value: envelopeRes.value.state,
  };
}

/**
 * Service principal de persistance BIOLAB (IndexedDB + Fallback mémoire automatique).
 */
export class BioLabStorageService {
  private readonly backend: StorageBackend;

  public constructor(customBackend?: StorageBackend) {
    if (customBackend) {
      this.backend = customBackend;
    } else if (typeof globalThis.indexedDB !== 'undefined') {
      this.backend = new IndexedDbStorageBackend();
    } else {
      this.backend = new InMemoryStorageBackend();
    }
  }

  /**
   * Valide et sauvegarde l'état du jeu dans le slot spécifié (par défaut 'autosave').
   */
  public async saveGame(
    state: GameState,
    slotId: string = DEFAULT_AUTOSAVE_SLOT_ID
  ): Promise<ValidationResult<SaveEnvelope>> {
    const envelopeRes = createSaveEnvelope(state, slotId);
    if (!envelopeRes.ok) {
      return envelopeRes;
    }
    await this.backend.put(slotId, envelopeRes.value);
    return envelopeRes;
  }

  /**
   * Charge et valide une sauvegarde depuis le slot spécifié (par défaut 'autosave').
   */
  public async loadGame(
    slotId: string = DEFAULT_AUTOSAVE_SLOT_ID,
    options: { readonly verifyChecksum?: boolean } = {}
  ): Promise<ValidationResult<GameState>> {
    const rawRecord = await this.backend.get(slotId);
    if (rawRecord === undefined) {
      return {
        ok: false,
        errorCode: 'INVALID_ENVELOPE',
        errorMessageFr: `Aucune sauvegarde trouvée dans l'emplacement '${slotId}'`,
        fieldPath: 'slotId',
      };
    }

    const validatedEnvelope = validateSaveEnvelope(rawRecord, options);
    if (!validatedEnvelope.ok) {
      return validatedEnvelope;
    }

    return {
      ok: true,
      value: validatedEnvelope.value.state,
    };
  }

  /**
   * Supprime une sauvegarde spécifique.
   */
  public async deleteSave(slotId: string = DEFAULT_AUTOSAVE_SLOT_ID): Promise<void> {
    await this.backend.delete(slotId);
  }

  /**
   * Supprime toutes les sauvegardes stockées.
   */
  public async clearAllSaves(): Promise<void> {
    await this.backend.clear();
  }

  /**
   * Liste les résumés de toutes les sauvegardes valides présentes dans la base.
   */
  public async listSaves(): Promise<readonly SaveSlotSummary[]> {
    const allRaw = await this.backend.getAll();
    const summaries: SaveSlotSummary[] = [];

    for (const raw of allRaw) {
      const check = validateSaveEnvelope(raw);
      if (check.ok) {
        const env = check.value;
        summaries.push({
          slotId: env.slotId,
          savedAtIso: env.savedAtIso,
          bio: env.state.bio,
          pr: env.state.pr,
          factoryTier: env.state.factoryTier,
          discoveredStrainsCount: env.state.stats.discoveredStrainIds.length,
          unlockedTrophiesCount: env.state.unlockedTrophyIds.length,
        });
      }
    }

    return summaries.sort((a, b) => b.savedAtIso.localeCompare(a.savedAtIso));
  }
}

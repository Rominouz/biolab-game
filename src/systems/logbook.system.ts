import { STRAINS_BY_ID } from '../data/strains.data.ts';
import type { SimulationEvent } from '../core/event-bus.ts';
import type { GameState } from '../types/game-state.types.ts';
import type { HybridizationCodexEntry, LogbookEntry } from '../types/meta.types.ts';

const MAX_FREE_NOTES_LENGTH = 10_000;

/**
 * Formate une étiquette d'horodatage rétro années 80 basée sur le temps d'observation du labo.
 */
export function formatRetroLabTimestamp(observationSeconds: number): string {
  const baseDay = 12 + Math.floor(observationSeconds / 3600);
  const totalMinutes = Math.floor(observationSeconds / 60);
  const hours = (14 + Math.floor(totalMinutes / 60)) % 24;
  const minutes = (22 + (totalMinutes % 60)) % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `[${String(baseDay)} Octobre - ${pad(hours)}:${pad(minutes)}]`;
}

/**
 * Assainit le texte libre du chercheur (aucune balise HTML, longueur bornée) conformément aux règles de sécurité.
 */
export function sanitizeResearcherNotes(rawText: string): string {
  const withoutTags = rawText.replace(/[<>]/g, '');
  return withoutTags.slice(0, MAX_FREE_NOTES_LENGTH);
}

/**
 * Met à jour le Bloc-Notes Libre du Chercheur (Page droite du Journal de Bord).
 */
export function updateLogbookFreeNotes(state: GameState, newNotes: string): GameState {
  return {
    ...state,
    logbook: {
      ...state.logbook,
      freeNotesText: sanitizeResearcherNotes(newNotes),
    },
  };
}

/**
 * Enregistre un essai d'hybridation (Conjugaison) dans le Manuel d'Hybridation (Codex Découvert).
 */
export function recordHybridizationInCodex(
  state: GameState,
  parentAStrainId: string,
  parentBStrainId: string,
  offspringStrainId?: string
): GameState {
  const sortedIds = [parentAStrainId, parentBStrainId].sort();
  const pA = sortedIds[0]!;
  const pB = sortedIds[1]!;
  const pairKey = `${pA}__${pB}`;

  const existingIdx = state.logbook.hybridizationCodex.findIndex((c) => c.pairKey === pairKey);
  const updatedCodex: HybridizationCodexEntry[] = [...state.logbook.hybridizationCodex];

  if (existingIdx === -1) {
    updatedCodex.push({
      pairKey,
      parentAStrainId: pA,
      parentBStrainId: pB,
      attemptsCount: 1,
      successesCount: offspringStrainId ? 1 : 0,
      observedOffspringStrainIds: offspringStrainId ? [offspringStrainId] : [],
    });
  } else {
    const existing = updatedCodex[existingIdx]!;
    const nextOffspring =
      offspringStrainId && !existing.observedOffspringStrainIds.includes(offspringStrainId)
        ? [...existing.observedOffspringStrainIds, offspringStrainId]
        : existing.observedOffspringStrainIds;

    updatedCodex[existingIdx] = {
      ...existing,
      attemptsCount: existing.attemptsCount + 1,
      successesCount: existing.successesCount + (offspringStrainId ? 1 : 0),
      observedOffspringStrainIds: nextOffspring,
    };
  }

  return {
    ...state,
    logbook: {
      ...state.logbook,
      hybridizationCodex: updatedCodex,
    },
  };
}

/**
 * Fonction d'Encre d'Archivage (Automatique) :
 * Inspecte les nouveaux événements émis et rédige automatiquement une phrase d'époque datée
 * dans les Annales Automatiques (Page gauche du Journal de Bord).
 */
export function appendAutomaticLogbookEntriesFromEvents(
  state: GameState,
  events: readonly SimulationEvent[]
): GameState {
  if (events.length === 0) {
    return state;
  }

  const newEntries: LogbookEntry[] = [];
  const timestamp = formatRetroLabTimestamp(state.stats.totalObservationSeconds);
  let nextEntryNumber = state.logbook.entries.length + 1;

  for (const ev of events) {
    if (ev.type === 'COLONY_SEEDED' && ev.isNewDiscovery) {
      const strain = STRAINS_BY_ID[ev.strainId];
      if (strain) {
        newEntries.push({
          id: `LOG_${String(nextEntryNumber++)}`,
          timestampLabelFr: timestamp,
          category: 'DISCOVERY',
          messageFr: `Première colonie de ${strain.scientificName} isolée (${strain.rarity}). ${strain.effect.descriptionFr}`,
        });
      }
    } else if (
      ev.type === 'DIVISION_COMPLETED' &&
      (ev.outcome === 'SPONTANEOUS_MUTATION' ||
        ev.outcome === 'SUPER_JUMP_MUTATION' ||
        ev.outcome === 'MYTHIC_CHIMERA') &&
      ev.resultingStrainId
    ) {
      const strain = STRAINS_BY_ID[ev.resultingStrainId];
      if (strain) {
        newEntries.push({
          id: `LOG_${String(nextEntryNumber++)}`,
          timestampLabelFr: timestamp,
          category: 'MUTATION',
          messageFr: `Rupture de chaîne ADN validée (${ev.method}). Émergence de ${strain.scientificName}.`,
        });
      }
    } else if (ev.type === 'UNDERVOLTAGE_CHANGED' && !ev.isUndervoltage) {
      newEntries.push({
        id: `LOG_${String(nextEntryNumber++)}`,
        timestampLabelFr: timestamp,
        category: 'UNDERVOLTAGE_SURVIVAL',
        messageFr:
          'Tension nominale rétablie sur le réseau du laboratoire après un épisode de sous-tension.',
      });
    } else if (ev.type === 'TROPHY_UNLOCKED') {
      newEntries.push({
        id: `LOG_${String(nextEntryNumber++)}`,
        timestampLabelFr: timestamp,
        category: 'TROPHY',
        messageFr: `Distinction scientifique ajoutée à l'Armoire : ${ev.nameFr}.`,
      });
    }
  }

  if (newEntries.length === 0) {
    return state;
  }

  return {
    ...state,
    logbook: {
      ...state.logbook,
      entries: [...state.logbook.entries, ...newEntries],
    },
  };
}

import {
  createEventBus,
  type EventBus,
  type SimulationEvent,
} from '../core/event-bus.ts';
import { advanceSimulation } from '../core/game-loop.ts';
import { createInitialGameState } from '../core/initial-state.ts';
import { createSeededRng, type RngService } from '../core/rng.ts';
import type { GameState } from '../types/game-state.types.ts';
import type { BenchEventId, TechId } from '../types/game.types.ts';
import { completeContract } from './contracts.system.ts';
import { moveColonyToCryoTube, thawColonyFromCryoTube } from './cryo.system.ts';
import {
  performConjugation,
  performMutagenesis,
  performScissiparity,
} from './division.system.ts';
import { evaluateEconomySnapshot } from './economy.system.ts';
import { interactWithBenchEvent, spawnBenchEvent } from './events.system.ts';
import { upgradeFactoryTier } from './factory.system.ts';
import {
  injectManualNutrients,
  seedIncubatorSlot,
  type SeedColonyOptions,
} from './incubator.system.ts';
import {
  appendAutomaticLogbookEntriesFromEvents,
  updateLogbookFreeNotes,
} from './logbook.system.ts';
import { unlockTech } from './tech.system.ts';
import { evaluateAndUnlockTrophies } from './trophies.system.ts';
import {
  evacuateWasteWithFlashAutoclave,
  startBioreactorRecycling,
} from './waste.system.ts';

export interface SimulationEngine {
  getState(): GameState;
  getEventBus(): EventBus;
  tick(deltaSeconds: number): GameState;
  setPaused(paused: boolean): GameState;
  seedColony(options: SeedColonyOptions): GameState;
  injectNutrients(slotIndex: number): GameState;
  flashAutoclaveWaste(slotIndex: number): GameState;
  recycleWasteInBioreactor(slotIndex: number): GameState;
  freezeColony(fromSlotIndex: number, toTubeIndex: number): GameState;
  thawColony(fromTubeIndex: number, toSlotIndex: number): GameState;
  scissiparity(sourceSlotIndex: number, targetSlotIndex: number): GameState;
  mutagenesis(sourceSlotIndex: number, targetSlotIndex: number): GameState;
  conjugate(parentSlotIndices: readonly number[], targetSlotIndex: number): GameState;
  unlockTechnology(techId: TechId): GameState;
  upgradeFactory(): GameState;
  triggerBenchEvent(forcedEventId?: BenchEventId): GameState;
  clickActiveBenchEvent(): GameState;
  validateContract(boardSlotIndex: 0 | 1 | 2, targetIncubatorSlotIndex?: number): GameState;
  setResearcherNotes(notesText: string): GameState;
}

export function createSimulationEngine(options?: {
  readonly initialState?: GameState;
  readonly seed?: number;
  readonly eventBus?: EventBus;
}): SimulationEngine {
  const seed = options?.seed ?? 1984_0042;
  const rng: RngService = createSeededRng(seed);
  const eventBus: EventBus = options?.eventBus ?? createEventBus();
  let state: GameState = options?.initialState ?? createInitialGameState(seed);

  // Tampon d'événements pour alimenter automatiquement l'Encre d'Archivage du Journal de Bord
  const pendingLogEvents: SimulationEvent[] = [];
  eventBus.subscribe((ev) => {
    pendingLogEvents.push(ev);
  });

  function finalizeStateTransition(): GameState {
    state = evaluateAndUnlockTrophies(state, eventBus);
    state = {
      ...state,
      economy: evaluateEconomySnapshot(state),
    };
    state = evaluateAndUnlockTrophies(state, eventBus);
    if (pendingLogEvents.length > 0) {
      const drained = pendingLogEvents.splice(0, pendingLogEvents.length);
      state = appendAutomaticLogbookEntriesFromEvents(state, drained);
    }
    return state;
  }

  return {
    getState(): GameState {
      return state;
    },
    getEventBus(): EventBus {
      return eventBus;
    },
    tick(deltaSeconds: number): GameState {
      state = advanceSimulation(state, deltaSeconds, eventBus, rng);
      return finalizeStateTransition();
    },
    setPaused(paused: boolean): GameState {
      state = {
        ...state,
        isPaused: paused,
      };
      return finalizeStateTransition();
    },
    seedColony(seedOptions: SeedColonyOptions): GameState {
      state = seedIncubatorSlot(state, seedOptions, rng, eventBus);
      return finalizeStateTransition();
    },
    injectNutrients(slotIndex: number): GameState {
      state = injectManualNutrients(state, slotIndex, eventBus);
      return finalizeStateTransition();
    },
    flashAutoclaveWaste(slotIndex: number): GameState {
      state = evacuateWasteWithFlashAutoclave(state, slotIndex, eventBus);
      return finalizeStateTransition();
    },
    recycleWasteInBioreactor(slotIndex: number): GameState {
      state = startBioreactorRecycling(state, slotIndex, eventBus);
      return finalizeStateTransition();
    },
    freezeColony(fromSlotIndex: number, toTubeIndex: number): GameState {
      state = moveColonyToCryoTube(state, fromSlotIndex, toTubeIndex, eventBus);
      return finalizeStateTransition();
    },
    thawColony(fromTubeIndex: number, toSlotIndex: number): GameState {
      state = thawColonyFromCryoTube(state, fromTubeIndex, toSlotIndex, eventBus);
      return finalizeStateTransition();
    },
    scissiparity(sourceSlotIndex: number, targetSlotIndex: number): GameState {
      state = performScissiparity(state, sourceSlotIndex, targetSlotIndex, rng, eventBus);
      return finalizeStateTransition();
    },
    mutagenesis(sourceSlotIndex: number, targetSlotIndex: number): GameState {
      state = performMutagenesis(state, sourceSlotIndex, targetSlotIndex, rng, eventBus);
      return finalizeStateTransition();
    },
    conjugate(parentSlotIndices: readonly number[], targetSlotIndex: number): GameState {
      state = performConjugation(state, parentSlotIndices, targetSlotIndex, rng, eventBus);
      return finalizeStateTransition();
    },
    unlockTechnology(techId: TechId): GameState {
      state = unlockTech(state, techId, eventBus);
      return finalizeStateTransition();
    },
    upgradeFactory(): GameState {
      state = upgradeFactoryTier(state, eventBus);
      return finalizeStateTransition();
    },
    triggerBenchEvent(forcedEventId?: BenchEventId): GameState {
      state = spawnBenchEvent(state, rng, forcedEventId, eventBus);
      return finalizeStateTransition();
    },
    clickActiveBenchEvent(): GameState {
      state = interactWithBenchEvent(state, rng, eventBus);
      return finalizeStateTransition();
    },
    validateContract(boardSlotIndex: 0 | 1 | 2, targetIncubatorSlotIndex?: number): GameState {
      state = completeContract(state, boardSlotIndex, targetIncubatorSlotIndex, eventBus);
      return finalizeStateTransition();
    },
    setResearcherNotes(notesText: string): GameState {
      state = updateLogbookFreeNotes(state, notesText);
      return state;
    },
  };
}

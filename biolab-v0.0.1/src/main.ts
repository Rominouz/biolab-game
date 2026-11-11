import {
  BENCH_EVENTS,
  CULTURE_MEDIA,
  FACTORY_TIERS,
  GAME_CONSTANTS,
  STRAINS,
  TECH_TREE,
  TROPHIES,
} from './data/index.ts';
import { BioLabAppController } from './ui/app-controller.ts';

export * from './audio/retro-audio.service.ts';
export * from './core/event-bus.ts';
export * from './core/game-loop.ts';
export * from './core/initial-state.ts';
export * from './core/math.ts';
export * from './core/rng.ts';
export * from './data/index.ts';
export * from './render/factory-cross-section.renderer.ts';
export * from './render/petri-canvas.renderer.ts';
export * from './storage/indexeddb.service.ts';
export * from './storage/validator.ts';
export * from './systems/contracts.system.ts';
export * from './systems/cryo.system.ts';
export * from './systems/division.system.ts';
export * from './systems/economy.system.ts';
export * from './systems/events.system.ts';
export * from './systems/factory.system.ts';
export * from './systems/incubator.system.ts';
export * from './systems/logbook.system.ts';
export * from './systems/simulation-engine.ts';
export * from './systems/tech.system.ts';
export * from './systems/trophies.system.ts';
export * from './systems/waste.system.ts';
export * from './types/game-state.types.ts';
export * from './types/game.types.ts';
export * from './types/meta.types.ts';
export * from './ui/app-controller.ts';

export function getStaticCatalogSummary(): {
  readonly mediaCount: number;
  readonly strainsCount: number;
  readonly factoryTiersCount: number;
  readonly techCount: number;
  readonly trophiesCount: number;
  readonly eventsCount: number;
  readonly startingBio: number;
} {
  return {
    mediaCount: CULTURE_MEDIA.length,
    strainsCount: STRAINS.length,
    factoryTiersCount: FACTORY_TIERS.length,
    techCount: TECH_TREE.length,
    trophiesCount: TROPHIES.length,
    eventsCount: BENCH_EVENTS.length,
    startingBio: GAME_CONSTANTS.INITIAL_STATE.bio,
  };
}

// Montage automatique de l'interface CRT lorsque le script s'exécute dans un navigateur
if (typeof globalThis.document !== 'undefined') {
  const appContainer = globalThis.document.getElementById('app');
  if (appContainer) {
    const controller = new BioLabAppController(appContainer);
    void controller.mount();
  }
}

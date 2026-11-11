import type { EventBus } from './event-bus.ts';
import type { RngService } from './rng.ts';
import { createSeededRng } from './rng.ts';
import type { GameState } from '../types/game-state.types.ts';
import { advanceContractsTick } from '../systems/contracts.system.ts';
import { advanceCryoChamberTick } from '../systems/cryo.system.ts';
import { advanceEconomyTick, evaluateEconomySnapshot } from '../systems/economy.system.ts';
import { advanceBenchEventsTick } from '../systems/events.system.ts';
import { advanceIncubatorsTick } from '../systems/incubator.system.ts';
import { evaluateAndUnlockTrophies } from '../systems/trophies.system.ts';
import { advanceWasteAndBioreactorTick } from '../systems/waste.system.ts';

/**
 * Pas de temps maximal par sous-étape (100 ms) pour garantir des transitions d'état exactes.
 */
export const MAX_SUBSTEP_SECONDS = 0.1;

const defaultLoopRng = createSeededRng(1984_9999);

export function executeSingleSubstep(
  state: GameState,
  dtSeconds: number,
  eventBus?: EventBus,
  rng: RngService = defaultLoopRng
): GameState {
  if (dtSeconds <= 0) {
    const withTrophies = evaluateAndUnlockTrophies(state, eventBus);
    return {
      ...withTrophies,
      economy: evaluateEconomySnapshot(withTrophies),
    };
  }

  // 1. Avancement de la croissance et de la sénescence des colonies sur la paillasse
  const afterIncubators = advanceIncubatorsTick(state, dtSeconds, eventBus);

  // 2. Avancement de la durée de congélation en Chambre Cryogénique
  const afterCryo = advanceCryoChamberTick(afterIncubators, dtSeconds);

  // 3. Avancement des bio-déchets (absorption Necro-Spore, délai toxique 60s, bioréacteur)
  const afterWaste = advanceWasteAndBioreactorTick(afterCryo, dtSeconds, eventBus);

  // 4. Avancement des micro-événements de paillasse (B1-B10, M1-M5) et buffs/debuffs
  const afterEvents = advanceBenchEventsTick(afterWaste, dtSeconds, rng, eventBus);

  // 5. Avancement des contrats dynamiques procéduraux (renouvellement 120s, extraction 90s, timers)
  const afterContracts = advanceContractsTick(afterEvents, dtSeconds, rng, eventBus);

  // 6. Évaluation et application du flux économique + détection de la Sous-Tension
  const afterEconomy = advanceEconomyTick(afterContracts, dtSeconds, eventBus);

  // 7. Vérification et déblocage automatique des 16 trophées
  return evaluateAndUnlockTrophies(afterEconomy, eventBus);
}

/**
 * Fait avancer la simulation d'une durée totale totalDeltaSeconds en la découpant en sous-pas de maximum 100 ms.
 */
export function advanceSimulation(
  state: GameState,
  totalDeltaSeconds: number,
  eventBus?: EventBus,
  rng: RngService = defaultLoopRng
): GameState {
  if (!Number.isFinite(totalDeltaSeconds) || totalDeltaSeconds <= 0) {
    const withTrophies = evaluateAndUnlockTrophies(state, eventBus);
    return {
      ...withTrophies,
      economy: evaluateEconomySnapshot(withTrophies),
    };
  }

  let current = state;
  let remaining = totalDeltaSeconds;

  while (remaining > 1e-9) {
    const step = remaining > MAX_SUBSTEP_SECONDS ? MAX_SUBSTEP_SECONDS : remaining;
    current = executeSingleSubstep(current, step, eventBus, rng);
    remaining -= step;
  }

  return current;
}

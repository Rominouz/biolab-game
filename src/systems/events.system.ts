import { BENCH_EVENTS, BENCH_EVENTS_BY_ID } from '../data/events.data.ts';
import { GAME_CONSTANTS } from '../data/constants.data.ts';
import type { EventBus } from '../core/event-bus.ts';
import { roundCurrency } from '../core/math.ts';
import type { RngService } from '../core/rng.ts';
import type { GameState, IncubatorSlot } from '../types/game-state.types.ts';
import type { BenchEventId } from '../types/game.types.ts';
import type { ActiveBenchEvent, BenchBuffsState } from '../types/meta.types.ts';

export function createInitialBenchBuffsState(): BenchBuffsState {
  return {
    b2GrowthSpeedRemainingSeconds: 0,
    b4BioBoostRemainingSeconds: 0,
    b6NextDivisionDiscountActive: false,
    b7ZeroFixedOverheadRemainingSeconds: 0,
    b8DoubledSlotRemainingSeconds: 0,
    b9NextMutagenesisBonusActive: false,
    b10ZeroCryoUpkeepRemainingSeconds: 0,
    m1SlowGrowthPenaltyRemainingSeconds: 0,
    m2CryoSurchargeRemainingSeconds: 0,
    m3MitosisLysisPenaltyRemainingSeconds: 0,
    m4NextSeededLifespanPenaltyActive: false,
    m5NextAutoclaveSurchargeBio: 0,
  };
}

/**
 * Déclenche un micro-événement spécifique (ou aléatoire) sur la paillasse.
 * Si l'événement est automatique sans clic (B2 Pic de Tension Nocturne ou B8 Effusion Métabolique Spontanée),
 * son effet bénéfique démarre immédiatement.
 */
export function spawnBenchEvent(
  state: GameState,
  rng: RngService,
  forcedEventId?: BenchEventId,
  eventBus?: EventBus
): GameState {
  const def = forcedEventId
    ? BENCH_EVENTS_BY_ID[forcedEventId]
    : rng.pickUniform(BENCH_EVENTS);

  const occupiedColonyIndices = state.incubatorSlots
    .filter((s) => s.status === 'COLONY')
    .map((s) => s.slotIndex);

  const targetSlotIndex =
    occupiedColonyIndices.length > 0 ? rng.pickUniform(occupiedColonyIndices) : 0;

  const activeEvent: ActiveBenchEvent = {
    eventId: def.id,
    category: def.category,
    remainingDisplaySeconds: def.displayDurationSeconds,
    totalDisplaySeconds: def.displayDurationSeconds,
    currentClicks: 0,
    requiredClicks: def.requiredClicks,
    targetSlotIndex,
  };

  let updatedBuffs = state.benchBuffs;

  // B2 et B8 ne nécessitent aucun clic : leur effet s'active dès l'apparition
  if (def.id === 'B2') {
    updatedBuffs = {
      ...updatedBuffs,
      b2GrowthSpeedRemainingSeconds: def.effectDurationSeconds,
    };
  } else if (def.id === 'B8') {
    updatedBuffs = {
      ...updatedBuffs,
      b8DoubledSlotIndex: targetSlotIndex,
      b8DoubledSlotRemainingSeconds: def.effectDurationSeconds,
    };
  }

  const nextSpawnDelay = rng.nextInt(
    GAME_CONSTANTS.EVENTS.minSpawnIntervalSeconds,
    GAME_CONSTANTS.EVENTS.maxSpawnIntervalSeconds + 1
  );

  if (eventBus) {
    eventBus.emit({
      type: 'BENCH_EVENT_SPAWNED',
      eventId: def.id,
      category: def.category,
    });
  }

  return {
    ...state,
    activeBenchEvent: activeEvent,
    nextBenchEventSpawnTimerSeconds: nextSpawnDelay,
    benchBuffs: updatedBuffs,
  };
}

/**
 * Applique la récompense d'un événement bénéfique ou résout un incident lorsque le joueur interagit avec lui.
 */
export function interactWithBenchEvent(
  state: GameState,
  rng: RngService,
  eventBus?: EventBus
): GameState {
  const active = state.activeBenchEvent;
  if (!active) {
    throw new Error('Aucun micro-événement actif sur la paillasse');
  }

  const def = BENCH_EVENTS_BY_ID[active.eventId];

  // Si l'événement est B8 ("Observer sans toucher"), un clic l'interrompt sans bonus supplémentaire
  if (def.interactionType === 'OBSERVE_NO_TOUCH' || def.interactionType === 'AUTOMATIC_NO_CLICK') {
    return state;
  }

  const nextClicks = active.currentClicks + 1;
  if (nextClicks < active.requiredClicks) {
    return {
      ...state,
      activeBenchEvent: {
        ...active,
        currentClicks: nextClicks,
      },
    };
  }

  // L'événement est résolu !
  let nextBio = state.bio;
  let nextPr = state.pr;
  let nextInventory = state.mediaInventory;
  let nextSlots: readonly IncubatorSlot[] = state.incubatorSlots;
  let nextBuffs: BenchBuffsState = state.benchBuffs;
  let addedBioEarned = 0;
  let addedPrEarned = 0;

  if (def.category === 'BENEFICIAL') {
    switch (def.id) {
      case 'B1': {
        // Goutte de Condensat : prolonge la durée de vie adulte de la colonie de +15 secondes
        const targetIdx = active.targetSlotIndex ?? 0;
        nextSlots = state.incubatorSlots.map((slot, idx) => {
          if (idx === targetIdx && slot.status === 'COLONY') {
            return {
              ...slot,
              adultLifespanRemainingSeconds: slot.adultLifespanRemainingSeconds + def.primaryValue,
              adultLifespanTotalSeconds: slot.adultLifespanTotalSeconds + def.primaryValue,
            };
          }
          return slot;
        });
        break;
      }
      case 'B3': {
        // Spore Vagabonde : accorde immédiatement +3 à 8 PR ou 1 boîte d'agar starter gratuite
        if (rng.nextFloat() < 0.5) {
          const prGain = rng.nextInt(def.primaryValue, (def.secondaryValue ?? 8) + 1);
          nextPr = roundCurrency(nextPr + prGain);
          addedPrEarned = prGain;
        } else {
          nextInventory = {
            ...nextInventory,
            MEDIUM_1_ORDINARY_AGAR: (nextInventory.MEDIUM_1_ORDINARY_AGAR ?? 0) + 1,
          };
        }
        break;
      }
      case 'B4': {
        // Bulle de Fermentation : +10 % Bio/s pendant 45 s
        nextBuffs = {
          ...nextBuffs,
          b4BioBoostRemainingSeconds: def.effectDurationSeconds,
        };
        break;
      }
      case 'B5': {
        // Visite du Facteur Scientifique : +50 à 350 Bio selon le palier (50 + (tier - 1) * 75)
        const grantBio = 50 + (state.factoryTier - 1) * 75;
        nextBio = roundCurrency(nextBio + grantBio);
        addedBioEarned = grantBio;
        break;
      }
      case 'B6': {
        // Reflet Cristallin : réduit de 15 % le coût de la prochaine division cellulaire mitotique
        nextBuffs = {
          ...nextBuffs,
          b6NextDivisionDiscountActive: true,
        };
        break;
      }
      case 'B7': {
        // Lecture Aiguille Stable : charges fixes annulées pendant 60 s
        nextBuffs = {
          ...nextBuffs,
          b7ZeroFixedOverheadRemainingSeconds: def.effectDurationSeconds,
        };
        break;
      }
      case 'B9': {
        // Note Glissée par le Stagiaire : +5 % de chance de mutation lors de la prochaine mutagenèse chimique
        nextBuffs = {
          ...nextBuffs,
          b9NextMutagenesisBonusActive: true,
        };
        break;
      }
      case 'B10': {
        // Vapeur d'Azote Relaxante : stoppe gratuitement la consommation d'azote des cryo-tubes pendant 90 s
        nextBuffs = {
          ...nextBuffs,
          b10ZeroCryoUpkeepRemainingSeconds: def.effectDurationSeconds,
        };
        break;
      }
      default:
        break;
    }
  }
  // Si category === 'INCIDENT', l'action de résolution annule simplement l'incident sans malus !

  if (eventBus) {
    eventBus.emit({
      type: 'BENCH_EVENT_RESOLVED',
      eventId: def.id,
    });
  }

  return {
    ...state,
    bio: nextBio,
    pr: nextPr,
    mediaInventory: nextInventory,
    incubatorSlots: nextSlots,
    activeBenchEvent: null,
    benchBuffs: nextBuffs,
    stats: {
      ...state.stats,
      totalBioEarned: roundCurrency(state.stats.totalBioEarned + addedBioEarned),
      totalPrEarned: roundCurrency(state.stats.totalPrEarned + addedPrEarned),
    },
  };
}

/**
 * Fait progresser les timers de buffs/debuffs, la durée d'affichage de l'événement actif,
 * et applique les malus mineurs si un incident M1-M5 expire sans avoir été résolu.
 */
export function advanceBenchEventsTick(
  state: GameState,
  dtSeconds: number,
  rng: RngService,
  eventBus?: EventBus
): GameState {
  if (dtSeconds <= 0 || state.isPaused) {
    return state;
  }

  let buffs = state.benchBuffs;
  const dec = (val: number): number => Math.max(0, roundCurrency(val - dtSeconds));

  const nextB8Remaining = dec(buffs.b8DoubledSlotRemainingSeconds);
  buffs = {
    ...buffs,
    b2GrowthSpeedRemainingSeconds: dec(buffs.b2GrowthSpeedRemainingSeconds),
    b4BioBoostRemainingSeconds: dec(buffs.b4BioBoostRemainingSeconds),
    b7ZeroFixedOverheadRemainingSeconds: dec(buffs.b7ZeroFixedOverheadRemainingSeconds),
    b8DoubledSlotRemainingSeconds: nextB8Remaining,
    ...(nextB8Remaining <= 0 ? {} : { b8DoubledSlotIndex: buffs.b8DoubledSlotIndex }),
    b10ZeroCryoUpkeepRemainingSeconds: dec(buffs.b10ZeroCryoUpkeepRemainingSeconds),
    m1SlowGrowthPenaltyRemainingSeconds: dec(buffs.m1SlowGrowthPenaltyRemainingSeconds),
    m2CryoSurchargeRemainingSeconds: dec(buffs.m2CryoSurchargeRemainingSeconds),
    m3MitosisLysisPenaltyRemainingSeconds: dec(buffs.m3MitosisLysisPenaltyRemainingSeconds),
  };

  let activeEvent = state.activeBenchEvent;
  let spawnTimer = state.nextBenchEventSpawnTimerSeconds;

  if (activeEvent) {
    const nextDisplay = activeEvent.remainingDisplaySeconds - dtSeconds;
    if (nextDisplay > 1e-9) {
      activeEvent = {
        ...activeEvent,
        remainingDisplaySeconds: nextDisplay,
      };
    } else {
      // L'événement arrive à expiration
      const def = BENCH_EVENTS_BY_ID[activeEvent.eventId];
      if (def.category === 'INCIDENT') {
        // Applique le mini-malus correspondant à l'incident ignoré
        switch (def.id) {
          case 'M1':
            buffs = {
              ...buffs,
              m1SlowGrowthPenaltyRemainingSeconds: def.effectDurationSeconds,
            };
            break;
          case 'M2':
            buffs = {
              ...buffs,
              m2CryoSurchargeRemainingSeconds: def.effectDurationSeconds,
            };
            break;
          case 'M3':
            buffs = {
              ...buffs,
              m3MitosisLysisPenaltyRemainingSeconds: def.effectDurationSeconds,
            };
            break;
          case 'M4':
            buffs = {
              ...buffs,
              m4NextSeededLifespanPenaltyActive: true,
            };
            break;
          case 'M5':
            buffs = {
              ...buffs,
              m5NextAutoclaveSurchargeBio: buffs.m5NextAutoclaveSurchargeBio + def.primaryValue,
            };
            break;
          default:
            break;
        }
        if (eventBus) {
          eventBus.emit({
            type: 'BENCH_INCIDENT_EXPIRED_PENALTY',
            eventId: def.id,
          });
        }
      } else if (def.id === 'B2' || def.id === 'B8') {
        if (eventBus) {
          eventBus.emit({
            type: 'BENCH_EVENT_RESOLVED',
            eventId: def.id,
          });
        }
      }
      activeEvent = null;
    }
  } else {
    spawnTimer = spawnTimer - dtSeconds;
    if (spawnTimer <= 1e-9) {
      const stateBeforeSpawn: GameState = {
        ...state,
        benchBuffs: buffs,
        activeBenchEvent: null,
        nextBenchEventSpawnTimerSeconds: 0,
      };
      return spawnBenchEvent(stateBeforeSpawn, rng, undefined, eventBus);
    }
  }

  return {
    ...state,
    activeBenchEvent: activeEvent,
    nextBenchEventSpawnTimerSeconds: Math.max(0, spawnTimer),
    benchBuffs: buffs,
  };
}

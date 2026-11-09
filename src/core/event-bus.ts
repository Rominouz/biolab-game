import type {
  BenchEventId,
  CultureMediumId,
  FactoryTierLevel,
  TechId,
  TrophyId,
} from '../types/game.types.ts';

/**
 * Bus d'événements interne typé pour découpler les systèmes de jeu (Journal de bord, Trophées, Audio, UI)
 */

export type DivisionOutcomeType =
  | 'REGULAR_CLONE'
  | 'SPONTANEOUS_MUTATION'
  | 'SUPER_JUMP_MUTATION'
  | 'HYBRID_OFFSPRING'
  | 'MYTHIC_CHIMERA'
  | 'LYSIS_FAILURE';

export type SimulationEvent =
  | {
      readonly type: 'COLONY_SEEDED';
      readonly slotIndex: number;
      readonly strainId: string;
      readonly mediumId: CultureMediumId;
      readonly isNewDiscovery: boolean;
      readonly doubledToSlotIndex?: number;
    }
  | {
      readonly type: 'NUTRIENT_INJECTED';
      readonly slotIndex: number;
      readonly strainId: string;
      readonly addedMaturityRatio: number;
    }
  | {
      readonly type: 'COLONY_REACHED_MATURITY';
      readonly slotIndex: number;
      readonly strainId: string;
    }
  | {
      readonly type: 'COLONY_NECROSED';
      readonly slotIndex: number;
      readonly originStrainId: string;
    }
  | {
      readonly type: 'TOXIC_EMISSION_STARTED';
      readonly slotIndex: number;
      readonly originStrainId: string;
    }
  | {
      readonly type: 'WASTE_AUTO_ABSORBED';
      readonly wasteSlotIndex: number;
      readonly absorberSlotIndex: number;
      readonly absorberStrainId: string;
    }
  | {
      readonly type: 'WASTE_AUTOCLAVED';
      readonly slotIndex: number;
      readonly originStrainId: string;
      readonly costBio: number;
      readonly nocardiaBonusBio: number;
    }
  | {
      readonly type: 'WASTE_RECYCLING_STARTED';
      readonly slotIndex: number;
      readonly taskId: string;
      readonly durationSeconds: number;
    }
  | {
      readonly type: 'WASTE_RECYCLING_COMPLETED';
      readonly taskId: string;
      readonly refundBio: number;
    }
  | {
      readonly type: 'UNDERVOLTAGE_CHANGED';
      readonly isUndervoltage: boolean;
    }
  | {
      readonly type: 'COLONY_FROZEN_IN_CRYO';
      readonly fromSlotIndex: number;
      readonly toTubeIndex: number;
      readonly strainId: string;
    }
  | {
      readonly type: 'COLONY_THAWED_FROM_CRYO';
      readonly fromTubeIndex: number;
      readonly toSlotIndex: number;
      readonly strainId: string;
      readonly frozenDurationSeconds: number;
    }
  | {
      readonly type: 'DIVISION_COMPLETED';
      readonly method: 'SCISSIPARITY' | 'MUTAGENESIS' | 'CONJUGATION';
      readonly outcome: DivisionOutcomeType;
      readonly targetSlotIndex?: number;
      readonly resultingStrainId?: string;
    }
  | {
      readonly type: 'TECH_UNLOCKED';
      readonly techId: TechId;
      readonly costPr: number;
    }
  | {
      readonly type: 'FACTORY_TIER_UNLOCKED';
      readonly newTier: FactoryTierLevel;
      readonly costBio: number;
      readonly costPr: number;
    }
  | {
      readonly type: 'TROPHY_UNLOCKED';
      readonly trophyId: TrophyId;
      readonly nameFr: string;
    }
  | {
      readonly type: 'BENCH_EVENT_SPAWNED';
      readonly eventId: BenchEventId;
      readonly category: 'BENEFICIAL' | 'INCIDENT';
    }
  | {
      readonly type: 'BENCH_EVENT_RESOLVED';
      readonly eventId: BenchEventId;
    }
  | {
      readonly type: 'BENCH_INCIDENT_EXPIRED_PENALTY';
      readonly eventId: BenchEventId;
    }
  | {
      readonly type: 'CONTRACT_COMPLETED';
      readonly contractId: string;
      readonly rewardBio: number;
      readonly rewardPr: number;
    }
  | {
      readonly type: 'CONTRACT_EXPIRED';
      readonly contractId: string;
    };

export type SimulationEventListener = (event: SimulationEvent) => void;

export interface EventBus {
  emit(event: SimulationEvent): void;
  subscribe(listener: SimulationEventListener): () => void;
  getHistory(): readonly SimulationEvent[];
  clearHistory(): void;
}

export function createEventBus(): EventBus {
  const listeners = new Set<SimulationEventListener>();
  const history: SimulationEvent[] = [];

  return {
    emit(event: SimulationEvent): void {
      history.push(event);
      for (const listener of listeners) {
        listener(event);
      }
    },
    subscribe(listener: SimulationEventListener): () => void {
      listeners.add(listener);
      return (): void => {
        listeners.delete(listener);
      };
    },
    getHistory(): readonly SimulationEvent[] {
      return [...history];
    },
    clearHistory(): void {
      history.length = 0;
    },
  };
}

import { FACTORY_TIERS_BY_LEVEL } from '../data/index.ts';
import type { GameState } from '../types/game-state.types.ts';

export type ActiveLabModule = 'BENCH' | 'CRYO' | 'TROPHIES' | 'LOGBOOK';

const CUTAWAY_WIDTH = 320;
const CUTAWAY_HEIGHT = 76;

/**
 * BIOLAB — Rendu Canvas 2D de la Coupe Architecturale de l'Usine (Section 4 de specs.md)
 * Représente le sas pneumatique et les 4 modules (Paillasse, Cryo, Distinctions, Journal)
 * avec l'évolution structurelle des Paliers 1 à 5.
 */
export function renderFactoryCrossSectionCanvas(
  canvas: HTMLCanvasElement,
  state: GameState,
  activeModule: ActiveLabModule,
  timeSeconds: number
): void {
  if (canvas.width !== CUTAWAY_WIDTH || canvas.height !== CUTAWAY_HEIGHT) {
    canvas.width = CUTAWAY_WIDTH;
    canvas.height = CUTAWAY_HEIGHT;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  // Fond souterrain / ciel nocturne rétro
  ctx.fillStyle = '#040806';
  ctx.fillRect(0, 0, CUTAWAY_WIDTH, CUTAWAY_HEIGHT);

  // Sol / fondations béton selon le palier d'usine
  const tier = state.factoryTier;
  const tierDef = FACTORY_TIERS_BY_LEVEL[tier];
  ctx.fillStyle = tier >= 4 ? '#152a22' : '#0d1b16';
  ctx.fillRect(0, 62, CUTAWAY_WIDTH, 14);

  // Sas pneumatique d'entrée à gauche
  ctx.strokeStyle = '#285242';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 18, 28, 44);
  ctx.fillStyle = state.isUndervoltage ? '#ff0055' : '#22c55e';
  ctx.fillRect(17, 12, 6, 4);

  // Portes coulissantes du sas
  const doorOffset = Math.round(Math.abs(Math.sin(timeSeconds * 0.9)) * 4);
  ctx.fillStyle = '#1e3a2f';
  ctx.fillRect(10, 24, 8 - doorOffset, 36);
  ctx.fillRect(22 + doorOffset, 24, 8 - doorOffset, 36);

  // Les 4 salles du complexe en coupe transversale
  const rooms: readonly {
    readonly id: ActiveLabModule;
    readonly label: string;
    readonly x: number;
    readonly w: number;
    readonly accent: string;
  }[] = [
    { id: 'BENCH', label: 'PAILLASSE', x: 40, w: 72, accent: '#a7f3d0' },
    { id: 'CRYO', label: 'CRYO -196', x: 116, w: 66, accent: '#00e5ff' },
    { id: 'TROPHIES', label: 'ARMOIRE', x: 186, w: 62, accent: '#ffb703' },
    { id: 'LOGBOOK', label: 'ARCHIVES', x: 252, w: 62, accent: '#93c5fd' },
  ];

  for (const room of rooms) {
    const isSelected = room.id === activeModule;
    ctx.fillStyle = isSelected ? '#112920' : '#08120e';
    ctx.fillRect(room.x, 16, room.w, 46);

    ctx.strokeStyle = isSelected ? room.accent : '#1b382d';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.strokeRect(room.x, 16, room.w, 46);

    // Mobilier miniature en pixel art par salle
    if (room.id === 'BENCH') {
      ctx.fillStyle = '#285242';
      ctx.fillRect(room.x + 8, 46, room.w - 16, 4);
      const activeColonies = state.incubatorSlots.filter((s) => s.status === 'COLONY').length;
      for (let i = 0; i < Math.min(6, activeColonies); i++) {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(room.x + 10 + i * 9, 42, 6, 4);
      }
    } else if (room.id === 'CRYO') {
      const frozenCount = state.cryoSlots.filter((c) => c.status === 'FROZEN').length;
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i < frozenCount ? '#00e5ff' : '#13303d';
        ctx.fillRect(room.x + 10 + i * 12, 32, 8, 22);
      }
    } else if (room.id === 'TROPHIES') {
      ctx.fillStyle = '#5c4028';
      ctx.fillRect(room.x + 10, 32, room.w - 20, 3);
      ctx.fillRect(room.x + 10, 44, room.w - 20, 3);
      const trophyCount = state.unlockedTrophyIds.length;
      for (let i = 0; i < Math.min(5, trophyCount); i++) {
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(room.x + 12 + i * 8, 27, 4, 5);
      }
    } else if (room.id === 'LOGBOOK') {
      ctx.fillStyle = '#f5f2eb';
      ctx.fillRect(room.x + 18, 36, 24, 14);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(room.x + 29, 36, 2, 14);
    }

    ctx.fillStyle = isSelected ? room.accent : '#64748b';
    ctx.font = 'bold 8px monospace';
    ctx.fillText(room.label, room.x + 6, 26);
  }

  // Bandeau de statut du palier d'usine en haut
  ctx.fillStyle = '#a7f3d0';
  ctx.font = '9px monospace';
  ctx.fillText(`PALIER ${String(tier)} // ${tierDef.nameFr.toUpperCase()}`, 8, 10);
}

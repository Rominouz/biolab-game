import { RARITY_VISUALS, STRAINS_BY_ID } from '../data/index.ts';
import type { IncubatorSlot } from '../types/game-state.types.ts';
import type { ActiveBenchEvent } from '../types/meta.types.ts';

/**
 * BIOLAB — Moteur de Rendu Canvas 2D Pixel Art Procédural des Boîtes de Pétri
 * Implémente fidèlement la Section 3.A de specs.md pour les 7 raretés,
 * l'état de croissance, la nécrose et l'émanation toxique.
 */

export const PETRI_INTERNAL_SIZE = 96;

function drawPixelCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  color: string,
  fill = true
): void {
  const r = Math.round(radius);
  if (r <= 0) return;
  ctx.fillStyle = color;
  for (let y = -r; y <= r; y += 2) {
    for (let x = -r; x <= r; x += 2) {
      const distSq = x * x + y * y;
      if (fill ? distSq <= r * r : Math.abs(Math.sqrt(distSq) - r) <= 1.5) {
        ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 2, 2);
      }
    }
  }
}

function drawAgarBackground(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Fond verre sombre et gélose quadrillée
  ctx.fillStyle = '#040806';
  ctx.fillRect(0, 0, PETRI_INTERNAL_SIZE, PETRI_INTERNAL_SIZE);

  drawPixelCircle(ctx, cx, cy, 43, '#091712', true);
  drawPixelCircle(ctx, cx, cy, 44, '#1b3d30', false);

  // Quadrillage de mesure rétro
  ctx.fillStyle = 'rgba(167, 243, 208, 0.08)';
  for (let i = 16; i < PETRI_INTERNAL_SIZE - 16; i += 8) {
    ctx.fillRect(i, cy, 2, 1);
    ctx.fillRect(cx, i, 1, 2);
  }
}

export function renderPetriDishCanvas(
  canvas: HTMLCanvasElement,
  slot: IncubatorSlot,
  timeSeconds: number,
  activeEvent: ActiveBenchEvent | null
): void {
  if (canvas.width !== PETRI_INTERNAL_SIZE || canvas.height !== PETRI_INTERNAL_SIZE) {
    canvas.width = PETRI_INTERNAL_SIZE;
    canvas.height = PETRI_INTERNAL_SIZE;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;
  const cx = PETRI_INTERNAL_SIZE / 2;
  const cy = PETRI_INTERNAL_SIZE / 2;

  drawAgarBackground(ctx, cx, cy);

  if (slot.status === 'EMPTY') {
    // Réticule central discret pour boîte vide
    ctx.fillStyle = '#1e3a2f';
    ctx.fillRect(cx - 4, cy - 1, 8, 2);
    ctx.fillRect(cx - 1, cy - 4, 2, 8);
    return;
  }

  if (slot.status === 'WASTE') {
    // Résidu nécrosé gris-olive (#4D7C0F / #3f3f46)
    drawPixelCircle(ctx, cx, cy, 26, '#36392e', true);
    drawPixelCircle(ctx, cx - 5, cy + 3, 14, '#4d7c0f', true);
    drawPixelCircle(ctx, cx + 7, cy - 4, 10, '#27272a', true);

    if (slot.isToxic) {
      // Émanation toxique après 60s : nuage de spores verdâtres animées
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + timeSeconds * 1.4;
        const dist = 16 + ((timeSeconds * 12 + i * 7) % 24);
        const px = Math.round(cx + Math.cos(angle) * dist);
        const py = Math.round(cy + Math.sin(angle) * dist);
        ctx.fillStyle = i % 2 === 0 ? '#84cc16' : '#ef4444';
        ctx.fillRect(px, py, 3, 3);
      }
    }
    return;
  }

  // Slot === 'COLONY'
  const strain = STRAINS_BY_ID[slot.strainId];
  if (!strain) return;

  const rarity = strain.rarity;
  const visual = RARITY_VISUALS[rarity];
  const color = visual.colorHex;
  const growthScale = 0.22 + slot.maturityRatio * 0.78;
  const maxRadius = 34 * growthScale;

  switch (rarity) {
    case 'COMMON': {
      // 1. Germination simple (#E2E8F0) : amas circulaire opaque qui s'étale du centre vers les bords
      drawPixelCircle(ctx, cx, cy, maxRadius, '#94a3b8', true);
      drawPixelCircle(ctx, cx, cy, maxRadius * 0.75, color, true);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        const lx = cx + Math.cos(a) * (maxRadius * 0.65);
        const ly = cy + Math.sin(a) * (maxRadius * 0.65);
        drawPixelCircle(ctx, lx, ly, Math.max(3, maxRadius * 0.28), color, true);
      }
      break;
    }

    case 'UNCOMMON': {
      // 2. Pulsation mitotique (#22C55E) : battement cardiaque régulier + micro-bulles d'oxygène vert néon
      const beat = 1 + Math.sin(timeSeconds * 7.5) * 0.1;
      const r = maxRadius * beat;
      drawPixelCircle(ctx, cx, cy, r, '#15803d', true);
      drawPixelCircle(ctx, cx, cy, r * 0.72, color, true);
      for (let b = 0; b < 8; b++) {
        const bubblePhase = (timeSeconds * 18 + b * 11) % 32;
        const bx = cx + Math.sin(b * 2.1 + timeSeconds) * (r * 0.7);
        const by = cy + r * 0.5 - bubblePhase;
        ctx.fillStyle = '#86efac';
        ctx.fillRect(Math.round(bx), Math.round(by), 2, 2);
      }
      break;
    }

    case 'RARE': {
      // 3. Filaments & Réseau (#00E5FF) : tentacules fractales + halo cyan translucide
      drawPixelCircle(ctx, cx, cy, maxRadius * 1.05, 'rgba(0, 229, 255, 0.18)', true);
      drawPixelCircle(ctx, cx, cy, maxRadius * 0.38, color, true);
      const branches = 8;
      ctx.fillStyle = color;
      for (let b = 0; b < branches; b++) {
        const baseAngle = (b / branches) * Math.PI * 2 + Math.sin(timeSeconds * 0.8 + b) * 0.12;
        for (let step = 4; step <= maxRadius; step += 2) {
          const wiggle = Math.sin(step * 0.35 + timeSeconds * 3 + b) * 2.2;
          const px = cx + Math.cos(baseAngle) * step - Math.sin(baseAngle) * wiggle;
          const py = cy + Math.sin(baseAngle) * step + Math.cos(baseAngle) * wiggle;
          ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
        }
      }
      break;
    }

    case 'EPIC': {
      // 4. Bioluminescence (#BD00FF) : noyau violet intense, étincelles orbitales et ondulations
      const waveRadius = ((timeSeconds * 16) % Math.max(8, maxRadius));
      drawPixelCircle(ctx, cx, cy, maxRadius * 0.85, '#581c87', true);
      drawPixelCircle(ctx, cx, cy, waveRadius, '#e879f9', false);
      drawPixelCircle(ctx, cx, cy, maxRadius * 0.48, color, true);
      for (let s = 0; s < 6; s++) {
        const orbitAngle = timeSeconds * 2.4 + (s * Math.PI) / 3;
        const orbitDist = maxRadius * 0.78;
        const sx = cx + Math.cos(orbitAngle) * orbitDist;
        const sy = cy + Math.sin(orbitAngle) * orbitDist;
        ctx.fillStyle = '#f5d0fe';
        ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 3);
      }
      break;
    }

    case 'LEGENDARY': {
      // 5. Géométrie Cristalline (#FFB703) : structures polygonales ambrées et micro-arcs dorés
      const sides = 6;
      ctx.fillStyle = '#92400e';
      drawPixelCircle(ctx, cx, cy, maxRadius * 0.85, '#78350f', true);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= sides; i++) {
        const a = (i / sides) * Math.PI * 2 + timeSeconds * 0.5;
        const vx = cx + Math.cos(a) * maxRadius * 0.85;
        const vy = cy + Math.sin(a) * maxRadius * 0.85;
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.stroke();
      drawPixelCircle(ctx, cx, cy, maxRadius * 0.42, '#fde047', true);
      // Micro-arcs dorés crépitants
      for (let k = 0; k < 5; k++) {
        const arcAngle = timeSeconds * 9 + k * 1.3;
        const ax = cx + Math.cos(arcAngle) * maxRadius * 0.65;
        const ay = cy + Math.sin(arcAngle) * maxRadius * 0.65;
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(Math.round(ax), Math.round(ay), 2, 2);
      }
      break;
    }

    case 'MYTHIC': {
      // 6. Vortex d'Alarme BSL-4 (#FF0055) : micro-vibrations, bouillonnement carmin et décharges
      const jitterX = Math.round(Math.sin(timeSeconds * 35) * 1.5);
      const jitterY = Math.round(Math.cos(timeSeconds * 41) * 1.5);
      const vx = cx + jitterX;
      const vy = cy + jitterY;
      drawPixelCircle(ctx, vx, vy, maxRadius * 0.92, '#881337', true);
      for (let arm = 0; arm < 4; arm++) {
        for (let r = 4; r <= maxRadius; r += 2) {
          const spiralAngle = (arm * Math.PI) / 2 + r * 0.14 - timeSeconds * 4.2;
          const px = vx + Math.cos(spiralAngle) * r;
          const py = vy + Math.sin(spiralAngle) * r;
          ctx.fillStyle = r < maxRadius * 0.5 ? '#fda4af' : color;
          ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
        }
      }
      break;
    }

    case 'SECRET': {
      // 7. Distorsion & Glitch Astral (#EC4899 / #38BDF8) : aberration chromatique CRT & traînées stellaires
      const shift = Math.round(Math.sin(timeSeconds * 12) * 2.5);
      drawPixelCircle(ctx, cx - shift, cy, maxRadius * 0.78, 'rgba(236, 72, 153, 0.65)', true);
      drawPixelCircle(ctx, cx + shift, cy, maxRadius * 0.78, 'rgba(56, 189, 248, 0.65)', true);
      drawPixelCircle(ctx, cx, cy, maxRadius * 0.4, '#ffffff', true);

      // Lignes de glitch horizontal et poussières d'étoiles
      for (let g = 0; g < 8; g++) {
        const starAngle = timeSeconds * 1.8 + g * 0.78;
        const dist = ((timeSeconds * 14 + g * 9) % Math.max(6, maxRadius));
        const sx = cx + Math.cos(starAngle) * dist;
        const sy = cy + Math.sin(starAngle) * dist;
        ctx.fillStyle = g % 2 === 0 ? '#38bdf8' : '#f472b6';
        ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2);
      }
      break;
    }
  }

  // Jauge circulaire externe de maturité si la colonie est encore en croissance
  if (!slot.isMature) {
    const endAngle = -Math.PI / 2 + slot.maturityRatio * Math.PI * 2;
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 41, -Math.PI / 2, endAngle);
    ctx.stroke();
  }

  // Superposition visuelle si un micro-événement cible cette boîte
  if (activeEvent && activeEvent.targetSlotIndex === slot.slotIndex) {
    ctx.strokeStyle = activeEvent.category === 'INCIDENT' ? '#ff0055' : '#ffb703';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, PETRI_INTERNAL_SIZE - 8, PETRI_INTERNAL_SIZE - 8);
  }
}

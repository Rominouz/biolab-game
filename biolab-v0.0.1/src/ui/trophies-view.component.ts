import { TROPHIES } from '../data/index.ts';
import type { GameState } from '../types/game-state.types.ts';
import type { TrophyShelfId } from '../types/game.types.ts';

export interface TrophiesViewRefs {
  readonly root: HTMLElement;
  update(state: GameState): void;
}

const SHELF_LABELS: Readonly<Record<TrophyShelfId, string>> = {
  SHELF_1_APPRENTICESHIP: "ÉTAGÈRE 1 : L'APPRENTISSAGE",
  SHELF_2_BENCH_PRACTICE: 'ÉTAGÈRE 2 : LA MAÎTRISE CELLULAIRE',
  SHELF_3_INDUSTRIAL_MASTERY: "ÉTAGÈRE 3 : L'INDUSTRIALISATION",
  SHELF_4_HIGH_CONTAINMENT: 'ÉTAGÈRE 4 : LE HAUT CONFINEMENT',
  UPPER_BELL_RARE_ANOMALY: "CLOCHE SUPÉRIEURE : L'ANOMALIE RARE (CONFINEMENT MAGNÉTIQUE)",
};

const SHELF_ORDER: readonly TrophyShelfId[] = [
  'UPPER_BELL_RARE_ANOMALY',
  'SHELF_1_APPRENTICESHIP',
  'SHELF_2_BENCH_PRACTICE',
  'SHELF_3_INDUSTRIAL_MASTERY',
  'SHELF_4_HIGH_CONTAINMENT',
];

export function createTrophiesViewComponent(): TrophiesViewRefs {
  const root = document.createElement('div');

  return {
    root,
    update(state: GameState): void {
      root.replaceChildren();

      const headerCard = document.createElement('section');
      headerCard.className = 'panel-card';
      const title = document.createElement('h2');
      title.className = 'panel-title';
      title.textContent = `L’ARMOIRE DES DISTINCTIONS SCIENTIFIQUES (${String(state.unlockedTrophyIds.length)} / 16 DÉBLOQUÉES)`;
      headerCard.appendChild(title);
      root.appendChild(headerCard);

      for (const shelfId of SHELF_ORDER) {
        const shelfEl = document.createElement('section');
        shelfEl.className =
          shelfId === 'UPPER_BELL_RARE_ANOMALY' ? 'trophy-shelf upper-bell' : 'trophy-shelf';

        const shelfTitle = document.createElement('h3');
        shelfTitle.className = 'trophy-shelf-title';
        shelfTitle.textContent = SHELF_LABELS[shelfId];

        const grid = document.createElement('div');
        grid.className = 'trophy-grid';

        const shelfTrophies = TROPHIES.filter((t) => t.shelf === shelfId);
        for (const t of shelfTrophies) {
          const isUnlocked = state.unlockedTrophyIds.includes(t.id);
          const card = document.createElement('div');
          card.className = `trophy-card${isUnlocked ? ' unlocked' : ''}`;

          const nameLine = document.createElement('div');
          nameLine.style.fontWeight = '700';
          nameLine.style.color = isUnlocked ? '#ffb703' : '#94a3b8';
          nameLine.textContent = `#${String(t.number).padStart(2, '0')} — ${t.nameFr}`;

          const artDesc = document.createElement('div');
          artDesc.style.fontSize = '0.73rem';
          artDesc.style.fontStyle = 'italic';
          artDesc.style.margin = '4px 0';
          artDesc.textContent = t.pixelArtDescriptionFr;

          const cond = document.createElement('div');
          cond.style.fontSize = '0.74rem';
          cond.textContent = `Condition : ${t.unlockConditionDescriptionFr}`;

          const bonus = document.createElement('div');
          bonus.style.fontSize = '0.75rem';
          bonus.style.marginTop = '4px';
          bonus.style.color = isUnlocked ? '#22c55e' : '#64748b';
          bonus.textContent = `${isUnlocked ? '✔ Bonus Actif : ' : 'Effet : '}${t.permanentEffectDescriptionFr}`;

          card.append(nameLine, artDesc, cond, bonus);
          grid.appendChild(card);
        }

        shelfEl.append(shelfTitle, grid);
        root.appendChild(shelfEl);
      }
    },
  };
}

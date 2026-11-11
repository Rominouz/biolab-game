import { RARITY_VISUALS, STRAINS_BY_ID } from '../data/index.ts';
import type { GameState } from '../types/game-state.types.ts';

export interface CryoViewCallbacks {
  onThawColony(fromTubeIndex: number, toSlotIndex: number): void;
  onFreezeColony(fromSlotIndex: number, toTubeIndex: number): void;
}

export interface CryoViewRefs {
  readonly root: HTMLElement;
  update(state: GameState): void;
}

export function createCryoViewComponent(callbacks: CryoViewCallbacks): CryoViewRefs {
  const root = document.createElement('div');

  const infoPanel = document.createElement('section');
  infoPanel.className = 'panel-card';

  const tubesPanel = document.createElement('section');
  tubesPanel.className = 'panel-card';
  const tubesTitle = document.createElement('h2');
  tubesTitle.className = 'panel-title';
  tubesTitle.textContent = 'CAISSONS D’AZOTE LIQUIDE (-196 °C // VIEILLISSEMENT SUSPENDU)';
  const tubesGrid = document.createElement('div');
  tubesGrid.className = 'cryo-grid';
  tubesPanel.append(tubesTitle, tubesGrid);

  root.append(infoPanel, tubesPanel);

  return {
    root,
    update(state: GameState): void {
      infoPanel.replaceChildren();
      const title = document.createElement('h2');
      title.className = 'panel-title';
      title.textContent = 'TÉLÉMÉTRIE CRYOGÉNIQUE & TRANSFERTS RAPIDES';

      const summary = document.createElement('p');
      summary.style.fontSize = '0.82rem';
      summary.style.margin = '0';
      const frozenCount = state.cryoSlots.filter((c) => c.status === 'FROZEN').length;
      summary.textContent = `Tubes occupés : ${String(frozenCount)} / ${String(state.cryoSlots.length)} | Consommation totale d'azote : -${state.economy.cryoUpkeepBioPerSec.toFixed(2)} Bio/s${state.hasUnlockedCoelicolorExtraCryoSlot ? ' | Bonus Streptomyces coelicolor (+1 tube gratuit) actif' : ''}`;

      infoPanel.append(title, summary);

      tubesGrid.replaceChildren();
      const emptyBenchSlot = state.incubatorSlots.find((s) => s.status === 'EMPTY');

      for (const tube of state.cryoSlots) {
        const card = document.createElement('div');
        card.className = `cryo-tube-card${tube.status === 'FROZEN' ? ' occupied' : ''}`;

        const head = document.createElement('div');
        head.style.display = 'flex';
        head.style.justifyContent = 'space-between';
        head.style.fontSize = '0.75rem';
        head.style.color = '#00e5ff';
        head.textContent = `CRYO-TUBE #${String(tube.tubeIndex + 1)}`;

        card.appendChild(head);

        if (tube.status === 'EMPTY') {
          const emptyMsg = document.createElement('div');
          emptyMsg.style.fontSize = '0.78rem';
          emptyMsg.style.color = '#64748b';
          emptyMsg.textContent = 'Tube dépressurisé (Vide)';
          card.appendChild(emptyMsg);

          // Sélecteur rapide d'une colonie de la paillasse à cryogéniser
          const benchColonies = state.incubatorSlots.filter((s) => s.status === 'COLONY');
          if (benchColonies.length > 0) {
            const firstColony = benchColonies[0]!;
            const strain = STRAINS_BY_ID[firstColony.strainId];
            const freezeBtn = document.createElement('button');
            freezeBtn.type = 'button';
            freezeBtn.className = 'retro-btn cryo';
            freezeBtn.textContent = `STOCKER BOÎTE #${String(firstColony.slotIndex + 1)} (${strain?.scientificName ?? ''})`;
            freezeBtn.addEventListener('click', () =>
              callbacks.onFreezeColony(firstColony.slotIndex, tube.tubeIndex)
            );
            card.appendChild(freezeBtn);
          }
        } else {
          const col = tube.storedColony;
          const strain = STRAINS_BY_ID[col.strainId];
          const vis = strain ? RARITY_VISUALS[strain.rarity] : undefined;

          const nameDiv = document.createElement('div');
          nameDiv.style.fontWeight = '700';
          nameDiv.style.color = vis?.colorHex ?? '#a7f3d0';
          nameDiv.textContent = strain?.scientificName ?? col.strainId;

          const detailsDiv = document.createElement('div');
          detailsDiv.style.fontSize = '0.75rem';
          const isStabilized2Min = (col.cryoStabilizedSeconds ?? 0) >= 120;
          detailsDiv.textContent = `Maturité : ${Math.floor(col.maturityRatio * 100)}% | Vie figée : ${Math.ceil(col.adultLifespanRemainingSeconds)}s | Durée cryo : ${Math.floor(tube.frozenDurationSeconds)}s${isStabilized2Min ? ' [STABILISÉE 2 MIN]' : ''}`;

          const thawBtn = document.createElement('button');
          thawBtn.type = 'button';
          thawBtn.className = 'retro-btn primary';
          thawBtn.disabled = !emptyBenchSlot;
          thawBtn.textContent = emptyBenchSlot
            ? `DÉCONGELER -> BOÎTE #${String(emptyBenchSlot.slotIndex + 1)}`
            : 'AUCUNE BOÎTE VIDE SUR PAILLASSE';
          if (emptyBenchSlot) {
            thawBtn.addEventListener('click', () =>
              callbacks.onThawColony(tube.tubeIndex, emptyBenchSlot.slotIndex)
            );
          }

          card.append(nameDiv, detailsDiv, thawBtn);
        }

        tubesGrid.appendChild(card);
      }
    },
  };
}

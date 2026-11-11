import { STRAINS, STRAINS_BY_ID } from '../data/index.ts';
import type { GameState } from '../types/game-state.types.ts';

export interface LogbookViewCallbacks {
  onSaveResearcherNotes(notes: string): void;
}

export interface LogbookViewRefs {
  readonly root: HTMLElement;
  update(state: GameState): void;
}

export function createLogbookViewComponent(callbacks: LogbookViewCallbacks): LogbookViewRefs {
  const root = document.createElement('div');

  const spread = document.createElement('div');
  spread.className = 'logbook-spread';

  // Page de gauche : Annales Automatiques & Catalogue Phylogénétique
  const leftPage = document.createElement('div');
  leftPage.className = 'logbook-page';

  // Page de droite : Manuel d'Hybridation (Codex) & Bloc-Notes Libre du Chercheur
  const rightPage = document.createElement('div');
  rightPage.className = 'logbook-page';

  const codexContainer = document.createElement('div');

  const notesTitle = document.createElement('h3');
  notesTitle.className = 'logbook-heading';
  notesTitle.style.marginTop = '18px';
  notesTitle.textContent = '3. BLOC-NOTES LIBRE DU CHERCHEUR (ENCRE STYLO-PLUME)';

  const notesTextarea = document.createElement('textarea');
  notesTextarea.className = 'logbook-notes-textarea';
  notesTextarea.placeholder =
    'Consignez ici vos hypothèses de croisements, recettes et observations personnelles...';

  const saveNotesBtn = document.createElement('button');
  saveNotesBtn.type = 'button';
  saveNotesBtn.className = 'retro-btn primary';
  saveNotesBtn.style.marginTop = '8px';
  saveNotesBtn.textContent = 'ARCHIVER LES NOTES DANS LE CARNET';
  saveNotesBtn.addEventListener('click', () => {
    callbacks.onSaveResearcherNotes(notesTextarea.value);
  });

  rightPage.append(codexContainer, notesTitle, notesTextarea, saveNotesBtn);
  spread.append(leftPage, rightPage);
  root.appendChild(spread);

  let lastRenderedNotes = '';

  return {
    root,
    update(state: GameState): void {
      leftPage.replaceChildren();

      const annalsTitle = document.createElement('h3');
      annalsTitle.className = 'logbook-heading';
      annalsTitle.textContent = `1. ANNALES AUTOMATIQUES (${String(state.logbook.entries.length)} ENTRÉES)`;

      const entriesList = document.createElement('div');
      entriesList.className = 'logbook-entries-list';

      if (state.logbook.entries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'logbook-entry-item';
        empty.textContent =
          '[12 Octobre - 14:22] Ouverture du cahier de paillasse. En attente du premier ensemencement.';
        entriesList.appendChild(empty);
      } else {
        for (const entry of [...state.logbook.entries].reverse()) {
          const item = document.createElement('div');
          item.className = 'logbook-entry-item';
          const stamp = document.createElement('strong');
          stamp.textContent = `${entry.timestampLabelFr} `;
          const msg = document.createElement('span');
          msg.textContent = entry.messageFr;
          item.append(stamp, msg);
          entriesList.appendChild(item);
        }
      }

      const catalogTitle = document.createElement('h3');
      catalogTitle.className = 'logbook-heading';
      catalogTitle.style.marginTop = '18px';
      catalogTitle.textContent = `CATALOGUE PHYLOGÉNÉTIQUE (${String(state.stats.discoveredStrainIds.length)} / ${String(STRAINS.length)} SOUCHES ISOLÉES)`;

      const catalogList = document.createElement('div');
      catalogList.style.fontSize = '0.78rem';
      catalogList.style.maxHeight = '200px';
      catalogList.style.overflowY = 'auto';

      for (const s of STRAINS) {
        const discovered = state.stats.discoveredStrainIds.includes(s.id);
        const row = document.createElement('div');
        row.style.padding = '3px 0';
        row.textContent = discovered
          ? `✔ [${s.rarity}] ${s.scientificName} (x${String(s.multiplier)}) — ${s.effect.descriptionFr}`
          : `• [???] Souche non isolée (${s.rarity})`;
        catalogList.appendChild(row);
      }

      leftPage.append(annalsTitle, entriesList, catalogTitle, catalogList);

      // Page de droite : Codex d'Hybridation
      codexContainer.replaceChildren();
      const codexTitle = document.createElement('h3');
      codexTitle.className = 'logbook-heading';
      codexTitle.textContent = '2. MANUEL D’HYBRIDATION (CODEX DÉCOUVERT)';
      codexContainer.appendChild(codexTitle);

      if (state.logbook.hybridizationCodex.length === 0) {
        const emptyCodex = document.createElement('p');
        emptyCodex.style.fontSize = '0.82rem';
        emptyCodex.textContent =
          'Aucune conjugaison thermochimique enregistrée pour le moment.';
        codexContainer.appendChild(emptyCodex);
      } else {
        for (const rec of state.logbook.hybridizationCodex) {
          const pA = STRAINS_BY_ID[rec.parentAStrainId]?.scientificName ?? rec.parentAStrainId;
          const pB = STRAINS_BY_ID[rec.parentBStrainId]?.scientificName ?? rec.parentBStrainId;
          const offspringNames = rec.observedOffspringStrainIds
            .map((id) => STRAINS_BY_ID[id]?.scientificName ?? id)
            .join(', ');
          const row = document.createElement('div');
          row.className = 'logbook-entry-item';
          row.textContent = `${pA} × ${pB} (${String(rec.successesCount)}/${String(rec.attemptsCount)} succès) => ${offspringNames || 'Lyse'}`;
          codexContainer.appendChild(row);
        }
      }

      if (
        document.activeElement !== notesTextarea &&
        state.logbook.freeNotesText !== lastRenderedNotes
      ) {
        notesTextarea.value = state.logbook.freeNotesText;
        lastRenderedNotes = state.logbook.freeNotesText;
      }
    },
  };
}

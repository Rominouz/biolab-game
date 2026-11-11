import {
  BENCH_EVENTS_BY_ID,
  CONTRACT_CONSTRAINTS_BY_ID,
  CONTRACT_OBJECTIVES_BY_TYPE,
  CONTRACT_SPONSORS_BY_ID,
  CULTURE_MEDIA,
  CULTURE_MEDIA_BY_ID,
  RARITY_VISUALS,
  STRAINS_BY_ID,
  TECH_TREE,
} from '../data/index.ts';
import { computeFlashAutoclaveCost } from '../core/math.ts';
import type { GameState } from '../types/game-state.types.ts';
import type { CultureMediumId, TechId } from '../types/game.types.ts';

export interface BenchViewCallbacks {
  onSeedSlot(slotIndex: number, mediumId: CultureMediumId, sacrificedMythicSlotIndex?: number): void;
  onInjectNutrients(slotIndex: number): void;
  onAutoclaveWaste(slotIndex: number): void;
  onRecycleWaste(slotIndex: number): void;
  onQuickFreeze(slotIndex: number): void;
  onScissiparity(sourceSlotIndex: number, targetSlotIndex: number): void;
  onMutagenesis(sourceSlotIndex: number, targetSlotIndex: number): void;
  onConjugation(parentSlotIndices: readonly number[], targetSlotIndex: number): void;
  onClickBenchEvent(): void;
  onValidateContract(boardSlotIndex: 0 | 1 | 2, targetIncubatorSlotIndex?: number): void;
  onUnlockTech(techId: TechId): void;
}

export interface BenchViewRefs {
  readonly root: HTMLElement;
  getPetriCanvases(): ReadonlyMap<number, HTMLCanvasElement>;
  update(state: GameState): void;
}

export function createBenchViewComponent(callbacks: BenchViewCallbacks): BenchViewRefs {
  const root = document.createElement('div');

  let selectedMediumId: CultureMediumId = 'MEDIUM_1_ORDINARY_AGAR';
  let selectedSacrificeSlotIndex: number | undefined = undefined;
  let selectedSources: number[] = [];

  const petriCanvases = new Map<number, HTMLCanvasElement>();

  // Bannière de Micro-Événement Actif
  const eventBanner = document.createElement('div');
  eventBanner.className = 'bench-event-banner';
  eventBanner.style.display = 'none';

  const layout = document.createElement('div');
  layout.className = 'bench-layout';

  // Colonne gauche : Incubateurs 1D + Division + Contrats + Bioréacteur
  const leftCol = document.createElement('div');

  const incubatorPanel = document.createElement('section');
  incubatorPanel.className = 'panel-card';
  const incubatorTitle = document.createElement('h2');
  incubatorTitle.className = 'panel-title';
  incubatorTitle.textContent = 'PAILLASSE D’INCUBATION 1D (SYNERGIES ADJACENTES GAUCHE / DROITE)';
  const incubatorRow = document.createElement('div');
  incubatorRow.className = 'incubator-row-1d';
  incubatorPanel.append(incubatorTitle, incubatorRow);

  // Panneau de Division Cellulaire (Scissiparité, Mutagenèse UV, Conjugaison)
  const divisionPanel = document.createElement('section');
  divisionPanel.className = 'panel-card';
  const divisionTitle = document.createElement('h2');
  divisionTitle.className = 'panel-title';
  divisionTitle.textContent = 'PROTOCOLES DE MULTIPLICATION & GÉNÉTIQUE';
  const divisionContent = document.createElement('div');
  divisionPanel.append(divisionTitle, divisionContent);

  // Panneau des Contrats Dynamiques Procéduraux
  const contractsPanel = document.createElement('section');
  contractsPanel.className = 'panel-card';
  const contractsTitle = document.createElement('h2');
  contractsTitle.className = 'panel-title';
  contractsTitle.textContent = 'CONTRATS DYNAMIQUES PROCÉDURAUX (3 EMPLACEMENTS)';
  const contractsContent = document.createElement('div');
  contractsPanel.append(contractsTitle, contractsContent);

  leftCol.append(incubatorPanel, divisionPanel, contractsPanel);

  // Colonne droite : Sélecteur de Milieu + Bioréacteur + Arbre Technologique PR
  const rightCol = document.createElement('div');

  const mediaPanel = document.createElement('section');
  mediaPanel.className = 'panel-card';
  const mediaTitle = document.createElement('h2');
  mediaTitle.className = 'panel-title';
  mediaTitle.textContent = 'SÉLECTEUR DE MILIEU DE CULTURE (1 À 7)';
  const mediaContent = document.createElement('div');
  mediaPanel.append(mediaTitle, mediaContent);

  const bioreactorPanel = document.createElement('section');
  bioreactorPanel.className = 'panel-card';
  const bioreactorTitle = document.createElement('h2');
  bioreactorTitle.className = 'panel-title';
  bioreactorTitle.textContent = 'BIORÉACTEUR DE RECYCLAGE (RESTITUTION 10%)';
  const bioreactorContent = document.createElement('div');
  bioreactorPanel.append(bioreactorTitle, bioreactorContent);

  const techPanel = document.createElement('section');
  techPanel.className = 'panel-card';
  const techTitle = document.createElement('h2');
  techTitle.className = 'panel-title';
  techTitle.textContent = 'ARBRE TECHNOLOGIQUE (12 RECHERCHES PR)';
  const techContent = document.createElement('div');
  techPanel.append(techTitle, techContent);

  rightCol.append(mediaPanel, bioreactorPanel, techPanel);
  layout.append(leftCol, rightCol);
  root.append(eventBanner, layout);

  function toggleSourceSelection(slotIndex: number, maxAllowed: number): void {
    const idx = selectedSources.indexOf(slotIndex);
    if (idx >= 0) {
      selectedSources.splice(idx, 1);
    } else {
      if (selectedSources.length >= maxAllowed) {
        selectedSources.shift();
      }
      selectedSources.push(slotIndex);
    }
  }

  return {
    root,
    getPetriCanvases(): ReadonlyMap<number, HTMLCanvasElement> {
      return petriCanvases;
    },
    update(state: GameState): void {
      const maxConjugationParents = state.unlockedTechIds.includes('M3') ? 3 : 2;
      selectedSources = selectedSources.filter((idx) => {
        const s = state.incubatorSlots[idx];
        return s !== undefined && s.status === 'COLONY' && s.isMature;
      });

      // 1. Bannière de Micro-Événement Actif
      eventBanner.replaceChildren();
      if (state.activeBenchEvent) {
        const activeEv = state.activeBenchEvent;
        const def = BENCH_EVENTS_BY_ID[activeEv.eventId];
        eventBanner.style.display = 'flex';
        eventBanner.className =
          activeEv.category === 'INCIDENT'
            ? 'bench-event-banner incident'
            : 'bench-event-banner';

        const infoDiv = document.createElement('div');
        const badge = document.createElement('strong');
        badge.textContent =
          activeEv.category === 'INCIDENT'
            ? `[INCIDENT ${activeEv.eventId}] ${def.titleFr} — `
            : `[ÉVÉNEMENT ${activeEv.eventId}] ${def.titleFr} — `;
        const desc = document.createElement('span');
        desc.textContent = `${def.visualDescriptionFr} (${def.effectDescriptionFr}) [${Math.ceil(activeEv.remainingDisplaySeconds)}s]`;
        infoDiv.append(badge, desc);

        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.className =
          activeEv.category === 'INCIDENT' ? 'retro-btn danger' : 'retro-btn warning';
        if (activeEv.requiredClicks === 0) {
          actionBtn.disabled = true;
          actionBtn.textContent = 'ACTIF AUTOMATIQUEMENT';
        } else {
          actionBtn.textContent = `${def.interactionDescriptionFr} (${String(activeEv.currentClicks)}/${String(activeEv.requiredClicks)})`;
          actionBtn.addEventListener('click', () => callbacks.onClickBenchEvent());
        }
        eventBanner.append(infoDiv, actionBtn);
      } else {
        eventBanner.style.display = 'none';
      }

      // 2. Rangée 1D d'incubateurs
      incubatorRow.replaceChildren();
      for (const slot of state.incubatorSlots) {
        const card = document.createElement('div');
        const isSelected = selectedSources.includes(slot.slotIndex);
        card.className = `petri-slot-card${isSelected ? ' selected-source' : ''}${slot.status === 'WASTE' && slot.isToxic ? ' toxic-waste' : ''}`;

        const header = document.createElement('div');
        header.className = 'petri-slot-header';
        const idxSpan = document.createElement('span');
        idxSpan.textContent = `BOÎTE #${String(slot.slotIndex + 1)}`;
        const yieldSpan = document.createElement('span');
        const slotBioRate = state.economy.slotEffectiveBioPerSec[slot.slotIndex] ?? 0;
        yieldSpan.textContent =
          slot.status === 'COLONY' ? `+${slotBioRate.toFixed(1)} Bio/s` : slot.status;
        header.append(idxSpan, yieldSpan);

        let canvas = petriCanvases.get(slot.slotIndex);
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvas.className = 'petri-canvas';
          petriCanvases.set(slot.slotIndex, canvas);
        }

        const nameEl = document.createElement('div');
        nameEl.className = 'strain-name';

        const rarityPill = document.createElement('span');
        rarityPill.className = 'rarity-pill';

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'slot-actions';

        if (slot.status === 'EMPTY') {
          nameEl.textContent = 'Boîte de Pétri Vierge';
          rarityPill.textContent = 'DISPONIBLE';
          rarityPill.style.color = '#64748b';

          const medDef = CULTURE_MEDIA_BY_ID[selectedMediumId];
          const stockCount = state.mediaInventory[selectedMediumId] ?? 0;
          const seedBtn = document.createElement('button');
          seedBtn.type = 'button';
          seedBtn.className = 'retro-btn primary';
          seedBtn.textContent =
            stockCount > 0
              ? `ENSEMENCER (${medDef.nameFr} - En stock: ${String(stockCount)})`
              : `ENSEMENCER (${medDef.costBio.toLocaleString('fr-FR')} Bio)`;
          seedBtn.addEventListener('click', () =>
            callbacks.onSeedSlot(slot.slotIndex, selectedMediumId, selectedSacrificeSlotIndex)
          );
          actionsDiv.appendChild(seedBtn);

          card.append(header, canvas, nameEl, rarityPill, actionsDiv);
        } else if (slot.status === 'COLONY') {
          const strain = STRAINS_BY_ID[slot.strainId];
          if (!strain) {
            continue;
          }
          const visual = RARITY_VISUALS[strain.rarity];
          nameEl.textContent = strain.scientificName;
          rarityPill.textContent = `${visual.labelFr} (x${String(strain.multiplier)})`;
          rarityPill.style.color = visual.colorHex;

          // Barre de maturité
          const matMeta = document.createElement('div');
          matMeta.className = 'slot-meta-line';
          const matLabel = document.createElement('span');
          matLabel.textContent = 'Maturité';
          const matVal = document.createElement('span');
          matVal.textContent = `${Math.floor(slot.maturityRatio * 100)}%`;
          matMeta.append(matLabel, matVal);

          const matTrack = document.createElement('div');
          matTrack.className = 'progress-bar-track';
          const matFill = document.createElement('div');
          matFill.className = 'progress-bar-fill';
          matFill.style.width = `${String(Math.min(100, slot.maturityRatio * 100))}%`;
          matTrack.appendChild(matFill);

          // Barre de vie adulte
          const lifeRatio =
            slot.adultLifespanTotalSeconds > 0
              ? slot.adultLifespanRemainingSeconds / slot.adultLifespanTotalSeconds
              : 0;
          const lifeMeta = document.createElement('div');
          lifeMeta.className = 'slot-meta-line';
          const lifeLabel = document.createElement('span');
          lifeLabel.textContent = 'Vie Adulte';
          const lifeVal = document.createElement('span');
          lifeVal.textContent = `${Math.ceil(slot.adultLifespanRemainingSeconds)}s`;
          lifeMeta.append(lifeLabel, lifeVal);

          const lifeTrack = document.createElement('div');
          lifeTrack.className = 'progress-bar-track';
          const lifeFill = document.createElement('div');
          lifeFill.className = 'progress-bar-fill lifespan';
          lifeFill.style.width = `${String(Math.min(100, lifeRatio * 100))}%`;
          lifeTrack.appendChild(lifeFill);

          if (!slot.isMature) {
            const injBtn = document.createElement('button');
            injBtn.type = 'button';
            injBtn.className = 'retro-btn';
            const cd = Math.ceil(slot.manualInjectionCooldownSeconds);
            injBtn.disabled = cd > 0 || state.bio < 5;
            injBtn.textContent =
              cd > 0 ? `NUTRIMENTS (${String(cd)}s)` : 'INJECTER NUTRIMENTS (5 Bio)';
            injBtn.addEventListener('click', () => callbacks.onInjectNutrients(slot.slotIndex));
            actionsDiv.appendChild(injBtn);
          } else {
            const selectBtn = document.createElement('button');
            selectBtn.type = 'button';
            selectBtn.className = isSelected ? 'retro-btn warning' : 'retro-btn';
            selectBtn.textContent = isSelected
              ? `SOURCE SÉLECTIONNÉE (#${String(selectedSources.indexOf(slot.slotIndex) + 1)})`
              : 'SÉLECTIONNER POUR DIVISION';
            selectBtn.addEventListener('click', () => {
              toggleSourceSelection(slot.slotIndex, maxConjugationParents);
              this.update(state);
            });

            const emptyCryo = state.cryoSlots.find((c) => c.status === 'EMPTY');
            const freezeBtn = document.createElement('button');
            freezeBtn.type = 'button';
            freezeBtn.className = 'retro-btn cryo';
            freezeBtn.disabled = !emptyCryo;
            freezeBtn.textContent = emptyCryo
              ? `CRYOGÉNISER (Tube #${String(emptyCryo.tubeIndex + 1)})`
              : 'CRYO PLEINE';
            freezeBtn.addEventListener('click', () => callbacks.onQuickFreeze(slot.slotIndex));

            actionsDiv.append(selectBtn, freezeBtn);
          }

          card.append(
            header,
            canvas,
            nameEl,
            rarityPill,
            matMeta,
            matTrack,
            lifeMeta,
            lifeTrack,
            actionsDiv
          );
        } else {
          // WASTE
          const originStrain = STRAINS_BY_ID[slot.originStrainId];
          nameEl.textContent = `Résidu (${originStrain?.scientificName ?? slot.originStrainId})`;
          rarityPill.textContent = slot.isToxic
            ? 'TOXIQUE (-25% VOISINS)'
            : `NÉCROSE (${Math.floor(slot.necrosisElapsedSeconds)}s/60s)`;
          rarityPill.style.color = slot.isToxic ? '#ff0055' : '#84cc16';

          const autoclaveCost =
            computeFlashAutoclaveCost(originStrain?.multiplier ?? 1) +
            state.benchBuffs.m5NextAutoclaveSurchargeBio;

          const autoBtn = document.createElement('button');
          autoBtn.type = 'button';
          autoBtn.className = 'retro-btn danger';
          autoBtn.disabled = state.bio < autoclaveCost;
          autoBtn.textContent = `AUTOCLAVE FLASH (${autoclaveCost.toFixed(1)} Bio)`;
          autoBtn.addEventListener('click', () => callbacks.onAutoclaveWaste(slot.slotIndex));

          const recycleBtn = document.createElement('button');
          recycleBtn.type = 'button';
          recycleBtn.className = 'retro-btn primary';
          recycleBtn.textContent = 'BIORÉACTEUR (GRATUIT / +10%)';
          recycleBtn.addEventListener('click', () => callbacks.onRecycleWaste(slot.slotIndex));

          actionsDiv.append(autoBtn, recycleBtn);
          card.append(header, canvas, nameEl, rarityPill, actionsDiv);
        }

        incubatorRow.appendChild(card);
      }

      // 3. Sélecteur de Milieu de Culture
      mediaContent.replaceChildren();
      const mediaSelect = document.createElement('select');
      mediaSelect.className = 'retro-select';
      for (const m of CULTURE_MEDIA) {
        const opt = document.createElement('option');
        opt.value = m.id;
        const stock = state.mediaInventory[m.id] ?? 0;
        opt.textContent = `${String(m.index)}. ${m.nameFr} — ${m.costBio.toLocaleString('fr-FR')} Bio (Stock: ${String(stock)})`;
        if (m.id === selectedMediumId) opt.selected = true;
        mediaSelect.appendChild(opt);
      }
      mediaSelect.addEventListener('change', () => {
        selectedMediumId = mediaSelect.value as CultureMediumId;
        this.update(state);
      });

      const currentMediaDef = CULTURE_MEDIA_BY_ID[selectedMediumId];
      const mediaDesc = document.createElement('p');
      mediaDesc.style.fontSize = '0.76rem';
      mediaDesc.style.margin = '8px 0';
      mediaDesc.textContent = currentMediaDef.profileDescriptionFr;

      mediaContent.append(mediaSelect, mediaDesc);

      if (currentMediaDef.requiresMythicSacrifice) {
        const mythicLabel = document.createElement('div');
        mythicLabel.style.fontSize = '0.74rem';
        mythicLabel.style.color = '#ff0055';
        mythicLabel.textContent = 'Requiert le sacrifice d’une souche Mythique active :';
        const mythicSelect = document.createElement('select');
        mythicSelect.className = 'retro-select';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '-- Choisir la colonie Mythique à sacrifier --';
        mythicSelect.appendChild(defaultOpt);
        for (const s of state.incubatorSlots) {
          if (s.status === 'COLONY' && STRAINS_BY_ID[s.strainId]?.rarity === 'MYTHIC') {
            const o = document.createElement('option');
            o.value = String(s.slotIndex);
            o.textContent = `Boîte #${String(s.slotIndex + 1)} : ${STRAINS_BY_ID[s.strainId]?.scientificName}`;
            if (selectedSacrificeSlotIndex === s.slotIndex) o.selected = true;
            mythicSelect.appendChild(o);
          }
        }
        mythicSelect.addEventListener('change', () => {
          selectedSacrificeSlotIndex =
            mythicSelect.value === '' ? undefined : Number(mythicSelect.value);
        });
        mediaContent.append(mythicLabel, mythicSelect);
      }

      // 4. Panneau de Division Cellulaire
      divisionContent.replaceChildren();
      const emptyTargetSlot = state.incubatorSlots.find((s) => s.status === 'EMPTY');
      const divHelp = document.createElement('p');
      divHelp.style.fontSize = '0.76rem';
      divHelp.style.margin = '0 0 8px 0';
      divHelp.textContent =
        selectedSources.length === 0
          ? 'Sélectionnez 1 colonie mature sur la paillasse pour la Scissiparité / Mutagenèse UV, ou 2 à 3 colonies pour la Conjugaison.'
          : `Sources sélectionnées : ${selectedSources.map((i) => `Boîte #${String(i + 1)} (${STRAINS_BY_ID[(state.incubatorSlots[i] as { strainId: string }).strainId]?.scientificName})`).join(' + ')} -> Cible : ${emptyTargetSlot ? `Boîte vide #${String(emptyTargetSlot.slotIndex + 1)}` : 'Aucune boîte vide !'}`;

      const divButtonsRow = document.createElement('div');
      divButtonsRow.style.display = 'flex';
      divButtonsRow.style.flexWrap = 'wrap';
      divButtonsRow.style.gap = '8px';

      const firstSourceIdx = selectedSources[0];
      const firstSourceSlot =
        firstSourceIdx !== undefined ? state.incubatorSlots[firstSourceIdx] : undefined;
      const firstStrain =
        firstSourceSlot?.status === 'COLONY' ? STRAINS_BY_ID[firstSourceSlot.strainId] : undefined;

      const scissBtn = document.createElement('button');
      scissBtn.type = 'button';
      scissBtn.className = 'retro-btn primary';
      scissBtn.disabled = selectedSources.length !== 1 || !emptyTargetSlot || !firstStrain;
      scissBtn.textContent = firstStrain
        ? `A. SCISSIPARITÉ (${firstStrain.scissiparityCostBio.toLocaleString('fr-FR')} Bio${firstStrain.scissiparityCostPr > 0 ? ` + ${String(firstStrain.scissiparityCostPr)} PR` : ''})`
        : 'A. SCISSIPARITÉ (1 source)';
      if (firstSourceIdx !== undefined && emptyTargetSlot) {
        scissBtn.addEventListener('click', () =>
          callbacks.onScissiparity(firstSourceIdx, emptyTargetSlot.slotIndex)
        );
      }

      const mutaBtn = document.createElement('button');
      mutaBtn.type = 'button';
      mutaBtn.className = 'retro-btn warning';
      mutaBtn.disabled = selectedSources.length !== 1 || !emptyTargetSlot || !firstStrain;
      mutaBtn.textContent = firstStrain
        ? `B. MUTAGENÈSE UV (${(firstStrain.scissiparityCostBio * 4).toLocaleString('fr-FR')} Bio + ${String(15 + firstStrain.scissiparityCostPr)} PR)`
        : 'B. MUTAGENÈSE UV (1 source)';
      if (firstSourceIdx !== undefined && emptyTargetSlot) {
        mutaBtn.addEventListener('click', () =>
          callbacks.onMutagenesis(firstSourceIdx, emptyTargetSlot.slotIndex)
        );
      }

      const conjBtn = document.createElement('button');
      conjBtn.type = 'button';
      conjBtn.className = 'retro-btn cryo';
      conjBtn.disabled = selectedSources.length < 2 || !emptyTargetSlot;
      conjBtn.textContent = `C. CONJUGAISON (${String(selectedSources.length)}/${String(maxConjugationParents)} parents)`;
      if (selectedSources.length >= 2 && emptyTargetSlot) {
        conjBtn.addEventListener('click', () =>
          callbacks.onConjugation([...selectedSources], emptyTargetSlot.slotIndex)
        );
      }

      divButtonsRow.append(scissBtn, mutaBtn, conjBtn);
      divisionContent.append(divHelp, divButtonsRow);

      // 5. Bioréacteur de recyclage
      bioreactorContent.replaceChildren();
      if (state.bioreactorTasks.length === 0) {
        const emptyBio = document.createElement('div');
        emptyBio.style.fontSize = '0.76rem';
        emptyBio.style.color = '#64748b';
        emptyBio.textContent = 'Aucun cycle de recyclage en cours.';
        bioreactorContent.appendChild(emptyBio);
      } else {
        for (const task of state.bioreactorTasks) {
          const item = document.createElement('div');
          item.style.marginBottom = '6px';
          item.style.fontSize = '0.75rem';
          item.textContent = `Recyclage Boîte #${String(task.originSlotIndex + 1)} : ${Math.ceil(task.remainingSeconds)}s restantes (+${task.refundBioAmount.toFixed(1)} Bio)`;
          bioreactorContent.appendChild(item);
        }
      }

      // 6. Tableau des Contrats Procéduraux
      contractsContent.replaceChildren();
      for (const cSlot of state.contractBoard) {
        const cCard = document.createElement('div');
        cCard.className = 'contract-card';

        if (cSlot.status === 'RENEWING') {
          cCard.textContent = `Slot #${String(cSlot.slotIndex + 1)} : Transmission d'un nouveau contrat dans ${Math.ceil(cSlot.renewalRemainingSeconds)}s...`;
        } else {
          const c = cSlot.contract;
          const sponsor = CONTRACT_SPONSORS_BY_ID[c.sponsorId];
          const obj = CONTRACT_OBJECTIVES_BY_TYPE[c.objectiveType];
          const strain = STRAINS_BY_ID[c.targetStrainId];
          const constraint = c.constraintId ? CONTRACT_CONSTRAINTS_BY_ID[c.constraintId] : null;

          const head = document.createElement('div');
          head.style.fontWeight = '700';
          head.textContent = `${sponsor.nameFr} — ${obj.nameFr}${constraint ? ` ${constraint.labelFr}` : ''}`;

          const details = document.createElement('div');
          details.style.margin = '4px 0';
          details.textContent = `Cible : ${strain?.scientificName ?? c.targetStrainId} | Récompense : +${c.rewardBio.toLocaleString('fr-FR')} Bio, +${c.rewardPr.toLocaleString('fr-FR')} PR${c.rewardMediumId ? ` + 1x ${CULTURE_MEDIA_BY_ID[c.rewardMediumId].nameFr}` : ''}`;

          if (c.objectiveType === 'CONTINUOUS_METABOLIC_EXTRACTION') {
            const extInfo = document.createElement('div');
            extInfo.style.color = '#00e5ff';
            extInfo.textContent = `Extraction continue : ${Math.floor(c.extractionElapsedSeconds)}s / ${String(c.extractionRequiredSeconds)}s`;
            details.appendChild(extInfo);
          }

          if (c.timeLimitRemainingSeconds !== undefined) {
            const timerInfo = document.createElement('div');
            timerInfo.style.color = '#ffb703';
            timerInfo.textContent = `Temps restant : ${Math.ceil(c.timeLimitRemainingSeconds)}s`;
            details.appendChild(timerInfo);
          }

          const valBtn = document.createElement('button');
          valBtn.type = 'button';
          valBtn.className = 'retro-btn primary';
          valBtn.style.marginTop = '4px';
          valBtn.textContent = 'VALIDER / LIVRER LE CONTRAT';
          valBtn.addEventListener('click', () => {
            const matchingSlot = state.incubatorSlots.find(
              (s) => s.status === 'COLONY' && s.isMature && s.strainId === c.targetStrainId
            );
            callbacks.onValidateContract(cSlot.slotIndex, matchingSlot?.slotIndex);
          });

          cCard.append(head, details, valBtn);
        }
        contractsContent.appendChild(cCard);
      }

      // 7. Arbre Technologique PR
      techContent.replaceChildren();
      for (const tech of TECH_TREE) {
        const isUnlocked = state.unlockedTechIds.includes(tech.id);
        const tCard = document.createElement('div');
        tCard.className = `tech-card${isUnlocked ? ' unlocked' : ''}`;

        const tHeader = document.createElement('div');
        tHeader.style.fontWeight = '700';
        tHeader.textContent = `[${tech.id}] ${tech.nameFr} (${tech.costPr.toLocaleString('fr-FR')} PR)`;

        const tDesc = document.createElement('div');
        tDesc.style.margin = '3px 0';
        tDesc.textContent = tech.effectDescriptionFr;

        tCard.append(tHeader, tDesc);

        if (!isUnlocked) {
          const buyBtn = document.createElement('button');
          buyBtn.type = 'button';
          buyBtn.className = 'retro-btn';
          buyBtn.disabled = state.pr < tech.costPr;
          buyBtn.textContent = `RECHERCHER (${tech.costPr.toLocaleString('fr-FR')} PR)`;
          buyBtn.addEventListener('click', () => callbacks.onUnlockTech(tech.id));
          tCard.appendChild(buyBtn);
        } else {
          const badge = document.createElement('span');
          badge.style.color = '#22c55e';
          badge.textContent = '✔ TECHNOLOGIE ACQUISE';
          tCard.appendChild(badge);
        }

        techContent.appendChild(tCard);
      }
    },
  };
}

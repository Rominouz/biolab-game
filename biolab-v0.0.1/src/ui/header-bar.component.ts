import { FACTORY_TIERS_BY_LEVEL } from '../data/index.ts';
import type { ActiveLabModule } from '../render/factory-cross-section.renderer.ts';
import type { GameState } from '../types/game-state.types.ts';
import type { FactoryTierLevel } from '../types/game.types.ts';

export interface HeaderBarCallbacks {
  onSelectModule(module: ActiveLabModule): void;
  onTogglePause(): void;
  onToggleMute(): void;
  onQuickSave(): void;
  onOpenExportImportModal(): void;
  onUpgradeFactory(): void;
}

export interface HeaderBarRefs {
  readonly root: HTMLElement;
  readonly cutawayCanvas: HTMLCanvasElement;
  update(state: GameState, activeModule: ActiveLabModule, isMuted: boolean): void;
}

function formatNumberFr(val: number, decimals = 1): string {
  return val.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function createHeaderBarComponent(callbacks: HeaderBarCallbacks): HeaderBarRefs {
  const wrapper = document.createElement('div');

  // 1. Barre d'instruments supérieure
  const header = document.createElement('header');
  header.className = 'lab-header';

  const brand = document.createElement('div');
  brand.className = 'lab-brand';

  const title = document.createElement('span');
  title.className = 'lab-brand-title';
  title.textContent = 'BIOLAB // CRT-88';

  const voltageBadge = document.createElement('span');
  voltageBadge.className = 'voltage-badge';
  voltageBadge.textContent = '[TENSION NOMINALE]';

  brand.append(title, voltageBadge);

  // Compteurs Bio, PR, Charges et Palier
  const metrics = document.createElement('div');
  metrics.className = 'lab-metrics';

  const bioBox = document.createElement('div');
  bioBox.className = 'metric-box';
  const bioLabel = document.createElement('span');
  bioLabel.className = 'metric-label';
  bioLabel.textContent = 'Trésorerie Biomasse';
  const bioValue = document.createElement('span');
  bioValue.className = 'metric-value';
  const bioRate = document.createElement('span');
  bioRate.className = 'metric-sub';
  bioBox.append(bioLabel, bioValue, bioRate);

  const prBox = document.createElement('div');
  prBox.className = 'metric-box';
  const prLabel = document.createElement('span');
  prLabel.className = 'metric-label';
  prLabel.textContent = 'Points de Recherche';
  const prValue = document.createElement('span');
  prValue.className = 'metric-value';
  const prRate = document.createElement('span');
  prRate.className = 'metric-sub positive';
  prBox.append(prLabel, prValue, prRate);

  const overheadBox = document.createElement('div');
  overheadBox.className = 'metric-box';
  const overheadLabel = document.createElement('span');
  overheadLabel.className = 'metric-label';
  overheadLabel.textContent = 'Charges (Usine + Cryo)';
  const overheadValue = document.createElement('span');
  overheadValue.className = 'metric-value';
  overheadBox.append(overheadLabel, overheadValue);

  metrics.append(bioBox, prBox, overheadBox);

  // Commandes système
  const controls = document.createElement('div');
  controls.className = 'lab-controls';

  const upgradeBtn = document.createElement('button');
  upgradeBtn.type = 'button';
  upgradeBtn.className = 'retro-btn primary';
  upgradeBtn.addEventListener('click', () => callbacks.onUpgradeFactory());

  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'retro-btn';
  pauseBtn.addEventListener('click', () => callbacks.onTogglePause());

  const muteBtn = document.createElement('button');
  muteBtn.type = 'button';
  muteBtn.className = 'retro-btn';
  muteBtn.addEventListener('click', () => callbacks.onToggleMute());

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'retro-btn';
  saveBtn.textContent = 'SAUVEGARDER';
  saveBtn.addEventListener('click', () => callbacks.onQuickSave());

  const ioBtn = document.createElement('button');
  ioBtn.type = 'button';
  ioBtn.className = 'retro-btn';
  ioBtn.textContent = 'EXPORT / IMPORT JSON';
  ioBtn.addEventListener('click', () => callbacks.onOpenExportImportModal());

  controls.append(upgradeBtn, pauseBtn, muteBtn, saveBtn, ioBtn);
  header.append(brand, metrics, controls);

  // 2. Coupe Architecturale 2D & Sas Pneumatique
  const cutawayBar = document.createElement('section');
  cutawayBar.className = 'factory-cross-section-bar';

  const cutawayCanvas = document.createElement('canvas');
  cutawayCanvas.className = 'factory-cutaway-canvas';

  const airlockNav = document.createElement('div');
  airlockNav.className = 'airlock-nav';

  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'airlock-tabs';

  const tabDefinitions: readonly { readonly id: ActiveLabModule; readonly titleFr: string }[] = [
    { id: 'BENCH', titleFr: '1. PAILLASSE PRINCIPALE' },
    { id: 'CRYO', titleFr: '2. CHAMBRE CRYOGÉNIQUE' },
    { id: 'TROPHIES', titleFr: '3. ARMOIRE DES DISTINCTIONS' },
    { id: 'LOGBOOK', titleFr: '4. JOURNAL DE BORD' },
  ];

  const tabButtons = new Map<ActiveLabModule, { btn: HTMLButtonElement; label: HTMLSpanElement }>();

  for (const def of tabDefinitions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'airlock-tab';
    const led = document.createElement('span');
    led.className = 'airlock-led';
    const label = document.createElement('span');
    label.textContent = def.titleFr;
    btn.append(led, label);
    btn.addEventListener('click', () => callbacks.onSelectModule(def.id));
    tabsContainer.appendChild(btn);
    tabButtons.set(def.id, { btn, label });
  }

  airlockNav.appendChild(tabsContainer);
  cutawayBar.append(cutawayCanvas, airlockNav);

  wrapper.append(header, cutawayBar);

  return {
    root: wrapper,
    cutawayCanvas,
    update(state: GameState, activeModule: ActiveLabModule, isMuted: boolean): void {
      if (state.isUndervoltage) {
        voltageBadge.className = 'voltage-badge undervoltage';
        voltageBadge.textContent = '[ALERTE SOUS-TENSION : POUSSE -50%]';
      } else {
        voltageBadge.className = 'voltage-badge';
        voltageBadge.textContent = '[TENSION NOMINALE]';
      }

      bioValue.textContent = `${formatNumberFr(state.bio, 1)} Bio`;
      const net = state.economy.netBioPerSec;
      bioRate.textContent = `(${net >= 0 ? '+' : ''}${formatNumberFr(net, 2)}/s)`;
      bioRate.className = `metric-sub ${net >= 0 ? 'positive' : 'negative'}`;

      prValue.textContent = `${formatNumberFr(state.pr, 1)} PR`;
      prRate.textContent =
        state.economy.passivePrPerSec > 0
          ? `(+${formatNumberFr(state.economy.passivePrPerSec, 2)}/s)`
          : '';

      const totalCharges =
        state.economy.fixedOverheadBioPerSec + state.economy.cryoUpkeepBioPerSec;
      overheadValue.textContent = `-${formatNumberFr(totalCharges, 2)} Bio/s`;

      // Bouton d'extension d'usine
      if (state.factoryTier >= 5) {
        upgradeBtn.disabled = true;
        upgradeBtn.textContent = 'PALIER 5 MAX (BSL-4)';
      } else {
        const nextLevel = (state.factoryTier + 1) as FactoryTierLevel;
        const nextDef = FACTORY_TIERS_BY_LEVEL[nextLevel];
        const canAfford = state.bio >= nextDef.unlockCostBio && state.pr >= nextDef.unlockCostPr;
        upgradeBtn.disabled = !canAfford;
        upgradeBtn.textContent = `EXTENSION PALIER ${String(nextLevel)} (${formatNumberFr(nextDef.unlockCostBio, 0)} Bio / ${formatNumberFr(nextDef.unlockCostPr, 0)} PR)`;
      }

      pauseBtn.textContent = state.isPaused ? 'REPRENDRE [PAUSE]' : 'PAUSE';
      muteBtn.textContent = isMuted ? 'AUDIO : MUET' : 'AUDIO : ACTIF';

      // Mise à jour des badges sur les onglets du sas
      const occupiedCryo = state.cryoSlots.filter((c) => c.status === 'FROZEN').length;
      for (const [id, refs] of tabButtons.entries()) {
        refs.btn.className = id === activeModule ? 'airlock-tab active' : 'airlock-tab';
        if (id === 'BENCH') {
          const activeColonies = state.incubatorSlots.filter((s) => s.status === 'COLONY').length;
          refs.label.textContent = `1. PAILLASSE (${String(activeColonies)}/${String(state.incubatorSlots.length)})`;
        } else if (id === 'CRYO') {
          refs.label.textContent = `2. CHAMBRE CRYO (${String(occupiedCryo)}/${String(state.cryoSlots.length)})`;
        } else if (id === 'TROPHIES') {
          refs.label.textContent = `3. DISTINCTIONS (${String(state.unlockedTrophyIds.length)}/16)`;
        } else if (id === 'LOGBOOK') {
          refs.label.textContent = `4. JOURNAL (${String(state.stats.discoveredStrainIds.length)}/27)`;
        }
      }
    },
  };
}

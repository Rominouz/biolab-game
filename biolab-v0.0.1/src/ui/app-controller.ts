import { RetroAudioService } from '../audio/retro-audio.service.ts';
import {
  renderFactoryCrossSectionCanvas,
  type ActiveLabModule,
} from '../render/factory-cross-section.renderer.ts';
import { renderPetriDishCanvas } from '../render/petri-canvas.renderer.ts';
import {
  BioLabStorageService,
  exportSaveToJson,
  importSaveFromJson,
} from '../storage/indexeddb.service.ts';
import { createSimulationEngine, type SimulationEngine } from '../systems/simulation-engine.ts';
import { createBenchViewComponent } from './bench-view.component.ts';
import { createCryoViewComponent } from './cryo-view.component.ts';
import { createHeaderBarComponent } from './header-bar.component.ts';
import { createLogbookViewComponent } from './logbook-view.component.ts';
import { createTrophiesViewComponent } from './trophies-view.component.ts';

export class BioLabAppController {
  private readonly container: HTMLElement;
  private readonly storage: BioLabStorageService;
  private readonly audio: RetroAudioService;
  private engine: SimulationEngine;
  private activeModule: ActiveLabModule = 'BENCH';
  private rafId: number | null = null;
  private lastFrameTimeMs = 0;
  private uiRefreshAccumulatorSec = 0;
  private autosaveAccumulatorSec = 0;
  private totalVisualTimeSec = 0;

  public constructor(container: HTMLElement) {
    this.container = container;
    this.storage = new BioLabStorageService();
    this.audio = new RetroAudioService();
    this.engine = createSimulationEngine({ seed: Date.now() >>> 0 });
  }

  public async mount(): Promise<void> {
    // Chargement éventuel de la sauvegarde automatique au démarrage
    const saved = await this.storage.loadGame('autosave');
    if (saved.ok) {
      this.engine = createSimulationEngine({
        initialState: saved.value,
        seed: Date.now() >>> 0,
      });
    }

    this.bindAudioEvents();
    this.buildLayout();
  }

  private bindAudioEvents(): void {
    this.engine.getEventBus().subscribe((ev) => {
      switch (ev.type) {
        case 'COLONY_SEEDED':
          this.audio.play('seed');
          break;
        case 'COLONY_REACHED_MATURITY':
          this.audio.play('mature');
          break;
        case 'DIVISION_COMPLETED':
          this.audio.play(ev.outcome === 'LYSIS_FAILURE' ? 'lysis' : 'division');
          break;
        case 'COLONY_FROZEN_IN_CRYO':
        case 'COLONY_THAWED_FROM_CRYO':
          this.audio.play('cryo');
          break;
        case 'BENCH_EVENT_SPAWNED':
          this.audio.play('incident');
          break;
        case 'CONTRACT_COMPLETED':
          this.audio.play('contract');
          break;
        case 'TROPHY_UNLOCKED':
          this.audio.play('trophy');
          this.showToast(`Nouvelle distinction débloquée : ${ev.nameFr}`);
          break;
        case 'FACTORY_TIER_UNLOCKED':
          this.audio.play('upgrade');
          break;
      }
    });
  }

  private showToast(messageFr: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast-banner';
    toast.textContent = messageFr;
    document.body.appendChild(toast);
    globalThis.setTimeout(() => {
      toast.remove();
    }, 3200);
  }

  private buildLayout(): void {
    this.container.replaceChildren();

    const monitor = document.createElement('div');
    monitor.className = 'crt-monitor';

    const moduleStage = document.createElement('main');

    const headerRefs = createHeaderBarComponent({
      onSelectModule: (mod) => {
        this.audio.play('click');
        this.activeModule = mod;
        refreshAllViews();
      },
      onTogglePause: () => {
        this.audio.play('click');
        const nextPaused = !this.engine.getState().isPaused;
        this.engine.setPaused(nextPaused);
        refreshAllViews();
      },
      onToggleMute: () => {
        this.audio.toggleMute();
        refreshAllViews();
      },
      onQuickSave: () => {
        this.audio.play('click');
        void this.storage.saveGame(this.engine.getState(), 'autosave').then((res) => {
          if (res.ok) {
            this.showToast('Sauvegarde locale enregistrée dans IndexedDB.');
          }
        });
      },
      onOpenExportImportModal: () => {
        this.audio.play('click');
        openExportImportModal();
      },
      onUpgradeFactory: () => {
        this.runSafeAction(() => {
          this.engine.upgradeFactory();
          this.showToast(`Extension d'infrastructure validée !`);
        });
        refreshAllViews();
      },
    });

    const benchRefs = createBenchViewComponent({
      onSeedSlot: (slotIndex, mediumId, sacrificedMythicSlotIndex) => {
        this.runSafeAction(() => {
          this.engine.seedColony({
            slotIndex,
            mediumId,
            ...(sacrificedMythicSlotIndex !== undefined
              ? { mythicSacrificeSlotIndex: sacrificedMythicSlotIndex }
              : {}),
          });
        });
        refreshAllViews();
      },
      onInjectNutrients: (slotIndex) => {
        this.runSafeAction(() => {
          this.audio.play('inject');
          this.engine.injectNutrients(slotIndex);
        });
        refreshAllViews();
      },
      onAutoclaveWaste: (slotIndex) => {
        this.runSafeAction(() => {
          this.audio.play('click');
          this.engine.flashAutoclaveWaste(slotIndex);
        });
        refreshAllViews();
      },
      onRecycleWaste: (slotIndex) => {
        this.runSafeAction(() => {
          this.audio.play('click');
          this.engine.recycleWasteInBioreactor(slotIndex);
        });
        refreshAllViews();
      },
      onQuickFreeze: (slotIndex) => {
        this.runSafeAction(() => {
          const emptyTube = this.engine
            .getState()
            .cryoSlots.find((c) => c.status === 'EMPTY');
          if (emptyTube) {
            this.engine.freezeColony(slotIndex, emptyTube.tubeIndex);
          }
        });
        refreshAllViews();
      },
      onScissiparity: (sourceSlotIndex, targetSlotIndex) => {
        this.runSafeAction(() => {
          this.engine.scissiparity(sourceSlotIndex, targetSlotIndex);
        });
        refreshAllViews();
      },
      onMutagenesis: (sourceSlotIndex, targetSlotIndex) => {
        this.runSafeAction(() => {
          this.engine.mutagenesis(sourceSlotIndex, targetSlotIndex);
        });
        refreshAllViews();
      },
      onConjugation: (parentSlotIndices, targetSlotIndex) => {
        this.runSafeAction(() => {
          this.engine.conjugate(parentSlotIndices, targetSlotIndex);
        });
        refreshAllViews();
      },
      onClickBenchEvent: () => {
        this.runSafeAction(() => {
          this.audio.play('click');
          this.engine.clickActiveBenchEvent();
        });
        refreshAllViews();
      },
      onValidateContract: (boardSlotIndex, targetIncubatorSlotIndex) => {
        this.runSafeAction(() => {
          this.engine.validateContract(boardSlotIndex, targetIncubatorSlotIndex);
          this.showToast('Contrat validé et récompenses transférées !');
        });
        refreshAllViews();
      },
      onUnlockTech: (techId) => {
        this.runSafeAction(() => {
          this.audio.play('upgrade');
          this.engine.unlockTechnology(techId);
          this.showToast(`Technologie ${techId} débloquée !`);
        });
        refreshAllViews();
      },
    });

    const cryoRefs = createCryoViewComponent({
      onThawColony: (fromTubeIndex, toSlotIndex) => {
        this.runSafeAction(() => {
          this.engine.thawColony(fromTubeIndex, toSlotIndex);
        });
        refreshAllViews();
      },
      onFreezeColony: (fromSlotIndex, toTubeIndex) => {
        this.runSafeAction(() => {
          this.engine.freezeColony(fromSlotIndex, toTubeIndex);
        });
        refreshAllViews();
      },
    });

    const trophiesRefs = createTrophiesViewComponent();

    const logbookRefs = createLogbookViewComponent({
      onSaveResearcherNotes: (notes) => {
        this.audio.play('click');
        this.engine.setResearcherNotes(notes);
        void this.storage.saveGame(this.engine.getState(), 'autosave');
        this.showToast('Notes du chercheur archivées dans le carnet.');
        refreshAllViews();
      },
    });

    const refreshAllViews = (): void => {
      const state = this.engine.getState();
      headerRefs.update(state, this.activeModule, this.audio.isMuted());

      moduleStage.replaceChildren();
      if (this.activeModule === 'BENCH') {
        benchRefs.update(state);
        moduleStage.appendChild(benchRefs.root);
      } else if (this.activeModule === 'CRYO') {
        cryoRefs.update(state);
        moduleStage.appendChild(cryoRefs.root);
      } else if (this.activeModule === 'TROPHIES') {
        trophiesRefs.update(state);
        moduleStage.appendChild(trophiesRefs.root);
      } else {
        logbookRefs.update(state);
        moduleStage.appendChild(logbookRefs.root);
      }

      this.drawCanvases(headerRefs.cutawayCanvas, benchRefs.getPetriCanvases());
    };

    const openExportImportModal = (): void => {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop';

      const win = document.createElement('div');
      win.className = 'modal-window';

      const mTitle = document.createElement('h3');
      mTitle.className = 'panel-title';
      mTitle.textContent = 'GESTION DES SAUVEGARDES (EXPORT / IMPORT JSON SÉCURISÉ)';

      const textarea = document.createElement('textarea');
      textarea.className = 'retro-input';
      textarea.style.minHeight = '210px';
      const exported = exportSaveToJson(this.engine.getState(), 'autosave');
      textarea.value = exported.ok ? exported.value : '';

      const btnRow = document.createElement('div');
      btnRow.style.display = 'flex';
      btnRow.style.gap = '8px';
      btnRow.style.marginTop = '10px';

      const importBtn = document.createElement('button');
      importBtn.type = 'button';
      importBtn.className = 'retro-btn primary';
      importBtn.textContent = 'IMPORTER & VALIDER CE JSON';
      importBtn.addEventListener('click', () => {
        const res = importSaveFromJson(textarea.value);
        if (!res.ok) {
          this.showToast(`Rejet sécurité (${res.errorCode}) : ${res.errorMessageFr}`);
          return;
        }
        this.engine = createSimulationEngine({
          initialState: res.value,
          seed: Date.now() >>> 0,
        });
        this.bindAudioEvents();
        void this.storage.saveGame(this.engine.getState(), 'autosave');
        backdrop.remove();
        this.showToast('Sauvegarde importée et vérifiée avec succès.');
        refreshAllViews();
      });

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'retro-btn danger';
      resetBtn.textContent = 'NOUVELLE PARTIE (RÉINITIALISER)';
      resetBtn.addEventListener('click', () => {
        this.engine = createSimulationEngine({ seed: Date.now() >>> 0 });
        this.bindAudioEvents();
        void this.storage.saveGame(this.engine.getState(), 'autosave');
        backdrop.remove();
        this.showToast('Nouvelle partie initialisée.');
        refreshAllViews();
      });

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'retro-btn';
      closeBtn.textContent = 'FERMER';
      closeBtn.addEventListener('click', () => backdrop.remove());

      btnRow.append(importBtn, resetBtn, closeBtn);
      win.append(mTitle, textarea, btnRow);
      backdrop.appendChild(win);
      document.body.appendChild(backdrop);
    };

    monitor.append(headerRefs.root, moduleStage);
    this.container.appendChild(monitor);

    refreshAllViews();

    // Boucle temps réel requestAnimationFrame
    this.lastFrameTimeMs = performance.now();
    const stepFrame = (nowMs: number): void => {
      const dtSec = Math.min(0.25, Math.max(0, (nowMs - this.lastFrameTimeMs) / 1000));
      this.lastFrameTimeMs = nowMs;
      this.totalVisualTimeSec += dtSec;

      this.engine.tick(dtSec);

      this.uiRefreshAccumulatorSec += dtSec;
      this.autosaveAccumulatorSec += dtSec;

      if (this.uiRefreshAccumulatorSec >= 0.4) {
        this.uiRefreshAccumulatorSec = 0;
        const activeEl = document.activeElement;
        const isInteractingWithForm =
          activeEl instanceof HTMLSelectElement || activeEl instanceof HTMLTextAreaElement;
        if (!isInteractingWithForm) {
          refreshAllViews();
        } else {
          headerRefs.update(
            this.engine.getState(),
            this.activeModule,
            this.audio.isMuted()
          );
        }
      }

      if (this.autosaveAccumulatorSec >= 15) {
        this.autosaveAccumulatorSec = 0;
        void this.storage.saveGame(this.engine.getState(), 'autosave');
      }

      this.drawCanvases(headerRefs.cutawayCanvas, benchRefs.getPetriCanvases());
      this.rafId = globalThis.requestAnimationFrame(stepFrame);
    };

    this.rafId = globalThis.requestAnimationFrame(stepFrame);
  }

  private drawCanvases(
    cutawayCanvas: HTMLCanvasElement,
    petriCanvases: ReadonlyMap<number, HTMLCanvasElement>
  ): void {
    const state = this.engine.getState();
    renderFactoryCrossSectionCanvas(
      cutawayCanvas,
      state,
      this.activeModule,
      this.totalVisualTimeSec
    );

    if (this.activeModule === 'BENCH') {
      for (const slot of state.incubatorSlots) {
        const canvas = petriCanvases.get(slot.slotIndex);
        if (canvas) {
          renderPetriDishCanvas(
            canvas,
            slot,
            this.totalVisualTimeSec,
            state.activeBenchEvent
          );
        }
      }
    }
  }

  private runSafeAction(fn: () => void): void {
    try {
      fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.showToast(`Action impossible : ${msg}`);
    }
  }

  public destroy(): void {
    if (this.rafId !== null) {
      globalThis.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

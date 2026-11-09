/**
 * BIOLAB — Synthétiseur Audio Procédural Rétro (Web Audio API)
 * Génère les bruitages d'instruments de laboratoire des années 80–90
 * sans fichiers audio externes, avec interrupteur Mute persistant.
 */

export type RetroSoundEffect =
  | 'click'
  | 'seed'
  | 'inject'
  | 'mature'
  | 'division'
  | 'lysis'
  | 'cryo'
  | 'incident'
  | 'trophy'
  | 'contract'
  | 'upgrade';

const MUTE_STORAGE_KEY = 'biolab_audio_muted';

export class RetroAudioService {
  private ctx: AudioContext | null = null;
  private muted: boolean;

  public constructor() {
    this.muted = this.readInitialMutedState();
  }

  private readInitialMutedState(): boolean {
    try {
      if (typeof globalThis.localStorage !== 'undefined') {
        return globalThis.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
      }
    } catch {
      // Ignore storage access errors in restricted contexts
    }
    return false;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    try {
      if (typeof globalThis.localStorage !== 'undefined') {
        globalThis.localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
      }
    } catch {
      // Ignore
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    if (!this.muted) {
      this.play('click');
    }
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted) {
      return null;
    }
    if (typeof globalThis.window === 'undefined') {
      return null;
    }
    const AudioCtx =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    durationSec: number,
    type: OscillatorType = 'square',
    gainPeak = 0.06,
    delaySec = 0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) {
      return;
    }

    const startAt = ctx.currentTime + delaySec;
    const stopAt = startAt + durationSec;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, startAt);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), stopAt);
    }

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(gainPeak, startAt + Math.min(0.015, durationSec * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startAt);
    osc.stop(stopAt);
  }

  public play(effect: RetroSoundEffect): void {
    if (this.muted) {
      return;
    }

    switch (effect) {
      case 'click':
        this.playTone(880, 440, 0.035, 'square', 0.04);
        break;
      case 'seed':
        this.playTone(320, 640, 0.09, 'sine', 0.06);
        this.playTone(640, 960, 0.07, 'triangle', 0.04, 0.06);
        break;
      case 'inject':
        this.playTone(520, 780, 0.07, 'triangle', 0.05);
        break;
      case 'mature':
        this.playTone(523.25, 523.25, 0.08, 'triangle', 0.05, 0);
        this.playTone(659.25, 659.25, 0.1, 'triangle', 0.05, 0.08);
        break;
      case 'division':
        this.playTone(440, 880, 0.12, 'sawtooth', 0.05, 0);
        this.playTone(880, 1174.66, 0.14, 'triangle', 0.05, 0.1);
        break;
      case 'lysis':
        this.playTone(260, 95, 0.22, 'sawtooth', 0.07);
        break;
      case 'cryo':
        this.playTone(1200, 300, 0.18, 'sine', 0.05);
        break;
      case 'incident':
        this.playTone(370, 290, 0.14, 'square', 0.06, 0);
        this.playTone(370, 290, 0.14, 'square', 0.06, 0.18);
        break;
      case 'contract':
        this.playTone(587.33, 587.33, 0.08, 'square', 0.05, 0);
        this.playTone(880, 880, 0.14, 'square', 0.05, 0.09);
        break;
      case 'trophy':
        this.playTone(523.25, 523.25, 0.09, 'square', 0.06, 0);
        this.playTone(659.25, 659.25, 0.09, 'square', 0.06, 0.09);
        this.playTone(783.99, 783.99, 0.09, 'square', 0.06, 0.18);
        this.playTone(1046.5, 1046.5, 0.2, 'square', 0.07, 0.27);
        break;
      case 'upgrade':
        this.playTone(220, 440, 0.12, 'sawtooth', 0.06, 0);
        this.playTone(440, 880, 0.18, 'sawtooth', 0.06, 0.12);
        break;
    }
  }
}

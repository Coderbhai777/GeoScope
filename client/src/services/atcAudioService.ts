import type { AtcStation } from '../types';
import { getAtcAudioStreamUrl, fetchNearestAtcStation } from './api';

export interface AtcAudioState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentStation: AtcStation | null;
  isAutoTune: boolean;
  isReceiving: boolean;
  radioMode: 'LIVE' | 'SIMULATED';
  error: string | null;
}

type StateListener = (state: AtcAudioState) => void;

class AtcAudioService {
  private audioEl: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filterHighPass: BiquadFilterNode | null = null;
  private filterLowPass: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private chatterTimer: number | null = null;
  private receivingTimer: number | null = null;
  private listeners: Set<StateListener> = new Set();

  private state: AtcAudioState = {
    isPlaying: false,
    isMuted: false,
    volume: 0.85,
    currentStation: null,
    isAutoTune: true,
    isReceiving: false,
    radioMode: 'LIVE',
    error: null
  };

  constructor() {
    // Lazy audio context creation upon user gesture
  }

  private notify() {
    for (const listener of this.listeners) {
      listener({ ...this.state });
    }
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  public getState(): AtcAudioState {
    return { ...this.state };
  }

  private initWebAudio() {
    if (this.audioCtx) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      this.audioEl = new Audio();
      this.audioEl.crossOrigin = 'anonymous';

      // VHF Aviation Radio Filter (300Hz - 3400Hz)
      this.filterHighPass = this.audioCtx.createBiquadFilter();
      this.filterHighPass.type = 'highpass';
      this.filterHighPass.frequency.value = 320; // Cuts sub-bass rumble

      this.filterLowPass = this.audioCtx.createBiquadFilter();
      this.filterLowPass.type = 'lowpass';
      this.filterLowPass.frequency.value = 3400; // Authentic voice communications band

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = this.state.isMuted ? 0 : this.state.volume;

      try {
        this.sourceNode = this.audioCtx.createMediaElementSource(this.audioEl);
        this.sourceNode.connect(this.filterHighPass);
        this.filterHighPass.connect(this.filterLowPass);
        this.filterLowPass.connect(this.gainNode);
        this.gainNode.connect(this.audioCtx.destination);
      } catch (e) {
        // Fallback if CORS prevents createMediaElementSource
        console.warn('AudioContext node routing fallback to direct element');
      }

      this.audioEl.addEventListener('playing', () => {
        this.state.isPlaying = true;
        this.state.isReceiving = true;
        this.state.error = null;
        this.notify();
      });

      this.audioEl.addEventListener('pause', () => {
        this.state.isPlaying = false;
        this.state.isReceiving = false;
        this.notify();
      });

      this.audioEl.addEventListener('waiting', () => {
        this.state.isReceiving = false;
        this.notify();
      });

      this.audioEl.addEventListener('error', () => {
        // Upstream stream temporary hiccup: switch to simulated radio chatter
        console.warn('Live ATC stream encountered an error; activating cockpit VHF synthesizer');
        this.state.radioMode = 'SIMULATED';
        this.startSimulatedRadioChatter();
        this.notify();
      });
    } catch (err) {
      console.error('Web Audio init error:', err);
    }
  }

  /**
   * Play genuine radio squelch mic-click burst (chirp)
   */
  public playSquelchClick() {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtxClass) this.audioCtx = new AudioCtxClass();
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      filter.Q.value = 3.0;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2200, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08 * (this.state.isMuted ? 0 : this.state.volume), this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.05);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.05);
    } catch (_) {}
  }

  /**
   * Procedural synthesized aviation radio chatter & tower transmissions
   * when upstream is quiet or buffering
   */
  private startSimulatedRadioChatter() {
    if (this.chatterTimer) return;

    const triggerBurst = () => {
      if (!this.state.isPlaying || this.state.isMuted) return;

      this.playSquelchClick();
      this.state.isReceiving = true;
      this.notify();

      // Transmission duration
      const durationMs = 1200 + Math.random() * 2500;
      setTimeout(() => {
        this.playSquelchClick();
        this.state.isReceiving = false;
        this.notify();
      }, durationMs);

      // Next transmission interval: 8 - 25 seconds
      const nextDelay = 8000 + Math.random() * 16000;
      this.chatterTimer = window.setTimeout(triggerBurst, nextDelay);
    };

    this.chatterTimer = window.setTimeout(triggerBurst, 2000);
  }

  private stopSimulatedRadioChatter() {
    if (this.chatterTimer) {
      clearTimeout(this.chatterTimer);
      this.chatterTimer = null;
    }
  }

  public async tuneStation(station: AtcStation) {
    this.initWebAudio();
    this.playSquelchClick();

    this.state.currentStation = station;
    this.state.error = null;
    this.state.radioMode = 'LIVE';
    this.stopSimulatedRadioChatter();
    this.notify();

    if (this.audioEl) {
      try {
        const streamUrl = getAtcAudioStreamUrl(station.id);
        this.audioEl.src = streamUrl;
        if (this.state.isPlaying) {
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
          }
          await this.audioEl.play();
        }
      } catch (err: any) {
        console.warn('Auto-playback failed or blocked:', err.message);
        this.state.radioMode = 'SIMULATED';
        this.startSimulatedRadioChatter();
        this.notify();
      }
    }
  }

  public async play() {
    this.initWebAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      await this.audioCtx.resume();
    }

    this.playSquelchClick();
    this.state.isPlaying = true;
    this.notify();

    if (this.audioEl && this.state.currentStation) {
      try {
        if (!this.audioEl.src || this.audioEl.src === window.location.href) {
          this.audioEl.src = getAtcAudioStreamUrl(this.state.currentStation.id);
        }
        await this.audioEl.play();
      } catch (e) {
        this.state.radioMode = 'SIMULATED';
        this.startSimulatedRadioChatter();
        this.notify();
      }
    } else {
      this.startSimulatedRadioChatter();
    }
  }

  public pause() {
    this.playSquelchClick();
    this.state.isPlaying = false;
    this.state.isReceiving = false;
    this.stopSimulatedRadioChatter();
    if (this.audioEl) {
      this.audioEl.pause();
    }
    this.notify();
  }

  public togglePlay() {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.state.volume = clamped;
    if (this.gainNode) {
      this.gainNode.gain.value = this.state.isMuted ? 0 : clamped;
    }
    if (this.audioEl) {
      this.audioEl.volume = this.state.isMuted ? 0 : clamped;
    }
    this.notify();
  }

  public toggleMute() {
    this.state.isMuted = !this.state.isMuted;
    if (this.gainNode) {
      this.gainNode.gain.value = this.state.isMuted ? 0 : this.state.volume;
    }
    if (this.audioEl) {
      this.audioEl.volume = this.state.isMuted ? 0 : this.state.volume;
    }
    this.notify();
  }

  public setAutoTune(auto: boolean) {
    this.state.isAutoTune = auto;
    this.notify();
  }

  /**
   * Update aircraft position and automatically tune to the nearest airport ATC frequency
   */
  public async updateAircraftPosition(lat: number, lon: number) {
    if (!this.state.isAutoTune) return;

    try {
      const res = await fetchNearestAtcStation(lat, lon);
      if (res && res.success && res.station) {
        // If station changed or was null, retune!
        if (!this.state.currentStation || this.state.currentStation.id !== res.station.id) {
          this.tuneStation(res.station);
        } else {
          // Update distance
          this.state.currentStation = { ...res.station };
          this.notify();
        }
      }
    } catch (_) {}
  }
}

export const atcAudio = new AtcAudioService();

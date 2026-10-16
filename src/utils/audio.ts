/**
 * Audio synthesis and Speech utilities for The Eye of Kitti
 * Optimized for visually impaired accessibility
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Play spatial beep indicating obstacle position and distance
  public playSpatialSonar(position: 'left' | 'center' | 'right', distanceMeters: number = 2.0) {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch inversely proportional to distance (closer = higher pitch alert)
      const freq = Math.max(350, Math.min(1200, 1000 - distanceMeters * 150));
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.type = 'sine';

      // Stereo panning
      let pannerNode: StereoPannerNode | null = null;
      if (this.ctx.createStereoPanner) {
        pannerNode = this.ctx.createStereoPanner();
        const panValue = position === 'left' ? -0.85 : position === 'right' ? 0.85 : 0;
        pannerNode.pan.setValueAtTime(panValue, this.ctx.currentTime);
      }

      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.3, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      if (pannerNode) {
        osc.connect(gain);
        gain.connect(pannerNode);
        pannerNode.connect(this.ctx.destination);
      } else {
        osc.connect(gain);
        gain.connect(this.ctx.destination);
      }

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // AudioContext may be blocked before user gesture
    }
  }

  // Urgent Hazard Alert: two rapid high pitch beeps
  public playDangerChirp() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      [0, 0.12].forEach((offset) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.frequency.setValueAtTime(880, now + offset);
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.3, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.09);
      });
    } catch {}
  }

  // Tactile paving notification sound (pleasant chime)
  public playTactileChime() {
    if (this.isMuted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.2, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.16);
      });
    } catch {}
  }

  // Loud Siren for SOS Emergency
  private sirenInterval: any = null;
  public startEmergencySiren() {
    this.stopEmergencySiren();
    this.initContext();
    if (!this.ctx) return;

    let high = true;
    const pulse = () => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(high ? 960 : 700, now);
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
      high = !high;
    };

    pulse();
    this.sirenInterval = setInterval(pulse, 420);
  }

  public stopEmergencySiren() {
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
  }
}

export const soundEngine = new SoundEngine();

// Text to Speech (TTS) Manager
class SpeechEngine {
  private synth: SpeechSynthesis | null = null;
  private thaiVoice: SpeechSynthesisVoice | null = null;
  private isSpeaking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    // Prioritize Thai voice
    const foundThai = voices.find(
      (v) => v.lang.startsWith('th') || v.name.toLowerCase().includes('thai') || v.lang === 'th-TH'
    );
    if (foundThai) {
      this.thaiVoice = foundThai;
    }
  }

  public speak(
    text: string,
    options: {
      urgent?: boolean;
      rate?: number;
      pitch?: number;
      lang?: string;
      onEnd?: () => void;
    } = {}
  ) {
    if (!this.synth || !text) return;

    if (options.urgent) {
      // Cancel previous ongoing non-urgent speech immediately
      this.synth.cancel();
    } else if (this.synth.speaking) {
      // Don't flood if speaking non-urgent
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.thaiVoice && (!options.lang || options.lang.startsWith('th'))) {
      utterance.voice = this.thaiVoice;
      utterance.lang = 'th-TH';
    } else {
      utterance.lang = options.lang || 'th-TH';
    }

    utterance.rate = options.rate || 1.1; // Slightly faster for responsive walking
    utterance.pitch = options.pitch || 1.0;

    utterance.onend = () => {
      this.isSpeaking = false;
      if (options.onEnd) options.onEnd();
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
    };

    this.isSpeaking = true;
    this.synth.speak(utterance);
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
      this.isSpeaking = false;
    }
  }
}

export const speechEngine = new SpeechEngine();

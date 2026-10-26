// RESONA spatial audio engine (browser-only).
// Signal: source -> input
//   -> [Bypass path] (for instant A/B neutral comparison)
//   -> [Processed path] -> 10-band EQ (user + hearing profile) -> instrument focus
//       -> Core stereo (preserves mix phase & stereo width)
//       -> Crossover (>140 Hz) -> L/R split -> HRTF virtual orbit speakers
//       -> Acoustic room convolution reverb (warm concert hall impulse)
//   -> Stereo Panner -> Master -> Transparent Limiter -> Analyser -> Speakers.

export const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export type ViewKey = "room" | "front" | "singer" | "guitar" | "keyboard" | "drums";

export interface SpatialSettings {
  orbit: number; // 0..1 amount of spatial motion
  speed: number; // 0..1
  width: number; // 0..1 virtual speaker separation
  height: number; // 0..1 elevation movement
  reverb: number; // 0..1 concert room acoustics
  balance: number; // -1..1 stereo balance
  bass: number; // dB
  treble: number; // dB
  bypass?: boolean; // True for clean neutral studio bypass (A/B testing)
}

export interface AudioBands {
  bass: number;
  mid: number;
  high: number;
  overall: number;
}

// Gentle, musical EQ focus curves with subtle compensatory gain to prevent loudness jumps
const FOCUS: Record<ViewKey, [number, number, number, number]> = {
  room: [1000, 0, 4200, 0],
  front: [1000, 0, 4200, 0],
  singer: [2200, 2.2, 4800, 1.2], // Vocal clarity & air
  guitar: [850, 2.0, 3200, 1.0], // Body warmth & presence
  keyboard: [1400, 1.8, 3600, 1.0], // Key definition & harmonics
  drums: [110, 2.4, 4500, 1.4], // Punchy kick & crisp cymbal/snare snap
};

const ANCHOR: Record<ViewKey, [number, number, number]> = {
  room: [0, 0, -2.2],
  front: [0, 0, -1.6],
  singer: [0, 0.1, -1.2],
  guitar: [-1.4, 0, -1.2],
  keyboard: [1.3, 0, -1.2],
  drums: [1.7, 0.1, -1.3],
};

/**
 * Generates an acoustically modeled, normalized concert hall impulse response.
 * Features realistic early reflections and a smooth, diffuse tail with high-frequency air absorption.
 */
function makeConcertHallImpulse(ctx: BaseAudioContext, seconds = 1.8): AudioBuffer {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);

  // Early reflection arrival times (seconds) and gains based on realistic hall acoustics
  const earlyTaps = [
    { t: 0.014, g: 0.65 },
    { t: 0.022, g: 0.52 },
    { t: 0.033, g: 0.44 },
    { t: 0.045, g: 0.36 },
    { t: 0.058, g: 0.30 },
    { t: 0.074, g: 0.24 },
    { t: 0.092, g: 0.19 },
    { t: 0.112, g: 0.15 },
  ];

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    const stereoSpread = ch === 0 ? 0.0018 : -0.0018;

    // Inject early reflections with slight interaural time difference (ITD)
    for (let i = 0; i < earlyTaps.length; i++) {
      const tap = earlyTaps[i];
      const tapTime = tap.t + stereoSpread * (i % 2 === 0 ? 1 : -1);
      const idx = Math.floor(tapTime * rate);
      if (idx >= 0 && idx < len) {
        d[idx] += tap.g * (ch === 0 ? 1 : 0.88);
      }
    }

    // Diffuse reverberation tail with exponential decay and high-frequency damping
    let lp = 0;
    const diffuseStart = Math.floor(0.04 * rate);
    const decayFactor = 3.6 / (seconds * rate);

    for (let i = diffuseStart; i < len; i++) {
      const tSec = i / rate;
      const decay = Math.exp(-tSec * 2.8);
      const white = Math.random() * 2 - 1;
      // Lowpass coefficient simulating natural air absorption (darker over time)
      const k = 0.28 + 0.52 * Math.exp(-tSec * 1.5);
      lp = lp + k * (white - lp);
      d[i] += lp * decay * 0.42;
    }

    // Safe normalization: prevent clipping and volume jumps
    let max = 0;
    for (let i = 0; i < len; i++) {
      const abs = Math.abs(d[i]);
      if (abs > max) max = abs;
    }
    if (max > 0.0001) {
      const scale = 0.52 / max;
      for (let i = 0; i < len; i++) {
        d[i] *= scale;
      }
    }
  }

  return buf;
}

export class ResonaEngine {
  ctx: AudioContext;
  analyser: AnalyserNode;
  private input: GainNode;

  // A/B comparison routing
  private bypassGain: GainNode;
  private procGain: GainNode;

  // Equalization & Focus
  private eq: BiquadFilterNode[];
  private bassShelf: BiquadFilterNode;
  private trebleShelf: BiquadFilterNode;
  private focus1: BiquadFilterNode;
  private focus2: BiquadFilterNode;

  // Spatial field
  private spatialHighpass: BiquadFilterNode;
  private pL: PannerNode;
  private pR: PannerNode;
  private dryStereo: GainNode;
  private spatialGain: GainNode;

  // Room Acoustics
  private reverbSend: GainNode;
  private reverbTone: BiquadFilterNode;
  private conv: ConvolverNode;
  private wet: GainNode;

  // Master Dynamics
  private pan: StereoPannerNode;
  private master: GainNode;
  private limiter: DynamicsCompressorNode;

  private sources = new WeakMap<HTMLMediaElement, MediaElementAudioSourceNode>();
  private current: MediaElementAudioSourceNode | null = null;
  private raf = 0;
  private userEq = new Array(EQ_FREQS.length).fill(0);
  private hearingEq = new Array(EQ_FREQS.length).fill(0);

  settings: SpatialSettings = {
    orbit: 0.4,
    speed: 0.28,
    width: 0.52,
    height: 0.1,
    reverb: 0.18,
    balance: 0,
    bass: 0,
    treble: 0,
    bypass: false,
  };

  view: ViewKey = "front";
  yaw = 0; // head-tracking yaw in radians
  listeningMode: "concert" | "focus" | "lyrics" | "video" = "concert";

  // Coordinates for smooth spatial movement
  private curLX = -1;
  private curLZ = -1;
  private curRX = 1;
  private curRZ = -1;

  constructor() {
    const ctx = new AudioContext({ latencyHint: "playback" });
    this.ctx = ctx;

    this.input = ctx.createGain();

    // 1. A/B Bypass Setup
    this.bypassGain = ctx.createGain();
    this.bypassGain.gain.value = 0; // Starts in processed mode
    this.procGain = ctx.createGain();
    this.procGain.gain.value = 1;

    this.input.connect(this.bypassGain);
    this.input.connect(this.procGain);

    // 2. 10-Band EQ
    this.eq = EQ_FREQS.map((f, i) => {
      const b = ctx.createBiquadFilter();
      b.type = i === 0 ? "lowshelf" : i === EQ_FREQS.length - 1 ? "highshelf" : "peaking";
      b.frequency.value = f;
      b.Q.value = 1.1;
      return b;
    });

    this.bassShelf = ctx.createBiquadFilter();
    this.bassShelf.type = "lowshelf";
    this.bassShelf.frequency.value = 140;

    this.trebleShelf = ctx.createBiquadFilter();
    this.trebleShelf.type = "highshelf";
    this.trebleShelf.frequency.value = 4200;

    this.focus1 = ctx.createBiquadFilter();
    this.focus1.type = "peaking";
    this.focus1.Q.value = 1.0;

    this.focus2 = ctx.createBiquadFilter();
    this.focus2.type = "peaking";
    this.focus2.Q.value = 0.9;

    // Chain EQ nodes
    let node: AudioNode = this.procGain;
    for (const b of [...this.eq, this.bassShelf, this.trebleShelf, this.focus1, this.focus2]) {
      node.connect(b);
      node = b;
    }
    const processedOut = node;

    // 3. Stereo Master bus and Balance
    this.pan = ctx.createStereoPanner();
    this.bypassGain.connect(this.pan);

    // Core Stereo path (preserves mix fidelity, low end and stereo coherence)
    this.dryStereo = ctx.createGain();
    this.dryStereo.gain.value = 1.0;
    processedOut.connect(this.dryStereo);
    this.dryStereo.connect(this.pan);

    // 4. Spatial Expansion Path (>140 Hz to avoid bass phase cancellation)
    this.spatialHighpass = ctx.createBiquadFilter();
    this.spatialHighpass.type = "highpass";
    this.spatialHighpass.frequency.value = 140;
    this.spatialHighpass.Q.value = 0.707;
    processedOut.connect(this.spatialHighpass);

    const split = ctx.createChannelSplitter(2);
    this.spatialHighpass.connect(split);

    const createHRTFPanner = () => {
      const p = ctx.createPanner();
      p.panningModel = "HRTF";
      p.distanceModel = "inverse";
      p.refDistance = 1.2;
      p.maxDistance = 100;
      p.rolloffFactor = 0.5;
      return p;
    };

    this.pL = createHRTFPanner();
    this.pR = createHRTFPanner();
    this.spatialGain = ctx.createGain();
    this.spatialGain.gain.value = 0.35;

    split.connect(this.pL, 0);
    split.connect(this.pR, 1);
    this.pL.connect(this.spatialGain);
    this.pR.connect(this.spatialGain);
    this.spatialGain.connect(this.pan);

    // 5. Concert Room Acoustics (Reverb)
    this.conv = ctx.createConvolver();
    this.conv.buffer = makeConcertHallImpulse(ctx);

    // Tone shaping on the reverb return: damp highs above 6.5kHz for warm hall characteristics
    this.reverbTone = ctx.createBiquadFilter();
    this.reverbTone.type = "lowpass";
    this.reverbTone.frequency.value = 6500;
    this.reverbTone.Q.value = 0.6;

    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.7;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.15;

    processedOut.connect(this.reverbSend);
    this.reverbSend.connect(this.conv);
    this.conv.connect(this.reverbTone);
    this.reverbTone.connect(this.wet);
    this.wet.connect(this.pan);

    // 6. Master Dynamics & Limiter
    // Transparent peak limiter preventing clipping without audible pumping
    this.master = ctx.createGain();
    this.master.gain.value = 1.0;

    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1.5;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 4.5;
    this.limiter.attack.value = 0.005;
    this.limiter.release.value = 0.14;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 512;
    this.analyser.smoothingTimeConstant = 0.8;

    this.pan.connect(this.master);
    this.master.connect(this.limiter);
    this.limiter.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    this.applyAll();
    this.loop();
  }

  attach(el: HTMLMediaElement) {
    let src = this.sources.get(el);
    if (!src) {
      src = this.ctx.createMediaElementSource(el);
      this.sources.set(el, src);
    }
    if (this.current && this.current !== src) {
      try {
        this.current.disconnect();
      } catch {
        /* already disconnected */
      }
    }
    if (this.current !== src) src.connect(this.input);
    this.current = src;
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  resume() {
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setEq(gains: number[]) {
    this.userEq = gains.slice();
    this.applyEq();
  }

  setHearing(gains: number[]) {
    this.hearingEq = gains.slice();
    this.applyEq();
  }

  private applyEq() {
    const t = this.ctx.currentTime;
    this.eq.forEach((b, i) => {
      const totalGain = (this.userEq[i] || 0) + (this.hearingEq[i] || 0);
      b.gain.setTargetAtTime(totalGain, t, 0.04);
    });
  }

  update(s: Partial<SpatialSettings>) {
    this.settings = { ...this.settings, ...s };
    this.applyAll();
  }

  setView(v: ViewKey) {
    this.view = v;
    const t = this.ctx.currentTime;
    const [f1, g1, f2, g2] = FOCUS[v];
    this.focus1.frequency.setTargetAtTime(f1, t, 0.08);
    this.focus1.gain.setTargetAtTime(g1, t, 0.08);
    this.focus2.frequency.setTargetAtTime(f2, t, 0.08);
    this.focus2.gain.setTargetAtTime(g2, t, 0.08);

    // Acoustic spatial shifts based on stage position
    if (v === "guitar") {
      this.pan.pan.setTargetAtTime(Math.max(-0.6, this.settings.balance - 0.18), t, 0.12);
    } else if (v === "keyboard") {
      this.pan.pan.setTargetAtTime(Math.min(0.6, this.settings.balance + 0.18), t, 0.12);
    } else if (v === "drums") {
      this.pan.pan.setTargetAtTime(this.settings.balance, t, 0.12);
      this.spatialGain.gain.setTargetAtTime(0.48, t, 0.12); // wider binaural spread right in the kit
    } else {
      this.pan.pan.setTargetAtTime(this.settings.balance, t, 0.12);
      const effectiveOrbit = this.listeningMode === "focus" ? 0 : this.settings.orbit;
      const mix = Math.min(1, effectiveOrbit * 1.15);
      this.spatialGain.gain.setTargetAtTime(Math.sin((mix * Math.PI) / 2) * 0.88, t, 0.12);
    }
  }

  /**
   * Applies distinct audio processing profiles based on the selected application mode.
   * Focus Mode: zero orbit movement, stable centered stereo image, gentle high softening to minimize fatigue.
   * Concert Mode: spacious stage width, warm room acoustics, active viewpoint acoustic depth.
   */
  setModeProfile(mode: "concert" | "focus" | "lyrics" | "video") {
    this.listeningMode = mode;
    const t = this.ctx.currentTime;

    if (mode === "focus") {
      // Focus profile: calm, centered, fatigue-free audio
      this.spatialGain.gain.setTargetAtTime(0.08, t, 0.2);
      this.dryStereo.gain.setTargetAtTime(1.0, t, 0.2);
      this.wet.gain.setTargetAtTime(0.06, t, 0.2); // subtle acoustic intimacy
      this.trebleShelf.gain.setTargetAtTime(Math.min(this.settings.treble, -1.5), t, 0.2);
    } else if (mode === "concert") {
      // Concert profile: spacious, warm, immersive
      const mix = Math.min(1, this.settings.orbit * 1.1);
      this.dryStereo.gain.setTargetAtTime(Math.cos((mix * Math.PI) / 2) * 0.95, t, 0.2);
      this.spatialGain.gain.setTargetAtTime(Math.sin((mix * Math.PI) / 2) * 0.85, t, 0.2);
      this.wet.gain.setTargetAtTime(this.settings.reverb * 0.75, t, 0.2);
      this.trebleShelf.gain.setTargetAtTime(this.settings.treble, t, 0.2);
    } else {
      this.applyAll();
    }
  }

  private applyAll() {
    const s = this.settings;
    const t = this.ctx.currentTime;
    const isBypass = !!s.bypass;

    // Smooth A/B bypass transition (zero clicks or volume pops)
    this.bypassGain.gain.setTargetAtTime(isBypass ? 1.0 : 0.0, t, 0.04);
    this.procGain.gain.setTargetAtTime(isBypass ? 0.0 : 1.0, t, 0.04);

    if (isBypass) return;

    this.bassShelf.gain.setTargetAtTime(s.bass, t, 0.04);
    this.trebleShelf.gain.setTargetAtTime(s.treble, t, 0.04);

    // Warm, calibrated concert hall reverb send
    const targetWet = this.listeningMode === "focus" ? Math.min(s.reverb, 0.08) : s.reverb * 0.75;
    this.wet.gain.setTargetAtTime(targetWet, t, 0.06);
    this.pan.pan.setTargetAtTime(s.balance, t, 0.06);

    // Smooth equal-power blending between primary stereo and spatial expansion
    const effectiveOrbit = this.listeningMode === "focus" ? 0 : s.orbit;
    const mix = Math.min(1, effectiveOrbit * 1.15);

    // Constant-power blend prevents volume drops or boosts during spatial adjustment
    const dryCoeff = Math.cos((mix * Math.PI) / 2);
    const spatialCoeff = Math.sin((mix * Math.PI) / 2) * 0.88;

    this.dryStereo.gain.setTargetAtTime(dryCoeff, t, 0.06);
    this.spatialGain.gain.setTargetAtTime(spatialCoeff, t, 0.06);

    this.applyEq();
  }

  private loop = () => {
    const s = this.settings;
    const t = this.ctx.currentTime;
    const [ax, ay, az] = ANCHOR[this.view];

    // In Focus mode, orbit motion is stopped to avoid pulling attention
    const isFocus = this.listeningMode === "focus";
    const orbitAmount = isFocus ? 0 : s.orbit;
    const rate = 0.08 + s.speed * 0.45; // Smooth, natural orbital drift
    const base = t * rate * Math.PI * 0.5;

    const r = (0.7 + s.width * 0.8) * (1 - orbitAmount) + (0.95 + orbitAmount * 0.6) * orbitAmount;
    const elev = Math.sin(t * rate * 0.5) * s.height * 0.6;
    const halfSpread = (Math.PI / 2) * (0.35 + s.width * 0.5);

    const cy = Math.cos(-this.yaw);
    const sy = Math.sin(-this.yaw);

    const updatePanner = (p: PannerNode, offset: number, sign: number, curXRef: "curLX" | "curRX", curZRef: "curLZ" | "curRZ") => {
      const a = base * orbitAmount + offset;
      let targetX = ax * (1 - orbitAmount) + Math.sin(a) * r;
      let targetZ = az * (1 - orbitAmount) - Math.cos(a) * r;
      const targetY = ay + elev * sign;

      // Rotate with head tracking yaw
      const rx = targetX * cy - targetZ * sy;
      const rz = targetX * sy + targetZ * cy;
      targetX = rx;
      targetZ = rz;

      // Smooth coordinate interpolation (glitch-free Web Audio positioning)
      this[curXRef] += (targetX - this[curXRef]) * 0.12;
      this[curZRef] += (targetZ - this[curZRef]) * 0.12;

      p.positionX.value = this[curXRef];
      p.positionY.value = targetY;
      p.positionZ.value = this[curZRef];
    };

    updatePanner(this.pL, -halfSpread, 1, "curLX", "curLZ");
    updatePanner(this.pR, halfSpread, -1, "curRX", "curRZ");

    this.raf = requestAnimationFrame(this.loop);
  };

  /** Returns composite audio level (0..1) */
  level(): number {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    const lows = data.slice(0, 10).reduce((a, b) => a + b, 0) / (10 * 255);
    const all = data.reduce((a, b) => a + b, 0) / (data.length * 255);
    return Math.min(1, lows * 0.65 + all * 0.5);
  }

  /**
   * Returns frequency band energies for multi-band reactive visuals (stage lights, performer animations).
   */
  audioBands(): AudioBands {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);

    // Bins: fftSize = 512, sampleRate ~44.1k/48k -> bin size ~86Hz-93Hz
    // Low: bins 0-4 (0 - 450Hz) - Kick, Bass
    // Mid: bins 5-25 (450Hz - 2.4kHz) - Vocals, Guitar, Keys
    // High: bins 26-100 (2.4kHz - 9.5kHz) - Snare crack, Cymbals, Air
    let lowSum = 0;
    for (let i = 0; i < 5; i++) lowSum += data[i] || 0;
    const bass = Math.min(1, lowSum / (5 * 255));

    let midSum = 0;
    for (let i = 5; i < 26; i++) midSum += data[i] || 0;
    const mid = Math.min(1, midSum / (21 * 255));

    let highSum = 0;
    for (let i = 26; i < 100; i++) highSum += data[i] || 0;
    const high = Math.min(1, highSum / (74 * 255));

    const overall = Math.min(1, bass * 0.5 + mid * 0.35 + high * 0.15);

    return { bass, mid, high, overall };
  }

  /** Plays a calibration tone through the hearing path (bypasses EQ). */
  tone(freq: number, gainDb: number, ear: "both" | "left" | "right" = "both", seconds = 1.1) {
    const ctx = this.ctx;
    this.resume();
    const o = ctx.createOscillator();
    o.frequency.value = freq;
    const g = ctx.createGain();
    const amp = Math.pow(10, gainDb / 20);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(amp, t + 0.08);
    g.gain.setValueAtTime(amp, t + seconds - 0.12);
    g.gain.linearRampToValueAtTime(0, t + seconds);
    const p = ctx.createStereoPanner();
    p.pan.value = ear === "left" ? -1 : ear === "right" ? 1 : 0;
    o.connect(g).connect(p).connect(ctx.destination);
    o.start(t);
    o.stop(t + seconds + 0.05);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    void this.ctx.close();
  }
}

export const SPATIAL_PRESETS: Record<string, Partial<SpatialSettings>> = {
  Neutral: { orbit: 0, speed: 0, width: 0.45, height: 0, reverb: 0, balance: 0, bass: 0, treble: 0, bypass: true },
  Stereo: { orbit: 0, speed: 0.2, width: 0.5, height: 0, reverb: 0.08, bypass: false },
  "Concert Stage": { orbit: 0.2, speed: 0.22, width: 0.6, height: 0.1, reverb: 0.24, bypass: false },
  "8D": { orbit: 0.42, speed: 0.3, width: 0.54, height: 0.12, reverb: 0.18, bypass: false },
  "16D": { orbit: 0.62, speed: 0.38, width: 0.68, height: 0.22, reverb: 0.22, bypass: false },
  "24D": { orbit: 0.76, speed: 0.42, width: 0.78, height: 0.32, reverb: 0.26, bypass: false },
};

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Warm: [2.5, 2.5, 2, 1, 0, -0.5, -1, -1.5, -2, -2.5],
  Bright: [-1, -0.5, 0, 0, 0.5, 1, 2, 2.5, 3, 3],
  "Bass boost": [4.5, 4, 3, 1.5, 0, 0, 0, 0, 0, 0],
  Vocal: [-1.5, -1, 0, 1.5, 2.5, 3, 2, 1, 0, -0.5],
  Concert: [2.5, 1.5, 0, -0.5, 0, 0.5, 1.5, 2, 2.5, 1.5],
  Focus: [1.5, 1.0, 0.5, 0, 0.5, 1.0, 0.5, -0.5, -1.5, -2.5], // Gentle vocal warmth, reduced fatigue highs
};

/** Hearing-check thresholds (dB attenuation at which the tone vanished) -> gentle compensation EQ. */
export function hearingToEq(thresholds: Record<number, number>): number[] {
  const vals = EQ_FREQS.map((f) => thresholds[f]);
  const known = vals.filter((v): v is number => typeof v === "number");
  if (!known.length) return EQ_FREQS.map(() => 0);
  const best = Math.min(...known); // most sensitive band (lowest dB needed)
  return vals.map((v) => {
    if (typeof v !== "number") return 0;
    const loss = v - best; // dB worse than best band
    return Math.max(0, Math.min(6, Math.round(loss * 0.45)));
  });
}

// Procedural CDCR prison-yard sound effects via the Web Audio API (no external assets).
export class SoundEngine {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }
  setEnabled(v) {
    this.enabled = v;
  }
  ensure() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        this.ctx = new AC();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }
  _env(node, ctx, dur, peak = 0.5, when = 0) {
    const g = ctx.createGain();
    const t0 = ctx.currentTime + when;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(g);
    g.connect(ctx.destination);
    return g;
  }
  _tone(freq, type, dur, peak, when = 0, endFreq = null) {
    const ctx = this.ensure();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = type;
    const t0 = ctx.currentTime + when;
    o.frequency.setValueAtTime(freq, t0);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  }
  // Short filtered-noise burst (metal scrape / snap / door air).
  _noise(dur, peak, filterType, freq, q = 1, when = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const buf = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.value = freq;
    filt.Q.value = q;
    src.connect(filt);
    this._env(filt, ctx, dur, peak, when);
    src.start(ctx.currentTime + when);
  }
  // Inharmonic metallic clank (iron gate / metal table).
  _clank(base, peak, when = 0) {
    [1, 2.76, 5.4, 8.9].forEach((r, i) =>
      this._tone(base * r, 'square', 0.16 - i * 0.02, peak * (i === 0 ? 1 : 0.28), when)
    );
    this._noise(0.09, peak * 0.5, 'bandpass', base * 6, 6, when);
  }

  // Deal — rapid crisp mechanical snap sequence.
  deal() {
    if (!this.enabled) return;
    for (let i = 0; i < 4; i++) this._noise(0.04, 0.22, 'highpass', 2600, 1, i * 0.055);
  }
  // Play card — low thud + resonant metallic clank (card slapping an iron table).
  play() {
    if (!this.enabled) return;
    this._tone(85, 'sine', 0.12, 0.4, 0, 55);
    this._clank(220, 0.2, 0.01);
  }
  // Bid chip — quick metallic tick.
  chip() {
    if (!this.enabled) return;
    this._clank(520, 0.12);
    this._tone(1600, 'sine', 0.08, 0.1, 0.02);
  }
  // Contract declared — short yard whistle rise.
  trump() {
    if (!this.enabled) return;
    this._tone(700, 'triangle', 0.4, 0.22, 0, 1500);
    this._noise(0.35, 0.08, 'bandpass', 2400, 8, 0);
  }
  // Renege / Bus' a Lead violation — harsh dual-tone yard siren + industrial buzzer.
  renege() {
    if (!this.enabled) return;
    // Alternating two-tone siren wail.
    for (let i = 0; i < 3; i++) {
      this._tone(760, 'sawtooth', 0.22, 0.3, i * 0.42, 480);
      this._tone(480, 'sawtooth', 0.22, 0.3, i * 0.42 + 0.22, 760);
    }
    // Gritty low buzzer underneath.
    this._tone(120, 'square', 1.3, 0.22, 0);
    this._noise(1.3, 0.06, 'bandpass', 300, 3, 0);
  }
  // Hard Set / penalty — heavy iron cell door slam with reverberant echo.
  busted() {
    if (!this.enabled) return;
    const slam = (when, peak) => {
      this._tone(70, 'sine', 0.5, peak, when, 40);
      this._noise(0.22, peak * 0.7, 'lowpass', 400, 1, when);
      this._clank(150, peak * 0.6, when);
    };
    slam(0, 0.5);
    slam(0.34, 0.24); // echo
    slam(0.62, 0.12); // tail echo
  }
  // Contract made / big win — industrial whistle blast + metallic jackpot chime.
  win() {
    if (!this.enabled) return;
    this._tone(900, 'triangle', 0.6, 0.24, 0, 1400); // whistle blast
    this._noise(0.5, 0.07, 'bandpass', 2600, 9, 0);
    [1047, 1319, 1568, 2093].forEach((f, i) => this._clank(f, 0.12, 0.25 + i * 0.09)); // jackpot chime run
  }
  // Generic loss cue.
  lose() {
    if (!this.enabled) return;
    [360, 300, 240].forEach((f, i) => this._tone(f, 'sawtooth', 0.32, 0.2, i * 0.15, f * 0.85));
    this._tone(60, 'sine', 0.45, 0.22, 0);
  }
}

// Procedural sound effects via the Web Audio API.
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
  _env(node, ctx, dur, peak = 0.5) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(peak, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    node.connect(g);
    g.connect(ctx.destination);
    return g;
  }
  _tone(freq, type, dur, peak, when = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime + when);
    const g = ctx.createGain();
    const t0 = ctx.currentTime + when;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  deal() {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 2000;
    src.connect(filt);
    this._env(filt, ctx, 0.06, 0.25);
    src.start();
  }
  play() {
    if (!this.enabled) return;
    this._tone(520, 'sine', 0.09, 0.28);
    this._tone(180, 'triangle', 0.07, 0.12);
  }
  chip() {
    if (!this.enabled) return;
    this._tone(1200, 'sine', 0.12, 0.16);
    this._tone(1800, 'sine', 0.1, 0.12, 0.02);
  }
  trump() {
    if (!this.enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 'triangle', 0.35, 0.18, i * 0.07));
  }
  busted() {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(320, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.6);
    this._env(o, ctx, 0.6, 0.4);
    o.start();
    o.stop(ctx.currentTime + 0.65);
    this._tone(50, 'sine', 0.6, 0.35);
  }
  win() {
    if (!this.enabled) return;
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 'sine', 0.5, 0.22, i * 0.12));
  }
  lose() {
    if (!this.enabled) return;
    [400, 330, 262].forEach((f, i) => this._tone(f, 'sawtooth', 0.3, 0.2, i * 0.14));
  }
}

// Character trash-talk voices via the browser Web Speech API (no keys, offline).
// DooLow (W) = higher/faster; PapaCap (E) = deeper/slower.

const TAUNTS = [
  'Brought that ass to the grinder, huh?',
  'Have heart, have money.',
  "I'm tryna eat, homey! Back up!",
  "Y'all sweeter than bear meat!",
  "What y'all got on my spread tonight?",
];

const SNATCH = ["Snatchin' teeth!", "Snatchin' teeth, homey!", "Ha! Snatchin' teeth!"];

const VOICE = {
  W: { pitch: 1.28, rate: 1.12 }, // DooLow — The Tactician
  E: { pitch: 0.68, rate: 0.9 }, // PapaCap — The Stubborn OG
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Dev-only visibility for TTS failures; silent in production so it never spams users.
const ttsWarn = (e) => {
  if (process.env.NODE_ENV !== 'production') console.warn('[TTS]', e);
};

export class TtsEngine {
  constructor() {
    this.enabled = true;
    this.supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this.voices = [];
    if (this.supported) {
      this._load = this._load.bind(this);
      this._load();
      try {
        window.speechSynthesis.onvoiceschanged = this._load;
      } catch (e) {
        ttsWarn(e);
      }
    }
  }

  _load() {
    try {
      this.voices = window.speechSynthesis.getVoices() || [];
    } catch (e) {
      this.voices = [];
      ttsWarn(e);
    }
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v && this.supported) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {
        ttsWarn(e);
      }
    }
  }

  _pickVoice(seat) {
    const en = this.voices.filter((v) => /^en/i.test(v.lang || ''));
    const pool = en.length ? en : this.voices;
    if (!pool.length) return null;
    // Give the two characters distinct voices when the platform offers more than one.
    return seat === 'E' ? pool[pool.length - 1] : pool[0];
  }

  speak(text, seat) {
    if (!this.enabled || !this.supported || !text) return;
    try {
      if (!this.voices.length) this._load();
      const u = new SpeechSynthesisUtterance(text);
      const cfg = VOICE[seat] || { pitch: 1, rate: 1 };
      u.pitch = cfg.pitch;
      u.rate = cfg.rate;
      u.volume = 1;
      const v = this._pickVoice(seat);
      if (v) u.voice = v;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) {
      ttsWarn(e); // fail open — never block the game on TTS
    }
  }

  taunt(seat) {
    this.speak(pick(TAUNTS), seat);
  }

  snatch(seat) {
    this.speak(pick(SNATCH), seat);
  }

  // Unlock speech synthesis inside a user gesture (needed by iOS/Safari) with a silent utterance.
  prime() {
    if (!this.supported || this._primed) return;
    try {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
      this._primed = true;
    } catch (e) {
      ttsWarn(e);
    }
  }
}

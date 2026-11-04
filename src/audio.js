export class GardenAudio {
  constructor() {
    this.enabled = false;
    this.volume = 0.35;
    this.timer = null;
    this.notes = 0;
  }
  async setEnabled(enabled, volume = this.volume) {
    this.volume = volume;
    this.enabled = enabled;
    if (!enabled) {
      if (this.master)
        this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
      clearInterval(this.timer);
      return;
    }
    if (!this.ctx) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.ctx = new Audio();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      const buffer = this.ctx.createBuffer(
          1,
          this.ctx.sampleRate * 3,
          this.ctx.sampleRate,
        ),
        data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + (Math.random() * 2 - 1) * 0.02) / 1.02;
        data[i] = last * 3.5;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 480;
      const gain = this.ctx.createGain();
      gain.gain.value = 0.16;
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      noise.start();
    }
    await this.ctx.resume();
    this.master.gain.setTargetAtTime(volume * 0.6, this.ctx.currentTime, 0.2);
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (!this.enabled || document.hidden) return;
      this.bird();
      if (this.notes++ % 3 === 0) this.chord();
    }, 3500);
  }
  tone(freq, duration, level = 0.1, type = "sine", delay = 0, endFreq = freq) {
    if (!this.ctx || !this.enabled) return;
    const at = this.ctx.currentTime + delay,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, at);
    o.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFreq),
      at + duration,
    );
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level, at + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    o.connect(g);
    g.connect(this.master);
    o.start(at);
    o.stop(at + duration + 0.02);
  }
  bird() {
    for (let i = 0; i < 3; i++)
      this.tone(1800 + i * 340, 0.16, 0.035, "sine", i * 0.16, 2900 - i * 200);
  }
  chord() {
    const root = [130.81, 146.83, 110, 174.61][Math.floor(this.notes / 3) % 4];
    [1, 1.5, 2, 2.5].forEach((v, i) =>
      this.tone(root * v, 4, 0.035, "sine", i * 0.17),
    );
  }
  effect(tool) {
    if (["water", "hose"].includes(tool)) {
      for (let i = 0; i < 9; i++)
        this.tone(
          400 + Math.random() * 1000,
          0.16,
          0.035,
          "sine",
          i * 0.035,
          160,
        );
    } else if (tool === "trim" || tool === "shape" || tool === "saw") {
      this.tone(850, 0.065, 0.12, "triangle", 0, 120);
      this.tone(420, 0.06, 0.06, "triangle", 0.08, 90);
    } else {
      this.tone(190, 0.12, 0.1, "triangle", 0, 80);
      this.tone(440, 0.2, 0.03, "sine", 0.07, 640);
    }
  }
  dispose() {
    clearInterval(this.timer);
    this.ctx?.close();
  }
}

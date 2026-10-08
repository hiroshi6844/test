/* Original synthesised effects and melody. No downloaded audio or CDN. */
(function (root) {
  'use strict';
  class Audio {
    constructor() {
      this.ctx = null; this.master = null; this.volume = 0.4; this.muted = false;
      this.voices = new Set(); this.bgm = false; this.nextNote = 0; this.step = 0; this.hold = false;
    }
    unlock() {
      try {
        if (!this.ctx || this.ctx.state === 'closed') {
          const A = root.AudioContext || root.webkitAudioContext;
          if (!A) return;
          this.ctx = new A(); this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
          this.setVolume(this.volume); this.nextNote = this.ctx.currentTime;
        }
        if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
        // A silent, short source is also started within the trusted gesture.
        const buffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
        const source = this.ctx.createBufferSource(); source.buffer = buffer;
        source.connect(this.master); source.start();
        this.hold = false;
      } catch (_) { /* Sound failure never stops play. */ }
    }
    setVolume(v) {
      this.volume = Math.max(0, Math.min(1, Number(v) || 0));
      if (this.master) this.master.gain.setValueAtTime(this.muted ? 0 : this.volume * 0.35, this.ctx.currentTime);
    }
    setMuted(muted) { this.muted = !!muted; this.setVolume(this.volume); }
    tone(freq, duration = 0.09, offset = 0, type = 'sine', loudness = 0.45, endFreq = null) {
      if (!this.ctx || this.hold || this.muted) return;
      try {
        const at = this.ctx.currentTime + offset, o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, at);
        if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, at + duration);
        g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(loudness, at + Math.min(.012, duration / 3));
        g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
        o.connect(g); g.connect(this.master); this.voices.add(o);
        o.onended = () => { this.voices.delete(o); o.disconnect(); g.disconnect(); };
        o.start(at); o.stop(at + duration + .015);
      } catch (_) {}
    }
    effect(name, value) {
      switch (name) {
        case 'bet': this.tone(740,.05,0,'triangle'); this.tone(990,.08,.045,'triangle'); break;
        case 'lever': this.tone(190,.12,0,'triangle',.7,62); this.tone(580,.045,.015,'sine',.25); break;
        case 'stop': this.tone([440,554,659][value || 0],.065,0,'triangle',.5,210); break;
        case 'coins': this.tone(1350,.025,0,'sine',.28); break;
        case 'notice': [784,1047,1568].forEach((n,i) => this.tone(n,.26,i*.055,'sine',.45)); break;
        case 'replay': [659,880,659].forEach((n,i) => this.tone(n,.12,i*.1,'triangle',.35)); break;
        case 'fanfare': [523,659,784,1047,988,1175,1568].forEach((n,i) => this.tone(n,i===6?.55:.19,i*.13,'triangle',.6)); break;
        case 'complete': [1047,784,659,523].forEach((n,i) => this.tone(n,.3,i*.16,'triangle',.5)); break;
      }
    }
    startBgm(delay = 0) {
      this.bgm = true; this.step = 0; this.nextNote = (this.ctx ? this.ctx.currentTime : 0) + delay;
    }
    stopBgm() { this.bgm = false; }
    pump() {
      if (!this.ctx || this.ctx.state !== 'running' || this.hold || !this.bgm || this.muted) return;
      const now = this.ctx.currentTime;
      if (this.nextNote < now - .2) this.nextNote = now;
      const melody = [76,0,79,81,79,76,72,74,76,0,83,81,79,74,76,72,69,72,76,79,77,76,74,72,71,74,79,83,81,79,76,74];
      const bass = [48,48,53,53,57,57,55,55];
      while (this.nextNote < now + .09) {
        const offset = Math.max(0,this.nextNote - now), note = melody[this.step % melody.length];
        if (note) this.tone(440 * Math.pow(2,(note-69)/12),.13,offset,'triangle',.18);
        if (this.step % 4 === 0) this.tone(440 * Math.pow(2,(bass[Math.floor(this.step/4)%8]-69)/12),.28,offset,'sine',.3);
        if (this.step % 2 === 1) this.tone(2200,.02,offset,'sine',.06);
        this.step++; this.nextNote += .16;
      }
    }
    suspend() {
      this.hold = true;
      this.voices.forEach(o => { try { o.stop(); } catch (_) {} }); this.voices.clear();
      if (this.ctx && this.ctx.state !== 'closed') this.ctx.suspend().catch(() => {});
    }
    resume() { this.unlock(); this.nextNote = this.ctx ? this.ctx.currentTime : 0; }
  }
  root.LumiAudio = Audio;
})(typeof globalThis !== 'undefined' ? globalThis : window);

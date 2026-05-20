import { useState, useEffect, useCallback, useRef } from "react";

// ─────────────────────────────────────────────
//  SOUND ENGINE  (Web Audio API, no files)
// ─────────────────────────────────────────────
class SoundEngine {
  constructor() {
    this.ctx = null;
    this._suspenseTimer = null;
    this._ambTimer = null;
    this._ready = false;
    this._muted = false;
    this._volume = 1.0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this._ready = true;
  }

  _note(freq, start, dur, type = "square", vol = 0.18) {
    if (!this.ctx || this._muted) return;
    const adj = vol * this._volume;
    if (adj < 0.001) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.connect(g); g.connect(this.ctx.destination);
    o.type = type; o.frequency.value = freq;
    const t = this.ctx.currentTime + start;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(adj, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // ── suspense loop (horror RPG danger music) ──
  startSuspense() {
    this.stopSuspense(); this.stopAmbience();
    if (!this.ctx) return;
    const pattern = [
      [196, 0.12], [0, 0.05], [185, 0.10], [0, 0.05],
      [175, 0.10], [0, 0.05], [165, 0.20], [0, 0.08],
      [196, 0.08], [0, 0.04], [196, 0.08], [0, 0.04],
      [185, 0.16], [0, 0.12],
    ];
    const totalMs = pattern.reduce((s, [, d]) => s + d, 0) * 1000;
    const play = () => {
      let t = 0;
      pattern.forEach(([f, d]) => {
        if (f > 0) { this._note(f, t, d * 0.85, "square", 0.13); }
        t += d;
      });
      // bass pulse every beat
      [0, 0.5, 1.0, 1.5].forEach(bt => this._note(98, bt, 0.08, "square", 0.09));
    };
    play();
    this._suspenseTimer = setInterval(play, totalMs);
  }

  stopSuspense() {
    if (this._suspenseTimer) { clearInterval(this._suspenseTimer); this._suspenseTimer = null; }
  }

  // ── reveal arpeggio ──
  playReveal() {
    if (!this.ctx) return;
    const arp = [262, 330, 392, 494, 523, 659, 784];
    arp.forEach((f, i) => this._note(f, i * 0.07, 0.18, "square", 0.22));
    // sparkle layer
    [1047, 1175, 1319].forEach((f, i) => this._note(f, 0.35 + i * 0.06, 0.12, "sine", 0.10));
  }

  // ── ambient reading music (calming RPG town) ──
  startAmbience() {
    this.stopAmbience();
    if (!this.ctx) return;
    const chord = [262, 330, 392];
    const play = () => {
      chord.forEach(f => this._note(f, 0, 2.2, "sine", 0.055));
      this._note(523, 0.4, 1.5, "sine", 0.04);
      this._note(659, 0.8, 1.0, "sine", 0.03);
      this._note(784, 1.2, 0.8, "sine", 0.025);
    };
    play();
    this._ambTimer = setInterval(play, 2600);
  }

  stopAmbience() {
    if (this._ambTimer) { clearInterval(this._ambTimer); this._ambTimer = null; }
  }

  // ── victory fanfare ──
  playVictory() {
    this.stopSuspense(); this.stopAmbience();
    if (!this.ctx) return;
    const melody = [
      [523, 0, 0.12], [523, 0.13, 0.12], [523, 0.26, 0.12],
      [415, 0.39, 0.30], [466, 0.70, 0.30],
      [523, 1.01, 0.55],
      [466, 1.57, 0.18], [523, 1.76, 0.7],
    ];
    melody.forEach(([f, s, d]) => this._note(f, s, d, "square", 0.28));
    // harmony
    [330, 349, 415].forEach((f, i) => this._note(f, 0.39 + i * 0.31, 0.28, "square", 0.14));
    // bass hit
    this._note(131, 0, 0.1, "square", 0.2);
    this._note(131, 1.01, 0.1, "square", 0.2);
  }

  // ── miss / review sound ──
  playMiss() {
    this.stopSuspense(); this.stopAmbience();
    if (!this.ctx) return;
    this._note(200, 0,    0.15, "square", 0.28);
    this._note(160, 0.16, 0.15, "square", 0.28);
    this._note(120, 0.32, 0.35, "square", 0.28);
  }

  // ── countdown tick ──
  playTick(urgent = false) {
    if (!this.ctx) return;
    this._note(urgent ? 880 : 440, 0, 0.04, "square", urgent ? 0.2 : 0.13);
  }

  // ── auto-reveal warning sweep ──
  playTimeUp() {
    if (!this.ctx) return;
    [880, 1047, 1319, 1047, 880].forEach((f, i) => this._note(f, i * 0.06, 0.08, "square", 0.22));
  }

  stopAll() { this.stopSuspense(); this.stopAmbience(); }

  // ── volume / mute controls ──
  setMuted(val) { this._muted = val; if (val) this.stopAll(); }
  setVolume(val) { this._volume = Math.max(0, Math.min(1, val)); }
  getMuted() { return this._muted; }
  getVolume() { return this._volume; }
}

const SFX = new SoundEngine();

// ─────────────────────────────────────────────
//  DATA
// ─────────────────────────────────────────────
const COUNTDOWN_SEC = 8;

// ─────────────────────────────────────────────
//  CSS
// ─────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

:root{
  --bg:#060614;
  --panel:#0d0d24;
  --gold:#ffe000;
  --gold2:#ffa500;
  --green:#00ff80;
  --red:#ff3855;
  --cyan:#00e5ff;
  --white:#e8e8ff;
  --muted:#5a5a8a;
  --pixel:4px;
  --px2:8px;
}

body{
  font-family:'Press Start 2P',monospace;
  background:var(--bg);
  color:var(--white);
  min-height:100vh;
  image-rendering:pixelated;
  cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect x='0' y='0' width='8' height='8' fill='%23ffe000'/%3E%3C/svg%3E") 4 4, crosshair;
}

/* scanlines */
body::after{
  content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;
  background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.18) 3px,rgba(0,0,0,0.18) 4px);
}

/* CRT flicker */
@keyframes crt{0%,100%{opacity:1}50%{opacity:0.97}}
body{animation:crt 8s ease-in-out infinite;}

/* pixel border util */
.px-border{
  border:var(--pixel) solid var(--gold);
  box-shadow:0 0 0 var(--pixel) #000,
             var(--px2) var(--px2) 0 var(--pixel) #000;
}
.px-border-cyan{
  border:var(--pixel) solid var(--cyan);
  box-shadow:0 0 0 var(--pixel) #000,
             var(--px2) var(--px2) 0 var(--pixel) #000;
}
.px-border-green{
  border:var(--pixel) solid var(--green);
  box-shadow:0 0 0 var(--pixel) #000,
             var(--px2) var(--px2) 0 var(--pixel) #000;
}

/* star bg */
.starfield{
  position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:
    radial-gradient(1px 1px at 12% 20%, rgba(255,255,255,0.6) 0, transparent 100%),
    radial-gradient(1px 1px at 78% 14%, rgba(255,255,255,0.5) 0, transparent 100%),
    radial-gradient(1px 1px at 35% 65%, rgba(255,255,255,0.4) 0, transparent 100%),
    radial-gradient(1px 1px at 91% 55%, rgba(255,255,255,0.6) 0, transparent 100%),
    radial-gradient(1px 1px at 58% 88%, rgba(255,255,255,0.5) 0, transparent 100%),
    radial-gradient(1px 1px at 24% 91%, rgba(255,255,255,0.3) 0, transparent 100%),
    radial-gradient(2px 2px at 67% 42%, rgba(255,224,0,0.4) 0, transparent 100%),
    radial-gradient(1px 1px at 44% 8%,  rgba(255,255,255,0.5) 0, transparent 100%),
    radial-gradient(1px 1px at 82% 79%, rgba(255,255,255,0.3) 0, transparent 100%);
}
@keyframes twinkle{0%,100%{opacity:0.7}50%{opacity:0.3}}
.starfield{animation:twinkle 4s ease-in-out infinite;}

/* app */
.app{
  position:relative;z-index:1;
  min-height:100vh;
  display:flex;flex-direction:column;align-items:center;
  padding:20px 16px 60px;
}

/* header */
.header{
  width:100%;max-width:760px;
  display:flex;align-items:center;justify-content:space-between;
  padding-bottom:28px;
}
.logo{display:flex;align-items:center;gap:12px;}
.logo-sprite{
  width:24px;height:24px;
  background:var(--gold);
  box-shadow:
    4px 0 0 var(--gold), -4px 0 0 var(--gold),
    0 4px 0 var(--gold), 0 -4px 0 var(--gold),
    8px 4px 0 var(--gold2), -8px 4px 0 var(--gold2);
  animation:bobble 1.2s ease-in-out infinite;
}
@keyframes bobble{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
.logo-text{font-size:11px;color:var(--gold);letter-spacing:0.04em;}
.logo-text span{color:var(--white);}

/* ── HOME ── */
.home{width:100%;max-width:760px;animation:fadeIn 0.4s ease both;}
@keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}

.hero-title{
  font-size:clamp(13px,2.5vw,18px);
  color:var(--gold);
  line-height:1.8;
  margin-bottom:6px;
  text-shadow:3px 3px 0 #7a5500,0 0 20px rgba(255,224,0,0.4);
}
.hero-sub{
  font-family:'VT323',monospace;
  font-size:clamp(18px,3vw,22px);
  color:var(--muted);
  margin-bottom:36px;
  line-height:1.5;
}

.section-label{
  font-size:9px;color:var(--muted);
  letter-spacing:0.12em;margin-bottom:14px;
  display:flex;align-items:center;gap:8px;
}
.section-label::before,.section-label::after{
  content:'';flex:1;height:1px;
  background:linear-gradient(90deg,transparent,var(--muted),transparent);
}

.subjects-grid{
  display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));
  gap:16px;margin-bottom:36px;
}

.subject-btn{
  background:var(--panel);
  padding:20px 18px;
  cursor:pointer;
  text-align:left;color:var(--white);
  font-family:'Press Start 2P',monospace;
  border:var(--pixel) solid var(--gold);
  box-shadow:0 0 0 var(--pixel) #000, var(--px2) var(--px2) 0 var(--pixel) #000;
  transition:transform 0.1s,box-shadow 0.1s;
  position:relative;overflow:hidden;
  -webkit-tap-highlight-color:transparent;
}
.subject-btn::before{
  content:'';position:absolute;inset:0;
  background:repeating-linear-gradient(
    45deg,transparent,transparent 4px,rgba(255,224,0,0.03) 4px,rgba(255,224,0,0.03) 8px);
}
.subject-btn:hover{
  transform:translate(-2px,-2px);
  box-shadow:0 0 0 var(--pixel) #000, 10px 10px 0 var(--pixel) #000;
}
.subject-btn:active{
  transform:translate(4px,4px);
  box-shadow:0 0 0 var(--pixel) #000, 4px 4px 0 var(--pixel) #000;
}
.sub-emoji{font-size:26px;display:block;margin-bottom:12px;}
.sub-name{font-size:9px;margin-bottom:6px;line-height:1.7;}
.sub-count{font-size:8px;color:var(--muted);}
.sub-bar{height:4px;margin-top:14px;background:var(--muted);position:relative;}
.sub-bar-fill{height:100%;background:var(--gold);width:100%;}

/* AI box */
.ai-panel{
  background:rgba(0,229,255,0.04);
  border:var(--pixel) solid var(--cyan);
  box-shadow:0 0 0 var(--pixel) #000, var(--px2) var(--px2) 0 var(--pixel) #000,
             0 0 32px rgba(0,229,255,0.08);
  padding:22px;
  margin-bottom:4px;
}
.ai-head{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
.ai-chip{
  background:var(--cyan);color:#000;
  font-size:8px;font-weight:900;letter-spacing:0.1em;
  padding:4px 8px;
}
.ai-head-txt{font-size:9px;color:var(--cyan);line-height:1.7;}

.ai-row{display:flex;gap:10px;flex-wrap:wrap;}
.ai-input{
  flex:1;min-width:180px;
  background:rgba(0,0,0,0.5);
  border:var(--pixel) solid var(--muted);
  padding:12px 14px;
  color:var(--white);
  font-family:'VT323',monospace;font-size:18px;
  outline:none;
  transition:border-color 0.2s;
}
.ai-input:focus{border-color:var(--cyan);}
.ai-input::placeholder{color:var(--muted);}

.px-btn{
  background:var(--gold);color:#000;
  border:var(--pixel) solid #000;
  box-shadow:var(--pixel) var(--pixel) 0 #000;
  padding:12px 18px;
  font-family:'Press Start 2P',monospace;font-size:8px;
  cursor:pointer;white-space:nowrap;
  transition:transform 0.08s,box-shadow 0.08s;
  -webkit-tap-highlight-color:transparent;
}
.px-btn:hover:not(:disabled){transform:translate(-2px,-2px);box-shadow:6px 6px 0 #000;}
.px-btn:active:not(:disabled){transform:translate(2px,2px);box-shadow:2px 2px 0 #000;}
.px-btn:disabled{opacity:0.4;cursor:not-allowed;}
.px-btn.cyan{background:var(--cyan);}
.px-btn.green{background:var(--green);}
.px-btn.red{background:var(--red);color:#fff;}
.px-btn.ghost{background:transparent;color:var(--white);border-color:var(--muted);}

.err-msg{margin-top:10px;font-size:8px;color:var(--red);line-height:1.8;}

/* ── STUDY ── */
.study{width:100%;max-width:680px;animation:fadeIn 0.35s ease both;}

.study-nav{
  display:flex;align-items:center;justify-content:space-between;
  margin-bottom:18px;flex-wrap:wrap;gap:10px;
}
.deck-tag{
  background:var(--panel);
  border:3px solid var(--gold);
  box-shadow:3px 3px 0 #000;
  font-size:8px;padding:6px 12px;color:var(--gold);
}
.counter{font-size:9px;color:var(--muted);}

/* pixel progress */
.px-bar-track{
  height:12px;background:#000;
  border:3px solid var(--muted);
  margin-bottom:18px;
  position:relative;overflow:hidden;
}
.px-bar-fill{
  height:100%;
  background:repeating-linear-gradient(90deg,var(--green) 0,var(--green) 8px,#00cc60 8px,#00cc60 12px);
  transition:width 0.4s steps(10);
}

/* countdown */
.countdown-wrap{
  display:flex;align-items:center;gap:14px;
  margin-bottom:18px;
  background:rgba(0,0,0,0.4);
  border:3px solid var(--muted);
  padding:10px 14px;
}
.countdown-label{font-size:7px;color:var(--muted);}
.countdown-num{
  font-size:22px;min-width:32px;text-align:center;
  transition:color 0.2s;
}
.countdown-num.urgent{color:var(--red);animation:pulse 0.5s ease-in-out infinite;}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
.countdown-track{
  flex:1;height:8px;background:#111;
  border:2px solid var(--muted);overflow:hidden;
}
.countdown-fill{
  height:100%;
  transition:width 0.9s linear,background 0.3s;
}

/* card scene */
.card-scene{
  perspective:1400px;
  width:100%;height:clamp(260px,44vh,380px);
  margin-bottom:44px;
  cursor:pointer;
  position:relative;z-index:1;
  touch-action:manipulation;
}
.card-scene.flipped{margin-bottom:100px;}
.card-inner{
  width:100%;height:100%;
  position:relative;transform-style:preserve-3d;
  transition:transform 0.6s cubic-bezier(0.4,0,0.2,1);
  z-index:2;
}
.card-inner.flipped{transform:rotateY(180deg);}

/* swipe feedback zones */
.swipe-zone{
  position:absolute;inset:0;z-index:1;
  pointer-events:none;overflow:hidden;
}
.swipe-zone-inner{
  position:absolute;inset:0;
  transition:opacity 0.15s;
  display:flex;align-items:center;
}
.swipe-right-bg{background:linear-gradient(90deg,transparent 40%,rgba(0,255,128,0.15));justify-content:flex-end;padding-right:16px;}
.swipe-left-bg{background:linear-gradient(270deg,transparent 40%,rgba(255,56,85,0.15));justify-content:flex-start;padding-left:16px;}
.swipe-label{
  font-size:11px;font-weight:900;letter-spacing:0.04em;
  text-shadow:0 0 12px currentColor;
}
.swipe-label.green{color:var(--green);}
.swipe-label.red{color:var(--red);}

/* swipe border glow */
.swipe-glow{position:absolute;inset:-4px;z-index:3;pointer-events:none;transition:opacity 0.15s;}

.card-face{
  position:absolute;inset:0;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:32px 36px;text-align:center;
  backface-visibility:hidden;-webkit-backface-visibility:hidden;
}

/* front: parchment pixel panel */
.card-front{
  background:#1c1008;
  border:var(--pixel) solid var(--gold);
  box-shadow:0 0 0 var(--pixel) #000,
             12px 12px 0 var(--pixel) #000,
             0 0 40px rgba(255,224,0,0.12);
  position:relative;overflow:hidden;
}
.card-front::before{
  content:'';position:absolute;inset:0;
  background:repeating-linear-gradient(
    0deg,transparent,transparent 6px,rgba(255,224,0,0.03) 6px,rgba(255,224,0,0.03) 7px);
}
.card-front-label{font-size:8px;color:var(--gold);margin-bottom:20px;letter-spacing:0.1em;}
.card-question{
  font-family:'VT323',monospace;font-size:clamp(20px,4vw,28px);
  color:#f0d890;line-height:1.5;
  position:relative;z-index:1;
}

/* pixel corner decorations */
.corner{position:absolute;width:12px;height:12px;background:var(--gold);}
.corner.tl{top:6px;left:6px;}
.corner.tr{top:6px;right:6px;}
.corner.bl{bottom:6px;left:6px;}
.corner.br{bottom:6px;right:6px;}

.flip-hint{
  position:absolute;bottom:14px;
  font-size:7px;color:var(--muted);letter-spacing:0.06em;
  animation:blink 1.2s steps(1) infinite;
}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}

/* back: answer panel */
.card-back{
  background:#001428;
  border:var(--pixel) solid var(--green);
  box-shadow:0 0 0 var(--pixel) #000,
             12px 12px 0 var(--pixel) #000,
             0 0 40px rgba(0,255,128,0.15);
  transform:rotateY(180deg);
  position:relative;overflow:hidden;
}
.card-back::before{
  content:'';position:absolute;inset:0;
  background:repeating-linear-gradient(
    0deg,transparent,transparent 6px,rgba(0,255,128,0.025) 6px,rgba(0,255,128,0.025) 7px);
}
.card-back-label{font-size:8px;color:var(--green);margin-bottom:16px;letter-spacing:0.1em;}
.card-back .corner{background:var(--green);}
.card-answer{
  font-family:'VT323',monospace;font-size:clamp(18px,3.5vw,26px);
  color:#c0ffdc;line-height:1.5;white-space:pre-line;
  position:relative;z-index:1;
}
.ambient-badge{
  position:absolute;bottom:14px;
  font-size:7px;color:var(--green);
  display:flex;align-items:center;gap:6px;
  animation:blink 1.8s steps(1) infinite;
}
.sound-dot{
  width:6px;height:6px;background:var(--green);
  animation:blink 0.6s steps(1) infinite;
}

/* reveal button */
.reveal-btn-wrap{display:flex;justify-content:center;margin-bottom:14px;position:relative;z-index:10;}

/* mark buttons */
.mark-row{
  display:flex;gap:14px;
  opacity:0;transform:translateY(8px);visibility:hidden;
  transition:all 0.3s ease;pointer-events:none;
  position:relative;z-index:10;
}
.mark-row.visible{opacity:1;transform:none;pointer-events:all;visibility:visible;}
.mark-btn{
  flex:1;padding:14px 10px;min-height:44px;
  border:var(--pixel) solid #000;
  box-shadow:var(--pixel) var(--pixel) 0 #000;
  font-family:'Press Start 2P',monospace;font-size:8px;
  cursor:pointer;transition:transform 0.08s,box-shadow 0.08s;
  display:flex;align-items:center;justify-content:center;gap:8px;
  -webkit-tap-highlight-color:transparent;
}
.mark-btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #000;}
.mark-btn:active{transform:translate(2px,2px);box-shadow:2px 2px 0 #000;}
.btn-review{background:var(--red);color:#fff;}
.btn-known{background:var(--green);color:#000;}

.kb-hint{
  text-align:center;margin-top:12px;
  font-size:7px;color:var(--muted);line-height:2;
}
.kbd{
  display:inline-block;background:#111;
  border:2px solid var(--muted);
  padding:1px 5px;font-size:7px;font-family:monospace;
}

/* ── RESULTS ── */
.results{width:100%;max-width:600px;animation:fadeIn 0.4s ease both;}

.results-panel{
  background:var(--panel);
  border:var(--pixel) solid var(--gold);
  box-shadow:0 0 0 var(--pixel) #000,
             16px 16px 0 var(--pixel) #000,
             0 0 60px rgba(255,224,0,0.12);
  padding:36px 32px;
  text-align:center;
  margin-bottom:20px;
}
.results-emoji{font-size:48px;display:block;margin-bottom:16px;animation:bobble 1s ease-in-out infinite;}
.results-title{font-size:clamp(11px,2.5vw,16px);color:var(--gold);margin-bottom:10px;line-height:1.7;}
.results-sub{font-family:'VT323',monospace;font-size:20px;color:var(--muted);margin-bottom:28px;}

.score-bar-wrap{margin-bottom:24px;}
.score-label{font-size:9px;color:var(--muted);margin-bottom:8px;}
.score-bar-track{height:20px;background:#000;border:3px solid var(--gold);}
.score-bar-fill{
  height:100%;
  background:repeating-linear-gradient(90deg,var(--gold) 0,var(--gold) 10px,var(--gold2) 10px,var(--gold2) 16px);
  transition:width 1s cubic-bezier(0.4,0,0.2,1);
}
.score-pct{font-size:20px;color:var(--gold);margin-top:8px;}

.stats-row{display:flex;gap:12px;margin-bottom:28px;}
.stat-box{
  flex:1;
  background:#000;
  border:3px solid var(--muted);
  box-shadow:3px 3px 0 #000;
  padding:14px;text-align:center;
}
.stat-num{font-size:22px;display:block;margin-bottom:4px;}
.stat-nm{font-size:7px;color:var(--muted);}

.results-btns{display:flex;flex-direction:column;gap:12px;}
.results-btn{
  width:100%;padding:15px;min-height:44px;
  border:var(--pixel) solid #000;
  box-shadow:var(--pixel) var(--pixel) 0 #000;
  font-family:'Press Start 2P',monospace;font-size:8px;
  cursor:pointer;transition:transform 0.08s,box-shadow 0.08s;
  display:flex;align-items:center;justify-content:center;gap:10px;
  -webkit-tap-highlight-color:transparent;
}
.results-btn:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 #000;}

/* spinner */
.spinner{
  width:14px;height:14px;border-radius:50%;
  border:2px solid rgba(0,0,0,0.2);border-top-color:#000;
  animation:spin 0.7s linear infinite;display:inline-block;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* flash overlay */
.flash-overlay{
  position:fixed;inset:0;z-index:9998;pointer-events:none;
  background:rgba(255,255,255,0);
  transition:background 0.08s;
}
.flash-overlay.flash-white{background:rgba(255,255,255,0.25);}
.flash-overlay.flash-gold{background:rgba(255,224,0,0.2);}
.flash-overlay.flash-red{background:rgba(255,56,85,0.18);}

/* ── TEACHER DASHBOARD ── */
.teacher-dash{width:100%;max-width:760px;animation:fadeIn 0.4s ease both;}
.td-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;}
.td-title{font-size:clamp(11px,2.5vw,16px);color:var(--gold);text-shadow:3px 3px 0 #7a5500;display:flex;align-items:center;gap:10px;}
.td-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px;}
.td-stat{background:#000;border:3px solid var(--gold);box-shadow:3px 3px 0 #000;padding:16px;text-align:center;}
.td-stat-num{font-size:clamp(18px,3vw,26px);color:var(--gold);display:block;margin-bottom:4px;}
.td-stat-label{font-size:7px;color:var(--muted);}
.td-section{margin-bottom:28px;}
.td-section-title{font-size:8px;color:var(--cyan);margin-bottom:12px;display:flex;align-items:center;gap:8px;}
.td-section-title::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--cyan),transparent);}
.td-table{width:100%;border-collapse:collapse;font-size:7px;}
.td-table th{background:var(--panel);color:var(--muted);padding:8px 6px;text-align:left;border-bottom:3px solid var(--muted);font-weight:normal;}
.td-table td{padding:8px 6px;border-bottom:2px solid rgba(90,90,138,0.15);color:var(--white);line-height:1.6;}
.td-table tr:hover td{background:rgba(255,224,0,0.04);}
.td-deck-row{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:var(--panel);border:3px solid var(--muted);margin-bottom:8px;box-shadow:3px 3px 0 #000;}
.td-deck-name{font-size:8px;color:var(--white);}
.td-deck-info{font-size:6px;color:var(--muted);margin-top:3px;}
.td-small-btn{background:var(--panel);color:var(--white);border:3px solid var(--muted);padding:8px 14px;cursor:pointer;font-family:'Press Start 2P',monospace;font-size:7px;transition:transform 0.08s;box-shadow:2px 2px 0 #000;white-space:nowrap;}
.td-small-btn:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 #000;}
.td-small-btn.red{background:var(--red);border-color:var(--red);color:#fff;}
.td-small-btn.green{background:var(--green);border-color:var(--green);color:#000;}
.td-small-btn.cyan{background:var(--cyan);border-color:var(--cyan);color:#000;}
.td-data-row{display:flex;gap:10px;flex-wrap:wrap;}
.td-empty{font-size:8px;color:var(--muted);text-align:center;padding:20px;border:3px dashed var(--muted);}
`;

// ─────────────────────────────────────────────
//  COMPONENT
// ─────────────────────────────────────────────
export default function FlashcardApp() {
  const isTeacher = typeof window !== 'undefined' && window.location.pathname.split('/').includes('teacher');
  const [screen, setScreen] = useState(isTeacher ? "teacher-home" : "home");
  const [deckName, setDeckName] = useState("");
  const [cards, setCards] = useState([]);
  const [origCards, setOrigCards] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]);
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [countdown, setCountdown] = useState(COUNTDOWN_SEC);
  const [flashClass, setFlashClass] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const cdRef = useRef(null);
  const audioReady = useRef(false);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem("fq_muted") === "true"; }
    catch { return false; }
  });
  const [volume, setVolume] = useState(() => {
    try { const v = parseFloat(localStorage.getItem("fq_volume")); return isNaN(v) ? 1.0 : v; }
    catch { return 1.0; }
  });
  const [savedDecks, setSavedDecks] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fq_saved_decks")) || []; }
    catch { return []; }
  });
  const [sessionHistory, setSessionHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fq_sessions")) || []; }
    catch { return []; }
  });
  const [swipeDelta, setSwipeDelta] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const gestureRef = useRef({ startX: 0, delta: 0, active: false });
  const suppressClickRef = useRef(false);
  const [isTouch] = useState(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);
  const [confirmAction, setConfirmAction] = useState(null);
  const importRef = useRef(null);
  const [difficulty, setDifficulty] = useState("high school");
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem("fq_api_key") || ""; }
    catch { return ""; }
  });
  // refs that always hold the latest values — fixes stale closure in event handlers
  const flippedRef = useRef(false);
  const resultsRef = useRef([]);
  const idxRef = useRef(0);
  const cardsRef = useRef([]);
  const deckNameRef = useRef("");

  // keep refs in sync
  useEffect(() => { flippedRef.current = flipped; }, [flipped]);
  useEffect(() => { resultsRef.current = results; }, [results]);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { cardsRef.current = cards; }, [cards]);
  useEffect(() => { deckNameRef.current = deckName; }, [deckName]);

  // ── persist settings to localStorage ──
  useEffect(() => {
    try { localStorage.setItem("fq_api_key", apiKey); }
    catch { /* localStorage unavailable */ }
  }, [apiKey]);
  useEffect(() => {
    try { localStorage.setItem("fq_muted", muted); }
    catch {}
  }, [muted]);
  useEffect(() => {
    try { localStorage.setItem("fq_volume", volume); }
    catch {}
  }, [volume]);
  useEffect(() => {
    try { localStorage.setItem("fq_saved_decks", JSON.stringify(savedDecks)); }
    catch {}
  }, [savedDecks]);
  useEffect(() => {
    try { localStorage.setItem("fq_sessions", JSON.stringify(sessionHistory)); }
    catch {}
  }, [sessionHistory]);

  // ── sync volume/mute to sound engine ──
  useEffect(() => { SFX.setVolume(volume); }, [volume]);
  useEffect(() => { SFX.setMuted(muted); }, [muted]);

  // ── close settings panel when screen changes ──
  useEffect(() => { setShowSettings(false); }, [screen]);

  const initAudio = () => {
    if (!audioReady.current) { SFX.init(); audioReady.current = true; }
  };

  const flash = (cls, ms = 300) => {
    setFlashClass(cls);
    setTimeout(() => setFlashClass(""), ms);
  };

  const stopCountdown = () => {
    if (cdRef.current) { clearInterval(cdRef.current); cdRef.current = null; }
  };

  // ── countdown: only decrements — auto-flip handled in useEffect below ──
  const startCountdown = useCallback(() => {
    stopCountdown();
    setCountdown(COUNTDOWN_SEC);
    cdRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(cdRef.current);
          cdRef.current = null;
          return 0;
        }
        if (prev <= 2) SFX.playTick(true);
        else SFX.playTick(false);
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── auto-flip when countdown hits 0 (avoids setState-inside-setState bug) ──
  useEffect(() => {
    if (countdown === 0 && screen === "study" && !flippedRef.current) {
      SFX.playTimeUp();
      flash("flash-white", 200);
      setFlipped(true);
      flippedRef.current = true;
      SFX.stopSuspense();
      setTimeout(() => { SFX.playReveal(); setTimeout(() => SFX.startAmbience(), 500); }, 50);
    }
  }, [countdown, screen]);

  // ── save deck to localStorage ──
  const maybeSaveDeck = (cardArr, name) => {
    if (name.endsWith("(Review)")) return;
    setSavedDecks(prev => {
      const filtered = prev.filter(d => d.name !== name);
      const entry = { name, cards: cardArr, difficulty, date: Date.now() };
      return [entry, ...filtered].slice(0, 10);
    });
  };

  // ── start study ──
  const startStudy = (cardArr, name) => {
    setCards(cardArr); setOrigCards(cardArr);
    setDeckName(name); setIdx(0); setFlipped(false); setResults([]);
    flippedRef.current = false;
    setScreen("study");
    SFX.stopAll();
    maybeSaveDeck(cardArr, name);
    setTimeout(() => { SFX.startSuspense(); startCountdown(); }, 200);
  };

  // ── flip (manual) ──
  const doFlip = useCallback(() => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    initAudio();
    if (flippedRef.current) return;
    stopCountdown();
    setFlipped(true);
    flippedRef.current = true;
    SFX.stopSuspense();
    flash("flash-white", 180);
    setTimeout(() => { SFX.playReveal(); }, 80);
    setTimeout(() => { SFX.startAmbience(); }, 600);
  }, []);

  // ── mark — reads from refs so it's never stale ──
  const handleMark = useCallback((status) => {
    initAudio();
    SFX.stopAll();
    stopCountdown();
    if (status === "known") { SFX.playVictory(); flash("flash-gold", 400); }
    else { SFX.playMiss(); flash("flash-red", 300); }
    const curResults = resultsRef.current;
    const curIdx = idxRef.current;
    const curCards = cardsRef.current;
    const newRes = [...curResults, status];
    setResults(newRes);
    resultsRef.current = newRes;
    if (curIdx < curCards.length - 1) {
      const next = curIdx + 1;
      setIdx(next); idxRef.current = next;
      setFlipped(false); flippedRef.current = false;
      setTimeout(() => { SFX.startSuspense(); startCountdown(); }, 400);
    } else {
      setTimeout(() => {
        // save session result
        const session = {
          deckName: deckNameRef.current,
          known: [...resultsRef.current, status].filter(r => r === "known").length,
          review: [...resultsRef.current, status].filter(r => r === "review").length,
          total: cardsRef.current.length,
          date: Date.now(),
        };
        session.pct = Math.round((session.known / session.total) * 100);
        setSessionHistory(prev => [session, ...prev].slice(0, 20));
        setScreen("results");
      }, 800);
    }
  }, [startCountdown]);

  // ── keyboard: uses refs so never stale, registered once per screen ──
  useEffect(() => {
    if (screen !== "study") return;
    const h = (e) => {
      if (e.code === "Space") { e.preventDefault(); doFlip(); }
      if (e.code === "Enter" && flippedRef.current) { e.preventDefault(); handleMark("known"); }
      if (e.code === "ArrowRight" && flippedRef.current) handleMark("known");
      if (e.code === "ArrowLeft"  && flippedRef.current) handleMark("review");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [screen, doFlip, handleMark]);

  // ── cleanup on screen change ──
  useEffect(() => {
    if (screen !== "study") { SFX.stopAll(); stopCountdown(); }
  }, [screen]);

  // ── AI generate (via OpenRouter) ──
  const generate = async () => {
    if (!topic.trim() || loading) return;
    initAudio();
    setLoading(true); setErr("");
    try {
      if (!apiKey) throw new Error("No API key configured");
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://flashquest.app",
          "X-Title": "FlashQuest",
        },
        body: JSON.stringify({
          model: "openrouter/owl-alpha",
          max_tokens: 700,
          messages: [{ role: "user", content:
            `Generate 8 ${difficulty} flashcards on: "${topic}". seed=${Date.now()}

IMPORTANT: Output ONLY raw JSON. Do NOT think out loud. Do NOT include any text before or after the JSON.

Format: [{"front":"question","back":"concise answer with key facts"}]

Each question must be DIFFERENT — vary the topics and angles.` }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const txt = data.choices?.[0]?.message?.content || "";
      const parsed = JSON.parse(txt.replace(/```json|```/g, "").trim());
      startStudy(parsed, topic.trim());
    } catch (e) {
      setErr(`ERROR: ${e?.message || "Couldn't generate. Try another topic."}`);
    } finally { setLoading(false); }
  };

  // derived
  const known   = results.filter(r => r === "known").length;
  const review  = results.filter(r => r === "review").length;
  const pct     = cards.length ? Math.round((known / cards.length) * 100) : 0;
  const progress = cards.length ? (idx / cards.length) * 100 : 0;
  const cdPct   = (countdown / COUNTDOWN_SEC) * 100;
  const urgent  = countdown <= 2;

  const retryMissed = () => {
    const missed = origCards.filter((_, i) => results[i] === "review");
    if (!missed.length) return;
    startStudy(missed, deckName + " (Review)");
  };

  const restartFull = () => startStudy(origCards, deckName);

  // ── teacher data helpers ──
  const exportData = () => {
    const data = { savedDecks, sessionHistory, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flashquest-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.savedDecks) setSavedDecks(data.savedDecks);
        if (data.sessionHistory) setSessionHistory(data.sessionHistory);
      } catch { alert("Invalid file format — expected FlashQuest JSON."); }
    };
    reader.readAsText(file);
  };

  const clearAllData = () => {
    try { localStorage.clear(); } catch {}
    setSavedDecks([]);
    setSessionHistory([]);
    setApiKey("");
    setMuted(false);
    setVolume(1.0);
  };

  return (
    <div onClick={initAudio} style={{ minHeight: "100vh", background: "#060614" }}>
      <style>{CSS}</style>
      <div className="starfield" />
      <div className={`flash-overlay ${flashClass}`} />

      <div className="app">
        {/* ── HEADER ── */}
        <header className="header">
          <div className="logo">
            <div className="logo-sprite" />
            <div className="logo-text">
              {isTeacher ? 'TEACHER' : 'FLASH'}<span>{isTeacher ? ' PANEL' : 'QUEST'}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="px-btn ghost"
              style={{ fontSize: 16, padding: "8px 10px", lineHeight: 1 }}
              onClick={() => setMuted(m => !m)}
              title={muted ? "Sound is muted — click to unmute" : `Volume: ${Math.round(volume * 100)}% — click to mute`}
            >
              {muted ? "🔇" : volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}
            </button>
            <button
              className="px-btn ghost"
              style={{ fontSize: 14, padding: "8px 10px", lineHeight: 1 }}
              onClick={() => setShowSettings(s => !s)}
              title={apiKey ? "API key configured — click to change" : "Click to set your API key"}
            >
              ⚙
            </button>
            {isTeacher ? (
              screen !== "teacher-home" ? (
                <button className="px-btn ghost" style={{ fontSize: 8 }} onClick={() => setScreen("teacher-home")}>
                  ◀ DASHBOARD
                </button>
              ) : (
                <button className="px-btn ghost" style={{ fontSize: 8 }} onClick={() => setScreen("home")}>
                  👤 STUDENT VIEW
                </button>
              )
            ) : (
              screen !== "home" && (
                <button className="px-btn ghost" style={{ fontSize: 8 }} onClick={() => setScreen("home")}>
                  ◀ EXIT
                </button>
              )
            )}
          </div>
        </header>

        {/* ── SETTINGS PANEL ── */}
        {showSettings && (
          <div style={{ width: "100%", maxWidth: 760, marginBottom: 20, animation: "fadeIn 0.3s ease both" }}>
            <div className="ai-panel" style={{ borderColor: "var(--gold)", boxShadow: "0 0 0 var(--pixel) #000, var(--px2) var(--px2) 0 var(--pixel) #000, 0 0 32px rgba(255,224,0,0.12)" }}>
              <div className="ai-head">
                <span className="ai-chip" style={{ background: "var(--gold)", color: "#000" }}>⚙ SETTINGS</span>
                <div className="ai-head-txt">OPENROUTER API KEY</div>
              </div>
              <div className="ai-row">
                <input
                  className="ai-input"
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
                <button className="px-btn green" onClick={() => setShowSettings(false)}>
                  ✔ DONE
                </button>
              </div>
              <div style={{ fontSize: 7, color: "var(--muted)", lineHeight: 1.8, marginTop: 12 }}>
                Get your free API key at <span style={{ color: "var(--cyan)" }}>openrouter.ai/keys</span>
                — Model: <span style={{ color: "var(--green)" }}>openrouter/owl-alpha</span> (free)
                {apiKey ? (
                  <span style={{ color: "var(--green)", display: "block", marginTop: 4 }}>✓ Key saved to browser storage</span>
                ) : (
                  <span style={{ color: "var(--red)", display: "block", marginTop: 4 }}>✗ No key set — AI generator disabled</span>
                )}
              </div>
              {/* sound controls divider */}
              <div style={{ height: 1, background: "var(--muted)", opacity: 0.3, margin: "16px 0" }} />
              <div className="ai-head">
                <span className="ai-chip" style={{ background: "var(--green)", color: "#000" }}>🔊 SOUND</span>
                <div className="ai-head-txt" style={{ color: "var(--green)" }}>
                  {muted ? "MUTED" : `${Math.round(volume * 100)}%`}
                </div>
                <button
                  className="px-btn ghost"
                  style={{ fontSize: 14, padding: "4px 8px", lineHeight: 1, marginLeft: "auto" }}
                  onClick={() => setMuted(m => !m)}
                >
                  {muted ? "🔇" : "🔊"}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 9, color: muted ? "var(--red)" : "var(--muted)" }}>🔉</span>
                <input
                  id="volume-slider"
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(volume * 100)}
                  onChange={e => { const v = parseInt(e.target.value) / 100; setVolume(v); if (v > 0 && muted) setMuted(false); }}
                  style={{
                    flex: 1, height: 6, appearance: "none", outline: "none",
                    background: muted
                      ? "var(--muted)"
                      : `linear-gradient(90deg, var(--green) ${volume * 100}%, #222 ${volume * 100}%)`,
                    cursor: "pointer",
                  }}
                />
                <span style={{ fontSize: 9, color: muted ? "var(--red)" : "var(--muted)" }}>🔊</span>
              </div>
              <div style={{ fontSize: 7, color: "var(--muted)", lineHeight: 1.8, marginTop: 8 }}>
                {muted ? (
                  <span style={{ color: "var(--red)" }}>🔇 All sounds muted</span>
                ) : (
                  <span style={{ color: "var(--green)" }}>✓ Sound at {Math.round(volume * 100)}%</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ HOME ═══════════ */}
        {screen === "home" && (
          <div className="home">
            <div className="hero-title">▶ STUDY MODE ACTIVATED</div>
            <div className="hero-sub">
              Pick a deck to study.<br />
              Your brain is the final boss. 🧠
            </div>

            {/* ── SAVED DECKS ── */}
            {savedDecks.length > 0 && (
              <>
                <div className="section-label" style={{ marginTop: 16 }}>SAVED DECKS</div>
                <div className="subjects-grid">
                  {savedDecks.map(deck => (
                    <button
                      key={deck.name + deck.date}
                      className="subject-btn"
                      style={{ borderColor: "var(--cyan)", boxShadow: "0 0 0 var(--pixel) #000, var(--px2) var(--px2) 0 var(--pixel) #000" }}
                      onClick={() => { initAudio(); startStudy(deck.cards, deck.name); }}
                    >
                      <span className="sub-emoji">📦</span>
                      <div className="sub-name">{deck.name}</div>
                      <div className="sub-count">{deck.cards.length} CARDS · {deck.difficulty || "-"}</div>
                      <div style={{ fontSize: 7, color: "var(--muted)", marginTop: 6 }}>
                        {new Date(deck.date).toLocaleDateString()}
                      </div>
                      <div className="sub-bar">
                        <div className="sub-bar-fill" style={{ background: "var(--cyan)", width: "100%" }} />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* ── LAST SESSION ── */}
            {sessionHistory.length > 0 && (
              <div style={{
                marginTop: 12, padding: "14px 18px",
                background: "rgba(0,255,128,0.04)",
                border: "4px solid var(--green)",
                boxShadow: "0 0 0 var(--pixel) #000, var(--px2) var(--px2) 0 var(--pixel) #000",
              }}>
                <div className="ai-head" style={{ marginBottom: 8 }}>
                  <span className="ai-chip" style={{ background: "var(--green)", color: "#000" }}>📊 LAST SESSION</span>
                  <div className="ai-head-txt" style={{ color: "var(--green)", fontSize: 8 }}>
                    {sessionHistory[0].deckName} — {sessionHistory[0].pct}%
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 7, color: "var(--muted)" }}>
                    {new Date(sessionHistory[0].date).toLocaleDateString()}
                  </div>
                </div>
                <div className="stats-row" style={{ marginBottom: 0 }}>
                  <div className="stat-box" style={{ padding: 8 }}>
                    <span className="stat-num" style={{ color: "var(--green)", fontSize: 16 }}>{sessionHistory[0].known}</span>
                    <span className="stat-nm" style={{ fontSize: 6 }}>✔ GOT IT</span>
                  </div>
                  <div className="stat-box" style={{ padding: 8 }}>
                    <span className="stat-num" style={{ color: "var(--red)", fontSize: 16 }}>{sessionHistory[0].review}</span>
                    <span className="stat-nm" style={{ fontSize: 6 }}>✗ REVIEW</span>
                  </div>
                  <div className="stat-box" style={{ padding: 8 }}>
                    <span className="stat-num" style={{ color: "var(--gold)", fontSize: 16 }}>{sessionHistory[0].total}</span>
                    <span className="stat-nm" style={{ fontSize: 6 }}>TOTAL</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ TEACHER DASHBOARD ═══════════ */}
        {screen === "teacher-home" && (
          <div className="teacher-dash">
            {/* ── AI DECK GENERATOR ── */}
            <div className="section-label" style={{ marginTop: 0 }}>AI DECK GENERATOR</div>
            <div className="ai-panel" style={{ marginBottom: 28 }}>
              <div className="ai-head">
                <span className="ai-chip">✦ AI</span>
                <div className="ai-head-txt">TYPE ANY TOPIC → GET 8 CARDS</div>
                <span style={{ marginLeft: "auto", fontSize: 10 }} title={apiKey ? "API key configured" : "No API key set"}>
                  {apiKey ? "🔑" : "❌"}
                </span>
              </div>
              <div className="ai-row">
                <input
                  className="ai-input"
                  placeholder="e.g. Photosynthesis, Civil War, Derivatives..."
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && generate()}
                />
                <button className="px-btn cyan" onClick={generate} disabled={loading || !topic.trim() || !apiKey}>
                  {loading ? <><span className="spinner" /> GEN...</> : "✦ GO"}
                </button>
              </div>
              {/* difficulty selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                <span style={{ fontSize: 7, color: "var(--muted)", letterSpacing: "0.1em" }}>🎓 LEVEL</span>
                {["high school", "college", "expert"].map(level => (
                  <button
                    key={level}
                    className="px-btn"
                    style={{
                      fontSize: 7,
                      padding: "6px 12px",
                      background: difficulty === level ? "var(--cyan)" : "transparent",
                      color: difficulty === level ? "#000" : "var(--white)",
                      borderColor: difficulty === level ? "var(--cyan)" : "var(--muted)",
                    }}
                    onClick={() => setDifficulty(level)}
                  >
                    {level === "high school" ? "📘" : level === "college" ? "📗" : "📕"} {level.toUpperCase()}
                  </button>
                ))}
              </div>
              {!apiKey && (
                <div className="err-msg" style={{ color: "var(--gold)", marginTop: 8, fontSize: 7 }}>
                  ⚙ Click the gear icon ⚙ above to set your API key
                </div>
              )}
              {err && <div className="err-msg">⚠ {err}</div>}
            </div>

            {/* quick stats */}
            <div className="td-stats">
              <div className="td-stat">
                <span className="td-stat-num">{sessionHistory.length}</span>
                <span className="td-stat-label">SESSIONS</span>
              </div>
              <div className="td-stat">
                <span className="td-stat-num">{sessionHistory.reduce((s, h) => s + h.total, 0)}</span>
                <span className="td-stat-label">CARDS STUDIED</span>
              </div>
              <div className="td-stat">
                <span className="td-stat-num">
                  {sessionHistory.length
                    ? Math.round(sessionHistory.reduce((s, h) => s + h.pct, 0) / sessionHistory.length)
                    : "--"}%
                </span>
                <span className="td-stat-label">AVG SCORE</span>
              </div>
            </div>

            {/* saved decks */}
            <div className="td-section">
              <div className="td-section-title">📋 SAVED DECKS</div>
              {savedDecks.length === 0 ? (
                <div className="td-empty">No saved decks yet. Generate some with the AI tool!</div>
              ) : (
                savedDecks.map(deck => (
                  <div key={deck.name + deck.date} className="td-deck-row">
                    <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { initAudio(); startStudy(deck.cards, deck.name); }}>
                      <div className="td-deck-name">{deck.name}</div>
                      <div className="td-deck-info">{deck.cards.length} cards · {deck.difficulty || "-"} · {new Date(deck.date).toLocaleDateString()}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="td-small-btn cyan" onClick={() => { initAudio(); startStudy(deck.cards, deck.name); }}>▶ STUDY</button>
                      <button className="td-small-btn red" onClick={() => setConfirmAction({ type: "deleteDeck", name: deck.name })}>🗑</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* session history table */}
            <div className="td-section">
              <div className="td-section-title">📊 SESSION HISTORY</div>
              {sessionHistory.length === 0 ? (
                <div className="td-empty">No sessions yet. Students need to study!</div>
              ) : (
                <table className="td-table">
                  <thead>
                    <tr>
                      <th>DATE</th>
                      <th>DECK</th>
                      <th>SCORE</th>
                      <th>✔</th>
                      <th>✗</th>
                      <th>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionHistory.map((s, i) => (
                      <tr key={i}>
                        <td>{new Date(s.date).toLocaleDateString()}</td>
                        <td>{s.deckName}</td>
                        <td style={{ color: s.pct >= 80 ? "var(--green)" : s.pct >= 50 ? "var(--gold)" : "var(--red)" }}>{s.pct}%</td>
                        <td style={{ color: "var(--green)" }}>{s.known}</td>
                        <td style={{ color: "var(--red)" }}>{s.review}</td>
                        <td>{s.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* per-deck progress */}
            {sessionHistory.length > 0 && (
              <div className="td-section">
                <div className="td-section-title">📈 PER-DECK PROGRESS</div>
                {Object.entries(sessionHistory.reduce((acc, s) => {
                  if (!acc[s.deckName]) acc[s.deckName] = [];
                  acc[s.deckName].push(s);
                  return acc;
                }, {})).map(([name, sessions]) => {
                  const avg = Math.round(sessions.reduce((a, s) => a + s.pct, 0) / sessions.length);
                  const best = Math.max(...sessions.map(s => s.pct));
                  return (
                    <div key={name} className="td-deck-row" style={{ cursor: "default" }}>
                      <div>
                        <div className="td-deck-name">{name}</div>
                        <div className="td-deck-info">{sessions.length} session{sessions.length > 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <span style={{ fontSize: 7, color: "var(--muted)" }}>AVG</span>
                        <span style={{ fontSize: 12, color: avg >= 80 ? "var(--green)" : avg >= 50 ? "var(--gold)" : "var(--red)" }}>{avg}%</span>
                        <span style={{ fontSize: 7, color: "var(--muted)" }}>BEST</span>
                        <span style={{ fontSize: 12, color: "var(--gold)" }}>{best}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* data management */}
            <div className="td-section">
              <div className="td-section-title">💾 DATA MANAGEMENT</div>
              <div className="td-data-row">
                <button className="td-small-btn green" onClick={exportData}>📥 EXPORT ALL DATA</button>
                <label className="td-small-btn" style={{ cursor: "pointer", display: "inline-block" }}>
                  📤 IMPORT DATA
                  <input
                    ref={importRef}
                    type="file"
                    accept=".json"
                    style={{ display: "none" }}
                    onChange={e => { if (e.target.files[0]) { importData(e.target.files[0]); e.target.value = ""; } }}
                  />
                </label>
                <button className="td-small-btn red" onClick={() => setConfirmAction({ type: "clearAll" })}>⚠ CLEAR ALL DATA</button>
              </div>
            </div>

            {/* confirmation modal */}
            {confirmAction && (
              <div style={{
                position: "fixed", inset: 0, zIndex: 10000,
                background: "rgba(0,0,0,0.8)",
                display: "flex", alignItems: "center", justifyContent: "center", padding: 20
              }}>
                <div className="ai-panel" style={{
                  maxWidth: 400, width: "100%",
                  borderColor: "var(--red)",
                  boxShadow: "0 0 0 var(--pixel) #000, var(--px2) var(--px2) 0 var(--pixel) #000, 0 0 40px rgba(255,56,85,0.2)",
                  textAlign: "center"
                }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>⚠</div>
                  <div style={{ fontSize: 8, color: "var(--white)", lineHeight: 1.8, marginBottom: 16 }}>
                    {confirmAction.type === "deleteDeck"
                      ? `Delete deck "${confirmAction.name}" and all its cards? This cannot be undone.`
                      : "Delete ALL saved data? This includes all decks, sessions, and settings. Cannot be undone."}
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <button className="td-small-btn" style={{ minWidth: 100 }} onClick={() => setConfirmAction(null)}>CANCEL</button>
                    <button className="td-small-btn red" style={{ minWidth: 100 }} onClick={() => {
                      if (confirmAction.type === "deleteDeck") {
                        setSavedDecks(prev => prev.filter(d => d.name !== confirmAction.name));
                      } else if (confirmAction.type === "clearAll") {
                        clearAllData();
                      }
                      setConfirmAction(null);
                    }}>CONFIRM</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ STUDY ═══════════ */}
        {screen === "study" && cards.length > 0 && (
          <div className="study">
            {/* nav */}
            <div className="study-nav">
              <div className="deck-tag">▶ {deckName}</div>
              <div className="counter">{idx + 1} / {cards.length}</div>
            </div>

            {/* progress */}
            <div className="px-bar-track">
              <div className="px-bar-fill" style={{ width: `${progress}%` }} />
            </div>

            {/* countdown — hidden when flipped to keep card position */}
            <div className="countdown-wrap" style={{ visibility: flipped ? 'hidden' : 'visible' }}>
                <div className="countdown-label">⏱ AUTO-REVEAL</div>
                <div className={`countdown-num ${urgent ? "urgent" : ""}`}
                  style={{ color: urgent ? "var(--red)" : countdown <= 5 ? "var(--gold)" : "var(--white)" }}>
                  {String(countdown).padStart(2, "0")}
                </div>
                <div className="countdown-track">
                  <div className="countdown-fill" style={{
                    width: `${cdPct}%`,
                    background: urgent
                      ? "repeating-linear-gradient(90deg,#ff3855 0,#ff3855 8px,#cc2040 8px,#cc2040 12px)"
                      : countdown <= 5
                        ? "repeating-linear-gradient(90deg,#ffa500 0,#ffa500 8px,#cc7000 8px,#cc7000 12px)"
                        : "repeating-linear-gradient(90deg,#00ff80 0,#00ff80 8px,#00cc60 8px,#00cc60 12px)"
                  }} />
                </div>
              </div>

            {/* card */}
            <div className={`card-scene${flipped ? " flipped" : ""}`}
              onClick={doFlip}
              onTouchStart={e => {
                if (!flippedRef.current) return;
                const t = e.touches[0];
                gestureRef.current = { startX: t.clientX, startY: t.clientY, delta: 0, active: false };
                suppressClickRef.current = false;
                setSwipeDelta(0);
                setSwiping(true);
              }}
              onTouchMove={e => {
                const g = gestureRef.current;
                if (!flippedRef.current && !g.active) return;
                const dx = e.touches[0].clientX - g.startX;
                const dy = e.touches[0].clientY - g.startY;
                // only activate if predominantly horizontal (>1.5x vertical)
                if (!g.active && Math.abs(dx) > 10) {
                  if (Math.abs(dx) < Math.abs(dy) * 1.5) return; // more vertical → let scroll pass
                  g.active = true;
                  suppressClickRef.current = true;
                }
                g.delta = dx;
                setSwipeDelta(dx);
              }}
              onTouchEnd={e => {
                const g = gestureRef.current;
                if (g.active && Math.abs(g.delta) > 80) {
                  setSwiping(false);
                  setSwipeDelta(0);
                  if (g.delta > 0) handleMark("known");
                  else handleMark("review");
                  return;
                }
                // also reset if was swiping but didn't meet threshold
                if (g.active) {
                  setSwiping(false);
                  setSwipeDelta(0);
                  g.active = false;
                } else {
                  // if it was just a tap on the flipped card, let click through
                  setSwiping(false);
                  setSwipeDelta(0);
                }
              }}
            >
              {/* swipe visual feedback — only when flipped */}
              {flipped && (swiping || swipeDelta !== 0) && (
                <>
                  {/* green glow on right */}
                  <div className="swipe-zone" style={{ opacity: swipeDelta > 30 ? Math.min(1, (swipeDelta - 30) / 50) : 0 }}>
                    <div className="swipe-zone-inner swipe-right-bg">
                      <span className="swipe-label green">✔ GOT IT</span>
                    </div>
                  </div>
                  {/* red glow on left */}
                  <div className="swipe-zone" style={{ opacity: swipeDelta < -30 ? Math.min(1, (-swipeDelta - 30) / 50) : 0 }}>
                    <div className="swipe-zone-inner swipe-left-bg">
                      <span className="swipe-label red">✗ REVIEW</span>
                    </div>
                  </div>
                  {/* border glow */}
                  <div className="swipe-glow" style={{
                    opacity: Math.abs(swipeDelta) > 20 ? Math.min(1, (Math.abs(swipeDelta) - 20) / 60) : 0,
                    border: `4px solid ${swipeDelta > 0 ? 'var(--green)' : 'var(--red)'}`,
                    boxShadow: `0 0 30px ${swipeDelta > 0 ? 'rgba(0,255,128,0.3)' : 'rgba(255,56,85,0.3)'}`,
                  }} />
                </>
              )}
              <div className={`card-inner${flipped ? " flipped" : ""}`}
                style={{
                  transform: (swiping || swipeDelta !== 0) && flipped
                    ? `translateX(${swipeDelta}px) rotateY(180deg)`
                    : undefined,
                  transition: swiping ? 'none' : undefined,
                }}
              >
                {/* FRONT */}
                <div className="card-face card-front">
                  <div className="corner tl" /><div className="corner tr" />
                  <div className="corner bl" /><div className="corner br" />
                  <div className="card-front-label">❓ QUESTION</div>
                  <div className="card-question">{cards[idx]?.front}</div>
                  <div className="flip-hint">{isTouch ? '▶ TAP TO REVEAL ◀' : '▶ PRESS SPACE OR TAP TO REVEAL ◀'}</div>
                </div>
                {/* BACK */}
                <div className="card-face card-back">
                  <div className="corner tl" /><div className="corner tr" />
                  <div className="corner bl" /><div className="corner br" />
                  <div className="card-back-label">✔ ANSWER</div>
                  <div className="card-answer">{cards[idx]?.back}</div>
                  <div className="ambient-badge">
                    <div className="sound-dot" />
                    AMBIENT MUSIC PLAYING
                  </div>
                </div>
              </div>
            </div>

            {/* reveal button — hidden when flipped to keep layout */}
            <div className="reveal-btn-wrap" style={{ visibility: flipped ? 'hidden' : 'visible' }}>
                <button className="px-btn cyan" style={{ padding: "13px 28px", fontSize: 9 }} onClick={doFlip}>
                  ▶ REVEAL ANSWER
                </button>
              </div>

            {/* mark buttons */}
            <div className={`mark-row${flipped ? " visible" : ""}`}>
              <button className="mark-btn btn-review" onClick={() => handleMark("review")}>
                ✗ REVIEW AGAIN
              </button>
              <button className="mark-btn btn-known" onClick={() => handleMark("known")}>
                ✔ GOT IT!
              </button>
            </div>

            {isTouch ? (
              <div className="kb-hint">
                ⇆ TAP card to flip &nbsp;·&nbsp;
                ← swipe review &nbsp;·&nbsp;
                → swipe got it
              </div>
            ) : (
              <div className="kb-hint">
                <span className="kbd">SPACE</span> flip &nbsp;·&nbsp;
                <span className="kbd">ENTER</span> got it &nbsp;·&nbsp;
                <span className="kbd">←</span> review &nbsp;·&nbsp;
                <span className="kbd">→</span> got it
              </div>
            )}
          </div>
        )}

        {/* ═══════════ RESULTS ═══════════ */}
        {screen === "results" && (
          <div className="results">
            <div className="results-panel">
              <span className="results-emoji">
                {pct === 100 ? "🏆" : pct >= 75 ? "🔥" : pct >= 50 ? "💪" : "📖"}
              </span>
              <div className="results-title">SESSION COMPLETE!</div>
              <div className="results-sub">
                {pct === 100 ? "PERFECT RUN. YOU ARE UNSTOPPABLE." :
                 pct >= 75  ? "GREAT WORK — ALMOST THERE!" :
                 pct >= 50  ? "SOLID START — KEEP GRINDING!" :
                              "RETRY THE DECK — YOU GOT THIS."}
              </div>

              <div className="score-bar-wrap">
                <div className="score-label">MASTERY SCORE</div>
                <div className="score-bar-track">
                  <div className="score-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="score-pct">{pct}%</div>
              </div>

              <div className="stats-row">
                <div className="stat-box">
                  <span className="stat-num" style={{ color: "var(--green)" }}>{known}</span>
                  <span className="stat-nm">✔ GOT IT</span>
                </div>
                <div className="stat-box">
                  <span className="stat-num" style={{ color: "var(--red)" }}>{review}</span>
                  <span className="stat-nm">✗ REVIEW</span>
                </div>
                <div className="stat-box">
                  <span className="stat-num" style={{ color: "var(--gold)" }}>{cards.length}</span>
                  <span className="stat-nm">TOTAL</span>
                </div>
              </div>
            </div>

            <div className="results-btns">
              {review > 0 && (
                <button className="results-btn" style={{ background: "var(--red)", color: "#fff" }} onClick={retryMissed}>
                  ↺ RETRY {review} MISSED CARD{review !== 1 ? "S" : ""}
                </button>
              )}
              <button className="results-btn" style={{ background: "var(--gold)", color: "#000" }} onClick={restartFull}>
                ▶ RESTART FULL DECK
              </button>
              <button className="results-btn" style={{ background: "var(--panel)", color: "var(--white)", border: "4px solid var(--muted)" }} onClick={() => setScreen("home")}>
                ◀ BACK TO MENU
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

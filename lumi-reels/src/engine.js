/* Deterministic, time-based game engine. DOM and audio are deliberately separate. */
(function (root) {
  'use strict';
  const C = root.LUMI_CONFIG;
  const ROLES = ['BIG','REG','GRAPE','CHERRY','BELL','REPLAY'];
  const mod = (v, n = 24) => ((v % n) + n) % n;
  const clone = x => JSON.parse(JSON.stringify(x));
  const bit = role => 1 << ROLES.indexOf(role);
  function boardAt(positions) {
    return positions.map((p, r) => [0,1,2].map(row => C.strips[r][mod(-Math.round(p) - 1 + row)]));
  }
  function winsAt(positions) {
    const board = boardAt(positions), wins = [];
    C.lines.forEach((line, index) => {
      const a = line.map((row, r) => board[r][row]);
      if (a[0] !== 'STAR' && a[0] === a[1] && a[1] === a[2]) wins.push({ role: a[0], line: index });
    });
    return wins;
  }
  function lineCoordinates(line) {
    return {x1:0,y1:(line[0]+.5)*100-(line[1]-line[0])*50,
      x2:300,y2:(line[2]+.5)*100+(line[2]-line[1])*50};
  }
  let cache, bonusSafety;
  function boards() {
    if (cache) return cache;
    cache = {};
    ['MISS', ...ROLES].forEach(role => { cache[role] = []; });
    for (let a = 0; a < 24; a++) for (let b = 0; b < 24; b++) for (let c = 0; c < 24; c++) {
      const pos = [a,b,c], wins = winsAt(pos);
      let mask = 0; wins.forEach(w => { mask |= bit(w.role); });
      const entry = { pos, wins, mask };
      if (!mask) Object.keys(cache).forEach(role => cache[role].push(entry));
      else ROLES.forEach(role => { if (mask === bit(role)) cache[role].push(entry); });
    }
    return cache;
  }
  function random() {
    try {
      const a = new Uint32Array(1); root.crypto.getRandomValues(a); return a[0] / 4294967296;
    } catch (_) { return Math.random(); }
  }
  function bonusSafe(positions) {
    if (!bonusSafety) {
      const pure = boards().GRAPE.filter(b => b.wins.some(w => w.line === 1));
      const grapes = C.strips.map((strip,r) => Array.from({length:24},(_,p)=>p).filter(p=>boardAt([p,p,p])[r][1]==='GRAPE'));
      const windows = Array.from({length:24},(_,start)=>Array.from({length:C.bonusMaxTravel},(_,d)=>mod(start+d+1)));
      const pairs = [0,1,2].map(last => {
        const others = [0,1,2].filter(r=>r!==last), safe = new Set();
        for(const a of grapes[others[0]]) for(const b of grapes[others[1]]) {
          const entries=pure.filter(e=>e.pos[others[0]]===a&&e.pos[others[1]]===b);
          if(windows.every(w=>w.some(p=>entries.some(e=>e.pos[last]===p)))) safe.add(a*24+b);
        }
        return safe;
      });
      const singles = [0,1,2].map(first => new Set(grapes[first].filter(p=>
        [0,1,2].filter(r=>r!==first).every(second=>windows.every(w=>w.some(q=>{
          const last=3-first-second,others=[0,1,2].filter(r=>r!==last), ps=[0,0,0];ps[first]=p;ps[second]=q;
          return pairs[last].has(ps[others[0]]*24+ps[others[1]]);
        }))))));
      bonusSafety={pairs,singles};
    }
    const stopped=positions.map((p,r)=>p===null?null:r).filter(r=>r!==null);
    if(stopped.length===1)return bonusSafety.singles[stopped[0]].has(mod(positions[stopped[0]]));
    if(stopped.length===2){const last=[0,1,2].find(r=>!stopped.includes(r));return bonusSafety.pairs[last].has(mod(positions[stopped[0]])*24+mod(positions[stopped[1]]));}
    return true;
  }
  function freshStats() {
    return { total: 0, normal: 0, sinceBonus: 0, big: 0, reg: 0, paid: 0, wagered: 0, replay: 0, missedBonus: 0 };
  }
  class Game {
    constructor(options = {}) {
      this.rng = options.rng || random;
      this.events = []; this.time = 0; this.setting = 1; this.credits = C.initialMedals;
      this.slip = C.maxSlip; this.speed = C.speed; this.phase = 'BET'; this.mode = 'NORMAL';
      this.betCount = 0; this.betSource = null; this.lastPayout = 0; this.stats = freshStats();
      this.pending = null; this.lamp = false; this.notice = null; this.role = 'MISS'; this.forced = null;
      this.bonus = null; this.lastBonus = null; this.deadline = null; this.pay = null;
      this.wins = []; this.history = []; this.paused = false; this.message = C.bet + '枚BETで、はじめよう。';
      this.reels = [0,1,2].map((_, r) => ({ p: [4,11,20][r], running: false, stopping: null, target: null }));
      boards();
    }
    emit(type, data = {}) { this.events.push({ type, ...data }); }
    drainEvents() { return this.events.splice(0); }
    canChange() { return !this.paused && this.mode === 'NORMAL' && !this.pending && this.phase === 'BET'; }
    bet() {
      if (this.paused || this.phase !== 'BET' || this.credits < C.bet) return false;
      this.credits -= C.bet; this.betCount = C.bet; this.betSource = 'paid'; this.stats.wagered += C.bet;
      if (this.bonus) this.bonus.net -= C.bet;
      this.phase = 'LEVER'; this.lastPayout = 0; this.wins = [];
      this.message = 'レバーでスタート。'; this.emit('bet'); return true;
    }
    draw(includeBonus) {
      const odds = C.settings[this.setting - 1], n = this.rng(); let threshold = 0;
      for (const role of ROLES) {
        if (!includeBonus && (role === 'BIG' || role === 'REG')) continue;
        threshold += 1 / odds[role]; if (n < threshold) return role;
      }
      return 'MISS';
    }
    lever() {
      if (this.paused || this.phase !== 'LEVER' || this.betCount !== C.bet) return false;
      this.betCount = 0; this.phase = 'SPIN'; this.lastPayout = 0; this.wins = []; this.pay = null;
      this.stats.total++;
      if (this.mode === 'BONUS') this.role = 'GRAPE';
      else {
        this.stats.normal++; this.stats.sinceBonus++;
        let drawn = this.forced ? this.forced.role : this.draw(!this.pending);
        // A dev bonus override cannot create a second pending bonus either.
        if (this.pending && (drawn === 'BIG' || drawn === 'REG')) drawn = 'MISS';
        if (!this.pending && (drawn === 'BIG' || drawn === 'REG')) {
          this.pending = drawn;
          this.notice = this.forced && this.forced.notice !== 'AUTO' ? this.forced.notice :
            (this.rng() < C.announcementBeforeChance ? 'BEFORE' : 'AFTER');
          this.lamp = this.notice === 'BEFORE';
          if (this.lamp) this.emit('notice');
        }
        // Small prizes / replay take priority. A miss permits the held bonus to be aimed.
        this.role = drawn === 'MISS' && this.pending ? this.pending : drawn;
      }
      this.forced = null;
      this.reels.forEach(reel => {
        // Reducing a full strip is visually identical; all subsequent motion remains forward.
        reel.p = mod(reel.p); reel.startP = reel.p; reel.startTime = this.time;
        reel.running = true; reel.stopping = null; reel.target = null;
      });
      this.message = this.mode === 'BONUS' ? 'どのタイミングでも、ぶどうが揃います。' :
        (this.lamp ? (this.role === this.pending ?
          'ランプ点灯！ '+(this.pending==='REG'?'BAR':'7')+' を全リールで狙おう。中段を目安に。' :
          '今回は小役・リプレイ優先。ボーナス当選は持ち越します。') :
          '好きな順番で、リールを止めよう。');
      this.emit('lever'); return true;
    }
    position(reel, time = this.time) {
      if (!reel.running) return reel.p;
      const s = reel.stopping;
      if (!s) return reel.startP + (time - reel.startTime) * this.speed;
      const t = Math.max(0, time - s.at);
      if (t >= s.duration) return s.target;
      if (t <= s.cruise) return s.from + this.speed * t;
      const u = t - s.cruise;
      return s.from + this.speed * s.cruise + this.speed * u - this.speed * u * u / (2 * s.brake);
    }
    optionsFor(index, limit = this.slip) {
      const p = this.position(this.reels[index]);
      const first = Math.floor(p + 1e-8) + 1;
      const last = Math.floor(p + limit + 1e-8);
      const choices = [];
      for (let t = first; t <= last; t++) choices.push(t);
      return choices;
    }
    eligibleBoards() {
      let entries = boards()[this.role];
      if (this.mode === 'BONUS') entries = entries.filter(b => b.wins.some(w => w.line === 1));
      return entries.filter(b => this.reels.every((r, i) => r.target === null || b.pos[i] === mod(r.target)));
    }
    chooseStop(index) {
      // In a bonus, automatic grape centring is intentional and independent of button timing.
      const candidates = this.optionsFor(index, this.mode === 'BONUS' ? C.bonusMaxTravel : this.slip);
      const legal = this.eligibleBoards(); let best = null;
      for (const target of candidates) {
        if (this.mode === 'BONUS') {
          const committed=this.reels.map(r=>r.target);committed[index]=target;
          if(!bonusSafe(committed))continue;
        }
        const choices = legal.filter(b => b.pos[index] === mod(target));
        if (!choices.length) continue;
        const winning = choices.filter(b => b.wins.some(w => w.role === this.role));
        if (this.mode === 'BONUS' && !winning.length) continue;
        // All centre symbols within the slip window must land on the same centre line.
        // Counting possible lines biased outside reels to bottom/top, then the middle
        // reel chose a diagonal whose last symbol had already passed its stop window.
        // Prefer centre, then a horizontal line, then a diagonal; ties stop sooner.
        const lines = new Set(winning.flatMap(b => b.wins.filter(w => w.role === this.role).map(w => w.line)));
        const priority = Math.max(0,...[...lines].map(index=>{
          const line=C.lines[index];
          return line.every(row=>row===1)?3:line.every(row=>row===line[0])?2:1;
        }));
        const rank = (winning.length ? 100 : 0) + priority;
        if (!best || rank > best.rank) best = { target, rank, possibleLines: [...lines] };
        if (this.mode === 'BONUS' && best) break;
      }
      // The shipped strips guarantee a legal result in every 3-cell candidate window.
      if (!best) throw new Error('No legal stop: configuration violates reel-control invariants.');
      return best;
    }
    stop(index) {
      const reel = this.reels[index];
      if (this.paused || this.phase !== 'SPIN' || !reel || !reel.running || reel.stopping) return false;
      const choice = this.chooseStop(index), from = this.position(reel), distance = choice.target - from;
      const brake = Math.min(C.brakeSeconds, 2 * distance / this.speed);
      const cruise = Math.max(0, (distance - this.speed * brake / 2) / this.speed);
      reel.p = from; reel.target = choice.target;
      reel.stopping = { at: this.time, from, target: choice.target, brake, cruise, duration: brake + cruise,
        distance, possibleLines: choice.possibleLines };
      this.emit('stop', { index }); return true;
    }
    advance(seconds) {
      if (this.paused || !Number.isFinite(seconds) || seconds < 0) return;
      this.time += seconds;
      this.reels.forEach(reel => {
        if (!reel.running) return;
        reel.p = this.position(reel);
        if (reel.stopping && this.time >= reel.stopping.at + reel.stopping.duration) {
          reel.p = reel.target; reel.running = false;
        }
      });
      if (this.phase === 'SPIN' && this.reels.every(r => r.target !== null && !r.running)) {
        const settledAt = Math.max(...this.reels.map(r => r.stopping.at + r.stopping.duration));
        this.resolve(settledAt);
      }
      if (this.phase === 'PAY') {
        const due = Math.min(this.pay.amount, Math.max(0, Math.floor((this.time - this.pay.at) / C.coinSeconds + 1e-8)));
        const delta = due - this.pay.delivered;
        if (delta > 0) {
          this.credits += delta; this.stats.paid += delta; this.lastPayout += delta;
          if (this.bonus) this.bonus.net += delta;
          this.pay.delivered = due; this.emit('coins', { count: delta });
        }
        if (due === this.pay.amount) this.finishGame(this.pay.at + this.pay.amount * C.coinSeconds);
      }
      if (this.phase === 'BONUS_INTRO' && this.lamp && this.time >= this.deadline-C.bonusIntroSeconds+C.noticeFlashSeconds) {
        this.lamp=false; this.emit('lampOff');
      }
      if (this.phase === 'BONUS_INTRO' && this.time >= this.deadline) {
        this.phase = 'BET'; this.lamp=false; this.message = 'ボーナス中！ BET → レバー → 3リール停止。'; this.emit('ready');
      }
      if (this.phase === 'BONUS_OUTRO' && this.time >= this.deadline) {
        this.mode = 'NORMAL'; this.bonus = null; this.phase = 'BET'; this.stats.sinceBonus = 0;
        this.message = 'ボーナス終了。次の光を待とう。'; this.emit('bonusEnd');
      }
    }
    resolve(at) {
      this.wins = winsAt(this.reels.map(r => r.p));
      if (this.wins.some(w => w.role !== this.role)) throw new Error('Unauthorised visible prize');
      const justAnnounced = !!this.pending && !this.lamp;
      if (justAnnounced) { this.lamp = true; this.emit('notice'); }
      const won = this.wins.length > 0;
      if (won && (this.role === 'BIG' || this.role === 'REG')) {
        if (this.pending !== this.role) throw new Error('Bonus without pending internal award');
        const type = this.pending; this.pending = null; this.lamp = justAnnounced; this.notice = null;
        this.mode = 'BONUS'; this.bonus = { type, total: C.bonus[type].games, remaining: C.bonus[type].games, net: 0 };
        this.stats[type === 'BIG' ? 'big' : 'reg']++;
        this.phase = 'BONUS_INTRO'; this.deadline = at + C.bonusIntroSeconds;
        this.message = type + ' BONUS！ ' + C.bonus[type].games + 'G スタート。';
        this.record(type); this.emit('bonusStart', { bonusType: type }); return;
      }
      if (won && this.role === 'REPLAY') {
        this.stats.replay++; this.phase = 'LEVER'; this.betCount = C.bet; this.betSource = 'replay';
        this.message = 'REPLAY — メダルを使わず、そのままレバー。'; this.record('REPLAY'); this.emit('replay'); return;
      }
      const amount = won ? C.payouts[this.role] : 0;
      if (this.pending && this.role === this.pending && !won) this.stats.missedBonus++;
      this.record(won ? this.role : 'MISS');
      if (amount > 0) { this.phase = 'PAY'; this.pay = { at, amount, delivered: 0 }; this.message = C.labels[this.role] + '！ +' + amount + '枚'; }
      else this.finishGame(at);
    }
    record(result) {
      this.history.unshift({ game: this.stats.total, result }); this.history.length = Math.min(10, this.history.length);
    }
    finishGame(at) {
      this.pay = null; this.betCount = 0; this.betSource = null;
      if (this.mode === 'BONUS') {
        this.bonus.remaining--;
        if (this.bonus.remaining === 0) {
          this.lastBonus = clone(this.bonus); this.phase = 'BONUS_OUTRO'; this.deadline = at + C.bonusOutroSeconds;
          this.message = this.bonus.type + ' COMPLETE！ 純増 +' + this.bonus.net + '枚'; this.emit('bonusComplete'); return;
        }
        this.message = 'ぶどう +' + C.payouts.GRAPE + '枚。あと ' + this.bonus.remaining + 'G。';
      } else if (this.pending) this.message = (this.pending==='REG'?'BAR':'7')+' の当選は持ち越し。全リールで狙おう。';
      else if (!this.wins.length) this.message = '次のゲームへ。';
      this.phase = 'BET'; this.emit('ready');
    }
    pause() { if (!this.paused) { this.paused = true; this.emit('pause'); } }
    resume() { if (this.paused) { this.paused = false; this.emit('resume'); } }
    refill() {
      if (this.paused || this.phase !== 'BET' || this.credits >= C.bet) return false;
      this.credits += C.initialMedals; this.message = '仮想メダルを ' + C.initialMedals + '枚補充しました。'; this.emit('refill'); return true;
    }
    setSetting(setting) {
      if (!this.canChange() || !Number.isInteger(setting) || setting < 1 || setting > 6) return false;
      this.setting = setting; this.credits = C.initialMedals; this.stats = freshStats(); this.history = [];
      this.lastPayout = 0; this.lastBonus = null; this.wins = []; this.role = 'MISS'; this.forced = null;
      this.message = '設定' + setting + 'で開始。メダルと遊技データをリセットしました。'; this.emit('setting'); return true;
    }
    setControls(slip, speed) {
      if (this.paused || this.phase !== 'BET' || this.mode === 'BONUS') return false;
      if (Number.isInteger(slip) && slip >= C.slipMin && slip <= C.slipMax) this.slip = slip;
      if (Number.isFinite(speed) && speed >= 10 && speed <= 16) this.speed = speed;
      this.emit('controls'); return true;
    }
    devForce(role, notice = 'AUTO') {
      if (!['MISS', ...ROLES].includes(role) || !['AUTO','BEFORE','AFTER'].includes(notice)) return false;
      this.forced = { role, notice }; return true;
    }
    devPosition(index, p) {
      const reel = this.reels[index];
      if (!Number.isFinite(p) || this.phase !== 'SPIN' || !reel || !reel.running || reel.stopping) return false;
      reel.p = p; reel.startP = p; reel.startTime = this.time; return true;
    }
    exportState() {
      const fields = ['time','setting','credits','slip','speed','phase','mode','betCount','betSource','lastPayout','stats','pending','lamp','notice','role','bonus','lastBonus','deadline','pay','wins','history','reels','message'];
      const state = { version: C.version }; fields.forEach(k => { state[k] = clone(this[k]); }); return state;
    }
    restore(state) {
      if (!state || state.version !== C.version) return false;
      if (!Object.keys(this.exportState()).every(k => Object.prototype.hasOwnProperty.call(state,k))) return false;
      const phases = ['BET','LEVER','SPIN','PAY','BONUS_INTRO','BONUS_OUTRO'];
      if (!phases.includes(state.phase) || !['NORMAL','BONUS'].includes(state.mode) ||
          !Number.isInteger(state.credits) || state.credits < 0 || state.credits > 1e10 ||
          !Number.isInteger(state.setting) || state.setting < 1 || state.setting > 6 ||
          !Number.isInteger(state.slip) || state.slip < C.slipMin || state.slip > C.slipMax ||
          !Number.isFinite(state.speed) || state.speed < 10 || state.speed > 16 ||
          !Number.isFinite(state.time) || state.time < 0 || !Array.isArray(state.reels) || state.reels.length !== 3 ||
          !state.reels.every(r => Number.isFinite(r.p) && typeof r.running === 'boolean' && (r.target === null || Number.isFinite(r.target))) ||
          !state.stats || !Object.keys(freshStats()).every(k => Number.isInteger(state.stats[k]) && state.stats[k] >= 0) ||
          ![null,'BIG','REG'].includes(state.pending) || !['MISS',...ROLES].includes(state.role) ||
          !Array.isArray(state.history) || state.history.length > 10 || !Array.isArray(state.wins) ||
          !state.wins.every(w=>ROLES.includes(w.role)&&Number.isInteger(w.line)&&w.line>=0&&w.line<5) ||
          typeof state.lamp !== 'boolean' || ![0,C.bet].includes(state.betCount) || typeof state.message !== 'string') return false;
      if (state.mode === 'BONUS' && (!state.bonus || !['BIG','REG'].includes(state.bonus.type) ||
          !Number.isInteger(state.bonus.remaining) || state.bonus.remaining < 0 || state.bonus.remaining > C.bonus[state.bonus.type].games ||
          !Number.isFinite(state.bonus.net))) return false;
      if (state.phase === 'PAY' && (!state.pay || !Number.isInteger(state.pay.amount) ||
          state.pay.amount < 0 || !Number.isInteger(state.pay.delivered) || state.pay.delivered < 0 || state.pay.delivered > state.pay.amount || !Number.isFinite(state.pay.at))) return false;
      if (state.phase === 'LEVER' && state.betCount !== C.bet) return false;
      if (state.reels.some(r => r.running && (!Number.isFinite(r.startP) || !Number.isFinite(r.startTime))) ||
          state.reels.some(r => r.stopping && !['at','from','target','brake','cruise','duration','distance'].every(k => Number.isFinite(r.stopping[k])))) return false;
      const fields = Object.keys(this.exportState()).filter(k => k !== 'version');
      fields.forEach(k => { this[k] = clone(state[k]); }); this.forced = null; this.events = [];
      this.paused = ['SPIN','PAY','BONUS_INTRO','BONUS_OUTRO'].includes(this.phase); return true;
    }
    snapshot() {
      return { ...this.exportState(), paused: this.paused, forced: clone(this.forced), visible: boardAt(this.reels.map(r => r.p)),
        positions: this.reels.map(r => this.position(r)) };
    }
  }
  const api = { Game, boardAt, winsAt, lineCoordinates, boards, mod, ROLES };
  root.LumiEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);

(function () {
  'use strict';
  const C = window.LUMI_CONFIG, E = window.LumiEngine, $ = id => document.getElementById(id);
  const dev = new URLSearchParams(location.search).get('dev') === '1';
  const storageKey = dev ? 'lumi-reels-dev-v1' : 'lumi-reels-v1';
  let game = new E.Game(), audio = new window.LumiAudio();
  let prefs = { volume: .4, muted: false, aimGuide: false }, saveAvailable = true;
  let lastFrame = performance.now(), uiSignature = '', guideSignature = '', lastDev = 0, fault = false, returnFocus = null;
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (stored && game.restore(stored.game)) {
      if (stored.prefs) {
        prefs.volume = Number.isFinite(stored.prefs.volume) ? Math.max(0,Math.min(1,stored.prefs.volume)) : .4;
        prefs.muted = stored.prefs.muted === true; prefs.aimGuide = stored.prefs.aimGuide === true;
      }
    }
  } catch (_) { saveAvailable = false; }
  audio.setVolume(prefs.volume); audio.setMuted(prefs.muted);
  const sprites = {};
  for (const [role, svg] of Object.entries(window.LUMI_ART)) {
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); sprites[role] = img;
  }
  const canvases = [0,1,2].map(i => $('reel'+i));
  let sizes = [];
  function resize() {
    document.documentElement.style.setProperty('--app-height',window.innerHeight+'px');
    sizes = canvases.map(canvas => {
      const box = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.max(1,Math.round(box.width * ratio)); canvas.height = Math.max(1,Math.round(box.height * ratio));
      return { w: box.width, h: box.height, ratio };
    });
    renderReels();
  }
  function renderReels() {
    canvases.forEach((canvas,r) => {
      const {w,h,ratio} = sizes[r] || {w:100,h:300,ratio:1}, ctx = canvas.getContext('2d');
      if (!ctx || !w || !h) return;
      ctx.setTransform(ratio,0,0,ratio,0,0); ctx.clearRect(0,0,w,h);
      const paper = ctx.createLinearGradient(0,0,w,0);
      paper.addColorStop(0,'#e5e1db'); paper.addColorStop(.18,'#faf7ef'); paper.addColorStop(.8,'#faf7ef'); paper.addColorStop(1,'#e3dfd9');
      ctx.fillStyle = paper; ctx.fillRect(0,0,w,h);
      const p = game.reels[r].p, cell = h/3;
      // For a fixed k, y increases with p: sprites always travel top -> bottom.
      for (let k = Math.floor(p)-2; k <= Math.floor(p)+3; k++) {
        const symbol = C.strips[r][E.mod(-k)], y = (p-k+1)*cell;
        const maxH = cell * .91, maxW = w * .89, imageW = Math.min(maxW,maxH*160/120), imageH = imageW*120/160;
        const img = sprites[symbol];
        if (img && img.complete && img.naturalWidth) ctx.drawImage(img,(w-imageW)/2,y+(cell-imageH)/2,imageW,imageH);
        else { ctx.fillStyle = '#6b527b'; ctx.font = 'bold '+Math.min(24,cell*.3)+'px sans-serif'; ctx.textAlign='center';ctx.fillText(symbol==='BIG'?'7':symbol==='REG'?'BAR':C.labels[symbol],w/2,y+cell*.62); }
      }
      const shade = ctx.createLinearGradient(0,0,0,h);
      shade.addColorStop(0,'#10102038'); shade.addColorStop(.12,'#10102000'); shade.addColorStop(.85,'#10102000'); shade.addColorStop(1,'#10102038');
      ctx.fillStyle=shade;ctx.fillRect(0,0,w,h);ctx.strokeStyle='#bdb9b04a';ctx.lineWidth=1;
      [1,2].forEach(row=>{ctx.beginPath();ctx.moveTo(0,row*cell);ctx.lineTo(w,row*cell);ctx.stroke();});
    });
  }
  function save() {
    try {
      localStorage.setItem(storageKey,JSON.stringify({game:game.exportState(),prefs})); saveAvailable = true;
    } catch (_) { saveAvailable = false; }
    $('saveStatus').textContent = saveAvailable ? '自動保存' : '保存不可・遊技は可能';
  }
  function events() {
    const items = game.drainEvents();
    items.forEach(event => {
      if (['bet','lever','stop','notice','coins','replay'].includes(event.type)) audio.effect(event.type,event.index);
      if (event.type === 'bonusStart') { audio.effect('fanfare'); audio.startBgm(1.4); }
      if (event.type === 'bonusComplete') { audio.stopBgm(); audio.effect('complete'); }
      if (event.type === 'bonusEnd') audio.stopBgm();
    });
    if (items.length) save();
  }
  function syncClock(now = performance.now()) {
    if (!game.paused && !document.hidden && !fault) {
      try { game.advance(Math.max(0,(now-lastFrame)/1000)); events(); }
      catch (error) { fault = true; game.pause(); game.message = '停止制御を安全に停止しました。再読み込みしてください。'; console.error(error); }
    }
    lastFrame = now;
  }
  const phaseNames = {BET:'BET待ち',LEVER:'レバー待ち',SPIN:'回転中',PAY:'払い出し中',BONUS_INTRO:'BONUS開始',BONUS_OUTRO:'BONUS終了'};
  function renderUi(force = false) {
    const sig = JSON.stringify([game.credits,game.phase,game.mode,game.betCount,game.lastPayout,game.lamp,game.setting,game.message,game.stats,game.wins,game.bonus,game.paused,prefs,saveAvailable,game.reels.map(r=>[r.running,!!r.stopping])]);
    if (force || sig !== uiSignature) {
      uiSignature = sig;
      $('credits').textContent = game.credits.toLocaleString('ja-JP'); $('betCount').textContent = game.betCount; $('payout').textContent = game.lastPayout;
      $('totalGames').textContent = game.stats.total.toLocaleString('ja-JP'); $('sinceBonus').textContent = game.stats.sinceBonus;
      $('bigCount').textContent = game.stats.big; $('regCount').textContent = game.stats.reg;
      $('settingBadge').innerHTML = '設定 <b>'+game.setting+'</b>'; $('phaseBadge').textContent = phaseNames[game.phase];
      $('message').textContent = game.message;
      $('betButton').disabled = game.paused || game.phase !== 'BET' || game.credits < C.bet;
      $('lever').disabled = game.paused || game.phase !== 'LEVER';
      [0,1,2].forEach(i=>{ $('stop'+i).disabled=game.paused || game.phase!=='SPIN' || !game.reels[i].running || !!game.reels[i].stopping; });
      $('refill').hidden = !(game.phase==='BET' && game.credits<C.bet);
      const bonusSymbol=game.pending==='REG'?'BAR':'7';
      $('lamp').classList.toggle('lit',game.lamp); $('lamp').setAttribute('aria-label','告知ランプ '+(game.lamp?(game.mode==='BONUS'?'点灯 ボーナス開始':'点灯 '+bonusSymbol+' を3リールで狙う'):'消灯'));
      $('lampCaption').textContent = game.lamp ? (game.mode==='BONUS'?'BONUS!':bonusSymbol+' を狙おう') : 'BONUS SIGNAL';
      const active = game.mode==='BONUS'; $('machine').classList.toggle('bonus',active); $('machine').classList.toggle('reg',active && game.bonus.type==='REG');
      $('bonusPanel').querySelector('.normal-banner').hidden=active; $('bonusPanel').querySelector('.bonus-content').hidden=!active;
      if (active) {
        $('bonusTitle').textContent=game.bonus.type+(game.phase==='BONUS_OUTRO'?' COMPLETE':' BONUS'); $('remaining').textContent=game.bonus.remaining;
        $('bonusNet').textContent=(game.bonus.net>=0?'+':'')+game.bonus.net; $('bonusProgress').style.width=(game.bonus.remaining/game.bonus.total*100)+'%';
      } else $('bonusProgress').style.width='0%';
      const winSet=new Set(game.wins.map(w=>w.line));
      $('lineOverlay').querySelectorAll('path').forEach(p=>p.classList.toggle('active',winSet.has(Number(p.dataset.line))));
      $('winLines').textContent=game.wins.length ? game.wins.map(w=>C.lineNames[w.line]).join('・')+' 成立' :
        game.lamp&&game.phase==='SPIN'&&game.role===game.pending?'中段を目安に '+bonusSymbol+' を狙おう':'横3本 + 斜め2本';
      $('winLines').classList.toggle('won',game.wins.length>0);
      const visible=E.boardAt(game.reels.map(r=>r.p));
      canvases.forEach((canvas,r)=>{ if(!game.reels[r].running) canvas.setAttribute('aria-label',['左','中','右'][r]+'リール：上 '+C.labels[visible[r][0]]+'、中 '+C.labels[visible[r][1]]+'、下 '+C.labels[visible[r][2]]); });
      $('pauseOverlay').hidden=!game.paused; $('pause').setAttribute('aria-label',game.paused?'再開':'一時停止');
      $('mute').textContent=prefs.muted?'×♪':'♪'; $('mute').setAttribute('aria-label',prefs.muted?'音を出す':'消音する');
      $('soundStatus').textContent=prefs.muted?'SOUND OFF':audio.ctx?'SOUND ON':'最初の操作でサウンドON';
      $('saveStatus').textContent=saveAvailable?'自動保存':'保存不可・遊技は可能';
      $('applySetting').disabled=!game.canChange(); $('settingSelect').disabled=!game.canChange();
      const controlsLocked=game.paused || game.phase!=='BET' || game.mode==='BONUS';
      $('slip').disabled=controlsLocked; $('speed').disabled=controlsLocked;
      $('settingLock').textContent=game.canChange()?'適用するとメダルは1,000枚、遊技データは0に戻ります。':'変更できるのは通常時・BET待ち・ボーナス非当選時です。';
      $('oddsTable').querySelectorAll('tr').forEach((tr,i)=>tr.classList.toggle('current',i+1===game.setting));
    }
    const guideKey=JSON.stringify([prefs.aimGuide,game.lamp,game.role,game.pending,game.phase,game.paused,game.reels.map(r=>[Math.floor(r.p),r.target,!!r.stopping])]);
    if(guideKey!==guideSignature){guideSignature=guideKey;[0,1,2].forEach(i=>{
      let aim=false;
      if (prefs.aimGuide && game.lamp && game.role===game.pending && game.phase==='SPIN' && !game.reels[i].stopping) {
        try { aim=game.chooseStop(i).rank>=100; } catch (_) {}
      }
      $('stop'+i).classList.toggle('aim',aim);
    });}
    if (dev && (force || performance.now()-lastDev>140)) {
      lastDev=performance.now();$('devState').textContent=JSON.stringify({...game.snapshot(),release:C.release,
        audio:{state:audio.ctx?audio.ctx.state:'locked',volume:prefs.volume,muted:prefs.muted,bgm:audio.bgm},
        viewport:{width:window.innerWidth,height:window.innerHeight},browser:navigator.userAgent},null,2);
    }
  }
  function action(fn) { syncClock(); audio.unlock(); fn(); events(); renderUi(true); renderReels(); }
  // Stop timing is sampled on pointerdown. The later synthetic click is consumed.
  // Keyboard / accessibility activation still uses click with detail === 0.
  function bindInstant(element,fn) {
    if ('PointerEvent' in window) {
      element.addEventListener('pointerdown',event=>{
        if (event.button!==0 || element.disabled) return;
        event.preventDefault(); action(fn);
      },{passive:false});
      element.addEventListener('click',event=>{event.preventDefault();if(event.detail===0 && !element.disabled)action(fn);});
    } else {
      let touchedAt=-Infinity;
      element.addEventListener('touchstart',event=>{if(element.disabled)return;event.preventDefault();touchedAt=performance.now();action(fn);},{passive:false});
      element.addEventListener('click',event=>{event.preventDefault();if(!element.disabled&&performance.now()-touchedAt>700)action(fn);});
    }
    element.addEventListener('contextmenu',event=>event.preventDefault());
  }
  bindInstant($('betButton'),()=>game.bet());bindInstant($('lever'),()=>game.lever());
  [0,1,2].forEach(i=>bindInstant($('stop'+i),()=>game.stop(i)));bindInstant($('refill'),()=>game.refill());
  // Some iOS releases accept audio activation on touchend/click rather than pointerdown.
  // These handlers unlock audio only; all game actions remain single-dispatch.
  ['pointerup','touchend','click'].forEach(type=>document.addEventListener(type,()=>{
    if(!document.hidden&&!game.paused)audio.unlock();
  },{capture:true,passive:true}));
  function pause() { syncClock(); game.pause(); audio.suspend(); events(); renderUi(true); }
  function resume() {
    lastFrame=performance.now(); audio.resume(); game.resume();
    if(game.mode==='BONUS'&&game.phase!=='BONUS_OUTRO') audio.startBgm(game.phase==='BONUS_INTRO'?Math.max(0,game.deadline-game.time):0);
    events(); renderUi(true);
  }
  $('resumeButton').addEventListener('click',resume);$('pause').addEventListener('click',()=>game.paused?resume():pause());
  $('mute').addEventListener('click',()=>action(()=>{prefs.muted=!prefs.muted;audio.setMuted(prefs.muted);save();}));
  function openModal(id) {
    returnFocus=document.activeElement;$(id).hidden=false;
    if(id==='settingsModal') {
      $('volume').value=Math.round(prefs.volume*100);$('volumeValue').textContent=Math.round(prefs.volume*100)+'%';$('aimGuide').checked=prefs.aimGuide;
      $('slip').value=game.slip;$('slipValue').textContent=game.slip+'コマ';$('speed').value=game.speed;$('speedValue').textContent=game.speed+'コマ/秒';$('settingSelect').value=game.setting;
    }
    renderUi(true); $(id).querySelector('[data-close]').focus();
  }
  function closeModal(id) {$(id).hidden=true;if(returnFocus&&returnFocus.focus)returnFocus.focus();}
  $('helpOpen').addEventListener('click',()=>openModal('helpModal'));$('settingsOpen').addEventListener('click',()=>openModal('settingsModal'));
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.dataset.close)));
  ['helpModal','settingsModal'].forEach(id=>$(id).addEventListener('click',event=>{if(event.target===$(id))closeModal(id);}));
  $('volume').addEventListener('input',()=>{audio.unlock();prefs.volume=Number($('volume').value)/100;audio.setVolume(prefs.volume);$('volumeValue').textContent=Math.round(prefs.volume*100)+'%';save();});
  $('aimGuide').addEventListener('change',()=>{prefs.aimGuide=$('aimGuide').checked;save();renderUi(true);});
  ['slip','speed'].forEach(id=>$(id).addEventListener('input',()=>action(()=>{game.setControls(Number($('slip').value),Number($('speed').value));$('slipValue').textContent=game.slip+'コマ';$('speedValue').textContent=game.speed+'コマ/秒';})));
  $('applySetting').addEventListener('click',()=>action(()=>{if(game.setSetting(Number($('settingSelect').value)))closeModal('settingsModal');}));
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape') {['helpModal','settingsModal'].forEach(closeModal);return;}
    const modal=['helpModal','settingsModal'].find(id=>!$(id).hidden);
    if(modal || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) || event.repeat)return;
    const key=event.key.toLowerCase();
    const f={b:()=>game.bet(),' ':()=>game.lever(),enter:()=>game.lever(),'1':()=>game.stop(0),'2':()=>game.stop(1),'3':()=>game.stop(2)}[key];
    if(f){event.preventDefault();action(f);}else if(key==='p'){event.preventDefault();game.paused?resume():pause();}else if(key==='m'){prefs.muted=!prefs.muted;audio.setMuted(prefs.muted);save();renderUi(true);}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else{lastFrame=performance.now();renderUi(true);}});
  window.addEventListener('pagehide',pause);window.addEventListener('pageshow',()=>{lastFrame=performance.now();resize();renderUi(true);});
  window.addEventListener('resize',resize);window.addEventListener('orientationchange',()=>requestAnimationFrame(resize));
  if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);
  if(window.ResizeObserver)new ResizeObserver(resize).observe($('reelWindow'));
  $('betButton').querySelector('span').textContent=C.bet+'枚';
  $('buildVersion').textContent='VIRTUAL MEDALS · v'+C.release;
  $('lineOverlay').querySelectorAll('path').forEach(path=>{
    const line=E.lineCoordinates(C.lines[Number(path.dataset.line)]);
    path.setAttribute('d','M'+line.x1+' '+line.y1+'L'+line.x2+' '+line.y2);
  });
  $('helpModal').querySelector('.intro').textContent=C.bet+'枚BET → レバー → 左・中・右を好きな順番で停止。';
  const netPerGame=C.payouts.GRAPE-C.bet;
  $('bonusRules').textContent='ボーナス中は目押し不要。BIG '+C.bonus.BIG.games+'G／REG '+C.bonus.REG.games+'G、毎ゲーム'+C.bet+'枚BETでぶどう'+C.payouts.GRAPE+'枚。全ゲーム完走でBIG純増'+(C.bonus.BIG.games*netPerGame)+'枚、REG純増'+(C.bonus.REG.games*netPerGame)+'枚です。';
  $('oddsTable').innerHTML=C.settings.map((s,i)=>'<tr><td>'+(i+1)+'</td><td>1/'+s.BIG+'</td><td>1/'+s.REG+'</td><td>1/'+(1/(1/s.BIG+1/s.REG)).toFixed(1)+'</td>'+['GRAPE','CHERRY','BELL','REPLAY'].map(role=>'<td>1/'+s[role]+'</td>').join('')+'</tr>').join('');
  $('prizeList').innerHTML=['BIG','REG','GRAPE','CHERRY','BELL','REPLAY'].map(role=>'<div><img alt="'+C.labels[role]+'" src="'+sprites[role].src+'"><small>'+C.labels[role]+' '+(role==='BIG'||role==='REG'?C.bonus[role].games+'G':role==='REPLAY'?'再遊技':C.payouts[role]+'枚')+'</small></div>').join('');
  if(dev) {
    $('devPanel').hidden=false;
    $('forceApply').addEventListener('click',()=>action(()=>{game.devForce($('forceRole').value,$('forceNotice').value);$('devNote').textContent='次のレバー：'+C.labels[$('forceRole').value]+' / '+$('forceNotice').value;}));
    [0,1,2].forEach(i=>{
      const wrapper=document.createElement('div');wrapper.innerHTML='<label>'+['左','中','右'][i]+'位置<input id="devPos'+i+'" type="number" value="0" step="0.05"></label><button id="devSet'+i+'">位置を適用</button><button id="devAim'+i+'">内部役を狙って停止</button><button id="devMiss'+i+'">取りこぼして停止</button>';
      $('devReels').appendChild(wrapper);
      $('devSet'+i).addEventListener('click',()=>action(()=>game.devPosition(i,Number($('devPos'+i).value))));
      $('devAim'+i).addEventListener('click',()=>action(()=>{
        const idx=C.strips[i].indexOf(game.role);if(idx<0)return;
        const target=E.mod(-idx);game.devPosition(i,target-.5);game.stop(i);
      }));
      $('devMiss'+i).addEventListener('click',()=>action(()=>{
        if(game.mode==='BONUS'){$('devNote').textContent='ボーナス中は取りこぼしません。';return;}
        for(let p=0;p<24;p++){
          if(!game.devPosition(i,p+.37))return;
          if(game.chooseStop(i).rank<100){game.stop(i);return;}
        }
      }));
    });
    $('devAdvance').addEventListener('click',()=>action(()=>game.advance(2)));
    $('devReset').addEventListener('click',()=>{audio.stopBgm();game=new E.Game();fault=false;lastFrame=performance.now();save();renderUi(true);});
    $('devSuite').addEventListener('click',()=>{
      $('devResults').hidden=false;$('devResults').textContent='検証中…';$('devSuite').disabled=true;
      setTimeout(()=>{
        try{const result=window.LumiQA.run();$('devResults').textContent=JSON.stringify(result,null,2);}catch(error){$('devResults').textContent='FAIL '+error.stack;}
        finally{$('devSuite').disabled=false;}
      },60);
    });
    // Exposed only with ?dev=1; never present during ordinary play.
    window.LumiDev={snapshot:()=>game.snapshot(),force:(role,notice)=>game.devForce(role,notice),getGame:()=>game};
  }
  if(game.mode==='BONUS'&&!game.paused)audio.startBgm();
  resize(); renderUi(true); save();
  function frame(now) {syncClock(now);renderReels();renderUi();audio.pump();requestAnimationFrame(frame);}
  requestAnimationFrame(frame);
})();

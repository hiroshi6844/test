/* In-page integration runner: deliberately separate from normal play. */
const frame=document.getElementById('play'),checks=document.getElementById('checks');
const tick=(w,n=2)=>new Promise(resolve=>{function next(){if(--n<=0)resolve();else w.requestAnimationFrame(next);}w.requestAnimationFrame(next);});
const assert=(condition,message)=>{if(!condition)throw Error(message);};
let passed=0,failed=0;
async function check(name,fn){const row=document.createElement('li');checks.append(row);try{await fn();row.textContent='PASS — '+name;row.className='pass';passed++;}catch(e){row.textContent='FAIL — '+name+' / '+e.message;row.className='fail';failed++;}}
function pointer(w,id,event,pid,x,y){w.document.getElementById(id).dispatchEvent(new w.PointerEvent(event,{bubbles:true,cancelable:true,pointerId:pid,pointerType:'touch',isPrimary:pid===11,clientX:x,clientY:y,buttons:event==='pointerup'?0:1}));}
function pixelCount(q){q.renderer.render(q.game,null,false,false);const gl=q.renderer.gl,w=q.renderer.width,h=q.renderer.height;let pixels;if(gl){pixels=new Uint8Array(w*h*4);gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,pixels);}else pixels=q.renderer.ctx.getImageData(0,0,w,h).data;const colors=new Set();for(let i=0;i<pixels.length;i+=400)colors.add(pixels[i]+','+pixels[i+1]+','+pixels[i+2]);return {colors:colors.size,error:gl?gl.getError():0};}
frame.addEventListener('load',()=>{document.getElementById('summary').textContent=frame.contentWindow.gameReady?'準備完了。実行ボタンを押してください。':'読み込み確認中';});
document.getElementById('run').addEventListener('click',async()=>{
 const run=document.getElementById('run');run.disabled=true;checks.innerHTML='';passed=failed=0;
 const w=frame.contentWindow,d=w.document,q=w.echoQA,previousSettings=w.localStorage.getItem('echo-hunt-settings');const by=id=>d.getElementById(id);
 if(!q){document.getElementById('summary').textContent='ゲームが読み込まれていません。';run.disabled=false;return;}
 await check('タイトル・3D描画・キャラクターの準備',()=>{assert(w.gameReady,'ready=false');assert(q.game.actors.length===8,'participants');assert(by('errorPanel').hidden,by('errorText').textContent);});
 await check('開始ボタンで人間としてゲーム開始・音声有効化',async()=>{d.querySelector('[data-role="human"]').click();by('start').click();await tick(w,5);assert(q.mode==='playing','mode');assert(q.game.actors[0].role==='human','role');assert(q.audio.ctx?.state==='running','audio='+q.audio.ctx?.state);});
 await check('ゲームの画面が単色ではなく描画エラーもない',()=>{const p=pixelCount(q);assert(p.colors>20,'colors='+p.colors);assert(p.error===0,'gl='+p.error);});
 await check('横向きスマートフォンの画面サイズとタッチボタン',async()=>{frame.width=844;frame.height=390;await tick(w,5);assert(by('world').width===844,'render width');assert(w.getComputedStyle(by('joystick')).display!=='none','joystick');assert(by('attackBtn').getBoundingClientRect().bottom<390,'attack clipped');});
 await check('移動・視点・攻撃の3指同時操作',async()=>{
  q.game.actors[0].cooldown=0;const p=q.game.actors[0],old={x:p.x,z:p.z,yaw:p.yaw},r=by('joystick').getBoundingClientRect();
  pointer(w,'joystick','pointerdown',11,r.left+r.width/2,r.top+10);pointer(w,'lookZone','pointerdown',12,450,170);pointer(w,'lookZone','pointermove',12,500,160);pointer(w,'attackBtn','pointerdown',13,800,280);
  await tick(w,12);assert(q.input.joyY>.5&&q.input.attack,'combined inputs');assert(p.yaw!==old.yaw,'look');assert(Math.hypot(p.x-old.x,p.z-old.z)>.01,'movement');assert(q.game.metrics.shots>0,'shoot');assert(by('errorPanel').hidden,by('errorText').textContent);
 });
 await check('pointercancel・pointerupで押しっぱなしを解除',()=>{pointer(w,'joystick','pointercancel',11,0,0);pointer(w,'lookZone','pointerup',12,0,0);pointer(w,'attackBtn','pointerup',13,0,0);assert(q.input.joyY===0&&!q.input.attack,'stuck input');});
 await check('リロード・武器切替ボタン',()=>{const p=q.game.actors[0];pointer(w,'reloadBtn','pointerdown',14,0,0);assert(p.reload>0,'reload');pointer(w,'reloadBtn','pointerup',14,0,0);pointer(w,'weaponBtn','pointerdown',15,0,0);assert(p.weapon===1,'weapon');pointer(w,'weaponBtn','pointerup',15,0,0);});
 await check('縦画面へのサイズ変更で入力解除・描画継続',async()=>{q.input.attack=true;frame.width=390;frame.height=844;await tick(w,4);assert(!q.input.attack,'resize release');assert(q.renderer.width===390&&q.renderer.height===844,'render size');assert(!by('rotateHint').hidden,'rotate guide');});
 await check('画面回転・一時停止・再開',async()=>{w.dispatchEvent(new w.Event('orientationchange'));assert(q.mode==='paused','rotate pause');by('resume').click();await tick(w,3);assert(q.mode==='playing','resume');});
 await check('タブのフォーカス喪失と復帰で固着しない',async()=>{q.input.attack=true;w.dispatchEvent(new w.Event('blur'));assert(q.mode==='paused'&&!q.input.attack,'blur');w.dispatchEvent(new w.Event('pageshow'));by('resume').click();await tick(w,3);assert(q.mode==='playing','restore');});
 await check('ヒドゥン開始・ナイトビジョン切替',async()=>{q.home();d.querySelector('[data-role="hidden"]').click();by('start').click();frame.width=844;frame.height=390;await tick(w,5);assert(q.game.actors[0].role==='hidden','hidden role');assert(!by('visionBtn').hidden,'vision button');pointer(w,'visionBtn','pointerdown',16,0,0);await tick(w,2);assert(w.echoDiagnostics().night,'night');pointer(w,'visionBtn','pointerup',16,0,0);});
 await check('制限時間終了から結果画面へ遷移',()=>{q.game.time=q.game.cfg.duration-.005;q.game.update(1/60);q.events();assert(q.mode==='ended'&&!by('resultPanel').hidden,'result');assert(by('resultScores').querySelectorAll('tbody tr').length===8,'ranking');});
 await check('結果から再プレイしてスコア・死亡数をリセット',async()=>{by('replay').click();await tick(w,3);assert(q.mode==='playing','replay');assert(q.game.actors.every(a=>a.score===0&&a.deaths===0),'reset');assert(q.game.actors.filter(a=>a.alive&&a.role==='hidden').length===1,'one hidden');});
 await check('再プレイを繰り返しても描画ループが1本',async()=>{for(let i=0;i<3;i++){by('start').click();await tick(w,2);}let previous=q.renderer.frames,sum=0;for(let i=0;i<6;i++){await tick(w,1);const delta=q.renderer.frames-previous;assert(delta<=1,'multiple renders='+delta);sum+=delta;previous=q.renderer.frames;}assert(sum>=4,'render stopped');});
 await check('追加ルールの設定保存と新試合への反映',async()=>{q.home();by('settingsOpen').click();for(const id of ['flashlight','supplies','traitor']){by(id).checked=true;by(id).dispatchEvent(new w.Event('change'));}d.querySelector('#settingsPanel [data-close]').click();by('start').click();await tick(w,3);assert(q.game.cfg.supplies&&q.game.cfg.flashlight&&q.game.cfg.traitor,'rules');assert(q.game.actors.filter(a=>a.role==='traitor').length===1,'traitor');});
 await check('PCのWASD・Space・R・Qとキー解除',async()=>{
  q.home();d.querySelector('[data-role="human"]').click();by('start').click();await tick(w,3);
  const p=q.game.actors[0],old={x:p.x,z:p.z,weapon:p.weapon};
  const key=(type,code)=>d.dispatchEvent(new w.KeyboardEvent(type,{code,key:code,bubbles:true,cancelable:true}));
  key('keydown','KeyW');key('keydown','Space');await tick(w,12);key('keyup','KeyW');key('keyup','Space');
  assert(Math.hypot(p.x-old.x,p.z-old.z)>.03,'W movement');assert(p.y>.05,'Space jump');
  p.ammo[p.weapon]=1;key('keydown','KeyR');key('keyup','KeyR');assert(p.reload>0,'R reload');
  key('keydown','KeyQ');key('keyup','KeyQ');assert(p.weapon!==(old.weapon),'Q switch');assert(q.keys.size===0&&!q.input.jump,'key release');
 });
 await check('1フレームより短い攻撃タップでも1発を発射',()=>{
  const p=q.game.actors[0];p.reload=0;p.cooldown=0;const before=p.ammo[p.weapon];pointer(w,'attackBtn','pointerdown',31,0,0);pointer(w,'attackBtn','pointerup',31,0,0);assert(p.ammo[p.weapon]===before-1,'short tap was dropped');assert(!q.input.attack,'tap stuck');
 });
 await check('人物表示・透明輪郭・透明度による実際の画素変化',()=>{
  q.pause();const g=q.game,p=g.actors[0],ally=g.actors[1],hidden=g.actors[2];for(const a of g.actors)a.alive=false;
  Object.assign(p,{alive:true,role:'human',x:2,y:0,z:18,yaw:0,pitch:0,moving:false,reload:0,lastShot:-10});
  g.hiddenId=2;Object.assign(ally,{role:'human',x:2,y:0,z:13,yaw:Math.PI,moving:false});Object.assign(hidden,{role:'hidden',x:5,y:0,z:13,yaw:Math.PI,moving:false,cloak:1,reveal:0});
  const image=()=>{q.renderer.render(g,null,false,false);if(!q.renderer.gl)return new Uint8Array(q.renderer.ctx.getImageData(0,0,q.renderer.width,q.renderer.height).data);const pixels=new Uint8Array(q.renderer.width*q.renderer.height*4);q.renderer.gl.readPixels(0,0,q.renderer.width,q.renderer.height,q.renderer.gl.RGBA,q.renderer.gl.UNSIGNED_BYTE,pixels);return pixels;};
  const changed=(a,b)=>{let count=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])count++;return count;};
  const empty=image();ally.alive=true;const human=image();assert(changed(empty,human)>500,'human model missing');
  hidden.alive=true;const cloaked=image();assert(changed(human,cloaked)>100,'cloaked model missing');hidden.cloak=0;const faded=image();assert(changed(cloaked,faded)>500,'opacity did not affect visible pixels');
 });
 await check('読み込みエラーに原因を表示',()=>{w.showFatal('QA: bundle.js 読み込み失敗の表示確認');assert(!by('errorPanel').hidden&&by('errorText').textContent.includes('bundle.js'),'error screen');by('errorPanel').hidden=true;});
 q.home();if(previousSettings===null)w.localStorage.removeItem('echo-hunt-settings');else w.localStorage.setItem('echo-hunt-settings',previousSettings);
 document.getElementById('summary').textContent=`完了: ${passed} PASS / ${failed} FAIL\nBrowser: ${navigator.userAgent}\n描画方式: ${q.renderer.kind}\n描画・音声・合成タッチ検証。iOS実機とSafari実機は未確認。`;
 run.disabled=false;
});

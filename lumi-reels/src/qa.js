/* Same real-engine tests run in Node and in the browser's hidden development panel. */
(function (root) {
  'use strict';
  function run() {
    const C=root.LUMI_CONFIG,E=root.LumiEngine,Game=E.Game;
    let assertions=0,cases=0,maxBonusTravel=0;const tests=[];
    const assert=(ok,message)=>{assertions++;if(!ok)throw new Error(message);};
    const equal=(a,b,message)=>assert(JSON.stringify(a)===JSON.stringify(b),message+' | '+JSON.stringify(a)+' != '+JSON.stringify(b));
    const near=(a,b,message)=>assert(Math.abs(a-b)<1e-7,message);
    const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
    let seed=20519;const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
    function test(name,fn){fn();tests.push({name,status:'PASS'});}
    function newSpin(role,notice='BEFORE') {const g=new Game({rng:()=>.9});g.devForce(role,notice);assert(g.bet(),'BET');assert(g.lever(),'LEVER');return g;}
    function aim(g,index) {
      const winner=g.eligibleBoards().find(b=>b.wins.some(w=>w.role===g.role));
      if(winner)g.devPosition(index,winner.pos[index]-1.4);else g.devPosition(index,.35);
      assert(g.stop(index),'aim stop');
    }
    function miss(g,index) {
      for(let p=0;p<24;p++) {
        g.devPosition(index,p+.37);
        if(g.chooseStop(index).rank<100){assert(g.stop(index),'miss stop');return;}
      }
      throw new Error('No miss window');
    }
    function complete(g,order,aimed=true) {
      order.forEach(i=>{if(aimed)aim(g,i);else{g.advance(rng()*.27);assert(g.stop(i),'free timing stop');maxBonusTravel=Math.max(maxBonusTravel,g.reels[i].stopping.distance);}g.advance(.02);});
      g.advance(3);
    }
    test('BET不足・連打・単独停止・レバー抽選は1回',()=>{
      let calls=0;const g=new Game({rng:()=>{calls++;return .99;}});
      assert(!g.lever(),'no wager cannot spin');g.credits=2;assert(!g.bet(),'not enough medals');g.credits=1000;
      assert(g.bet(),'bet once');equal(g.credits,997,'bet consumes 3');assert(!g.bet(),'double bet blocked');assert(g.lever(),'lever once');equal(calls,1,'one draw');
      for(let i=0;i<30;i++){assert(!g.bet(),'spin bet blocked');assert(!g.lever(),'spin lever blocked');}
      assert(g.stop(1),'centre accepted');assert(!g.stop(1),'double stop blocked');assert(g.reels[0].running&&g.reels[2].running,'other reels still running');equal(calls,1,'stops do not redraw');
      g.advance(.7);assert(!g.reels[1].running,'centre stopped');assert(g.reels[0].running&&g.reels[2].running,'other reels keep spinning');g.stop(2);g.stop(0);g.advance(2);equal(g.phase,'BET','normal game ends');cases++;
    });
    test('BIG・REG目押し成功：全6停止順と全設定',()=>{
      ['BIG','REG'].forEach(role=>orders.forEach(order=>{for(let setting=1;setting<=6;setting++){
        const g=new Game({rng:()=>.9});g.setSetting(setting);g.devForce(role,'BEFORE');g.bet();g.lever();assert(g.lamp,'pre-notice lamp on');complete(g,order);
        equal(g.mode,'BONUS','bonus starts');equal(g.bonus.type,role,'correct bonus');equal(g.bonus.remaining,C.bonus[role].games,'initial games');equal(g.credits,997,'no lump-sum award');equal(g.stats[role==='BIG'?'big':'reg'],1,'one bonus');cases++;
      }}));
    });
    test('中段目押しの回帰検証：全停止順・全滑り幅・混在する押下位置',()=>{
      // Aim by the actual strip's middle-row position, never by the controller's chosen board.
      // All three centre symbols are physically reachable in these independent stop windows.
      for(const role of ['BIG','REG'])for(const order of orders)for(const slip of [3,4,5,6]) {
        const offsets=[-slip+.05,-2.1,-.5,-.05];
        for(let variant=0;variant<64;variant++) {
          const g=new Game({rng:()=>.9});g.setControls(slip,[10,13.5,16][variant%3]);
          g.devForce(role,'BEFORE');g.bet();g.lever();
          order.forEach(index=>{
            const centre=E.mod(-C.strips[index].indexOf(role));
            const offset=offsets[(variant>>(index*2))&3];
            g.devPosition(index,centre+offset);assert(g.stop(index),'independent centre aim accepted');
            assert(g.reels[index].stopping.distance<=slip+1e-8,'no enlarged slip to rescue centre aim');
            g.advance(.02);
          });
          g.advance(3);
          equal(g.mode,'BONUS','reachable centre aim must win: '+role+' / '+order.join('')+' / '+slip+' / '+variant);
          assert(g.wins.some(w=>w.role===role&&w.line===1),'all independently aimed reels meet on the centre line');
          equal(E.boardAt(g.reels.map(r=>r.p)).map(b=>b[1]),[role,role,role],'visible centre symbols agree');cases++;
        }
      }
      for(const role of ['BIG','REG'])for(const order of orders) {
        const late=newSpin(role);
        order.forEach(index=>{
          late.devPosition(index,E.mod(-C.strips[index].indexOf(role))+.05);late.stop(index);late.advance(.02);
        });late.advance(3);
        equal(late.mode,'BONUS','just-passed centre is caught on the bottom horizontal line');
        assert(late.wins.some(w=>w.line===2),'no backwards snap to the passed centre');cases++;
        for(const missed of [0,1,2]) {
          const g=newSpin(role);
          order.forEach(index=>{
            const centre=E.mod(-C.strips[index].indexOf(role));
            // Once below the bottom row, the single bonus symbol cannot return within 4 cells.
            g.devPosition(index,centre+(index===missed?1.05:-.5));g.stop(index);g.advance(.02);
          });g.advance(3);
          equal(g.mode,'NORMAL','one independently mistimed reel must not auto-align');
          equal(g.pending,role,'real mistiming carries the bonus');assert(g.lamp,'real mistiming keeps the lamp');cases++;
        }
      }
    });
    test('全3リールそれぞれの取りこぼし・持ち越し：全6停止順',()=>{
      ['BIG','REG'].forEach(role=>orders.forEach(order=>[0,1,2].forEach(missed=>{
        const g=newSpin(role);
        order.forEach(i=>{i===missed?miss(g,i):aim(g,i);g.advance(.02);});g.advance(2);
        equal(g.mode,'NORMAL','single reel miss prevents bonus');equal(g.pending,role,'award carried');assert(g.lamp,'lamp carried');equal(g.stats.missedBonus,1,'miss counted');equal(g.credits,997,'miss gives no award');
        g.devForce('MISS');g.bet();g.lever();equal(g.role,role,'held bonus remains target');complete(g,order);equal(g.mode,'BONUS','next aimed spin begins bonus');equal(g.credits,994,'next bet only');cases++;
      })));
    });
    test('先告知・後告知・重複当選防止・持ち越し中の小役優先',()=>{
      ['BEFORE','AFTER'].forEach(notice=>{
        const g=newSpin('BIG',notice);equal(g.lamp,notice==='BEFORE','timing before stops');miss(g,0);aim(g,1);g.advance(.8);equal(g.lamp,notice==='BEFORE','not before third stop');aim(g,2);g.advance(1);assert(g.lamp,'after third lit');equal(g.pending,'BIG','held');cases++;
      });
      const g=newSpin('BIG');miss(g,0);aim(g,1);aim(g,2);g.advance(2);
      g.devForce('REG');g.bet();g.lever();equal(g.pending,'BIG','not duplicated');equal(g.role,'BIG','second bonus force ignored');miss(g,0);aim(g,1);aim(g,2);g.advance(2);
      g.devForce('GRAPE');g.bet();g.lever();equal(g.role,'GRAPE','small prize priority');complete(g,[2,0,1]);equal(g.pending,'BIG','small prize preserves bonus');assert(g.lamp,'lamp retained');equal(g.lastPayout,8,'small payout');equal(g.mode,'NORMAL','small prize cannot begin bonus');cases++;
      const postWin=newSpin('BIG','AFTER');[0,1,2].forEach(i=>aim(postWin,i));
      const settled=Math.max(...postWin.reels.map(r=>r.stopping.at+r.stopping.duration));postWin.advance(settled-postWin.time+1e-6);
      equal(postWin.mode,'BONUS','post-notice winning spin begins bonus');assert(postWin.lamp,'post-notice success still visibly lights lamp');
      postWin.advance(C.noticeFlashSeconds/2);assert(postWin.lamp,'notice flash is retained');postWin.advance(C.noticeFlashSeconds/2+.001);assert(!postWin.lamp,'bonus lamp clears after visible flash');cases++;
    });
    test('経過時間・滑り上限・速度連続・単調減速・前向き停止',()=>{
      const a=newSpin('MISS'),b=newSpin('MISS');a.advance(1.5);for(let i=0;i<180;i++)b.advance(1/120);
      a.reels.forEach((r,i)=>near(r.p,b.reels[i].p,'same position at 120fps'));equal(a.role,b.role,'draw unaffected by frames');
      for(const slip of [3,4,5,6])for(const fraction of [.001,.1,.3,.6,.999]) {
        const g=new Game({rng:()=>.99});g.setControls(slip,13.5);g.bet();g.lever();g.devPosition(0,12+fraction);g.stop(0);const s=g.reels[0].stopping;
        assert(s.distance>0&&s.distance<=slip+1e-8,'bounded forward travel');assert(s.duration<=slip/g.speed+C.brakeSeconds/2+1e-8,'short stop duration');
        let last=s.from,lastV=g.speed;
        for(let step=1;step<=120;step++) {
          const t=s.duration*step/120,p=g.position(g.reels[0],s.at+t),v=(p-last)/(s.duration/120);
          assert(p>=last-1e-9,'never reverse');assert(v<=g.speed+1e-7,'never accelerate above cruise');assert(v<=lastV+1e-7,'nonincreasing velocity');last=p;lastV=v;
        }
        near(last,s.target,'exact continuous landing');
        const epsilon=Math.min(1e-7,s.brake/100),expected=g.speed*(s.cruise>=epsilon?1:1-epsilon/(2*s.brake));
        assert(Math.abs((g.position(g.reels[0],s.at+epsilon)-s.from)/epsilon-expected)<1e-5,'button-edge velocity continuous');cases++;
      }
    });
    test('全5ラインの図柄・判定・払い出し、リプレイの無料BET',()=>{
      // Independent renderer geometry: top / middle / bottom are at y = (p-k+1)*cell.
      for(let p=0;p<24;p++)for(let r=0;r<3;r++)for(let row=0;row<3;row++){
        const spriteK=p+1-row,drawn=C.strips[r][E.mod(-spriteK)];
        equal(E.boardAt([p,p,p])[r][row],drawn,'canvas geometry and judged row agree');
      }
      C.lines.forEach(line=>{
        const path=E.lineCoordinates(line);
        line.forEach((row,r)=>near(path.y1+(path.y2-path.y1)*(r+.5)/3,(row+.5)*100,'payline passes through actual symbol centre'));
      });
      const all=Object.values(E.boards()).flat();
      for(let line=0;line<5;line++) {
        const fixture=all.find(b=>b.wins.some(w=>w.role==='BIG'&&w.line===line));assert(!!fixture,'five-line fixture exists');
        const visual=E.boardAt(fixture.pos);assert(C.lines[line].every((row,r)=>visual[r][row]==='BIG'),'visible 7 matches judged line');equal(E.winsAt(fixture.pos),fixture.wins,'judgement same board');cases++;
      }
      for(const role of ['BIG','REG'])for(let line=0;line<5;line++) {
        const g=newSpin(role),order=line===4?[1,0,2]:[0,1,2];
        order.forEach(index=>{
          const row=C.lines[line][index],target=E.mod(-C.strips[index].indexOf(role))+row-1;
          g.devPosition(index,target+(row===0?-g.slip+.05:-.05));
          assert(g.stop(index),'actual five-line stop');g.advance(.02);
        });g.advance(3);
        equal(g.mode,'BONUS','five-line control starts bonus');
        assert(g.wins.some(w=>w.role===role&&w.line===line),'actual control preserves each of the five paylines');cases++;
      }
      ['GRAPE','CHERRY','BELL','REPLAY'].forEach(role=>orders.forEach(order=>{
        const g=newSpin(role);complete(g,order);assert(g.wins.every(w=>w.role===role),'only internal prize visible');assert(g.wins.length>0,'aimed small prize wins');
        const visual=E.boardAt(g.reels.map(r=>r.p));g.wins.forEach(w=>assert(C.lines[w.line].every((row,r)=>visual[r][row]===role),'line symbols match payout'));
        equal(g.lastPayout,C.payouts[role],'right payout');equal(g.credits,997+C.payouts[role],'right medals');
        if(role==='REPLAY'){equal(g.phase,'LEVER','replay prebet');equal(g.betCount,3,'free bet');assert(!g.bet(),'no second payment');g.devForce('MISS');assert(g.lever(),'replay lever');equal(g.credits,997,'no extra medals spent');}
        cases++;
      }));
    });
    test('ボーナス全G・全停止順・タイミング不問・最終払い出し先行',()=>{
      ['BIG','REG'].forEach(role=>orders.forEach(order=>{
        const g=newSpin(role);complete(g,order);equal(g.phase,'BET','intro finished');const start=g.credits;
        for(let n=0;n<C.bonus[role].games;n++) {
          equal(g.bonus.remaining,C.bonus[role].games-n,'remaining before bet');g.bet();g.lever();equal(g.role,'GRAPE','every bonus outcome grape');
          order.forEach(i=>{g.advance(rng()*.21);assert(g.stop(i),'any timing bonus stop');maxBonusTravel=Math.max(maxBonusTravel,g.reels[i].stopping.distance);assert(g.reels[i].stopping.distance<=C.bonusMaxTravel+1e-8,'bonus stop travel also bounded');g.advance(.01);});
          const settle=Math.max(...g.reels.map(r=>r.stopping.at+r.stopping.duration));g.advance(Math.max(0,settle-g.time)+1e-6);
          equal(g.phase,'PAY','payout begins');equal(g.lastPayout,0,'no instant full payout');assert(g.wins.some(w=>w.role==='GRAPE'&&w.line===1),'centre grapes without aim');
          g.advance(C.coinSeconds*C.payouts.GRAPE-0.0002);equal(g.lastPayout,7,'last medal not delivered yet');equal(g.bonus.remaining,C.bonus[role].games-n,'game not decremented early');
          g.advance(.0003);equal(g.lastPayout,8,'all eight delivered');equal(g.bonus.remaining,C.bonus[role].games-n-1,'decrement after final coin');cases++;
        }
        equal(g.phase,'BONUS_OUTRO','outro after payout');equal(g.bonus.net,C.bonus[role].games*5,'net increments per game');equal(g.credits,start+C.bonus[role].games*5,'net exact');
        g.advance(1.5);equal(g.mode,'NORMAL','returns normal');equal(g.stats.sinceBonus,0,'since counter resets');equal(g.stats.total,1+C.bonus[role].games,'total games no drift');equal(g.stats.normal,1,'normal count excludes bonus');
      }));
    });
    test('非当選役の見た目成立を排除：全41,472停止窓＋ランダム遊技',()=>{
      let checked=0;
      const masks=new Uint8Array(24*24*24);
      for(let a=0;a<24;a++)for(let b=0;b<24;b++)for(let c=0;c<24;c++)masks[(a*24+b)*24+c]=E.winsAt([a,b,c]).length>0?1:0;
      for(let last=0;last<3;last++){const others=[0,1,2].filter(i=>i!==last);for(let a=0;a<24;a++)for(let b=0;b<24;b++)for(let first=0;first<24;first++){
        let legal=false;const p=[0,0,0];p[others[0]]=a;p[others[1]]=b;
        for(let d=0;d<3;d++){p[last]=(first+d)%24;if(!masks[(p[0]*24+p[1])*24+p[2]])legal=true;}
        assert(legal,'three-cell legal stop window');checked++;
      }}equal(checked,41472,'all windows checked');cases+=checked;
      for(const slip of [3,4,5,6])for(const role of ['MISS',...E.ROLES])for(const order of orders)for(let repeat=0;repeat<3;repeat++) {
        const g=new Game({rng});g.setControls(slip,13.5);g.devForce(role);g.bet();g.lever();order.forEach(i=>{g.advance(rng()*.35);g.devPosition(i,rng()*24);g.stop(i);g.advance(.02);});g.advance(3);
        assert(g.wins.every(w=>w.role===role),'no unauthorised visible win');cases++;
      }
    });
    test('設定変更制限・確率表の単調性・メダル補充',()=>{
      let previous=0;C.settings.forEach((s,i)=>{const combined=1/s.BIG+1/s.REG;assert(combined>previous,'bonus rate rises');previous=combined;const g=new Game();g.stats.total=10;g.credits=25;assert(g.setSetting(i+1),'setting accepted');equal(g.credits,1000,'medals reset');equal(g.stats.total,0,'data reset');g.bet();assert(!g.setSetting(6),'wagered setting locked');g.lever();assert(!g.setSetting(6),'spinning setting locked');cases++;});
      const g=newSpin('BIG');assert(!g.setSetting(6),'pending locked');complete(g,[0,1,2]);assert(!g.setSetting(6),'bonus locked');
      const h=new Game();h.credits=1;assert(!h.bet(),'low balance cannot bet');assert(h.refill(),'refill when depleted');equal(h.credits,1001,'refill adds medals');assert(!h.refill(),'refill cannot spam while funded');cases++;
      const boundaryRole=(setting,includeBonus)=>{const odds=C.settings[setting-1];let edge=0;for(const role of E.ROLES){if(!includeBonus&&['BIG','REG'].includes(role))continue;const g=new Game({rng:()=>edge+1/odds[role]/2});g.setting=setting;equal(g.draw(includeBonus),role,'draw bucket matches table');edge+=1/odds[role];}const g=new Game({rng:()=>edge+(1-edge)/2});g.setting=setting;equal(g.draw(includeBonus),'MISS','remaining probability is miss');};
      for(let s=1;s<=6;s++){boundaryRole(s,true);boundaryRole(s,false);}
    });
    test('アプリ中断・復帰・回転中保存・払い出し途中保存',()=>{
      const g=newSpin('BIG');aim(g,1);g.advance(.03);const p=g.reels.map(r=>r.p),t=g.time;g.pause();g.advance(100);equal(g.time,t,'paused time frozen');equal(g.reels.map(r=>r.p),p,'paused positions frozen');g.resume();
      const h=new Game();assert(h.restore(g.exportState()),'spin restored');assert(h.paused,'restored spin waits resume');h.resume();g.advance(.03);h.advance(.03);g.reels.forEach((r,i)=>near(r.p,h.reels[i].p,'same restored position'));aim(h,0);aim(h,2);h.advance(3);equal(h.mode,'BONUS','restored pending bonus works');cases++;
      h.bet();h.lever();[0,1,2].forEach(i=>h.stop(i));const settle=Math.max(...h.reels.map(r=>r.stopping.at+r.stopping.duration));h.advance(settle-h.time+C.coinSeconds*3+.00001);equal(h.lastPayout,3,'partial payout fixture');
      const j=new Game();assert(j.restore(h.exportState()),'partial payout restore');const credit=j.credits;j.resume();j.advance(1);equal(j.credits,credit+5,'only remaining five paid');equal(j.bonus.remaining,49,'one game decremented');const after=j.credits;j.advance(5);equal(j.credits,after,'no duplicate payout');cases++;
      const bad=h.exportState();bad.credits=-1;assert(!new Game().restore(bad),'corrupt save rejected');assert(!new Game().restore({version:1}),'incomplete save rejected');
    });
    return {status:'PASS',tests:tests.length,assertions,scenarioCases:cases,maxBonusForwardCells:Number(maxBonusTravel.toFixed(6)),results:tests};
  }
  root.LumiQA={run};if(typeof module!=='undefined'&&module.exports)module.exports=root.LumiQA;
})(typeof globalThis !== 'undefined' ? globalThis : window);

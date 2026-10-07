/* ECHO HUNT — original simulation. Units: metres / seconds. */
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export const angle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const direction=(yaw,pitch=0)=>({x:Math.sin(yaw)*Math.cos(pitch),y:Math.sin(pitch),z:-Math.cos(yaw)*Math.cos(pitch)});
export const WEAPONS=[
 {name:'AR-24',label:'アサルトライフル',mag:24,reserve:144,damage:22,interval:.12,reload:1.9,range:50,falloff:26,spread:.014,pellets:1,recoil:.025},
 {name:'SG-6',label:'ショットガン',mag:6,reserve:48,damage:15,interval:.82,reload:2.5,range:23,falloff:8,spread:.087,pellets:8,recoil:.08},
 {name:'P-12',label:'ハンドガン',mag:12,reserve:96,damage:31,interval:.27,reload:1.35,range:38,falloff:17,spread:.011,pellets:1,recoil:.035}
];
export const BALANCE={humanHP:100,hiddenHP:180,humanSpeed:4.3,hiddenSpeed:6.7,humanJump:6.6,hiddenJump:10.5,gravity:21,meleeRange:2.3,meleeDamage:55,meleeInterval:.72,cloakDuration:32,attackReveal:1.1,spawnShield:1.8};
export const DEFAULTS={role:'human',weapon:0,target:15,duration:300,respawn:4,difficulty:'normal',quality:'medium',sensitivity:1,volume:.65,flashlight:false,supplies:false,traitor:false};
export function makeMap(){
 const solids=[],decor=[],spawns=[],boxes=[];
 const add=(x,y,z,w,h,d,c,walk=false)=>{const b={x,y,z,w,h,d,c,walk};solids.push(b);return b};
 const deco=(x,y,z,w,h,d,c)=>decor.push({x,y,z,w,h,d,c});
 const wall=[.24,.32,.37],roof=[.28,.36,.39],steel=[.13,.22,.28],orange=[.95,.42,.12],glow=[.2,.85,.91];
 add(0,-.25,0,56,.5,56,[.14,.21,.25],true);
 add(-28,3,0,1,6,56,wall);add(28,3,0,1,6,56,wall);add(0,3,-28,56,6,1,wall);add(0,3,28,56,6,1,wall);
 function room(cx,cz,w,d){
  add(cx-w/2,2,cz,.6,4,d,wall);add(cx+w/2,2,cz,.6,4,d,wall);
  // Wide north / south doors, with a lintel.
  for(const z of [cz-d/2,cz+d/2]){add(cx-w/4-1,1.8,z,w/2-2,3.6,.6,wall);add(cx+w/4+1,1.8,z,w/2-2,3.6,.6,wall);add(cx,3.5,z,4,1,.6,wall);}
  add(cx,3.9,cz,w,.2,d,roof,true);
  // Broken parapets leave room to jump down.
  add(cx-w/2,4.28,cz,.3,.55,d-2,steel);add(cx,4.28,cz-d/2,w-3,.55,.3,steel);
  deco(cx,3.2,cz+d/2+.33,3,.12,.08,glow);deco(cx,3.15,cz,2.5,.09,.45,glow);
  for(let i=0;i<5;i++)deco(cx-w/2+.34,1.5,cz-d/2+1.5+i*2.2,.07,1.8,.05,[.36,.48,.5]);
 }
 room(-14,-12.5,14,15);room(13,1,14,16);
 // Roof access: twenty physical steps, landing bridges at height 4.
 for(let i=0;i<20;i++){let h=(i+1)*.2;add(-4.6,h/2,-5.3-i*.6,2.8,h,.6,roof,true);add(22.4,h/2,7.7-i*.6,2.8,h,.6,roof,true);}
 add(-5.5,3.9,-18.5,5,.2,3,roof,true);add(21,3.9,-5.5,6,.2,3,roof,true);
 // Courtyard and back alleys.
 add(-14,1.2,10,7,2.4,4,steel);add(-15,1.2,18,10,2.4,3,steel);
 add(9,1.2,-19,10,2.4,3,steel);add(17,1.2,18,6,2.4,4,steel);
 add(0,.65,8,3,1.3,3,[.32,.34,.29],true);add(1,.5,-9,2,1,3,[.32,.34,.29],true);
 for(const [x,z] of [[-11,7],[-18,7],[-21,15],[13,15],[20,15],[5,-22],[13,-22],[-17,-13],[16,3]]) add(x,.55,z,1.35,1.1,1.35,[.4,.35,.23],true);
 // Painted road stripes, cargo ribs, ventilation, utility lamps, skyline.
 for(let z=-25;z<26;z+=4){deco(2,.012,z,.1,.012,1.6,[.68,.58,.28]);deco(-1,.01,z,.045,.012,2.6,[.32,.43,.44]);}
 for(const b of solids.filter(b=>b.c===steel&&b.w>3))for(let x=b.x-b.w/2+.4;x<b.x+b.w/2;x+=.7)deco(x,1.3,b.z+b.d/2+.02,.04,2,.035,[.32,.43,.46]);
 for(const [x,z] of [[-17,-15],[-11,-8],[10,-2],[16,5]]){add(x,4.4,z,1.7,.8,2,steel);for(let i=0;i<4;i++)deco(x,4.82,z-.7+i*.45,1.4,.03,.08,[.48,.59,.59]);}
 for(const [x,z] of [[-25,23],[25,23],[25,-24],[-25,-24],[3,20],[3,-18]]){deco(x,2.7,z,.13,5.4,.13,steel);deco(x,5.35,z,1.1,.18,.6,orange);}
 for(let i=0;i<14;i++){const x=-40+i*6,h=5+(i*7%11);deco(x,h/2,-37,4,h,5,[.085,.14,.19]);for(let j=2;j<h;j+=2)deco(x,j,-34.45,2,.15,.03,[.3,.48,.5]);}
 const positions=[[-23,0,23],[-4,0,20],[22,0,23],[24,0,-22],[-24,0,-24],[-14,0,-11],[13,0,2],[-13,4,-17],[14,4,4],[-24,0,2],[4,0,-24],[10,0,24]];
 positions.forEach(([x,y,z])=>spawns.push({x,y,z}));
 [[-14,0,-8],[13,4,2],[0,0,18],[-23,0,-1],[19,0,-22]].forEach(([x,y,z],i)=>boxes.push({x,y,z,type:i%4,readyAt:0}));
 return {solids,decor,spawns,boxes};
}
export function rayBox(o,d,b,max=Infinity){
 let near=0,far=max;
 for(const [k,size] of [['x','w'],['y','h'],['z','d']]){let lo=b[k]-b[size]/2,hi=b[k]+b[size]/2;if(Math.abs(d[k])<1e-8){if(o[k]<lo||o[k]>hi)return Infinity;}else{let t1=(lo-o[k])/d[k],t2=(hi-o[k])/d[k];if(t1>t2)[t1,t2]=[t2,t1];near=Math.max(near,t1);far=Math.min(far,t2);if(near>far)return Infinity;}}
 return near<=max?near:Infinity;
}
export function wallRay(map,o,d,max=100){let hit=max;for(const b of map.solids)hit=Math.min(hit,rayBox(o,d,b,max));return hit;}
export function lineClear(map,a,b){const n=dist(a,b);if(n<.01)return true;return wallRay(map,a,{x:(b.x-a.x)/n,y:(b.y-a.y)/n,z:(b.z-a.z)/n},n)>=n-.04;}
const eye=a=>({x:a.x,y:a.y+1.52,z:a.z});
export function blocked(map,x,y,z,r=.3){return map.solids.some(b=>x+r>b.x-b.w/2+.005&&x-r<b.x+b.w/2-.005&&z+r>b.z-b.d/2+.005&&z-r<b.z+b.d/2-.005&&y+1.76>b.y-b.h/2+.02&&y<b.y+b.h/2-.035);}
export function moveActor(a,dx,dz,dt,map,jump=false){
 const was=a.grounded; if(jump&&a.grounded){a.vy=a.role==='hidden'?BALANCE.hiddenJump:BALANCE.humanJump;a.grounded=false;}
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.16));
 for(let i=0;i<count;i++)for(const [axis,delta] of [['x',dx/count],['z',dz/count]]){
  const nx=a.x+(axis==='x'?delta:0),nz=a.z+(axis==='z'?delta:0);
  if(!blocked(map,nx,a.y,nz)){a.x=nx;a.z=nz;}else if(a.grounded){
   let top=a.y;for(const b of map.solids)if(nx+.3>b.x-b.w/2&&nx-.3<b.x+b.w/2&&nz+.3>b.z-b.d/2&&nz-.3<b.z+b.d/2&&b.y+b.h/2>a.y&&b.y+b.h/2<=a.y+.255)top=Math.max(top,b.y+b.h/2);
   if(top>a.y&&!blocked(map,nx,top,nz)){a.y=top;a.x=nx;a.z=nz;}
  }
 }
 const oldY=a.y;a.vy-=BALANCE.gravity*dt;let ny=a.y+a.vy*dt;a.grounded=false;
 for(const b of map.solids){if(a.x+.28<=b.x-b.w/2||a.x-.28>=b.x+b.w/2||a.z+.28<=b.z-b.d/2||a.z-.28>=b.z+b.d/2)continue;
  const top=b.y+b.h/2,bot=b.y-b.h/2;
  if(a.vy<=0&&oldY>=top-.055&&ny<=top){ny=Math.max(ny,top);a.vy=0;a.grounded=true;}
  if(a.vy>0&&oldY+1.76<=bot+.03&&ny+1.76>=bot){ny=bot-1.76;a.vy=0;}
 }
 a.y=ny;return !was&&a.grounded;
}
export class Navigation {
 constructor(map){this.map=map;this.nodes=[];this.cells=new Map();
  for(let x=-26;x<=26;x++)for(let z=-26;z<=26;z++){
   // A waypoint at a step edge needs the higher support under the capsule.
   // Centre-only sampling leaves a hole every few 0.6m steps on a 1m grid.
   const levels=[0];for(const b of map.solids)if(b.walk&&x>=b.x-b.w/2-.36&&x<=b.x+b.w/2+.36&&z>=b.z-b.d/2-.36&&z<=b.z+b.d/2+.36&&b.y+b.h/2>0)levels.push(b.y+b.h/2);
   for(const y of [...new Set(levels)])if(!blocked(map,x,y,z,.36)){let n={x,y,z,id:this.nodes.length,links:[]};this.nodes.push(n);let k=x+','+z;if(!this.cells.has(k))this.cells.set(k,[]);this.cells.get(k).push(n);}
  }
  for(const n of this.nodes)for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]])for(const t of this.cells.get((n.x+dx)+','+(n.z+dz))||[])if(Math.abs(t.y-n.y)<=.61&&lineClear(map,{x:n.x,y:Math.max(n.y,t.y)+.9,z:n.z},{x:t.x,y:Math.max(n.y,t.y)+.9,z:t.z})){
   if(t.y>n.y+.01){const probe={x:n.x,y:n.y,z:n.z,vy:0,grounded:true,role:'human'};for(let i=0;i<10;i++)moveActor(probe,dx*.1,dz*.1,.1/BALANCE.humanSpeed,map);if(Math.hypot(probe.x-t.x,probe.z-t.z)>.12||probe.y<t.y-.21)continue;}
   n.links.push(t.id);
  }
 }
 nearest(p){let best=null,d=1e9;for(const n of this.nodes){const v=(n.x-p.x)**2+(n.z-p.z)**2+(n.y-p.y)**2*5;if(v<d){d=v;best=n;}}return best;}
 path(a,b){const s=this.nearest(a),end=this.nearest(b);if(!s||!end)return [];
  let open=[s.id],came=new Map(),g=new Map([[s.id,0]]),closed=new Set(),iter=0;
  while(open.length&&iter++<4000){let bi=0,bs=Infinity;for(let i=0;i<open.length;i++){let n=this.nodes[open[i]],v=g.get(n.id)+Math.abs(n.x-end.x)+Math.abs(n.z-end.z)+Math.abs(n.y-end.y);if(v<bs){bs=v;bi=i;}}const id=open.splice(bi,1)[0],n=this.nodes[id];
   if(id===end.id){let out=[n];while(came.has(out[0].id))out.unshift(this.nodes[came.get(out[0].id)]);return out.slice(1);}
   closed.add(id);for(const next of n.links){if(closed.has(next))continue;let cost=g.get(id)+dist(n,this.nodes[next]);if(cost<(g.get(next)??Infinity)){came.set(next,id);g.set(next,cost);if(!open.includes(next))open.push(next);}}
  }return [];
 }
}
export class Game {
 constructor(options={},rng=Math.random){this.cfg={...DEFAULTS,...options};this.rng=rng;this.map=makeMap();this.nav=new Navigation(this.map);this.reset();}
 reset(){this.time=0;this.state='playing';this.events=[];this.noises=[];this.effects=[];this.metrics={shots:0,hits:0,kills:0,transfers:0,respawns:0};this.map.boxes.forEach(b=>b.readyAt=0);
  this.actors=Array.from({length:8},(_,i)=>({id:i,name:i?'UNIT '+String(i).padStart(2,'0'):'YOU',score:0,kills:0,deaths:0,role:'human',alive:true,x:0,y:0,z:0,yaw:0,pitch:0,vy:0,grounded:true,weapon:i?i%3:Number(this.cfg.weapon),ammo:WEAPONS.map(w=>w.mag),reserve:WEAPONS.map(w=>w.reserve),cooldown:0,reload:0,step:0,lastShot:-10,reveal:0,cloak:1,shield:0,buffs:{},brain:{path:[],next:0,memory:null,seenFor:0,patrol:null},moving:false,flashlight:false}));
  const id=this.cfg.role==='hidden'?0:this.cfg.role==='random'?Math.floor(this.rng()*8):1+Math.floor(this.rng()*7);
  for(const a of this.actors)this.spawn(a,'human');this.hiddenId=id;this.spawn(this.actors[id],'hidden');
  this.assignTraitor();this.event('role',{id:0,role:this.actors[0].role});
 }
 event(type,data={}){this.events.push({type,time:this.time,...data});if(this.events.length>150)this.events.shift();}
 spawn(a,role){let best=null,score=-Infinity;const points=[...this.map.spawns].sort(()=>this.rng()-.5);
  for(const p of points){if(blocked(this.map,p.x,p.y,p.z))continue;const enemies=this.actors.filter(b=>b.alive&&b!==a);let v=enemies.length?Math.min(...enemies.map(b=>dist(p,b))):20;v+=enemies.filter(b=>!lineClear(this.map,eye(p),eye(b))).length*.6+this.rng();if(v>score){score=v;best=p;}}
  const p=best||this.map.spawns[0];Object.assign(a,p,{role,alive:true,hp:role==='hidden'?BALANCE.hiddenHP:BALANCE.humanHP,maxHP:role==='hidden'?BALANCE.hiddenHP:BALANCE.humanHP,vy:0,grounded:true,cloak:1,reveal:0,shield:BALANCE.spawnShield,reload:0,cooldown:.35,lastMelee:-10,buffs:{},ammo:WEAPONS.map(w=>w.mag),reserve:WEAPONS.map(w=>w.reserve),yaw:Math.atan2(-p.x,p.z),pitch:0,flashlight:false});a.brain={path:[],next:this.time+a.id*.07,memory:null,seenFor:0,patrol:null};
 }
 assignTraitor(){for(const a of this.actors)if(a.role==='traitor')a.role='human';if(!this.cfg.traitor)return;const hs=this.actors.filter(a=>a.alive&&a.role==='human');if(hs.length){const t=hs[Math.floor(this.rng()*hs.length)];t.role='traitor';if(t.id===0)this.event('role',{id:0,role:'traitor'});}}
 opacity(a){return clamp(.08+(1-a.cloak)*.68+(a.reveal>0?.72:0),.08,.93);}
 hostile(a,b){if(a===b||!b.alive)return false;if(a.role==='hidden')return b.role!=='hidden';if(a.role==='traitor')return b.role==='human';return b.role==='hidden'||b.role==='traitor';}
 noise(a,kind,range){this.noises.push({x:a.x,y:a.y+1,z:a.z,id:a.id,role:a.role,kind,range,until:this.time+.7});this.event('sound',{id:a.id,kind,x:a.x,y:a.y+1,z:a.z,range});}
 reload(a){const w=WEAPONS[a.weapon];if(a.alive&&a.role!=='hidden'&&!a.reload&&a.ammo[a.weapon]<w.mag&&a.reserve[a.weapon]>0){a.reload=w.reload;this.event('reload',{id:a.id});}}
 changeWeapon(a,n){if(a.role==='hidden')return;a.weapon=(n+3)%3;a.reload=0;a.cooldown=Math.max(.18,a.cooldown);}
 hit(a,damage,attacker){if(!a.alive||a.shield>0||attacker&&!this.hostile(attacker,a))return false;a.hp-=damage;this.metrics.hits++;a.reveal=Math.max(a.reveal,.35);this.event('hit',{id:a.id,from:attacker?.id,damage});if(a.hp<=0)this.kill(a,attacker);return true;}
 kill(v,k){if(!v.alive)return;const wasHidden=v.role==='hidden';v.alive=false;v.hp=0;v.deaths++;v.respawnAt=this.time+Number(this.cfg.respawn);v.reload=0;this.metrics.kills++;
  if(k&&k!==v){let pts=wasHidden&&k.role==='human'?3:1;k.score+=pts;k.kills++;if(k.role==='hidden'){k.cloak=1;k.reveal=.35;}this.event('kill',{id:v.id,from:k.id,pts});}else this.event('kill',{id:v.id,from:null,pts:0});
  // A traitor is never allowed to damage or inherit the Hidden directly.
  if(wasHidden){let next=k?.alive&&k.role==='human'?k:null;if(!next){let choices=this.actors.filter(a=>a.alive&&a.role==='human');if(!choices.length)choices=this.actors.filter(a=>a!==v&&a.role==='human');next=choices[Math.floor(this.rng()*choices.length)];}
   if(!next){next=this.actors.find(a=>a!==v);this.spawn(next,'human');}
   this.spawn(next,'hidden');this.hiddenId=next.id;this.metrics.transfers++;this.assignTraitor();this.event('role',{id:next.id,role:'hidden'});
  }v.role='human';v.buffs={};for(const a of this.actors){a.brain.memory=null;a.brain.seenFor=0;}this.checkEnd();
 }
 checkEnd(){if(this.state!=='playing')return;if(this.actors.some(a=>a.score>=this.cfg.target)||this.time>=this.cfg.duration){this.state='ended';this.event('end');}}
 attack(a,aim=null){if(!a.alive||a.cooldown>0||a.reload||this.state!=='playing')return false;const o=eye(a),dir=aim||direction(a.yaw,a.pitch);a.shield=0;
  if(a.role==='hidden'){a.cooldown=BALANCE.meleeInterval;a.lastMelee=this.time;a.reveal=BALANCE.attackReveal;this.noise(a,'slash',13);this.event('attack',{id:a.id,melee:true});
   let victims=this.actors.filter(b=>this.hostile(a,b)).sort((b,c)=>dist(a,b)-dist(a,c));for(const b of victims){let to={x:b.x-o.x,y:b.y+.9-o.y,z:b.z-o.z},l=Math.hypot(to.x,to.y,to.z);if(l<=BALANCE.meleeRange&&(to.x*dir.x+to.y*dir.y+to.z*dir.z)/l>.5&&lineClear(this.map,o,{x:b.x,y:b.y+.9,z:b.z})){this.hit(b,BALANCE.meleeDamage*(a.buffs.damage>this.time?1.35:1),a);break;}}return true;
  }
  const w=WEAPONS[a.weapon];if(a.ammo[a.weapon]<=0){this.reload(a);return false;}a.ammo[a.weapon]--;a.cooldown=w.interval;a.lastShot=this.time;this.metrics.shots++;this.noise(a,'shot',34);this.event('attack',{id:a.id,weapon:a.weapon});
  const firingRole=a.role;
  for(let i=0;i<w.pellets;i++){if(a.role!==firingRole||this.state!=='playing')break;const d={x:dir.x+(this.rng()-.5)*w.spread*2,y:dir.y+(this.rng()-.5)*w.spread*2,z:dir.z+(this.rng()-.5)*w.spread*2};let len=Math.hypot(d.x,d.y,d.z);d.x/=len;d.y/=len;d.z/=len;
   let range=wallRay(this.map,o,d,w.range),victim=null;
   for(const b of this.actors){if(!this.hostile(a,b))continue;let t=rayBox(o,d,{x:b.x,y:b.y+.88,z:b.z,w:.72,h:1.76,d:.72},range);if(t<range){victim=b;range=t;}}
   const end={x:o.x+d.x*range,y:o.y+d.y*range,z:o.z+d.z*range};
   this.effects.push({type:'tracer',from:o,to:end,until:this.time+.065});this.effects.push({type:'spark',...end,until:this.time+.18});
   if(victim){const fall=clamp(1-(range-w.falloff)/(w.range-w.falloff)*.7,.3,1);this.hit(victim,w.damage*fall*(a.buffs.damage>this.time?1.35:1),a);}
  }return true;
 }
 illuminate(observer,target){if(!this.cfg.flashlight||!observer.flashlight||observer.role==='hidden')return false;const o=eye(observer),t=eye(target),d=dist(o,t),f=direction(observer.yaw,observer.pitch);return d<16&&d>.01&&((t.x-o.x)*f.x+(t.y-o.y)*f.y+(t.z-o.z)*f.z)/d>.87&&lineClear(this.map,o,t);}
 detect(observer,target){const o=eye(observer),t=eye(target),distance=dist(o,t);if(distance>36||!lineClear(this.map,o,t))return false;const d=direction(observer.yaw),dot=((t.x-o.x)*d.x+(t.z-o.z)*d.z)/(Math.hypot(t.x-o.x,t.z-o.z)||1);if(dot<.32)return false;
  if(target.role!=='hidden')return true;const light=this.illuminate(observer,target),scan=observer.buffs.scan>this.time;const skill={easy:.8,normal:1,hard:1.25}[this.cfg.difficulty];const range=(2.4+this.opacity(target)*24+(target.moving?3:0)+(light?10:0)+(scan?14:0))*skill;return distance<range;
 }
 ai(a,dt){if(!a.alive)return;const skill={easy:{react:.8,spread:.17,memory:3.5},normal:{react:.43,spread:.09,memory:5},hard:{react:.22,spread:.045,memory:7}}[this.cfg.difficulty];const brain=a.brain;let target=null;
  // Only visibility produces a live target. Sound yields a noisy, expiring point.
  for(const b of this.actors)if(this.hostile(a,b)&&this.detect(a,b)&&(!target||dist(a,b)<dist(a,target)))target=b;
  if(target){brain.seenFor+=dt;brain.memory={x:target.x,y:target.y,z:target.z,until:this.time+skill.memory};
   // Teammates exchange a coarse sighting nearby, never a wall-penetrating live target.
   if(a.role==='human'&&target.role==='hidden'&&this.time>=(brain.reportAt||0)){brain.reportAt=this.time+1;for(const ally of this.actors)if(ally!==a&&ally.alive&&ally.role==='human'&&dist(a,ally)<12&&lineClear(this.map,eye(a),eye(ally))&&(!ally.brain.memory||ally.brain.memory.until<this.time+1.5))ally.brain.memory={x:target.x+(this.rng()-.5)*3,y:target.y,z:target.z+(this.rng()-.5)*3,until:this.time+2.5};}
  }else{brain.seenFor=0;for(const n of this.noises)if(n.id!==a.id&&this.hostile(a,this.actors[n.id])&&dist(a,n)<n.range*(lineClear(this.map,eye(a),n)?1:.45)){if(!brain.memory||brain.memory.until<this.time+1)brain.memory={x:n.x+(this.rng()-.5)*4,y:n.y-1,z:n.z+(this.rng()-.5)*4,until:this.time+2.5};}}
  if(brain.memory?.until<this.time)brain.memory=null;
  const hidden=a.role==='hidden';const retreat=hidden&&target&&(a.hp<60||(a.reveal>.2&&target.hp>BALANCE.meleeDamage))&&dist(a,target)<9;
  let destination=brain.memory;
  if(retreat){const safe=this.map.spawns.filter(p=>!lineClear(this.map,eye(p),eye(target)));destination=(safe.length?safe:this.map.spawns).reduce((b,p)=>dist(p,target)>dist(b,target)?p:b);}
  if(!destination){if(!brain.patrol||dist(a,brain.patrol)<1.5){brain.patrol=this.map.spawns[Math.floor(this.rng()*this.map.spawns.length)];}destination=brain.patrol;}
  if(this.time>=brain.next){brain.next=this.time+.85+this.rng()*.4;brain.path=this.nav.path(a,destination);if(!brain.path.length&&dist(a,destination)>2&&!target){brain.patrol=null;brain.memory=null;}}
  let goal=brain.path[0];while(goal&&Math.hypot(a.x-goal.x,a.z-goal.z)<.22&&a.y>=goal.y-.05){brain.path.shift();goal=brain.path[0];}
  let dx=0,dz=0,jump=false;const stop=target&&!hidden&&dist(a,target)<17&&!retreat;
  if(goal&&!stop){let l=Math.hypot(goal.x-a.x,goal.z-a.z);dx=(goal.x-a.x)/Math.max(l,.01);dz=(goal.z-a.z)/Math.max(l,.01);}
  if(target){const d=dist(a,target),desired=Math.atan2(target.x-a.x,-(target.z-a.z));a.yaw+=clamp(angle(desired-a.yaw),-dt*4,dt*4);a.pitch=Math.atan2(target.y-a.y,Math.hypot(target.x-a.x,target.z-a.z));
   if(brain.seenFor>skill.react&&Math.abs(angle(desired-a.yaw))<.28&&(!hidden||d<2.2)&&!retreat){const yaw=a.yaw+(this.rng()-.5)*skill.spread,pitch=a.pitch+(this.rng()-.5)*skill.spread;this.attack(a,direction(yaw,pitch));}
   if(hidden&&d>3&&d<7&&a.grounded&&this.rng()<dt*.7)jump=true;
  }else if(goal){const desired=Math.atan2(dx,-dz);a.yaw+=clamp(angle(desired-a.yaw),-dt*2.5,dt*2.5);a.pitch=0;}
  a.flashlight=this.cfg.flashlight&&!hidden;this.walk(a,dx,dz,jump,dt);if(!hidden&&a.ammo[a.weapon]<=0)this.reload(a);
 }
 walk(a,dx,dz,jump,dt){const speed=(a.role==='hidden'?BALANCE.hiddenSpeed:BALANCE.humanSpeed)*(a.buffs.speed>this.time?1.3:1),len=Math.hypot(dx,dz);if(len>1){dx/=len;dz/=len;}const old={x:a.x,z:a.z};const landed=moveActor(a,dx*speed*dt,dz*speed*dt,dt,this.map,jump);a.moving=Math.hypot(a.x-old.x,a.z-old.z)>.001;
  if(a.moving&&a.grounded){a.step+=dt;if(a.step>(a.role==='hidden'?.29:.39)){a.step=0;this.noise(a,'step',a.role==='hidden'?11:9);}}if(landed)this.noise(a,'land',16);if(a.y< -8)this.kill(a,null);
 }
 update(dt,input={}){if(this.state!=='playing')return;dt=clamp(dt,0,.05);this.time+=dt;this.checkEnd();if(this.state!=='playing')return;this.noises=this.noises.filter(n=>n.until>this.time);this.effects=this.effects.filter(e=>e.until>this.time);
  for(const a of this.actors){if(this.state!=='playing')break;if(!a.alive){if(this.time>=a.respawnAt){this.spawn(a,'human');this.metrics.respawns++;this.event('respawn',{id:a.id});}continue;}
   a.cooldown=Math.max(0,a.cooldown-dt);a.shield=Math.max(0,a.shield-dt);a.reveal=Math.max(0,a.reveal-dt);if(a.role==='hidden')a.cloak=Math.max(0,a.cloak-dt/BALANCE.cloakDuration);
   if(a.reload>0){a.reload=Math.max(0,a.reload-dt);if(!a.reload){const n=Math.min(WEAPONS[a.weapon].mag-a.ammo[a.weapon],a.reserve[a.weapon]);a.ammo[a.weapon]+=n;a.reserve[a.weapon]-=n;}}
   if(a.id===0){this.walk(a,input.x||0,input.z||0,!!input.jump,dt);if(input.attack)this.attack(a);}
   else this.ai(a,dt);
   if(this.cfg.supplies)for(const b of this.map.boxes)if(b.readyAt<=this.time&&dist(a,b)<1.2){b.readyAt=this.time+22;const names=['回復 +45','探知 8秒','移動速度 +30% / 10秒','攻撃力 +35% / 10秒'];if(b.type===0)a.hp=Math.min(a.maxHP,a.hp+45);else a.buffs[['','scan','speed','damage'][b.type]]=this.time+(b.type===1?8:10);a.reserve=a.reserve.map((v,i)=>Math.min(v+WEAPONS[i].mag*2,WEAPONS[i].reserve));this.event('supply',{id:a.id,name:names[b.type]});}
  }this.checkEnd();
 }
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {Game, BALANCE, WEAPONS, dist, direction, moveActor, blocked, lineClear} from '../core.mjs';

const rng=()=>.5;
const arena=(options={})=>{
 const g=new Game({role:'human',target:100,duration:300,...options},rng);
 g.map.solids=[{x:0,y:-.25,z:0,w:56,h:.5,d:56,walk:true}];
 for(const a of g.actors){a.alive=false;a.respawnAt=Infinity;a.shield=0;}
 const p=g.actors[0],h=g.actors[g.hiddenId];
 Object.assign(p,{alive:true,role:'human',x:0,y:0,z:0,yaw:0,pitch:0,hp:100,cooldown:0,reload:0,weapon:0});
 Object.assign(h,{alive:true,role:'hidden',x:0,y:0,z:-5,hp:180,cloak:1,reveal:0,cooldown:0,shield:0});
 g.ai=()=>{};
 return {g,p,h};
};
const advance=(g,seconds)=>{for(let i=0;i<Math.ceil(seconds*60);i++)g.update(1/60);};
const wall=g=>g.map.solids.push({x:0,y:2,z:-2.5,w:6,h:4,d:.5});

test('all start choices create exactly eight participants and one Hidden',()=>{
 for(const role of ['human','hidden','random']){
  const g=new Game({role},rng);
  assert.equal(g.actors.length,8);
  assert.equal(g.actors.filter(a=>a.alive&&a.role==='hidden').length,1);
  assert.equal(g.actors[0].role,role==='hidden'?'hidden':'human');
  assert.ok(g.actors.every(a=>!blocked(g.map,a.x,a.y,a.z)));
 }
});
test('a completely cloaked enemy receives rifle damage and ammunition is consumed',()=>{
 const {g,p,h}=arena();assert.equal(h.cloak,1);
 assert.ok(g.attack(p));assert.equal(h.hp,158);assert.equal(p.ammo[0],23);
 assert.equal(g.metrics.hits,1);assert.ok(h.reveal>0);
});
test('opacity changes never change bullet collision',()=>{
 for(const cloak of [0,.3,.7,1]){const {g,p,h}=arena();h.cloak=cloak;g.attack(p);assert.equal(h.hp,158);}
});
test('friendly humans are unaffected and do not obstruct the enemy hit',()=>{
 const {g,p,h}=arena();const ally=g.actors.find(a=>a!==p&&a!==h);
 Object.assign(ally,{alive:true,role:'human',x:0,y:0,z:-2,hp:100,shield:0});
 g.attack(p);assert.equal(ally.hp,100);assert.equal(h.hp,158);
});
test('walls stop bullets and hidden melee',()=>{
 const {g,p,h}=arena();wall(g);g.attack(p);assert.equal(h.hp,180);
 Object.assign(h,{x:0,z:-3,yaw:Math.PI,cooldown:0});p.z=-2;
 g.attack(h);assert.equal(p.hp,100);assert.equal(h.reveal,BALANCE.attackReveal);
});
test('weapon range, spread pellet count, cooldown, and distance falloff differ',()=>{
 for(let weapon=0;weapon<3;weapon++){
  const {g,p,h}=arena();p.weapon=weapon;h.hp=500;
  g.attack(p);assert.equal(500-h.hp,WEAPONS[weapon].damage*WEAPONS[weapon].pellets);
  assert.equal(p.cooldown,WEAPONS[weapon].interval);assert.equal(g.attack(p),false);
 }
 const {g,p,h}=arena();h.z=-40;g.attack(p);assert.ok(h.hp>158&&h.hp<180);
 p.cooldown=0;p.weapon=1;h.hp=180;g.attack(p);assert.equal(h.hp,180);
});
test('reload fills only the selected magazine after the configured time',()=>{
 const {g,p}=arena();p.ammo[0]=0;p.reserve[0]=10;g.reload(p);
 assert.equal(g.attack(p),false);advance(g,WEAPONS[0].reload+.05);
 assert.equal(p.ammo[0],10);assert.equal(p.reserve[0],0);assert.equal(p.ammo[1],6);
});
test('a human kill awards three points and transfers the Hidden to a clear spawn',()=>{
 const {g,p,h}=arena();h.hp=20;g.attack(p);
 assert.equal(p.score,3);assert.equal(p.role,'hidden');assert.equal(g.hiddenId,p.id);
 assert.equal(g.metrics.transfers,1);assert.equal(h.alive,false);assert.equal(h.role,'human');
 assert.equal(p.hp,BALANCE.hiddenHP);assert.ok(p.shield>0);assert.equal(p.cloak,1);
 assert.equal(g.actors.filter(a=>a.alive&&a.role==='hidden').length,1);
});
test('a shotgun stops emitting pellets after its shooter becomes the Hidden',()=>{
 const {g,p,h}=arena();p.weapon=1;h.hp=1;g.attack(p);
 assert.equal(p.role,'hidden');assert.equal(g.effects.filter(e=>e.type==='tracer').length,1);
});
test('a Hidden kill awards one point, restores cloak, and the victim respawns human',()=>{
 const {g,p,h}=arena({respawn:2});h.z=-1;h.yaw=Math.PI;h.cloak=.1;p.hp=40;
 g.attack(h);assert.equal(h.score,1);assert.equal(h.cloak,1);assert.equal(p.alive,false);
 advance(g,2.1);assert.equal(p.alive,true);assert.equal(p.role,'human');assert.equal(p.hp,100);
 assert.equal(g.metrics.respawns,1);assert.equal(h.role,'hidden');
});
test('suicide transfers the Hidden to a human without score',()=>{
 const {g,p,h}=arena();g.kill(h,null);assert.equal(p.role,'hidden');assert.equal(p.score,0);
 assert.equal(g.actors.filter(a=>a.alive&&a.role==='hidden').length,1);
});
test('a suicide with every ordinary human down does not promote the traitor',()=>{
 const {g,p,h}=arena({traitor:true});p.alive=false;p.respawnAt=Infinity;
 const traitor=g.actors.find(a=>a!==p&&a!==h);Object.assign(traitor,{alive:true,role:'traitor'});
 g.kill(h,null);assert.notEqual(g.hiddenId,traitor.id);assert.equal(g.actors[g.hiddenId].role,'hidden');
 assert.ok(g.actors[g.hiddenId].alive);assert.ok(g.actors.every(a=>a.score===0));
});
test('spawn protection expires, while an attack immediately cancels it',()=>{
 const {g,p,h}=arena();h.shield=1;g.attack(p);assert.equal(h.hp,180);
 advance(g,1.1);p.cooldown=0;g.attack(p);assert.equal(h.hp,158);
 p.shield=1;p.cooldown=0;g.attack(p);assert.equal(p.shield,0);
});
test('cloak fades over time and attacks expose the Hidden',()=>{
 const {g,h}=arena();const old=g.opacity(h);advance(g,5);
 assert.ok(h.cloak<1&&g.opacity(h)>old);h.cooldown=0;g.attack(h);
 assert.equal(h.reveal,BALANCE.attackReveal);assert.ok(g.opacity(h)>.75);
});
test('a flashlight needs distance, cone, and clear line of sight',()=>{
 const {g,p,h}=arena({flashlight:true});p.flashlight=true;
 assert.equal(g.illuminate(p,h),true);p.yaw=Math.PI;assert.equal(g.illuminate(p,h),false);
 p.yaw=0;wall(g);assert.equal(g.illuminate(p,h),false);
});
test('supplies apply bounded healing or timed buffs and are cleared on death',()=>{
 for(let type=0;type<4;type++){
  const {g,p}=arena({supplies:true});p.hp=40;g.map.boxes=[{x:0,y:0,z:0,type,readyAt:0}];
  g.update(1/60);assert.ok(g.map.boxes[0].readyAt>22);
  if(type===0)assert.equal(p.hp,85);else assert.ok(p.buffs[['','scan','speed','damage'][type]]>g.time);
  g.kill(p,null);assert.deepEqual(p.buffs,{});
 }
});
test('traitors only hurt humans; human retaliation is legal and scored',()=>{
 const {g,p,h}=arena({traitor:true});p.role='traitor';g.attack(p);assert.equal(h.hp,180);
 const other=g.actors.find(a=>a!==p&&a!==h);Object.assign(other,{alive:true,role:'human',x:0,y:0,z:-2,hp:20,shield:0});
 p.cooldown=0;g.attack(p);assert.equal(other.alive,false);assert.equal(p.score,1);
 Object.assign(other,{alive:true,role:'human',x:0,z:-2,hp:100,cooldown:0,yaw:Math.PI,shield:0});p.hp=20;
 g.attack(other);assert.equal(p.alive,false);assert.equal(other.score,1);assert.equal(h.role,'hidden');
});
test('BOT visual detection has a limited range, field of view, and wall occlusion',()=>{
 const {g,p,h}=arena();h.z=-24;h.cloak=1;assert.equal(g.detect(p,h),false);
 h.z=-3;assert.equal(g.detect(p,h),true);p.yaw=Math.PI;assert.equal(g.detect(p,h),false);
 p.yaw=0;wall(g);assert.equal(g.detect(p,h),false);
});
test('a BOT without sight or sound does not learn the Hidden position',()=>{
 const {g,p,h}=arena();g.ai=Game.prototype.ai;h.z=-24;g.time=2;
 g.ai(p,1/60);assert.equal(p.brain.memory,null);
 g.noises.push({x:5,y:1,z:0,id:h.id,range:11,until:3});g.ai(p,1/60);
 assert.ok(p.brain.memory);assert.notEqual(p.brain.memory.z,h.z);
});
test('movement collides with walls and human/Hidden jumps land safely',()=>{
 const {g,p}=arena();wall(g);for(let i=0;i<120;i++)moveActor(p,0,-.1,1/60,g.map);
 assert.ok(p.z>-2);for(const role of ['human','hidden']){Object.assign(p,{x:0,z:0,y:0,vy:0,grounded:true,role});let top=0;
  for(let i=0;i<120;i++){moveActor(p,0,0,1/60,g.map,i===0);top=Math.max(top,p.y);}
  assert.ok(top>(role==='human'?.9:2.3));assert.equal(p.y,0);assert.equal(p.grounded,true);
 }
});
test('both roofs are reachable by walking the actual stairs, then returning to ground',()=>{
 const g=new Game({},rng);
 for(const end of g.map.spawns.slice(7,9)){
  const a={...g.actors[0],...g.map.spawns[0],role:'human',vy:0,grounded:true};
  for(const destination of [end,g.map.spawns[0]]){
   const path=g.nav.path(a,destination);assert.ok(path.length>0);let ticks=0;
   while(path.length&&ticks++<6000){const goal=path[0],length=Math.hypot(goal.x-a.x,goal.z-a.z);
    if(length<.22&&a.y>=goal.y-.05){path.shift();continue;}
    moveActor(a,(goal.x-a.x)/Math.max(length,.001)*BALANCE.humanSpeed/60,(goal.z-a.z)/Math.max(length,.001)*BALANCE.humanSpeed/60,1/60,g.map);
   }
   assert.equal(path.length,0);assert.ok(dist(a,destination)<.5);
  }
 }
});
test('a score or time limit freezes scoring, and reset restores one clean match',()=>{
 const {g,p,h}=arena({target:3});h.hp=1;g.attack(p);assert.equal(g.state,'ended');
 const points=p.score;advance(g,1);assert.equal(p.score,points);assert.equal(g.attack(p),false);
 g.reset();assert.equal(g.time,0);assert.equal(g.state,'playing');assert.equal(g.metrics.transfers,0);
 assert.ok(g.actors.every(a=>a.score===0&&a.alive));assert.equal(g.actors.filter(a=>a.role==='hidden').length,1);
 const timeMatch=arena({duration:.05});advance(timeMatch.g,.1);assert.equal(timeMatch.g.state,'ended');assert.equal(timeMatch.p.score,0);
});

import {direction,WEAPONS,lineClear} from './core.mjs';
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function multiply(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[c*4+row]+=a[k*4+row]*b[c*4+k];return r;}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),r=new Float32Array(16);r[0]=f/aspect;r[5]=f;r[10]=(far+near)/(near-far);r[11]=-1;r[14]=2*far*near/(near-far);return r;}
function camera(p){const f=direction(p.yaw,p.pitch),r={x:Math.cos(p.yaw),y:0,z:Math.sin(p.yaw)},u={x:-Math.sin(p.yaw)*Math.sin(p.pitch),y:Math.cos(p.pitch),z:Math.cos(p.yaw)*Math.sin(p.pitch)};return new Float32Array([r.x,u.x,-f.x,0,r.y,u.y,-f.y,0,r.z,u.z,-f.z,0,-r.x*p.x-r.z*p.z,-u.x*p.x-u.y*p.y-u.z*p.z,f.x*p.x+f.y*p.y+f.z*p.z,1]);}
const faces=[[[1,0,0],[[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]],[[-1,0,0],[[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],[[0,1,0],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],[[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]],[[0,0,1],[[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,1]]],[[0,0,-1],[[-1,-1,-1],[-1,1,-1],[1,1,-1],[1,-1,-1]]]];
export function cube(out,b,yaw=0,origin=null){const co=Math.cos(yaw),si=Math.sin(yaw);for(const [n,verts]of faces){const normal=[n[0]*co-n[2]*si,n[1],n[0]*si+n[2]*co];for(const i of [0,1,2,0,2,3]){const v=verts[i],x=b.x+v[0]*b.w/2,z=b.z+v[2]*b.d/2;out.push(x*co-z*si+(origin?.x||0),b.y+v[1]*b.h/2+(origin?.y||0),x*si+z*co+(origin?.z||0),...normal,...b.c);}}}
function actorGeometry(a,t,ghost=false){const out=[],c=ghost?[.45,.86,.86]:a.role==='traitor'?[.45,.28,.18]:[.18,.32,.39],dark=[.065,.12,.16],visor=ghost?[.65,.9,.95]:[.24,.82,.88],swing=a.moving?Math.sin(t*11+a.id)*.25:0;
 const part=(x,y,z,w,h,d,col=c)=>cube(out,{x,y,z,w,h,d,c:col},a.yaw,{x:a.x,y:a.y,z:a.z});
 part(0,1.12,0,.6,.64,.34);part(0,.73,0,.44,.2,.3,dark);part(0,1.64,0,.42,.38,.4,dark);part(0,1.66,-.208,.31,.11,.015,visor);part(0,1.23,-.2,.43,.35,.085,dark);
 part(-.2,.39,swing,.22,.64,.24,dark);part(.2,.39,-swing,.22,.64,.24,dark);part(-.2,.11,swing-.06,.26,.17,.37);part(.2,.11,-swing-.06,.26,.17,.37);
 part(-.42,1.05,-.07,.2,.5,.22);part(.42,1.05,-.17,.2,.5,.22);part(.42,.96,-.4,.16,.15,.45,dark);
 if(!ghost){part(.32,1.08,-.54,.14,.19,.62,dark);part(.32,1.14,-.93,.07,.07,.25,dark);part(-.32,1.2,-.18,.08,.07,.02,visor);}else{part(-.42,.84,-.37,.065,.07,.65,visor);part(.42,.84,-.53,.065,.07,.65,visor);}
 return out;}
export function handGeometry(p,t){const hands=[],bob=p.moving?Math.sin(t*8)*.012:0,kick=Math.max(0,1-(t-p.lastShot)/.12)*.04,rel=p.reload?Math.sin(p.reload*3)*.08:0;
   const part=(x,y,z,w,h,d,c)=>cube(hands,{x,y:y+bob-rel,z:z+kick,w,h,d,c});const dark=[.1,.16,.19],steel=[.23,.32,.35],glove=[.18,.23,.25];
   if(p.role==='hidden'){const sweep=Math.sin(Math.min(1,(t-p.lastMelee)/.3)*Math.PI)*.26;for(const s of [-1,1]){part(s*(.28-sweep),-.3+sweep*.3,-.42-sweep,.15,.17,.28,glove);part(s*(.24-sweep),-.26+sweep*.3,-.67-sweep,.07,.07,.47,[.38,.75,.78]);part(s*(.3-sweep),-.28+sweep*.3,-.69-sweep,.03,.05,.36,[.5,.88,.9]);}}
   else{let size=p.weapon===2?.64:1;part(.25,-.3,-.36,.17,.25,.36,glove);part(.12,-.29,-.7,.14,.13,.27,glove);part(.23,-.21,-.62,.16,.18,.56*size,dark);part(.23,-.23,-.83,.1,.08,.52*size,steel);part(.23,-.36,-.6,.12,.22,.17,dark);part(.23,-.095,-.57,.055,.055,.09,[.38,.56,.6]);part(.23,-.09,-.84,.018,.046,.027,[.3,.9,.91]);part(.15,-.21,-.6,.01,.035,.09,[.99,.54,.17]);if(t-p.lastShot<.065){part(.23,-.23,-1.1,.12,.12,.13,[1,.78,.31]);}}
return hands;}
const VS=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;uniform mat4 uVP;varying vec3 vPosition;varying vec3 vNormal;varying vec3 vColor;void main(){vPosition=aPosition;vNormal=aNormal;vColor=aColor;gl_Position=uVP*vec4(aPosition,1.0);}`;
const FS=`precision mediump float;varying vec3 vPosition;varying vec3 vNormal;varying vec3 vColor;uniform vec3 uEye;uniform vec3 uForward;uniform vec2 uResolution;uniform float uTime;uniform float uGhost;uniform float uNight;uniform float uFlash;uniform float uHands;uniform sampler2D uScene;
void main(){vec3 n=normalize(vNormal);vec3 toEye=normalize(uEye-vPosition);float d=distance(uEye,vPosition);float light=.52+max(dot(n,normalize(vec3(-.4,.85,.3))),0.0)*.5;
 float stripes=step(.985,fract(vPosition.y*2.0))*.04;vec3 col=vColor*(light-stripes);
 float pool=exp(-length(vPosition.xz-vec2(3.,20.))*.18)+exp(-length(vPosition.xz-vec2(3.,-18.))*.18);col+=vec3(.12,.09,.03)*pool;
 float cone=smoothstep(.86,.96,dot(normalize(vPosition-uEye),uForward));col+=vColor*uFlash*cone*max(0.,1.-d/18.)*.8;
 float emission=step(.72,max(vColor.r,max(vColor.g,vColor.b)));col=mix(col,vColor,emission*.7);
 float fog=1.-exp(-d*.014);col=mix(col,vec3(.048,.092,.13),fog*(1.-uHands));
 if(uNight>.5){float l=dot(col,vec3(.299,.587,.114));col=vec3(.18,.95,.51)*(l*1.5+.08);}
 if(uGhost>0.){float rim=pow(1.-abs(dot(n,toEye)),2.);vec2 uv=gl_FragCoord.xy/uResolution;vec2 warp=(n.xy*.0035+vec2(sin(vPosition.y*19.+uTime*6.),cos(vPosition.x*12.+uTime*4.))*.0013)*(1.-uGhost);vec3 bg=texture2D(uScene,clamp(uv+warp,vec2(.001),vec2(.999))).rgb;col=mix(bg,col,uGhost*.68)+vec3(.19,.48,.55)*(rim*.12+.015)*(1.-uGhost);}
 gl_FragColor=vec4(col,1.);}`;
export class Renderer{
 constructor(canvas,map,cfg){this.canvas=canvas;this.cfg=cfg;const gl=this.gl=canvas.getContext('webgl',{antialias:false,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:false});if(!gl)return new SoftwareRenderer(canvas,map,cfg);this.kind='webgl';
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('描画シェーダー: '+gl.getShaderInfoLog(s));return s;};
  this.program=gl.createProgram();gl.attachShader(this.program,compile(gl.VERTEX_SHADER,VS));gl.attachShader(this.program,compile(gl.FRAGMENT_SHADER,FS));gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('3Dプログラム: '+gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  this.maxTextureSize=gl.getParameter(gl.MAX_TEXTURE_SIZE);this.loc={};for(const k of ['uVP','uEye','uForward','uResolution','uTime','uGhost','uNight','uFlash','uScene','uHands'])this.loc[k]=gl.getUniformLocation(this.program,k);for(const k of ['aPosition','aNormal','aColor'])this.loc[k]=gl.getAttribLocation(this.program,k);
  const geometry=[];for(const b of [...map.solids,...map.decor])cube(geometry,b);this.world=this.buffer(geometry,gl.STATIC_DRAW);this.dynamic=gl.createBuffer();this.scene=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.scene);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,1,1,0,gl.RGB,gl.UNSIGNED_BYTE,new Uint8Array(3));gl.uniform1i(this.loc.uScene,0);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);this.frames=0;this.resize();
 }
 buffer(data,usage){const gl=this.gl,b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),usage);return {b,count:data.length/9};}
 bind(b){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,b);for(const [k,offset]of [['aPosition',0],['aNormal',12],['aColor',24]]){gl.enableVertexAttribArray(this.loc[k]);gl.vertexAttribPointer(this.loc[k],3,gl.FLOAT,false,36,offset);}}
 resize(){const scale={low:.65,medium:1,high:1.5}[this.cfg.quality]||1;const cap=this.maxTextureSize;const ratio=Math.min(devicePixelRatio||1,scale,cap/innerWidth,cap/innerHeight);const w=Math.max(1,Math.floor(innerWidth*ratio)),h=Math.max(1,Math.floor(innerHeight*ratio));if(this.width!==w||this.height!==h){this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h);this.gl.bindTexture(this.gl.TEXTURE_2D,this.scene);this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGB,w,h,0,this.gl.RGB,this.gl.UNSIGNED_BYTE,null);}this.width=w;this.height=h;}
 draw(data){if(!data.length)return;const gl=this.gl;this.bind(this.dynamic);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);gl.drawArrays(gl.TRIANGLES,0,data.length/9);}
 render(game,view,night=false,menu=false,recoil=0){const gl=this.gl,p=game.actors[0],t=game.time;this.resize();gl.useProgram(this.program);gl.clearColor(night?.016:.048,night?.06:.092,night?.03:.13,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const cam=menu?{x:23,y:10,z:26,yaw:-.68+Math.sin(performance.now()*.00009)*.08,pitch:-.2}:{x:p.x,y:p.y+1.52+(p.moving&&p.grounded?Math.sin(t*12)*.033:0),z:p.z,yaw:p.yaw,pitch:p.pitch+recoil};this.lastCamera=cam;
  const vp=multiply(perspective(1.22,this.width/this.height,.065,130),camera(cam));gl.uniformMatrix4fv(this.loc.uVP,false,vp);gl.uniform3f(this.loc.uEye,cam.x,cam.y,cam.z);const f=direction(cam.yaw,cam.pitch);gl.uniform3f(this.loc.uForward,f.x,f.y,f.z);gl.uniform2f(this.loc.uResolution,this.width,this.height);gl.uniform1f(this.loc.uTime,t);gl.uniform1f(this.loc.uNight,night?1:0);gl.uniform1f(this.loc.uFlash,p.flashlight?1:0);gl.uniform1f(this.loc.uGhost,0);gl.uniform1f(this.loc.uHands,0);this.bind(this.world.b);gl.drawArrays(gl.TRIANGLES,0,this.world.count);
  const dynamic=[];
  for(const a of game.actors)if(a.alive&&(a.id!==0||menu)&&a.role!=='hidden')dynamic.push(...actorGeometry(a,t));
  if(game.cfg.supplies)for(const b of game.map.boxes)if(b.readyAt<=t){const colors=[[.3,.92,.55],[.3,.65,.95],[.91,.75,.28],[.93,.31,.23]];cube(dynamic,{x:0,y:.42+Math.sin(t*2+b.x)*.06,z:0,w:.65,h:.65,d:.65,c:[.14,.25,.29]},t*.4,b);cube(dynamic,{x:b.x,y:b.y+.46,z:b.z,w:.68,h:.14,d:.68,c:colors[b.type]});}
  for(const e of game.effects){if(e.type==='spark')cube(dynamic,{x:e.x,y:e.y,z:e.z,w:.045,h:.045,d:.045,c:[1,.64,.18]});else if(e.type==='tracer'){for(let i=1;i<4;i++){let k=i/4;cube(dynamic,{x:e.from.x+(e.to.x-e.from.x)*k,y:e.from.y+(e.to.y-e.from.y)*k,z:e.from.z+(e.to.z-e.from.z)*k,w:.017,h:.017,d:.07,c:[1,.75,.3]});}}}
  this.draw(dynamic);
  const hidden=game.actors[game.hiddenId];if(hidden?.alive&&(hidden.id!==0||menu)){gl.bindTexture(gl.TEXTURE_2D,this.scene);gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,this.width,this.height);const lit=game.actors.some(a=>a.alive&&game.illuminate(a,hidden));const scan=p.buffs.scan>t&&lineClear(game.map,{x:p.x,y:p.y+1.5,z:p.z},{x:hidden.x,y:hidden.y+1.5,z:hidden.z});gl.uniform1f(this.loc.uGhost,Math.max(game.opacity(hidden),lit?.55:0,scan?.7:0));this.draw(actorGeometry(hidden,t,true));gl.uniform1f(this.loc.uGhost,0);}
  if(!menu&&p.alive){gl.clear(gl.DEPTH_BUFFER_BIT);gl.uniformMatrix4fv(this.loc.uVP,false,perspective(1.1,this.width/this.height,.04,5));gl.uniform3f(this.loc.uEye,0,0,0);gl.uniform1f(this.loc.uHands,1);this.draw(handGeometry(p,t));

  }this.frames++;return cam;
 }
 project(x,y,z){const p=this.lastCamera;if(!p)return null;const v=multiply(perspective(1.22,this.width/this.height,.065,130),camera(p));const w=v[3]*x+v[7]*y+v[11]*z+v[15];if(w<=0)return null;return {x:(1+(v[0]*x+v[4]*y+v[8]*z+v[12])/w)*innerWidth/2,y:(1-(v[1]*x+v[5]*y+v[9]*z+v[13])/w)*innerHeight/2};}
}

// Perspective polygon renderer used when the browser does not expose WebGL.
// It shares the exact world and character geometry with the GPU renderer.
export class SoftwareRenderer {
 constructor(canvas,map,cfg){
  this.canvas=canvas;this.map=map;this.cfg=cfg;this.kind='canvas3d';this.frames=0;
  this.ctx=canvas.getContext('2d',{alpha:false});
  if(!this.ctx)throw new Error('3D描画を初期化できません。別のブラウザでお試しください。');
  const geometry=[];for(const b of [...map.solids,...map.decor])cube(geometry,b);
  this.world=this.polygons(geometry);this.world.forEach((p,i)=>p.ground=i<6);
  this.back=document.createElement('canvas');this.backCtx=this.back.getContext('2d');this.resize();
 }
 polygons(data){const result=[];for(let i=0;i<data.length;i+=54){const vertices=[0,9,18,45].map(k=>[data[i+k],data[i+k+1],data[i+k+2]]);result.push({vertices,n:[data[i+3],data[i+4],data[i+5]],c:[data[i+6],data[i+7],data[i+8]],center:vertices.reduce((v,p)=>v.map((a,k)=>a+p[k]/4),[0,0,0])});}return result;}
 resize(){const scale=this.cfg.quality==='low'?.65:1,w=Math.max(1,Math.round(innerWidth*scale)),h=Math.max(1,Math.round(innerHeight*scale));if(this.width!==w||this.height!==h){this.canvas.width=w;this.canvas.height=h;this.back.width=w;this.back.height=h;}this.width=w;this.height=h;}
 transform(point,cam){const dx=point[0]-cam.x,dy=point[1]-cam.y,dz=point[2]-cam.z,cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw),cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);return [cy*dx+sy*dz,-sy*sp*dx+cp*dy+cy*sp*dz,sy*cp*dx+sp*dy-cy*cp*dz];}
 clip(vertices,near=.065){const result=[];for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],aIn=a[2]>=near,bIn=b[2]>=near;if(aIn)result.push(a);if(aIn!==bIn){const t=(near-a[2])/(b[2]-a[2]);result.push(a.map((v,k)=>v+(b[k]-v)*t));}}return result;}
 prepare(polys,cam,night,flash,ghost=0,hands=false){const output=[],focal=this.height/(2*Math.tan((hands?1.1:1.22)/2));
  for(const p of polys){const toEye=[cam.x-p.center[0],cam.y-p.center[1],cam.z-p.center[2]],distance=Math.hypot(...toEye);if(p.n.reduce((v,n,k)=>v+n*toEye[k],0)<=0)continue;
   const clipped=this.clip(p.vertices.map(v=>this.transform(v,cam)),hands?.04:.065);if(clipped.length<3)continue;
   const points=clipped.map(v=>[this.width/2+v[0]/v[2]*focal,this.height/2-v[1]/v[2]*focal]);
   const xs=points.map(v=>v[0]),ys=points.map(v=>v[1]);if(Math.max(...xs)<0||Math.min(...xs)>this.width||Math.max(...ys)<0||Math.min(...ys)>this.height)continue;
   let light=.52+Math.max(0,(-.4*p.n[0]+.85*p.n[1]+.3*p.n[2])/.986)*.5;
   const local=this.transform(p.center,cam);if(flash&&local[2]/Math.max(distance,.01)>.87)light+=Math.max(0,1-distance/18)*.7;
   let col=p.c.map(v=>v*light);if(Math.max(...p.c)>.72)col=p.c.map((v,k)=>col[k]*.3+v*.7);
   if(!hands){const fog=1-Math.exp(-distance*.014);col=col.map((v,k)=>v*(1-fog)+[.048,.092,.13][k]*fog);}
   if(night){const l=col[0]*.299+col[1]*.587+col[2]*.114;col=[.18,.95,.51].map(v=>v*(l*1.5+.08));}
   output.push({points,depth:clipped.reduce((v,a)=>v+a[2]/clipped.length,0),color:'rgb('+col.map(v=>Math.min(255,Math.round(v*255))).join(',')+')',ghost,ground:p.ground,n:p.n});
  }return output;
 }
 paint(faces,cam,ghost=false,t=0){const ctx=this.ctx;faces.sort((a,b)=>b.depth-a.depth);
  for(const face of faces){ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();
   if(ghost){ctx.save();ctx.clip();ctx.drawImage(this.back,Math.sin(t*6+face.n[0])*2.8,Math.cos(t*4+face.n[2])*1.8);ctx.globalAlpha=face.ghost*.68;ctx.fillStyle=face.color;ctx.fill();ctx.restore();ctx.strokeStyle='rgba(126,218,232,'+(.04+face.ghost*.2)+')';ctx.lineWidth=.7;ctx.stroke();}
   else{ctx.fillStyle=face.color;ctx.fill();}
  }
 }
 render(game,view,night=false,menu=false,recoil=0){
  this.resize();const ctx=this.ctx,p=game.actors[0],t=game.time;
  const cam=menu?{x:23,y:10,z:26,yaw:-.68+Math.sin(performance.now()*.00009)*.08,pitch:-.2}:{x:p.x,y:p.y+1.52+(p.moving&&p.grounded?Math.sin(t*12)*.033:0),z:p.z,yaw:p.yaw,pitch:p.pitch+recoil};this.lastCamera=cam;
  const sky=ctx.createLinearGradient(0,0,0,this.height);sky.addColorStop(0,night?'#09221a':'#0c2639');sky.addColorStop(1,night?'#0f3022':'#173642');ctx.fillStyle=sky;ctx.fillRect(0,0,this.width,this.height);
  const faces=this.prepare(this.world,cam,night,p.flashlight);this.paint(faces.filter(f=>f.ground),cam);
  const dynamic=[];const visible=a=>menu||[.3,.9,1.6].some(y=>lineClear(game.map,cam,{x:a.x,y:a.y+y,z:a.z}));
  for(const a of game.actors)if(a.alive&&(a.id!==0||menu)&&a.role!=='hidden'&&visible(a))dynamic.push(...actorGeometry(a,t));
  if(game.cfg.supplies)for(const b of game.map.boxes)if(b.readyAt<=t){cube(dynamic,{x:b.x,y:b.y+.4,z:b.z,w:.65,h:.65,d:.65,c:[[.3,.92,.55],[.3,.65,.95],[.91,.75,.28],[.93,.31,.23]][b.type]});}
  for(const e of game.effects)if(e.type==='spark')cube(dynamic,{x:e.x,y:e.y,z:e.z,w:.055,h:.055,d:.055,c:[1,.64,.18]});
  this.paint([...faces.filter(f=>!f.ground),...this.prepare(this.polygons(dynamic),cam,night,p.flashlight)],cam);
  const hidden=game.actors[game.hiddenId];if(hidden?.alive&&(hidden.id!==0||menu)&&visible(hidden)){
   this.backCtx.drawImage(this.canvas,0,0);const lit=game.actors.some(a=>a.alive&&game.illuminate(a,hidden)),scan=p.buffs.scan>t&&lineClear(game.map,cam,{x:hidden.x,y:hidden.y+1.5,z:hidden.z});
   const opacity=Math.max(game.opacity(hidden),lit?.55:0,scan?.7:0);this.paint(this.prepare(this.polygons(actorGeometry(hidden,t,true)).filter(face=>lineClear(game.map,cam,{x:face.center[0],y:face.center[1],z:face.center[2]})),cam,night,false,opacity),cam,true,t);
  }
  if(p.alive&&!menu)this.paint(this.prepare(this.polygons(handGeometry(p,t)),{x:0,y:0,z:0,yaw:0,pitch:0},night,false,0,true),cam);
  this.frames++;return cam;
 }
 project(x,y,z){if(!this.lastCamera)return null;const v=this.transform([x,y,z],this.lastCamera);if(v[2]<=0)return null;const focal=innerHeight/(2*Math.tan(1.22/2));return {x:innerWidth/2+v[0]/v[2]*focal,y:innerHeight/2-v[1]/v[2]*focal};}
}

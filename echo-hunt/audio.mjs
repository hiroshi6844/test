import {lineClear,clamp} from './core.mjs';
export class AudioEngine {
 constructor(){this.ctx=null;this.volume=.65;this.voices=0;}
 async unlock(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;try{if(!this.ctx){this.ctx=new AC();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination);this.noise=this.ctx.createBuffer(1,this.ctx.sampleRate*.4,this.ctx.sampleRate);const data=this.noise.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=(last+Math.random()*2-1)*.6;data[i]=last;}}if(this.ctx.state!=='running')await this.ctx.resume();this.master.gain.value=this.volume;return this.ctx.state==='running';}catch{return false;}}
 setVolume(v){this.volume=v;if(this.master)this.master.gain.value=v;}
 play(kind,pos,player,map,weapon=0){if(!this.ctx||this.ctx.state!=='running'||this.voices>24||!this.volume)return;let distance=pos?Math.hypot(pos.x-player.x,pos.y-player.y-1.5,pos.z-player.z):0;const max=kind==='shot'?36:kind==='step'?13:20;if(distance>max)return;let gain=(1-distance/max)**2,pan=0;if(pos&&distance>.8){const dx=pos.x-player.x,dz=pos.z-player.z;pan=clamp((dx*Math.cos(player.yaw)+dz*Math.sin(player.yaw))/distance,-1,1);if(!lineClear(map,{x:player.x,y:player.y+1.5,z:player.z},pos))gain*=.35;}
  let duration=.1,freq=130,volume=.4,noise=true;
  if(kind==='shot'){duration=weapon===1?.23:.12;freq=weapon===1?280:weapon===2?750:1000;volume=.6;}
  else if(kind==='step'){duration=.07;freq=160;volume=.22;}
  else if(kind==='land'){duration=.18;freq=190;volume=.45;}
  else if(kind==='slash'){duration=.2;freq=1700;volume=.5;}
  else if(kind==='hit'){duration=.1;freq=420;volume=.26;noise=false;}
  else if(kind==='reload'){duration=.12;freq=1900;volume=.2;}
  else {duration=.18;freq=kind==='role'?620:880;volume=.28;noise=false;}
  const ctx=this.ctx,t=ctx.currentTime,source=noise?ctx.createBufferSource():ctx.createOscillator(),filter=ctx.createBiquadFilter(),envelope=ctx.createGain();if(noise)source.buffer=this.noise;else{source.type='sine';source.frequency.setValueAtTime(freq,t);source.frequency.exponentialRampToValueAtTime(freq*.55,t+duration);}
  filter.type='lowpass';filter.frequency.value=freq;source.connect(filter);filter.connect(envelope);envelope.gain.setValueAtTime(Math.max(.0001,gain*volume),t);envelope.gain.exponentialRampToValueAtTime(.0001,t+duration);
  if(ctx.createStereoPanner){const stereo=ctx.createStereoPanner();stereo.pan.value=pan;envelope.connect(stereo);stereo.connect(this.master);source.onended=()=>{this.voices--;source.disconnect();filter.disconnect();envelope.disconnect();stereo.disconnect();};}else{envelope.connect(this.master);source.onended=()=>{this.voices--;source.disconnect();filter.disconnect();envelope.disconnect();};}
  this.voices++;source.start(t);source.stop(t+duration+.015);
 }
}

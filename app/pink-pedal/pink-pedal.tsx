"use client";
import { useEffect, useRef, useState } from "react";
import Link from "../app-link";
import { Bike, Gamepad2, Pause, Play, RotateCcw, RefreshCw, Target, Utensils, Crosshair, Volume2, VolumeX, Infinity as InfinityIcon } from "lucide-react";
import type { PinkEngine, PedalState } from "@/lib/pink-engine";
const initial:PedalState={phase:"ready",score:0,time:90,ammo:6,hits:0,shots:0,combo:0,reloading:false,message:"",weapon:"schnitzel",voices:true,quote:""};
export default function PinkPedal(){
 const host=useRef<HTMLDivElement>(null),engine=useRef<PinkEngine|null>(null);const [state,setState]=useState(initial),[ready,setReady]=useState(false),[error,setError]=useState("");
 const [force2d,setForce2d]=useState(false),[attempt,setAttempt]=useState(0),[renderMode,setRenderMode]=useState("");
 useEffect(()=>{
   let cancelled=false;const container=host.current;
   setReady(false);setError("");setState(initial);setRenderMode("");
   const contextLost=(event:Event)=>{event.preventDefault();setForce2d(true);};
   container?.addEventListener("webglcontextlost",contextLost,true);
   import("@/lib/pink-engine").then(({PinkEngine})=>{
     if(cancelled||!container)return;
     try{engine.current=new PinkEngine(container,setState,force2d);setRenderMode(engine.current.renderer.domElement.dataset.renderer==="canvas2d"?"2D":"3D");setReady(true);}
     catch(cause){console.error("Pink Pedal initialization failed:",cause);container.replaceChildren();setError("Die Grafik konnte nicht gestartet werden. Bitte den 2D-Modus versuchen oder erneut starten.");}
   }).catch(cause=>{console.error("Pink Pedal module loading failed:",cause);setError("Das Spiel konnte nicht geladen werden. Bitte erneut versuchen.");});
   return()=>{cancelled=true;container?.removeEventListener("webglcontextlost",contextLost,true);engine.current?.destroy();engine.current=null;};
 },[force2d,attempt]);
 const start=()=>engine.current?.start();const accuracy=state.shots?Math.round(state.hits/state.shots*100):0;
 const loadout=(inRound=false)=><div className={`pedal-loadout ${inRound?"in-round":""}`} role="group" aria-label="Wurfmodus"><button aria-pressed={state.weapon==="paintball"} onClick={()=>engine.current?.selectWeapon("paintball")}><Crosshair size={17}/>Paintball</button><button aria-pressed={state.weapon==="schnitzel"} onClick={()=>engine.current?.selectWeapon("schnitzel")}><Utensils size={17}/>Schnitzel</button></div>;
 return <main className={`pedal-game phase-${state.phase}`}>
   <div className="pedal-world" ref={host}/>
   <header className="pedal-header"><Link href="/" className="pedal-home" title="Zur Spielhalle"><Gamepad2 size={21}/><span>MARTIN'S ARCADE</span></Link><span className="pedal-logo"><Bike size={23}/>PINK PEDAL</span><button className="pedal-icon" onClick={()=>engine.current?.pause()} aria-label="Spiel pausieren" disabled={state.phase!=="playing"}><Pause size={21}/></button></header>
   {state.phase!=="ready"&&<><div className="pedal-scoreboard"><div><span>PUNKTE</span><strong>{state.score.toLocaleString("de-DE")}</strong></div><div className={state.time<15?"time-low":""}><span>ZEIT</span><strong>{Math.ceil(state.time)}<small>s</small></strong></div><div><span>TREFFER</span><strong>{state.hits}</strong></div></div><div className="pedal-quote" role="status">{state.quote}</div><div className="pedal-message" role="status">{state.message}</div><div className="pedal-ammo">{state.weapon==="schnitzel"?<div className="schnitzel-stock"><Utensils size={20}/><InfinityIcon size={25}/><span>SCHNITZEL</span></div>:<><div className="paintballs" aria-label={`${state.ammo} Schuss`}>{Array.from({length:6},(_,i)=><i key={i} className={i<state.ammo?"loaded":""}/>)}</div><button onClick={()=>engine.current?.reload()} disabled={state.reloading||state.phase!=="playing"} aria-label="Nachladen"><RefreshCw size={20} className={state.reloading?"spin":""}/><span>{state.reloading?"LAEDT...":"NACHLADEN"}</span></button></>}</div>{state.phase==="playing"&&loadout(true)}</>}
   {(state.phase==="ready"||state.phase==="playing")&&<button className="pedal-voice" title="Trefferstimmen" aria-label="Trefferstimmen" aria-pressed={state.voices} onClick={()=>engine.current?.toggleVoices()}>{state.voices?<Volume2 size={21}/>:<VolumeX size={21}/>}</button>}
   {state.phase==="ready"&&<section className="pedal-start"><span className="pink-eyebrow">MARTIN'S ARCADE / NR. 02</span><h1>PINK<br/><span>PEDAL</span></h1><div className="pedal-round-info"><span>90 SEKUNDEN</span><span>3 FAHRSPUREN</span></div>{loadout()}<div className="pedal-render-modes" role="group" aria-label="Grafikmodus"><button aria-pressed={!force2d} onClick={()=>setForce2d(false)}>Auto</button><button aria-pressed={force2d} onClick={()=>setForce2d(true)}>2D</button>{ready&&<span>{renderMode}</span>}</div><button className="pink-button" disabled={!ready&&!error} onClick={error?()=>setAttempt(n=>n+1):start}><Play size={20} fill="currentColor"/>{error?"ERNEUT VERSUCHEN":ready?"PUNKTJAGD STARTEN":"LAEDT..."}</button>{error&&<p className="error" role="alert">{error}</p>}</section>}
   {(state.phase==="paused"||state.phase==="finished")&&<div className="pedal-overlay"><section className="pedal-summary"><Target size={30}/><span className="pink-eyebrow">PINK PEDAL</span><h2>{state.phase==="paused"?"KURZE PAUSE":"RUNDE GESCHAFFT"}</h2><strong className="pedal-final-score">{state.score.toLocaleString("de-DE")}<small>PUNKTE</small></strong><div className="pedal-results"><span>{state.hits} Treffer</span><span>{accuracy}% Genauigkeit</span><span>{state.combo} Treffer in Folge</span></div><button className="pink-button" onClick={state.phase==="paused"?()=>engine.current?.resume():start}>{state.phase==="paused"?<Play size={18}/>:<RotateCcw size={18}/>} {state.phase==="paused"?"WEITERSPIELEN":"NOCH EINE RUNDE"}</button><Link className="pink-back" href="/">ZUR SPIELHALLE</Link></section></div>}
 </main>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "./app-link";
import { Crosshair, Shield, Volume2, Settings2, X, Play, Pause, RotateCcw, LogOut, ArrowUp, ArrowDown, Target, Maximize, Check, Zap, Rocket, Bomb, Package, RadioTower, MoveUp, Feather, Infinity as InfinityIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { weapons, maps, categories, type MatchConfig, type GameState } from "@/lib/arsenal";
import type { Shooter } from "@/lib/engine";

const defaultConfig:MatchConfig={map:"dockyard",weapon:"m4",sidearm:"usp",difficulty:"regular",sensitivity:1,volume:.6};
const initial:GameState={phase:"lobby",health:100,ammo:30,reserve:180,kills:0,deaths:0,time:180,weapon:"m4",reloading:false,reloadProgress:0,hit:false,hurt:false,notice:"",streak:0,score:0,grenades:2,aiming:false,radar:[],yaw:0,flying:false,c4:0,altitude:0};

export default function Game({playerName,signOut}:{playerName:string;signOut:string|null}){
  const host=useRef<HTMLDivElement>(null),engine=useRef<Shooter|null>(null);
  const [config,setConfig]=useState(defaultConfig),[state,setState]=useState(initial),[ready,setReady]=useState(false),[error,setError]=useState("");
  const [attempt,setAttempt]=useState(0),[graphicsError,setGraphicsError]=useState(false);
  const configRef=useRef(config);configRef.current=config;
  const [armory,setArmory]=useState(false),[settings,setSettings]=useState(false),[category,setCategory]=useState("Sturmgewehre");
  const [touch,setTouch]=useState(false),[stick,setStick]=useState({x:0,y:0});
  const lookPointer=useRef<{x:number;y:number;id:number}|null>(null),movePointer=useRef<{x:number;y:number;id:number}|null>(null);
  useEffect(()=>{
    setTouch(matchMedia("(pointer:coarse)").matches);
    try{const saved=JSON.parse(localStorage.getItem("strikepoint-settings")||"null");if(saved&&Number.isFinite(saved.sensitivity)&&Number.isFinite(saved.volume))setConfig(c=>({...c,sensitivity:Math.max(.3,Math.min(2.5,saved.sensitivity)),volume:Math.max(0,Math.min(1,saved.volume))}));}catch{}
  },[]);
  useEffect(()=>{
    let cancelled=false;const container=host.current;
    setReady(false);setError("");setGraphicsError(false);setState(initial);
    const contextLost=(event:Event)=>{
      event.preventDefault();engine.current?.destroy();engine.current=null;
      setReady(false);setState(initial);setGraphicsError(true);
      setError("Die Verbindung zur 3D-Grafik wurde unterbrochen. Bitte erneut versuchen.");
    };
    container?.addEventListener("webglcontextlost",contextLost,true);
    import("@/lib/engine").then(({Shooter})=>{
      if(cancelled||!container)return;
      try{engine.current=new Shooter(container,{...configRef.current},setState);setReady(true);}
      catch(cause){
        console.error("STRIKEPOINT initialization failed:",cause);container.replaceChildren();
        const unavailable=cause instanceof Error&&cause.name==="WebGLUnavailableError";
        setGraphicsError(unavailable);setError(unavailable?"WebGL 2 ist nicht verfuegbar. STRIKEPOINT kann die 3D-Grafik nicht starten.":"Das Spiel konnte nicht gestartet werden. Bitte erneut versuchen.");
      }
    }).catch(cause=>{if(cancelled)return;console.error("STRIKEPOINT module loading failed:",cause);setError("Die Spielengine konnte nicht geladen werden. Bitte erneut versuchen.");});
    return()=>{cancelled=true;container?.removeEventListener("webglcontextlost",contextLost,true);engine.current?.destroy();engine.current=null;};
  },[attempt]);
  useEffect(()=>{engine.current?.setMap(config.map);},[config.map]);
  useEffect(()=>{try{localStorage.setItem("strikepoint-settings",JSON.stringify({sensitivity:config.sensitivity,volume:config.volume}));}catch{}if(engine.current){engine.current.config.sensitivity=config.sensitivity;engine.current.config.volume=config.volume;}},[config.sensitivity,config.volume]);
  useEffect(()=>{
    const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void}}).modelContext;
    if(!context)return;const lifecycle=new AbortController();
    try{context.registerTool({name:"read_match_state",description:"Liest Map, Ausruestung und den aktuellen Spielstand.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input:unknown)=>{if(!input||typeof input!=="object"||Object.keys(input).length)throw new Error("Keine Parameter erwartet.");return {map:engine.current?.config.map,weapon:engine.current?.state.weapon,phase:engine.current?.state.phase,kills:engine.current?.state.kills};}},{signal:lifecycle.signal});}catch{}
    return()=>lifecycle.abort();
  },[]);
  const map=maps.find(m=>m.id===config.map)!;
  const selected=weapons.find(w=>w.id===config.weapon)!;
  const current=weapons.find(w=>w.id===state.weapon)!;
  const active=state.phase==="playing"||state.phase==="dead";
  const start=()=>{setArmory(false);setSettings(false);window.scrollTo(0,0);engine.current?.start({...config});};
  const formatTime=(n:number)=>{const seconds=Math.ceil(n);return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,"0")}`;};
  const fullscreen=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void document.documentElement.requestFullscreen().catch(()=>{});};
  return <main className={`game-root ${active?"in-match":""}`}>
    <div ref={host} className="world" />
    {state.phase==="lobby"&&<>
      <div className="lobby-shade" />
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Zur Spielhalle"><Zap size={26} fill="currentColor"/><span>STRIKEPOINT<span className="brand-sub">MARTIN'S ARCADE / SPIELHALLE</span></span></Link>
        <div className="top-mode"><span className="active-line"/>LOCAL OPERATIONS <span className="version">01.00</span></div>
        <div className="account"><Shield size={16}/><span>{playerName}</span>{signOut&&<a className="icon-button" href={signOut} target="_top" title="Abmelden"><LogOut size={17}/></a>}</div>
      </header>
      <section className="lobby-content">
        <div className="mission">
          <div className="eyebrow"><span className="small-rule"/> EINSATZGEBIET / {config.map==="dockyard"?"01":"02"}</div>
          <h1>{map.name}</h1><p className="map-sub">{map.description}</p>
          <div className="mission-facts"><span><Crosshair size={16}/> FREE FOR ALL</span><span>1 OPERATOR + 5 BOTS</span><span>03:00</span></div>
          <RadioGroup className="map-list" value={config.map} onValueChange={v=>setConfig(c=>({...c,map:v as MatchConfig["map"]}))} aria-label="Map auswaehlen">
            {maps.map((m,i)=><label className={`map-option ${config.map===m.id?"selected":""}`} key={m.id}><RadioGroupItem value={m.id} className="map-radio"/><span className="map-number">0{i+1}</span><span><strong>{m.name}</strong><small>{m.description}</small></span><span className="map-check">{config.map===m.id?<Check size={20}/>:<Crosshair size={20}/>}</span></label>)}
          </RadioGroup>
        </div>
        <aside className="loadout">
          <div className="panel-heading"><span>DEIN EINSATZ</span><span>SOLO / PVE</span></div>
          <div className="loadout-title"><Crosshair size={20}/><h2>Loadout</h2><button className="icon-button" title="Einstellungen" onClick={()=>setSettings(true)}><Settings2 size={20}/></button></div>
          <button className="weapon-choice" onClick={()=>setArmory(true)}><span className="eyebrow">PRIMAERWAFFE</span><strong>{selected.name}</strong><span>{selected.category}<span className="inline-action">ARSENAL <Crosshair size={14}/></span></span><div className="weapon-bars"><i style={{width:`${selected.damage}%`}}/><i style={{width:`${selected.rpm/10}%`}}/><i style={{width:`${100-selected.spread*500}%`}}/></div></button>
          <label className="field-label">SEKUNDAERWAFFE</label><Select value={config.sidearm} onValueChange={v=>setConfig(c=>({...c,sidearm:v}))}><SelectTrigger className="game-select" aria-label="Sekundaerwaffe"><SelectValue/></SelectTrigger><SelectContent>{weapons.filter(w=>w.category==="Pistolen").map(w=><SelectItem value={w.id} key={w.id}>{w.name}</SelectItem>)}</SelectContent></Select>
          <label className="field-label">BOT-STAERKE</label><Select value={config.difficulty} onValueChange={v=>setConfig(c=>({...c,difficulty:v as MatchConfig["difficulty"]}))}><SelectTrigger className="game-select" aria-label="Bot-Staerke"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="recruit">Rekrut</SelectItem><SelectItem value="regular">Soldat</SelectItem><SelectItem value="veteran">Veteran</SelectItem></SelectContent></Select>
          <div className="win-condition"><Target size={17}/><span>25 Eliminierungen <span>oder 3 Minuten</span></span></div>
          <button className="deploy-button" disabled={!ready&&!error} onClick={error?()=>setAttempt(n=>n+1):start}>{error?<RotateCcw size={20}/>:<Play size={20} fill="currentColor"/>}{error?"ERNEUT VERSUCHEN":ready?"EINSATZ STARTEN":"INITIALISIERUNG..."}</button>
          {error&&<div className="graphics-error"><p role="alert" className="error">{error}</p>{graphicsError&&<details><summary>Brave: Grafik pruefen</summary><p>Unter <code>brave://settings/system</code> die Grafikbeschleunigung aktivieren und Brave neu starten.</p><p>Falls es weiterhin nicht klappt: Unter <code>brave://gpu</code> den Status von WebGL2 und „Problems Detected“ pruefen.</p><Link href="/pink-pedal">Pink Pedal im 2D-Modus spielen</Link></details>}</div>}
        </aside>
      </section>
      <footer className="lobby-footer"><span role="status"><span className="status-dot"/> {error?"START FEHLGESCHLAGEN":ready?"BEREIT FUER DEN EINSATZ":"ENGINE STARTET"}</span><span>CLASSIC ARSENAL / 2007</span><button className="icon-button" title="Vollbild" onClick={fullscreen}><Maximize size={17}/></button></footer>
    </>}
    {state.phase!=="lobby"&&<>
      <div className={`damage-overlay ${state.hurt?"visible":""}`}/>
      <div className="match-top"><div className="radar"><div className="radar-lines"/>{state.radar.map((p,i)=><span key={i} className={p.enemy?"radar-enemy":"radar-player"} style={{left:`${(p.x+30)/60*100}%`,top:`${(p.z+30)/60*100}%`,transform:p.enemy?undefined:`rotate(${-state.yaw}rad)`}}/>)}<small>N</small></div><div className="match-score"><span>FREE FOR ALL</span><strong>{state.kills}<small> / 25</small></strong><time>{formatTime(state.time)}</time></div><button className="icon-button pause-button" title="Pause" onClick={()=>engine.current?.pause()}><Pause size={21}/></button></div>
      {active&&<><div className={`crosshair ${state.aiming?"aimed":""} ${state.hit?"hit":""}`}><i/><i/><i/><i/>{state.hit&&<X size={25}/>}</div><div className="notice" aria-live="polite">{state.notice}</div></>}
      <div className="hud-bottom"><div className="health"><div><Shield size={18}/><strong>{state.health}</strong><span>HP</span></div><div className="health-track"><i style={{width:`${state.health}%`}}/></div><small>{state.kills} KILLS <span>/</span> {state.deaths} DEATHS</small></div><div className="flight-state">{state.flying&&<><Feather size={18}/> FLUG <strong>{state.altitude.toFixed(0)} m</strong></>}</div><div className="ammo"><span>{current.name} <small>{current.mode.toUpperCase()}</small></span><strong aria-label="Unbegrenzte Munition"><InfinityIcon size={44}/></strong><span className="grenade-count">FRAG <InfinityIcon size={14}/> / C4 {state.c4}/4</span></div></div>
      {state.phase==="playing"&&<div className="combat-tools" aria-label="Ausrüstung und Bewegung">
        <button title="Raketenwerfer (3)" aria-label="Raketenwerfer" onClick={()=>engine.current?.switchWeapon(2)}><Rocket size={20}/></button>
        <button title="Granate werfen (G)" aria-label="Granate werfen" onClick={()=>engine.current?.grenade()}><Bomb size={20}/></button>
        <button title="C4 platzieren (V)" aria-label="C4 platzieren" onClick={()=>engine.current?.c4()}><Package size={20}/></button>
        <button title="C4 zünden (X)" aria-label="C4 zünden" disabled={!state.c4} onClick={()=>engine.current?.detonate()}><RadioTower size={20}/><small>{state.c4}</small></button>
        <button title="Hochklettern (E)" aria-label="Hochklettern" onClick={()=>engine.current?.climb()}><MoveUp size={20}/></button>
        <button title="Flugmodus (F)" aria-label="Flugmodus" aria-pressed={state.flying} onClick={()=>engine.current?.fly()}><Feather size={20}/></button>
        {state.flying&&<><button title="Aufsteigen (Leertaste)" aria-label="Aufsteigen" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);engine.current?.ascend(1);}} onPointerUp={()=>engine.current?.ascend(0)} onPointerCancel={()=>engine.current?.ascend(0)}><ArrowUp size={20}/></button><button title="Absteigen (Strg)" aria-label="Absteigen" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);engine.current?.ascend(-1);}} onPointerUp={()=>engine.current?.ascend(0)} onPointerCancel={()=>engine.current?.ascend(0)}><ArrowDown size={20}/></button></>}
      </div>}
      {state.phase==="dead"&&<div className="death-screen"><span>GEFALLEN</span><p>Wiedereinstieg...</p></div>}
      {(state.phase==="paused"||state.phase==="finished")&&<div className="pause-overlay"><section className="pause-menu"><div className="eyebrow">{map.name} / FREE FOR ALL</div><h2>{state.phase==="paused"?"EINSATZ PAUSIERT":state.kills>=25?"MISSION ERFUELLT":"EINSATZ BEENDET"}</h2><div className="results"><div><strong>{state.kills}</strong><span>KILLS</span></div><div><strong>{state.deaths}</strong><span>DEATHS</span></div><div><strong>{state.score}</strong><span>PUNKTE</span></div></div>{state.phase==="paused"?<button className="deploy-button" onClick={()=>engine.current?.resume()}><Play size={18}/>FORTSETZEN</button>:<button className="deploy-button" onClick={start}><RotateCcw size={18}/>ERNEUT SPIELEN</button>}<button className="secondary-button" onClick={()=>engine.current?.lobby()}>ZURUECK ZUM LOADOUT</button><button className="quiet-button" onClick={()=>setSettings(true)}><Settings2 size={16}/>Einstellungen</button></section></div>}
    </>}
    {touch&&active&&<div className="touch-controls"><div className="look-zone" aria-label="Blicksteuerung" onPointerDown={e=>{lookPointer.current={x:e.clientX,y:e.clientY,id:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{const p=lookPointer.current;if(p?.id!==e.pointerId)return;engine.current?.look((e.clientX-p.x)*1.8,(e.clientY-p.y)*1.8);lookPointer.current={x:e.clientX,y:e.clientY,id:e.pointerId};}} onPointerUp={()=>lookPointer.current=null} onPointerCancel={()=>lookPointer.current=null}/><div className="move-stick" aria-label="Bewegungssteuerung" onPointerDown={e=>{movePointer.current={x:e.clientX,y:e.clientY,id:e.pointerId};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{const p=movePointer.current;if(p?.id!==e.pointerId)return;const x=Math.max(-1,Math.min(1,(e.clientX-p.x)/38)),y=Math.max(-1,Math.min(1,(e.clientY-p.y)/38));engine.current?.move(x,y);setStick({x,y});}} onPointerUp={()=>{movePointer.current=null;engine.current?.move(0,0);setStick({x:0,y:0});}} onPointerCancel={()=>{movePointer.current=null;engine.current?.move(0,0);setStick({x:0,y:0});}}><i style={{transform:`translate(${stick.x*30}px,${stick.y*30}px)`}}/></div><button className="touch-fire" aria-label="Feuern" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);engine.current?.fire(true);}} onPointerUp={()=>engine.current?.fire(false)} onPointerCancel={()=>engine.current?.fire(false)}><Crosshair size={32}/></button><div className="touch-actions"><button aria-label="Zielen" onClick={()=>engine.current?.aim(!state.aiming)}><Target/></button><button aria-label="Springen" onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);engine.current?.jump();}} onPointerUp={()=>engine.current?.ascend(0)} onPointerCancel={()=>engine.current?.ascend(0)}><ArrowUp/></button><button aria-label="Waffe wechseln" onClick={()=>engine.current?.switchWeapon()}><RotateCcw/></button><button aria-label="Granate" onClick={()=>engine.current?.grenade()}>G</button></div></div>}
    <Dialog open={armory} onOpenChange={setArmory}><DialogContent className="armory-dialog"><DialogTitle>ARSENAL <span>27 WAFFEN / 2007</span></DialogTitle><DialogDescription>Primaerwaffe</DialogDescription><Tabs value={category} onValueChange={setCategory}><TabsList className="arsenal-tabs">{categories.map(c=><TabsTrigger value={c} key={c}>{c}</TabsTrigger>)}</TabsList>{categories.map(c=><TabsContent value={c} key={c}><div className="arsenal-grid">{weapons.filter(w=>w.category===c).map(w=><button key={w.id} className={`arsenal-weapon ${config.weapon===w.id?"chosen":""}`} onClick={()=>{setConfig(c=>({...c,weapon:w.id}));setArmory(false);}}><span>{w.mode.toUpperCase()}<span>{config.weapon===w.id&&<Check size={17}/>}</span></span><strong>{w.name}</strong><div><span>SCHADEN</span><meter min="0" max="110" value={w.damage}/></div><div><span>FEUERRATE</span><meter min="0" max="1000" value={w.rpm}/></div><small><InfinityIcon size={16}/> <span>OHNE NACHLADEN</span></small></button>)}</div></TabsContent>)}</Tabs><p className="arsenal-note">Eigenstaendige Modelle und Spielbalance. Kein offizielles Call-of-Duty-Produkt.</p></DialogContent></Dialog>
    <Dialog open={settings} onOpenChange={setSettings}><DialogContent className="settings-dialog"><DialogTitle>EINSTELLUNGEN</DialogTitle><DialogDescription>Audio & Steuerung</DialogDescription><label className="slider-label"><Crosshair size={17}/>Mausempfindlichkeit <span>{config.sensitivity.toFixed(1)}</span></label><Slider aria-label="Mausempfindlichkeit" value={[config.sensitivity]} onValueChange={v=>setConfig(c=>({...c,sensitivity:v[0]}))} min={.3} max={2.5} step={.1}/><label className="slider-label"><Volume2 size={17}/>Lautstaerke <span>{Math.round(config.volume*100)}%</span></label><Slider aria-label="Lautstaerke" value={[config.volume]} onValueChange={v=>setConfig(c=>({...c,volume:v[0]}))} min={0} max={1} step={.05}/><button className="secondary-button" onClick={fullscreen}><Maximize size={17}/>Vollbild</button></DialogContent></Dialog>
  </main>;
}

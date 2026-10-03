"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, Radio, Volume2, VolumeX, ExternalLink, LoaderCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";

const STREAM="https://stream.sunshine-live.de/live/mp3-192/stream.sunshine-live.de/";
export default function RadioPlayer(){
  const audio=useRef<HTMLAudioElement>(null),generation=useRef(0);
  const [status,setStatus]=useState<"off"|"loading"|"playing"|"error">("off"),[volume,setVolume]=useState(.25),[muted,setMuted]=useState(false);
  useEffect(()=>{try{const saved=Number(localStorage.getItem("radio-volume")??.25);if(Number.isFinite(saved))setVolume(Math.min(1,Math.max(0,saved)));}catch{}return()=>{generation.current++;};},[]);
  useEffect(()=>{if(audio.current){audio.current.volume=volume;audio.current.muted=muted;}try{localStorage.setItem("radio-volume",String(volume));}catch{}},[volume,muted]);
  useEffect(()=>{if(status!=="loading")return;const timer=setTimeout(()=>{generation.current++;audio.current?.pause();setStatus("error");},20000);return()=>clearTimeout(timer);},[status]);
  async function toggle(){
    const element=audio.current;if(!element)return;const request=++generation.current;
    if(status==="playing"||status==="loading"){element.pause();element.removeAttribute("src");element.load();setStatus("off");return;}
    setStatus("loading");element.src=STREAM;element.volume=volume;element.muted=muted;
    try{await element.play();if(request===generation.current)setStatus("playing");}catch{if(request===generation.current)setStatus("error");}
  }
  return <aside className="radio-player" aria-label="Hintergrundradio">
    <audio ref={audio} preload="none" onPlaying={()=>setStatus("playing")} onWaiting={()=>setStatus(s=>s==="playing"?"loading":s)} onError={()=>setStatus("error")} />
    <Radio size={20} className="radio-symbol"/>
    <div className="radio-name"><a href="https://www.sunshine-live.de/" target="_blank" rel="noreferrer">SUNSHINE LIVE</a><span role="status">{status==="playing"?"LIVE / ELECTRONIC MUSIC":status==="loading"?"VERBINDE...":status==="error"?"STREAM NICHT ERREICHBAR":"RADIO AUS"}</span></div>
    <button className="radio-toggle" onClick={toggle} aria-label={status==="playing"||status==="loading"?"Radio stoppen":"Radio abspielen"}>{status==="loading"?<LoaderCircle size={18} className="spin"/>:status==="playing"?<Pause size={18}/>:<Play size={18} fill="currentColor"/>}</button>
    <button className="icon-button" onClick={()=>setMuted(v=>!v)} title={muted?"Radio-Ton einschalten":"Radio stummschalten"}>{muted||volume===0?<VolumeX size={18}/>:<Volume2 size={18}/>}</button>
    <Slider className="radio-volume" aria-label="Radio-Lautstaerke" min={0} max={1} step={.05} value={[volume]} onValueChange={v=>setVolume(v[0])}/>
    {status==="error"&&<a className="radio-fallback" href="https://www.sunshine-live.de/" target="_blank" rel="noreferrer" title="Sunshine Live oeffnen"><ExternalLink size={17}/></a>}
    <span className="radio-credit">24/7 ELECTRONIC MUSIC</span>
  </aside>;
}

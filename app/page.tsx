import Link from "./app-link";
import { Gamepad2, Play, Shield, LogOut, Crosshair, Bike, Radio } from "lucide-react";
import { getChatGPTUser, requireChatGPTUser, chatGPTSignOutPath } from "./chatgpt-auth";
import { weapons } from "@/lib/arsenal";
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = process.env.NODE_ENV === "development" ? await getChatGPTUser() : await requireChatGPTUser("/");
  return <main className="hub">
    <header className="hub-header">
      <Link className="hub-brand" href="/" aria-label="Martin's Arcade"><Gamepad2 size={26}/><strong>M<span>/A</span></strong></Link>
      <span className="hub-section">SPIELHALLE</span>
      <div className="hub-account"><Shield size={16}/><span>{user?.fullName||user?.email.split("@")[0]||"Local Operator"}</span>{user&&<a href={chatGPTSignOutPath()} target="_top" title="Abmelden" className="icon-button"><LogOut size={18}/></a>}</div>
    </header>
    <section className="hub-library">
      <div className="library-heading"><div><span className="eyebrow">DEINE SAMMLUNG / 01</span><h1>Martin&apos;s Arcade<span>.</span></h1></div><span className="game-total">02 <small>SPIELE</small></span></div>
      <div className="game-library">
        <Link href="/strikepoint" className="game-tile strike-tile">
          <div className="tile-art"><img src="/strikepoint-preview.jpg" alt="Dockyard mit Containern, Hafenkran und Industriegebaeuden" width={1280} height={800}/><span className="tile-badge"><Crosshair size={15}/> TACTICAL FPS</span><span className="tile-play"><Play size={24} fill="currentColor"/></span></div>
          <div className="tile-info"><div><span className="tile-index">01 / SOLO GEGEN BOTS</span><h2>STRIKEPOINT</h2><p>Dockyard & Relay</p></div><span className="tile-detail">2 MAPS<br/>{weapons.length} WAFFEN</span></div>
          <div className="tile-bottom"><span>Freier Flug · Unbegrenzte Munition</span><span>SPIELEN <Play size={12} fill="currentColor"/></span></div>
        </Link>
        <Link href="/pink-pedal" className="game-tile pink-tile">
          <div className="tile-art"><img src="/pink-pedal-preview.jpg" alt="Comic-E-Bikerinnen in pinken Kleidern auf der Parkstrecke" width={1280} height={800}/><span className="tile-badge"><Bike size={16}/> ARCADE SHOOTER</span><span className="tile-play"><Play size={24} fill="currentColor"/></span></div>
          <div className="tile-info"><div><span className="tile-index">02 / PUNKTJAGD</span><h2>PINK PEDAL</h2><p>Vollgas im Stadtpark</p></div><span className="tile-detail">90 SEKUNDEN<br/>3 FAHRSPUREN</span></div>
          <div className="tile-bottom"><span>Paintball · Schnitzel</span><span>SPIELEN <Play size={12} fill="currentColor"/></span></div>
        </Link>
      </div>
      <footer className="library-footer"><span>M/A · PRIVATE COLLECTION</span><span><Radio size={14}/> SUNSHINE LIVE</span></footer>
    </section>
  </main>;
}

import Link from "./app-link";
import { Gamepad2, Play, Shield, LogOut, Crosshair, Bike } from "lucide-react";
import { getChatGPTUser, requireChatGPTUser, chatGPTSignOutPath } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = process.env.NODE_ENV === "development" ? await getChatGPTUser() : await requireChatGPTUser("/");
  return <main className="hub">
    <header className="hub-header"><Link className="hub-brand" href="/"><Gamepad2 size={27}/><strong>247<span>ARCADE</span></strong></Link><div className="hub-account"><Shield size={16}/><span>{user?.fullName||user?.email.split("@")[0]||"Local Operator"}</span>{user&&<a href={chatGPTSignOutPath()} target="_top" title="Abmelden" className="icon-button"><LogOut size={18}/></a>}</div></header>
    <section className="hub-library"><div className="library-heading"><div><span className="eyebrow">DEINE SPIELE</span><h1>Spielhalle</h1></div><span className="game-total">02 <small>SPIELE</small></span></div>
    <div className="game-library">
      <Link href="/strikepoint" className="game-tile strike-tile"><div className="tile-art"><img src="/strikepoint-preview.jpg" alt="Dockyard mit Containern, Hafenkran und Industriegebaeuden"/><span className="tile-badge"><Crosshair size={14}/> TACTICAL FPS</span><span className="tile-play"><Play size={26} fill="currentColor"/></span></div><div className="tile-info"><div><span className="tile-index">01 / SOLO GEGEN BOTS</span><h2>STRIKEPOINT</h2><p>Dockyard & Relay</p></div><span className="tile-detail">2 MAPS<br/>26 WAFFEN</span></div></Link>
      <Link href="/pink-pedal" className="game-tile pink-tile"><div className="tile-art"><img src="/pink-pedal-preview.jpg" alt="Rundliche Comic-E-Biker in pinken Kleidern auf einer bunten Parkstrecke"/><span className="tile-badge"><Bike size={15}/> ARCADE SHOOTER</span><span className="tile-play"><Play size={26} fill="currentColor"/></span></div><div className="tile-info"><div><span className="tile-index">02 / PUNKTJAGD</span><h2>PINK PEDAL</h2><p>Vollgas im Stadtpark</p></div><span className="tile-detail">90 SEKUNDEN<br/>6 SCHUSS</span></div></Link>
    </div><footer className="library-footer"><span>247 / PLAY SOMETHING</span><span>SOLO COLLECTION · VOL. 02</span></footer></section>
  </main>;
}

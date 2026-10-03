export type Category = "Sturmgewehre" | "Maschinenpistolen" | "Leichte MGs" | "Schrotflinten" | "Scharfschuetzen" | "Pistolen" | "Raketenwerfer";
export type Weapon = { id: string; name: string; category: Category; damage: number; rpm: number; mag: number; reload: number; spread: number; mode: "auto" | "semi" | "burst" | "bolt"; pellets?: number; range: number };
const w = (id: string, name: string, category: Category, damage: number, rpm: number, mag: number, reload: number, spread: number, mode: Weapon["mode"] = "auto", range = 60, pellets = 1): Weapon => ({id,name,category,damage,rpm,mag,reload,spread,mode,range,pellets});
export const weapons: Weapon[] = [
  w("m4","M4 Carbine","Sturmgewehre",28,800,30,2.1,.022),
  w("m16","M16A4","Sturmgewehre",34,900,30,2.2,.018,"burst"),
  w("ak47","AK-47","Sturmgewehre",36,600,30,2.5,.029),
  w("g3","G3","Sturmgewehre",44,450,20,2.4,.016,"semi"),
  w("g36","G36C","Sturmgewehre",30,750,30,2.3,.021),
  w("m14","M14","Sturmgewehre",49,400,20,2.5,.02,"semi"),
  w("mp44","MP44","Sturmgewehre",38,500,30,2.8,.03),
  w("mp5","MP5","Maschinenpistolen",29,800,30,1.8,.03,"auto",35),
  w("skorpion","Skorpion","Maschinenpistolen",27,850,20,1.7,.028,"auto",28),
  w("uzi","Mini-Uzi","Maschinenpistolen",24,950,32,1.9,.035,"auto",30),
  w("ak74","AK-74u","Maschinenpistolen",33,750,30,2,.029,"auto",38),
  w("p90","P90","Maschinenpistolen",25,900,50,2.6,.027,"auto",38),
  w("m249","M249 SAW","Leichte MGs",30,850,100,5,.032),
  w("rpd","RPD","Leichte MGs",38,650,100,5.5,.028),
  w("m60","M60E4","Leichte MGs",43,550,100,5.8,.036),
  w("w1200","W1200","Schrotflinten",20,75,7,3.3,.095,"bolt",18,8),
  w("m1014","M1014","Schrotflinten",18,240,4,2.8,.09,"semi",16,8),
  w("m40","M40A3","Scharfschuetzen",100,55,5,3,.008,"bolt",120),
  w("m21","M21","Scharfschuetzen",65,240,10,2.7,.012,"semi",110),
  w("dragunov","Dragunov","Scharfschuetzen",75,200,10,2.9,.012,"semi",110),
  w("r700","R700","Scharfschuetzen",105,50,4,3.2,.007,"bolt",130),
  w("barrett","Barrett .50cal","Scharfschuetzen",95,180,10,3.5,.017,"semi",140),
  w("usp","USP .45","Pistolen",35,350,12,1.3,.026,"semi",32),
  w("m9","M9","Pistolen",30,450,15,1.2,.024,"semi",30),
  w("m1911","M1911 .45","Pistolen",40,350,8,1.3,.024,"semi",32),
  w("deagle","Desert Eagle","Pistolen",60,260,7,1.7,.03,"semi",45),
  w("rpg","RPG-7","Raketenwerfer",200,45,1,0,0,"semi",150),
];
export const categories = [...new Set(weapons.map(w=>w.category))];
export const maps = [
  {id:"dockyard",name:"DOCKYARD",label:"01 / INDUSTRIAL PORT",description:"Container-Terminal",color:"#d7ef72"},
  {id:"relay",name:"RELAY",label:"02 / RESEARCH FACILITY",description:"Alpine Forschungsstation",color:"#78dce5"},
] as const;
export type MapId = typeof maps[number]["id"];
export type MatchConfig = {map:MapId; weapon:string; sidearm:string; difficulty:"recruit"|"regular"|"veteran"; sensitivity:number; volume:number; graphics?:import("./graphics-settings").GraphicsQuality};
export type GameState = {phase:"lobby"|"playing"|"paused"|"dead"|"finished";health:number;ammo:number;reserve:number;kills:number;deaths:number;time:number;weapon:string;reloading:boolean;reloadProgress:number;hit:boolean;hurt:boolean;notice:string;streak:number;score:number;grenades:number;aiming:boolean;radar:{x:number;z:number;enemy:boolean}[];yaw:number;flying:boolean;c4:number;altitude:number};

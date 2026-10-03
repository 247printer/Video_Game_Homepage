import PinkPedal from "./pink-pedal";
import { requireChatGPTUser } from "../chatgpt-auth";
export const dynamic="force-dynamic";
export const metadata={title:"PINK PEDAL | MARTIN'S ARCADE"};
export default async function Page(){if(process.env.NODE_ENV!=="development")await requireChatGPTUser("/pink-pedal");return <PinkPedal/>;}

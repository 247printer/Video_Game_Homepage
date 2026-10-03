import Game from "../game";
import { getChatGPTUser, requireChatGPTUser, chatGPTSignOutPath } from "../chatgpt-auth";
export const dynamic="force-dynamic";
export const metadata={title:"STRIKEPOINT | 247 ARCADE"};
export default async function Strikepoint(){
 const user=process.env.NODE_ENV==="development"?await getChatGPTUser():await requireChatGPTUser("/strikepoint");
 return <Game playerName={user?.fullName||user?.email.split("@")[0]||"Local Operator"} signOut={user?chatGPTSignOutPath():null}/>;
}

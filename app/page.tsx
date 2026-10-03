import Game from "./game";
import { getChatGPTUser, requireChatGPTUser, chatGPTSignOutPath } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = process.env.NODE_ENV === "development" ? await getChatGPTUser() : await requireChatGPTUser("/");
  return <Game playerName={user?.fullName || user?.email.split("@")[0] || "Local Operator"} signOut={user ? chatGPTSignOutPath() : null} />;
}

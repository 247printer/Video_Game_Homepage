import type { Metadata } from "next";
import "./globals.css";
import RadioPlayer from "./radio";
import "./arcade.css";

export const metadata: Metadata = {
  title: "247 ARCADE | STRIKEPOINT & Pink Pedal",
  description: "Deine Spielhalle: STRIKEPOINT, Pink Pedal und Sunshine Live.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">{children}<RadioPlayer /></body>
    </html>
  );
}

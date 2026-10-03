import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "STRIKEPOINT | Tactical Bot Arena",
  description: "Zwei Schauplaetze. Dein Arsenal. Ein browserbasierter 3D-Shooter gegen Bots.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}

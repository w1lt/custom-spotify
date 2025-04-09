import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import { PlayerProvider } from "@/context/PlayerContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spotify Player App",
  description: "Listen to Spotify",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Script
          src="https://sdk.scdn.co/spotify-player.js"
          strategy="beforeInteractive"
        />
        <AuthProvider>
          <PlayerProvider>{children}</PlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

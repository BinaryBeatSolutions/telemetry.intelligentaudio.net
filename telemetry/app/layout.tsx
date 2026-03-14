import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "NEXUS [PULSE-MIRROR] | IntelligentAudio.NET",
    description: "Real-time Zero-Heap Telemetry Mirror - Protocol: NXP v1.0",
    viewport: "width=device-width, initial-scale=1, maximum-scale=1",
    icons: {
        icon: "/favicon.ico", // Se till att ha en grön ikon här för rätt känsla
    },
    openGraph: {
        title: "NEXUS [PULSE-MIRROR]",
        description: "Nano-Standard Verification & Shared Memory Registry Monitor",
        images:, // Om du vill ha en snygg bild när du delar länken
    },
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
              {children}
              <Analytics />
      </body>
    </html>
  );
}

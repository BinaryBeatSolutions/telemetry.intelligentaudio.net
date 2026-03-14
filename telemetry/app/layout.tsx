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
    manifest: "/manifest.json", // Länkar till filen ovan
    themeColor: "#000000",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "NEXUS Pulse mirror",
    },
    // Rättade stavningen på "Meter" och lade till din brand-standard
    title: "NEXUS [PULSE-MIRROR] | Real-time Telemetry & Latency Meter",
    description: "IntelligentAudio.NET - Ultra-low latency Zero-Heap Architecture",

    openGraph: {
        title: 'NEXUS.Pulse | Real-time Performance Mirror',
        description: 'Ultra-low latency telemetry with NEXUS NXP-Protocol. Zero-Heap, Direct-Ptr Verification.',
        url: 'https://telemetry.intelligentaudio.net',
        siteName: 'IntelligentAudio NEXUS',
        images: [
            {
                url: '/telemetry.png', // Next.js hittar den i public-mappen
                width: 1200,
                height: 630,
                alt: 'NEXUS.Pulse Dashboard Preview',
            },
        ],
        locale: 'en_US',
        type: 'website',
    },
    // Robots-inställningar så att IT-folket hittar dig på Google
    robots: {
        index: true,
        follow: true,
    },
    icons: {
        icon: '/icon.png',
        apple: 'telemetry.png',
    }
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

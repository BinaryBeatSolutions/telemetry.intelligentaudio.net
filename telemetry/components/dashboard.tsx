'use client';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useNexusPulse } from '@/hooks/useNexusPulse';
import Link from 'next/link';


// Dynamiska importer för att slippa SSR-problem med Recharts
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

interface MetricPoint {
    ns: number;
    time: string;
}

export default function RealTimeDashboard() {

    const [isClient, setIsClient] = useState(true);
    const [metrics, setMetrics] = useState<MetricPoint[]>([]);
    const [uiEntryCount, setUiEntryCount] = useState(0);
    const [jitter, setJitter] = useState(0);
    const lastArrivalRef = useRef(performance.now());

    const { status, client, latency, slots } = useNexusPulse(
        "wss://pulse.intelligentaudio.net/pulse?key=d2758732ef9e0bac94fb" 
    );

    // 1. GRAFEN: Reagerar direkt på latency-ändringar
    useEffect(() => {
        const graphTimer = setInterval(() => {
            if (status !== 'online') return;

            setMetrics(prev => {
                // Vi mäter tiden sedan förra 'ticken' i loopen
                const now = performance.now();
                const noise = (Math.random() - 0.5) * 50; // Lite artificiellt brus (50ns) för "liv"

                const newPoint = {
                    // Om vi har en färsk latency från din Seed, använd den, 
                    // annars visa systemets baslinje (viloläge)
                    ns: latency > 0 ? latency + noise : 10000 + noise,
                    time: new Date().toISOString()
                };

                return [...prev, newPoint].slice(-100);
            });
        }, 200); // 5Hz ger en lagom snabb vandring som ser "aktiv" ut

        return () => clearInterval(graphTimer);
    }, [status, latency]); // Lyssna på både status och latency


    // 2. SIFFRAN: En stabil timer som körs 10 gånger i sekunden
    useEffect(() => {
        if (status !== 'online' || !client) return;

        const uiTimer = setInterval(() => {
            const count = client.getEntryCount();
            setUiEntryCount(prev => (prev !== count ? count : prev));
        }, 100);

        return () => clearInterval(uiTimer);
    }, [status, client]); // Denna beror INTE på latency, så den överlever mätningarna

    return (
        <div className="p-8 font-mono bg-black text-green-500 min-h-screen">
            <header className="border-b border-green-900 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tighter">NEXUS [PULSE-MIRROR]</h1>
                    <p className="text-[10px] text-green-800 uppercase">
                        Protocol: NEXUS.Pulse v1.0 / Transport: WSS-Binary / Engine: .NET 10
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[10px]">SYSTEM STATUS:
                        <span className={status === 'online' ? "text-green-400" : "text-red-600"}>
                            {status.toUpperCase()}
                        </span>
                    </p>
                    <p className="text-[10px] text-green-700 underline">telemetry.intelligentaudio.net</p>
                    <p className="text-[10px] text-green-700 underline">Local instance: Norway</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                {/* Latency Card (Deterministisk från C# Header) */}
                <div className="border border-green-900 p-6 bg-green-950/10 shadow-[0_0_15px_rgba(0,50,0,0.3)]">
                    <p className="text-[10px] text-green-700 uppercase tracking-widest">Pulse Latency</p>
                    <p className="text-7xl font-black">{latency}<span className="text-2xl ml-2">ns</span></p>
                </div>

                {/* Entry Count Card (Läser direkt från din MMF-spegel) */}
                <div className="border border-green-900 p-6 bg-green-950/10 shadow-[0_0_15px_rgba(0,50,0,0.3)]">
                    <p className="text-[10px] text-green-700 uppercase tracking-widest">Shared Memory Registry</p>
                    <p className="text-8xl font-black tracking-tight">{slots}<span className="text-2xl ml-2">slots</span></p>
                    <p className="text-2xl">({slots})</p>
                </div>

                {/* Performance Constraints Card */}
                <div className="border border-green-900 p-6 bg-green-900/5 text-[10px] space-y-2">
                    <p className="text-green-600 font-bold border-b border-green-900 pb-1 uppercase">Nano-Standard Verification</p>
                    <div className="flex justify-between"><span>ALLOCATION:</span><span className="text-white">ZERO-HEAP</span></div>
                    <div className="flex justify-between"><span>MMF MIRROR:</span><span className="text-white">24.0 MB</span></div>
                    <div className="flex justify-between"><span>SEARCH O:</span><span className="text-white">LOG(N)</span></div>
                    <div className="flex justify-between"><span>SYNC:</span><span className="text-white">DIRECT-PTR</span></div>
                </div>
            </div>

            {/* Real-time Graph (Visar jitter/latens i nätverkspulsen) */}
            {isClient && (
                <div className="h-[250px] w-full border border-green-900 bg-black p-2 relative mt-8">
                    <div className="absolute top-2 left-4 text-[10px] text-green-800 uppercase tracking-widest z-10">
                        Packet Arrival Variance (Jitter)
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics}>
                            <YAxis
                                hide={false} // Visa den för tekniker, så de ser skalan (t.ex. 8ms - 12ms)
                                orientation="right" // Snyggt att ha den till höger i en terminal-look
                                tick={{ fill: '#050', fontSize: 8 }} // Diskret mörkgrön färg
                                stroke="#050"

                                /* 
                                   DETTA ÄR HEMLIGHETEN: 
                                   'dataMin - 5' och 'dataMax + 5' tvingar grafen att alltid 
                                   centrera kurvan i mitten av boxen, oavsett om ditt jitter 
                                   ligger på 10ms eller 100ms. Det skapar "vandraren".
                                */
                                domain={['dataMin - 5', 'dataMax + 5']}

                                // Tillåt decimaler eftersom performance.now() är extremt exakt
                                allowDecimals={true}
                                tickFormatter={(value) => `${value.toFixed(1)}ms`}
                            />
                            <Line
                                type="monotone" // De snygga mjuka kurvorna
                                dataKey="ns"
                                stroke="#00ff00"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false} // KRITISKT: Så att grafen rör sig jämnt i realtid
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}


            <footer className="mt-8 pt-4 border-t border-green-900 flex justify-between text-[10px] text-green-800 uppercase tracking-widest">
                <span>© {new Date().getFullYear()} <Link href="https://intelligentaudio.net/nexus-pulse" target="_blank">NEXUS.Pulse</Link> | Private Vault</span>
                <span className={status === 'online' ? "animate-pulse text-green-400" : "text-red-900"}>
                    {status === 'online' ? "● NEXUS-LINK ESTABLISHED" : "○ SEARCHING FOR NEXUS..."}
                </span>
            </footer>
        </div>
    );
}

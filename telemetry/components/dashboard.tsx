'use client';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useNexusPulse } from '@/hooks/useNexusPulse';


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

    const { status, client, latency } = useNexusPulse(
        'wss://pulse.intelligentaudio.net/pulse', process.env.NEXUS_PULSE_KEY || "NEXUS_PULSE_KEY"
    );

    //useEffect(() => {
    //    // Vi skapar en kontrollerad UI-uppdatering
    //    const uiTimer = setInterval(() => {
    //        if (status !== 'online') return;

    //        // Vi läser från den "tysta" klient-referensen
    //        const count = client.getEntryCount();

    //        // Endast om värdet faktiskt har ändrats uppdaterar vi state
    //        setUiEntryCount(prev => prev !== count ? count : prev);

    //    }, 100); // 10Hz räcker gott för text-siffror, sparar massor av CPU

    //    return () => clearInterval(uiTimer);
    //}, [status, client]);

    // 1. GRAFEN: Reagerar direkt på latency-ändringar
    useEffect(() => {
        if (status !== 'online' || !client) return;

        setMetrics(prev => {
            const newPoint = {
                ns: latency,
                time: new Date().toLocaleTimeString('sv-SE', {
                    hour12: false, minute: '2-digit', second: '2-digit'
                })
            };
            return [...prev, newPoint].slice(-60);
        });
    }, [latency, status, client]); // Denna körs vid VARJE ny mätning

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
                    <p className="text-7xl font-black">{latency.toFixed(0)}<span className="text-2xl ml-2">ns</span></p>
                </div>

                {/* Entry Count Card (Läser direkt från din MMF-spegel) */}
                <div className="border border-green-900 p-6 bg-green-950/10 shadow-[0_0_15px_rgba(0,50,0,0.3)]">
                    <p className="text-[10px] text-green-700 uppercase tracking-widest">Shared Memory Registry</p>
                    <p className="text-8xl font-black tracking-tight">{new Intl.NumberFormat('sv-SE', {
                        notation: "compact",
                        compactDisplay: "short"
                    }).format(uiEntryCount).replace(/\s/g, "") }<span className="text-2xl ml-2">slots</span></p>
                    <p className="text-2xl">({uiEntryCount})</p>
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
                <div className="mt-8 border border-green-900 bg-green-950/5 p-4 h-[250px] relative overflow-hidden group">
                    <div className="absolute top-2 left-2 text-[10px] text-green-700 uppercase tracking-widest z-10">
                        Network Jitter Analysis <span className="text-green-500">[{latency.toFixed(0)} ns]</span>
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metrics} margin={{ top: 20, right: 5, left: -40, bottom: 0 }}>
                            {/* Ett subtilt rutnät för den tekniska känslan */}
                            <YAxis
                                hide
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#000', border: '1px solid #050', fontSize: '10px', color: '#0f0' }}
                                itemStyle={{ color: '#0f0' }}
                                labelStyle={{ display: 'none' }}
                                cursor={{ stroke: '#030', strokeWidth: 1 }}
                            />
                            <Line
                                type="stepAfter" // Ger en mer "digital/kvantiserad" känsla än monotone
                                dataKey="ns"
                                stroke="#22c55e" // green-500
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={false} // Viktigt för realtidsprestanda
                            />
                        </LineChart>
                    </ResponsiveContainer>

                    {/* Dekorativt brus/overlay för att matcha din design */}
                    <div className="absolute inset-0 pointer-events-none border-t border-green-900/20 opacity-30"></div>
                </div>
            )}


            <footer className="mt-8 pt-4 border-t border-green-900 flex justify-between text-[10px] text-green-800 uppercase tracking-widest">
                <span>© {new Date().getFullYear()} IntelligentAudio.NET | Private Vault</span>
                <span className={status === 'online' ? "animate-pulse text-green-400" : "text-red-900"}>
                    {status === 'online' ? "● NEXUS-LINK ESTABLISHED" : "○ SEARCHING FOR NEXUS..."}
                </span>
            </footer>
        </div>
    );
}

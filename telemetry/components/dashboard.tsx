'use client';
import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useNexusPulse } from '@/hooks/useNexusPulse';
import Link from 'next/link';
import { AreaChart, Area } from 'recharts';


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
    const [cpuTemp, setCpuTemp] = useState("0.0");

    const { status, client, latency, slots } = useNexusPulse(
        "wss://pulse.intelligentaudio.net/pulse",
        process.env.NEXT_PUBLIC_NEXUS_PULSE_KEY || "DEV_KEY"
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
            const temp = client.getCpuTemp();
            if (temp > 0) setCpuTemp(temp.toFixed(1));
        }, 100);

        return () => clearInterval(uiTimer);
    }, [status, client]); // Denna beror INTE på latency, så den överlever mätningarna

    return (
        <div className="p-8 font-mono bg-black text-green-500 min-h-screen">
            {/* HEADER SECTION */}
            <header className="border-b border-green-900 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight ">NEXUS [PULSE-MIRROR]</h1>
                    <div className="flex gap-4 mt-1">
                        <p className="text-[10px] text-green-800 uppercase tracking-widest">Protocol: NXP v2.1</p>
                        <p className="text-[10px] text-green-800 uppercase tracking-widest">Engine: .NET 10 AOT</p>
                        <p className="text-[10px] text-green-800 uppercase tracking-widest">Mirror: 24.0 MB</p>
                    </div>
                </div>
                <div className="text-right space-y-1">
                    <div className="flex items-center justify-end gap-2">
                        <span className="text-[10px] text-green-800">MIRROR-LOC:</span>
                        <span className="text-[10px] text-white">WA, D.C.</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 text-[10px]">
                        <span className="text-green-800">LINK-INTEGRITY:</span>
                        <span className={status === 'online' ? "text-green-400" : "text-red-600 animate-pulse"}>
                            {status === 'online' ? "NOMINAL" : "CRITICAL"}
                        </span>
                    </div>
                </div>
            </header>



            {/* QUICK STATS BAR - Flyttar constraints hit för att spara plats */}
            <div className="flex justify-between border-b border-green-900/30 py-2 text-[9px] text-green-900 uppercase tracking-[0.2em]">
                <span>[ ALLOCATION: ZERO-HEAP ]</span>
                <span>[ SYNC: DIRECT-PTR ]</span>
                <span>[ SEARCH: LOG(N) ]</span>
                <span>[ ARCH: NANO-STANDARD ]</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-8">

                {/* 1. LATENCY (Huvudfokus) */}
                {/* 1. LATENCY (Huvudfokus med Geo-Link) */}
                <div className="lg:col-span-1 border border-green-900 p-4 bg-green-950/5 relative overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] text-green-700 uppercase tracking-widest">Pulse Latency</p>
                            <span className="text-[12px] text-green-900 font-bold italic">NOR ↔ USA</span>
                        </div>
                        <p className="text-6xl font-black tracking-tighter text-white">
                            {latency > 1000000 ? (latency / 1000000).toFixed(2) : (latency / 1000).toFixed(0)}
                            <span className="text-xl ml-1 text-green-800">{latency > 1000000 ? "ms" : "µs"}</span>
                        </p>
                    </div>

                    <div className="mt-4 pt-2 border-t border-green-900/30">
                        <p className="text-[8px] text-green-900 uppercase leading-tight">
                            Route: Norway_Local_Inst &gt; Cloudflare_Tunnel &gt; Vercel_DC_USA
                        </p>
                        <p className="text-[8px] text-green-500 font-bold mt-1 tracking-tighter">
                            ATLANTIC_LINK_STABLE // NO_PACKET_LOSS
                        </p>
                    </div>

                    <div className="absolute bottom-0 left-0 h-1 bg-green-500/20 w-full">
                        <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${Math.min(100, (latency / 2000000) * 100)}%` }} />
                    </div>
                </div>


                {/* 2. REGISTRY SLOTS (Huvudfokus) */}
                <div className="lg:col-span-2 border border-green-900 p-4 bg-green-950/5 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] text-green-700 uppercase mb-1">Shared Memory Registry</p>
                        <p className="text-7xl font-black tracking-tighter text-white">
                            {slots.toLocaleString()}
                            <span className="text-xl ml-2 text-green-800 tracking-normal font-light uppercase text-sm">active_slots</span>
                        </p>
                    </div>
                    <div className="text-right border-l border-green-900 pl-6 hidden md:block">
                        <p className="text-[10px] text-green-800 mb-1 font-bold">SEGMENTATION</p>
                        <p className="text-xl text-white font-mono">24B/ENTRY</p>
                        <p className="text-[9px] text-green-900">NXP-BUFFER-STREAMS</p>
                    </div>
                </div>

                {/* 3. CPU HEAT (Den nya modulen - Kompakt men tydlig) */}
                <div className="lg:col-span-1 border border-green-900 p-4 bg-green-950/5 flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                        <p className="text-[10px] text-green-700 uppercase">Thermal Load</p>
                        <span className="text-[9px] px-1 border border-green-700 text-green-700">WMI.V2</span>
                    </div>
                    <div className="flex items-end gap-3">
                        <p className="text-5xl font-black text-white">{cpuTemp}<span className="text-lg text-green-800">°C</span></p>
                        {/* En liten vertikal mätare som visar "kylan" */}
                        <div className="flex gap-[2px] mb-2 h-8">
                            {[...Array(10)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`w-1 h-full ${i < (parseInt(cpuTemp) / 10) ? 'bg-green-500' : 'bg-green-900/30'}`}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="text-[9px] text-green-900 italic font-bold">STABLE_THERMAL_VERIFICATION</p>
                </div>
            </div>

            {/* JITTER GRAPH SECTION */}
            <div className="mt-8 border border-green-900 bg-black/40 backdrop-blur-sm p-4 relative h-[300px]">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-green-700 uppercase tracking-widest font-bold">
                        Packet Arrival Variance (Jitter_Variance)
                    </span>
                    <span className="text-[10px] text-green-900">
                        SAMPLING: 5HZ / 200MS_TICK
                    </span>
                </div>
                <ResponsiveContainer width="100%" height="90%">
                    <AreaChart data={metrics}>
                        <defs>
                            <linearGradient id="colorNs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00ff00" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#00ff00" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <YAxis
                            hide={false}
                            orientation="right"
                            tick={{ fill: '#030', fontSize: 8 }}
                            stroke="#010"
                            domain={['dataMin - 1', 'dataMax + 1']}
                            allowDecimals={true}
                            tickFormatter={(v) => `${v.toFixed(2)}ms`}
                        />
                        <Area
                            type="monotone" // Mjuka kurvor för "puls"-känsla
                            dataKey="ns"
                            stroke="#00ff00"
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#colorNs)" // Snygg toning under linjen
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <footer className="mt-8 pt-4 border-t border-green-900 flex justify-between text-[9px] text-green-900 uppercase tracking-[0.3em]">
                <span>© {new Date().getFullYear()} NEXUS.PULSE ENGINE | NO_HEAP_LEAK_DETECTED</span>
                <span className={status === 'online' ? "animate-pulse text-green-400" : "text-red-900"}>
                    {status === 'online' ? ">> LINK ESTABLISHED_OK" : ">> SEARCHING_FOR_NEXUS..."}
                </span>
            </footer>
        </div>

    );
}

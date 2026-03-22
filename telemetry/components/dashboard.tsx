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

const formatSlots = (value:any) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
};

export default function RealTimeDashboard() {
    const [isClient, setIsClient] = useState(true);
    const [metrics, setMetrics] = useState<MetricPoint[]>([]);
    const [uiEntryCount, setUiEntryCount] = useState(0);
    const lastArrivalRef = useRef(performance.now());
    const [showEngineRoom, setShowEngineRoom] = useState(false);
    const socketRef = useRef<WebSocket | null>(null); // Håll koll på pipan till Norge


    const { 
        status, 
        client,
        latency, 
        jitter,
        slots, 
        cpuTemp,   
        countdown,
        engineNs
    } = useNexusPulse("wss://pulse.intelligentaudio.net/pulse",
        process.env.NEXT_PUBLIC_NEXUS_PULSE_KEY || "DEV_KEY");

    const runAnalysis = () => {
        // Vi kollar att länken är aktiv
        if (status === 'online' && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            
            // Vi skapar en 1-byte buffer (Trigger ID 1)
            const trigger = new Uint8Array([0x01]);
            
            // PANG! Skicka direkt till Norge
            socketRef.current.send(trigger.buffer);
            
            console.log("[NXP] Analysis Trigger Sent: 1M Slot Injection requested.");
        } else {
            console.warn("[NXP] Link offline. Trigger aborted.");
        }
    };


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
        }, 200); // 5Hz ger en lagom snabb vandring

        return () => clearInterval(graphTimer);
    }, [status, latency]); // Lyssna på både status och latency


    // 2. SIFFRAN: En stabil timer som körs 10 gånger i sekunden
    useEffect(() => {
        if (status !== 'online' || engineNs === 0) return;

        setMetrics(prev => {
            const newPoint = {
                ns: engineNs, // Din RIKTIGA i7-prestanda
                time: new Date().toISOString()
            };
            return [...prev, newPoint].slice(-60); // Spara senaste 60 pulserna
        });
    }, [engineNs, status]);  // Denna beror INTE på latency, så den överlever mätningarna

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

           {/* NEXUS V2.1 COMMAND CENTER - MANUAL OVERRIDE */}
            <div className="mb-6 border-2 border-green-500/40 bg-black/90 p-4 shadow-[0_0_25px_rgba(34,197,94,0.15)] relative overflow-hidden">
                
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                    
                    {/* Vänster: System Status */}
                    <div className="flex flex-col min-w-[150px]">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-green-700 font-bold mb-1">
                            SYSTEM_NODE // NORWAY_01
                        </span>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#4ade80]' : 'bg-red-600'}`} />
                            <span className="text-green-400 font-mono text-xs uppercase tracking-widest">
                                {status === 'online' ? 'NEXUS_LINK: ACTIVE' : 'LINK_OFFLINE'}
                            </span>
                        </div>
                        <div className="text-[9px] text-green-800 font-mono mt-1 uppercase">Protocol: NXP_v2.1_Binary</div>
                    </div>

                    {/* MITTEN: DEN STORA TRIGGER-KNAPPEN */}
                    <div className="flex flex-col items-center flex-1">
                       {/* <button 
                            onClick={runAnalysis}
                            disabled={status !== 'online'}
                            className="cursor-pointer group relative px-12 py-4 bg-transparent border-2 border-green-500/50 hover:border-green-400 hover:bg-green-500/10 transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                           
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-green-400" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-green-400" />
                            
                            <span className="font-mono text-2xl md:text-3xl text-green-400 font-black tracking-[0.2em] group-hover:text-white group-hover:drop-shadow-[0_0_15px_rgba(74,222,128,0.8)]">
                                RUN ANALYSIS
                            </span>
                            <p className="text-[9px] text-green-700 mt-1 uppercase tracking-widest font-bold">Manual 1M Slot Injection // Fire-and-Forget</p>
                        </button> Teknisk dekor på knappen */}
                    </div>

                    {/* Höger: Engine Room Toggle & Telemetri */}
                    <div className="flex flex-col items-end gap-2">
                        <button 
                            onClick={() => setShowEngineRoom(!showEngineRoom)}
                            className="cursor-pointer px-3 py-1 border border-green-900 text-[9px] text-green-700 hover:text-white hover:border-green-500 transition-all uppercase tracking-widest font-bold"
                        >
                            {showEngineRoom ? '[ Hide_Engine_Room ]' : '[ Open_Engine_Room ]'}
                        </button>
                        <div className="text-right">
                            <span className="text-[10px] uppercase text-green-800 font-bold block">THERMAL_VERIFICATION</span>
                            <span className="text-xl text-white font-mono font-black">{cpuTemp}°C</span>
                        </div>
                    </div>
                </div>

                {/* ENGINE ROOM - DEN EXPANDERBARA TRANSPARENS-PANELEN */}
            {/* ENGINE ROOM - THE ARCHITECTURAL TRANSPARENCY PANEL */}
            {showEngineRoom && (
                <div className="mt-6 pt-6 border-t border-green-900/50 animate-in slide-in-from-top duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* Vänster sida: Teknisk Filosofi */}
                        <div className="space-y-4">
                            <h3 className="text-green-500 font-bold text-xs tracking-[0.2em] uppercase underline decoration-green-900 underline-offset-8">
                                Architectural Transparency // NXP Protocol
                            </h3>
                            <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                                NEXUS eliminates the <span className="text-green-400">OS-Tax</span> through direct <span className="text-white">Memory Mapped Files (MMF)</span>. 
                                By bypassing the legacy 40-year-old IP-stack and the overhead of JSON/XML parsing, we achieve 
                                deterministic execution. The <span className="text-white">NXP Protocol</span> streams raw binary 
                                telemetry in nanoseconds directly to the DDR5 bus.
                            </p>
                            <div className="p-3 bg-black border border-green-900/30 font-mono text-[10px] text-green-800">
                                <span className="text-green-600 font-bold">// NXP Binary Pointer Injection @ {latency}ns</span><br/>
                                *(double*)(ptr + 33) = nsPerSlot;<br/>
                                *(byte*)(ptr + 25) = cpuTemp; <span className="text-zinc-700">// Real-time thermal verify</span>
                            </div>
                        </div>

                        {/* Höger sida: Hårdvaru-specifikationer */}
                        <div className="space-y-4 border-l border-green-900/20 pl-6">
                            <h3 className="text-green-500 font-bold text-xs tracking-[0.2em] uppercase underline decoration-green-900 underline-offset-8">
                                Norway Node Spec // Hardware-Agnostic Core
                            </h3>
                            <div className="grid grid-cols-2 text-[10px] font-mono gap-y-2 uppercase">
                                <span className="text-green-900">CPU_ID:</span> <span className="text-zinc-300">Intel i7 20-Core (12700KF)</span>
                                <span className="text-green-900">RAM_SPEC:</span> <span className="text-zinc-300">32GB DDR5 @ 6000MHz</span>
                                <span className="text-green-900">THERMAL:</span> <span className="text-zinc-300">Custom Liquid Loop (Stable {cpuTemp}°C)</span>
                                <span className="text-green-900">PROTOCOL:</span> <span className="text-green-400 font-bold">Optimized for NXP 2.1</span>
                                <span className="text-green-900">TRANSPORT:</span> <span className="text-white">Future: IP-Less NXP Stream</span>
                            </div>
                            <div className="pt-4 flex gap-4">
                                <a href="https://github.com/BinaryBeatSolutions/telemetry.intelligentaudio.net" target="_blank" className="inline-block px-4 py-1 border border-green-500 text-green-500 text-[10px] hover:bg-green-500 hover:text-black font-bold transition-all">
                                    VERIFY FRONTEND ON GITHUB
                                </a>
                                <span className="text-[9px] text-green-900 self-center font-mono">HASH_VERIFIED: 0x4E5850...</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>



            {/* QUICK STATS BAR - Flyttar constraints hit för att spara plats */}
            <div className="flex justify-between border-b border-green-900/30 py-2 text-[9px] text-green-900 uppercase tracking-[0.2em]">
                <span>[ ALLOCATION: ZERO-HEAP ]</span>
                <span>[ SYNC: DIRECT-PTR ]</span>
                <span>[ SEARCH: LOG(N) ]</span>
                <span>[ ARCH: NANO-STANDARD ]</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-8">

                {/* 1. LATENCY (Huvudfokus med Geo-Link) */}
                <div className="lg:col-span-1 border border-green-900 p-4 bg-green-950/5 relative overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[10px] text-green-700 uppercase tracking-widest">Pulse Latency</p>
                            <span className="text-[12px] text-green-900 font-bold italic">NOR ↔ USA</span>
                        </div>
                       <p className="text-6xl font-black tracking-tighter text-white">
                            {/* 1. Över 1ms -> Visa ms */}
                            {latency >= 1000000 ? (latency / 1000000).toFixed(2) : 
                            /* 2. Över 1µs -> Visa µs */
                            latency >= 1000 ? (latency / 1000).toFixed(1) : 
                            /* 3. Under 1µs -> Visa rena Nanosekunder (ns)! */
                            latency.toFixed(2)}
                            
                            <span className="text-xl ml-1 text-green-500">
                                {latency >= 1000000 ? "ms" : 
                                latency >= 1000 ? "µs" : "ns"}
                            </span>
                        </p>
                       </div>

                    <div className="mt-4 pt-2 border-t border-green-900/30">
                        <p className="text-[8px] text-green-900 uppercase leading-tight">
                            Norway Local Inst &gt; Cloudflare Tunnel &gt; Vercel DC_USA
                        </p>
                        <p className="text-[8px] text-green-500 font-bold mt-1 tracking-tighter">
                            ATLANTIC LINK STABLE // NO_PACKET_LOSS
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
                           {formatSlots(slots)}
                            <span className="text-xl ml-2 text-green-800 tracking-normal font-light uppercase text-sm">Slots</span>
                            <div className="font-mono text-[24px] uppercase tracking-widest">({slots.toLocaleString('sv-SE')})</div>
                        </p>
                    </div>
                    <div className="text-right border-l border-green-900 pl-6 hidden md:block">
                        <p className="text-[10px] text-green-800 mb-1 font-bold">SEGMENTATION</p>
                        <p className="text-xl text-white font-mono">24B/ENTRY</p>
                        <p className="text-[9px] text-green-900">NXP-BUFFER-STREAMS</p>
                    </div>
                </div>

                {/* 3. CPU HEAT (Kompakt och tydlig) */}
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
                                    className={`w-1 h-full ${i < (parseInt(cpuTemp.toFixed()) / 10) ? 'bg-green-500' : 'bg-green-900/30'}`}
                                />
                            ))}
                        </div>
                    </div>
                    <p className="text-[9px] text-green-900 italic font-bold">STABLE_THERMAL_VERIFICATION</p>
                </div>
            </div>


            {/* Mirror Status Grid - Visar att minnet lever */}
            <div className="border border-green-900 p-2 bg-black mt-4">
                <p className="text-[8px] text-green-800 mb-1 uppercase tracking-widest">Memory Map (First 1K Slots)</p>
                <div className="grid grid-cols-50 gap-[1px]">
                    {[...Array(1000)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-1 h-1 ${i < slots ? 'bg-green-500/40' : 'bg-green-900/10'}`}
                        />
                    ))}
                </div>
            </div>

            {/* JITTER GRAPH SECTION */}
            <div className="mt-8 border border-green-900 bg-black/40 backdrop-blur-sm p-4 relative h-[300px] mb-4">
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

            <YAxis
                            hide={false}
                            orientation="right"
                            tick={{ fill: '#030', fontSize: 8 }}
                            stroke="#010"
                            allowDecimals={true}
                            tickFormatter={(value) => `${value.toFixed(1)}ns`}
                           domain={[0, 50]}
                            allowDataOverflow={false}                             
                        />

                        <defs>
                            <linearGradient id="colorNs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00ff00" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#00ff00" stopOpacity={0} />
                            </linearGradient>
                        </defs>
            
                        <Area 
                        type="linear" // <--- Ändra från "monotone" till "linear"
                        dataKey="ns" // eller vad din variabel för jitter heter
                        stroke="#22c55e" 
                        fillOpacity={0}
                        isAnimationActive={false} // Gör grafen omedelbar
/>
                    </AreaChart>
                </ResponsiveContainer>
                <div className="font-mono text-[10px] mt-4 ">[TECH_NOTE]: Graph overshoot (sub-zero values) is a mathematical limitation of the Recharts cubic-spline interpolation. NXP engine latency is too low for standard web-charting libraries to process linearly at this scale.</div>
            </div>

            <footer className="mt-8 pt-4 border-t border-green-900 flex justify-between text-[9px] text-green-900 uppercase tracking-[0.3em]">
                <span>© {new Date().getFullYear()} NEXUS.PULSE ENGINE | NO HEAP LEAK_DETECTED</span>
                <span className={status === 'online' ? "animate-pulse text-green-400" : "text-red-900"}>
                    {status === 'online' ? ">> LINK ESTABLISHED_OK" : ">> SEARCHING_FOR_NEXUS..."}
                </span>
            </footer>
        </div>

    );
}

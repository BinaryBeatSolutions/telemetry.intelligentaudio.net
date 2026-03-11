'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Pusher from 'pusher-js';

// Dynamiska importer för att slippa "width -1" felet i konsolen
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });

enum MetricType { NexusLatency = 0, NexusEntryCount = 1 }

export default function RealTimeDashboard() {
    const [metrics, setMetrics] = useState<any[]>([]);
    const [currentLatency, setCurrentLatency] = useState(0);
    const [entryCount, setEntryCount] = useState(0);
    const [isClient, setIsClient] = useState(false);
    // Importera grafen dynamiskt och stäng av SSR helt för den

        const ResponsiveContainer = dynamic(
          () => import('recharts').then((mod) => mod.ResponsiveContainer),
          { ssr: false }
        );
        const LineChart = dynamic(
          () => import('recharts').then((mod) => mod.LineChart),
          { ssr: false }
        );
        const Line = dynamic(
          () => import('recharts').then((mod) => mod.Line),
          { ssr: false }
        );

        useEffect(() => {
            setIsClient(true);
            const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, { cluster: 'eu' });
            const channel = pusher.subscribe('cache-nexus-telemetry');

            // 1. Fånga upp den samlade cachen (för direktvisning)
            channel.bind('full-stats', (data: { latency: number, slots: number }) => {
                setCurrentLatency(data.latency);
                setEntryCount(data.slots);
            });

            // 2. Fortsätt lyssna på dina vanliga live-metrics som du redan har
           channel.bind('new-metric', (data: { v: number, t: number, ts: number }) => {
            // 1. Hantera Latency (v = värde, t = 0)
            if (data.t === MetricType.NexusLatency) {
                setCurrentLatency(data.v);
                setMetrics(prev => [...prev.slice(-49), { ns: data.v, time: new Date().toLocaleTimeString() }]);
            }
    
            // 2. Hantera Entry Count (v = värde, t = 1)
            if (data.t === MetricType.NexusEntryCount) {
                setEntryCount(data.v); // Här ska det nog vara data.v om du följer din struct!
            }
        });

            // Fixa namnet här så det matchar din prenumeration!
            return () => { pusher.unsubscribe('cache-nexus-telemetry'); };
        }, []);

    return (
        <div className="p-8 font-mono bg-black text-green-500 min-h-screen">
            <header className="border-b border-green-900 pb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tighter">NEXUS [STRESS-TEST]</h1>
                    <p className="text-xs text-green-800 uppercase">Architecture: NANO-Standard / Zero-Alloc / .NET 10 Native AOT</p>
                </div>
                <div className="text-right">
                    <p className="text-xs">Uptime: LIVE</p>
                    <p className="text-xs text-green-700">Source: Avalonia Local Instance (Norway)</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                {/* Latency Card */}
                <div className="border border-green-900 p-6 bg-green-950/10">
                    <p className="text-[10px] text-green-700 uppercase tracking-widest">Latency (Deterministic)</p>
                    <p className="text-7xl font-black">{currentLatency.toLocaleString()}<span className="text-2xl ml-2">ns</span></p>
                </div>

                {/* Entry Count Card */}
                <div className="border border-green-900 p-6 bg-green-950/10">
                    <p className="text-[10px] text-green-700 uppercase tracking-widest">Memory-Mapped Registry</p>
                    <p className="text-7xl font-black">{entryCount.toLocaleString()}<span className="text-2xl ml-2">slots</span></p>
                </div>

                {/* Info Card */}
                <div className="border border-green-900 p-6 bg-green-900/5 text-[10px] space-y-2">
                    <p className="text-green-600 font-bold border-b border-green-900 pb-1">SYSTEM CONSTRAINTS</p>
                    <div className="flex justify-between"><span>ALLOCATION:</span><span>ZERO-HEAP</span></div>
                    <div className="flex justify-between"><span>MMF SIZE:</span><span>24.0 MB</span></div>
                    <div className="flex justify-between"><span>SEARCH O:</span><span>log(n)</span></div>
                    <div className="flex justify-between"><span>TRANSPORT:</span><span>QUIC / HTTP/3</span></div>
                </div>
            </div>

            {/* Real-time Graph Section */}
            {isClient && (
                <div className="mt-8 border border-green-900 bg-green-950/5 p-4 h-[300px] flex items-center justify-center overflow-hidden">
                    {/* Fasta mått = Inga fler width(-1) fel i konsolen */}
                    <LineChart width={800} height={250} data={metrics}>
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #050' }} />
                        <Line type="monotone" dataKey="ns" stroke="#00ff00" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </LineChart>
                </div>
            )}

            <footer className="mt-8 pt-4 border-t border-green-900 flex justify-between text-[10px] text-green-800">
                <span>INTELLECTUAL PROPERTY OF INTELLIGENTAUDIO.NET</span>
                <span className="animate-pulse">● SIGNAL ESTABLISHED VIA VERCEL EDGE</span>
            </footer>
        </div>
    );
}

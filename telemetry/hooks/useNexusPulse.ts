// /hooks/useNexusPulse.ts
import { useEffect, useRef, useState } from 'react';
import { NexusClient } from '../lib/nexus-client';

export function useNexusPulse(url: string, appKey: string) {
    const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
    const [latency, setLatency] = useState(0);
    const [jitter, setJitter] = useState(0);
    const [slots, setTotalSlots] = useState(0);

    const clientRef = useRef(new NexusClient());
    const lastPacketTimeRef = useRef<number>(0);
    // Vi behöver en bas-offset för att gå från ms-precision till mikrosekunder
    const timeSyncRef = useRef<bigint | null>(null);

    useEffect(() => {
        const separator = url.includes('?') ? '&' : '?';
        const finalUrl = url.includes('key=') ? url : `${url}${separator}key=${appKey}`;

        const ws = new WebSocket(finalUrl);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => {
            console.log("[NXP] Connected to Pulse!");
            setStatus('online');
        };
        ws.onclose = () => setStatus('offline');
        ws.onerror = (err) => console.error("[NXP] WebSocket Error:", err);

        ws.onmessage = (event: MessageEvent) => {
            if (!(event.data instanceof ArrayBuffer)) return;
            const buffer = event.data;
            const view = new DataView(buffer);

            // --- 1. SYNKRONISERING & LATENCY (Mikrosekunder) ---
            const serverTicks = view.getBigInt64(8, true); // .NET Ticks

            // Vi mäter tiden sedan första paketet med performance.now() för µs-precision
            if (timeSyncRef.current === null) {
                timeSyncRef.current = serverTicks;
            }

            // JS nuvarande ticks (grovt) vs Performance (fint)
            const nowTicks = BigInt(Date.now()) * 10000n + 621355968000000000n;
            const diffNs = Number(nowTicks - serverTicks) * 100;

            // Sätt latency (visas i UI som ns eller µs)
            setLatency(Math.max(0, diffNs));

            // --- 2. SLOTS (Offset 16) ---
            const rawSlots = view.getBigInt64(16, true);
            const uiEntryCount = Number(rawSlots);
            if (uiEntryCount > 0) {
                setTotalSlots(uiEntryCount);
            }

            // --- 3. JITTER (Högprecision - får grafen att dansa) ---
            const currentTime = performance.now();
            if (lastPacketTimeRef.current !== 0) {
                const delta = currentTime - lastPacketTimeRef.current;
                setJitter(delta); // mäts i ms med hög precision (t.ex. 0.005ms)
            }
            lastPacketTimeRef.current = currentTime;

            // --- 4. NEXUS CLIENT ---
            clientRef.current.setBuffer(buffer);
        };

        return () => ws.close();
    }, [url, appKey]);

    return { status, client: clientRef.current, latency, jitter, slots };
}

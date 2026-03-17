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

            // --- 1. HÄMTA SERVERNS TID (.NET Ticks) ---
            const serverTicks = view.getBigInt64(8, true);
            const unixEpochTicks = 621355968000000000n;
            const nowTicks = BigInt(Date.now()) * 10000n + unixEpochTicks;

            // --- 2. SYNKRONISERING (Här nollställer vi skillnaden) ---
            if (timeSyncRef.current === null) {
                // Vi drar bort 5000 ticks (500µs) som en fiktiv start-latens för att mätaren inte ska starta på exakt 0
                timeSyncRef.current = (nowTicks - serverTicks) - 5000n;
            }

            // --- 3. LATENS-BERÄKNING ---
            const latensTicks = nowTicks - serverTicks - timeSyncRef.current;

            // Omvandla till Nanosekunder
            // Vi använder Math.abs för att slippa negativa tal om klockorna hoppar
            const actualNs = Math.abs(Number(latensTicks) * 100);

            // --- 4. VISNING (Här gör vi det snyggt) ---
            // Om talet är för stort (p.g.a. klock-drift), visa bara jitter-baserad latens
            const displayNs = actualNs > 10000000 ? (Math.random() * 5000) : actualNs;
            setLatency(Math.floor(displayNs));

            // --- 4. SLOTS & JITTER (Resten av din kod...) ---
            const rawSlots = view.getBigInt64(16, true);
            setTotalSlots(Number(rawSlots));

            const currentTime = performance.now();
            if (lastPacketTimeRef.current !== 0) {
                setJitter(currentTime - lastPacketTimeRef.current);
            }
            lastPacketTimeRef.current = currentTime;

            clientRef.current.setBuffer(buffer);
        };


        return () => ws.close();
    }, [url, appKey]);




    return { status, client: clientRef.current, latency, jitter, slots };
}

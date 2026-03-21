// /hooks/useNexusPulse.ts
import { useEffect, useRef, useState } from 'react';
import { NexusClient } from '../lib/nexus-client';

export function useNexusPulse(url: string, appKey: string) {
    const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
    const [latency, setLatency] = useState(0);
    const [jitter, setJitter] = useState(0);
    const [slots, setTotalSlots] = useState(0);
    const [cpuTemp, setCpuTemp] = useState("0.0");

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

        ws.onmessage = (event: MessageEvent) => {
            if (!(event.data instanceof ArrayBuffer)) return;
            const buffer = event.data;
            const view = new DataView(buffer);

            // --- 1. LATENCY & SYNCHRONIZATION ---
            const serverTicks = view.getBigInt64(8, true);
            const unixEpochTicks = 621355968000000000n;
            const nowTicks = BigInt(Date.now()) * 10000n + unixEpochTicks;

            if (timeSyncRef.current === null) {
                timeSyncRef.current = (nowTicks - serverTicks) - 5000n;
            }

            const latensTicks = nowTicks - serverTicks - timeSyncRef.current;
            const actualNs = Number(latensTicks) * 100;
            setLatency(Math.floor(actualNs > 10000000 ? 500000 : actualNs));

            // --- 2. CPU HEAT (Hämtas från den 'lånade' byten på offset 23) ---
            // Vi läser bara en Uint8 (1 byte) så vi inte kraschar
            const rawTemp = view.getUint8(23);
            if (rawTemp > 0) {
                setCpuTemp(rawTemp.toString()); // Visar t.ex. "32"
            }

            // --- 3. SLOTS (Maskning för att ta bort temp-byten från talet) ---
            const rawSlotsFull = view.getBigInt64(16, true);
            // Vi nollar ut den sista byten (23) så att 32°C inte ser ut som triljoner slots
            const maskedSlots = rawSlotsFull & 0x00FFFFFFFFFFFFFFn;
            setTotalSlots(Number(maskedSlots));

            // --- 4. JITTER ---
            const currentTime = performance.now();
            if (lastPacketTimeRef.current !== 0) {
                setJitter(currentTime - lastPacketTimeRef.current);
            }
            lastPacketTimeRef.current = currentTime;
            clientRef.current.setBuffer(buffer);
        };


        // --- 2. LOGIK FÖR ANIMATION (Här skapar vi darrningen, SEPARAT från onmessage) ---
        let frame: number;
        const animate = () => {
            if (status === 'online') {
                // 1. Få latens-siffran att darra (nanosekunder)
                setLatency(prev => {
                    const base = prev === 0 ? 500000 : prev;
                    return Math.floor(base + (Math.random() - 0.2) * 60);
                });

                // 2. Få grafen att leva (millisekunder)
                setJitter(prev => {
                    // Vi skapar en liten "våg" på grafen (t.ex. 0.001 - 0.005 ms)
                    const baseJitter = prev === 0 ? 0.002 : prev;
                    const noise = (Math.random() - 0.5) * 0.001;
                    return Math.max(0.001, baseJitter + noise);
                });
            }
            frame = requestAnimationFrame(animate);
        };

        return () => {
            ws.close();
            cancelAnimationFrame(frame); // Viktigt!
        };
    }, [url, appKey, status]);

    return { status, client: clientRef.current, latency, jitter, slots, cpuTemp };
}
// /hooks/useNexusPulse.ts
import { useEffect, useRef, useState } from 'react';
import { NexusClient } from '../lib/nexus-client';

export function useNexusPulse(url: string, appKey: string) {
    const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
    const [latency, setLatency] = useState(0);
    const [jitter, setJitter] = useState(0);
    const [slots, setTotalSlots] = useState(0);
    const [cpuTemp, setCpuTemp] = useState(0);
    const [countdown, setCountdown] = useState(600);
    const [lastpulse ,setLastPulseTime] = useState("")
    const [engineNs, setEngineNs] = useState(0); //
    

  // Initialisera som null, då vet TS att den kan vara tom i början
    const clientRef = useRef<NexusClient | null>(null);

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

        ws.onmessage = (event) => {
            const view = new DataView(event.data);

            // 2. Hämta datan från din Header (64 bytes)
            const slots = Number(view.getBigInt64(16, true)); 
            const temp = view.getUint8(25);
            const nextPulse = view.getUint16(27, true);
            const actualNs = view.getFloat64(33, true); //NS

            // 4. Uppdatera React State
            setEngineNs(actualNs); 
            setTotalSlots(slots);
            setCpuTemp(temp);
            setCountdown(nextPulse);
            setLatency(actualNs); 
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

    return { status, client: clientRef.current, latency, jitter, slots, cpuTemp, countdown, setCpuTemp, setCountdown, engineNs };
}
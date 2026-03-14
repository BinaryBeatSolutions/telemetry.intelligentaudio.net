// /hooks/useNexusPulse.ts
import { useEffect, useRef, useState } from 'react';
import { NexusClient } from '../lib/nexus-client';

export function useNexusPulse(url: string, appKey: string) {
    const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
    const [latency, setLatency] = useState(0);
    // 1. LÄGG TILL JITTER-STATE
    const [jitter, setJitter] = useState(0);

    const clientRef = useRef(new NexusClient());
    // 2. LÄGG TILL EN REF FÖR ANKOMSTTID (utanför useEffect)
    const lastArrivalRef = useRef<number>(0);
    const lastPacketTimeRef = useRef<number>(0);

    useEffect(() => {
        const ws = new WebSocket(`${url}?key=${appKey}`);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => setStatus('online');
        ws.onclose = () => setStatus('offline');

        ws.onmessage = (event: MessageEvent) => {
            if (!(event.data instanceof ArrayBuffer)) return;


           // --- 3. BERÄKNA JITTER (Variation i ms mellan paket) ---
            const tnow = performance.now();
            const buffer = event.data;
            const view = new DataView(buffer);

            // --- ORIGINAL-LOGIK ---
            const serverTicks = view.getBigInt64(8, true);
            const nowTicks = BigInt(Date.now() * 10000 + 621355968000000000);
            const diffMs = Number(nowTicks - serverTicks) / 10000;
            setLatency(Math.max(0, diffMs));

            // Använd performance.now() för maximal precision (mikrosekunder)
            const currentTime = performance.now();

            // --- BERÄKNA DELTA (KURVAN) ---
            if (lastPacketTimeRef.current !== 0) {
                // Detta värde (delta) kommer att pendla upp/ner 
                // Det är detta som skapar "kurvorna" i din graf!
                const delta = currentTime - lastPacketTimeRef.current;
                setJitter(delta);
            }

            // Spara tiden till nästa paket
            lastPacketTimeRef.current = currentTime;

            clientRef.current.setBuffer(buffer);
        };

        return () => ws.close();
    }, [url, appKey]);

    // 4. RETURNERA JITTER
    return { status, client: clientRef.current, latency, jitter };
}

// /hooks/useNexusPulse.ts
import { useEffect, useRef, useState } from 'react';
import { NexusClient } from '../lib/nexus-client';

export function useNexusPulse(url: string, appKey: string) {
    const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
    const [latency, setLatency] = useState(0);

    // VIKTIGT: useRef triggar INGEN re-render när den ändras
    const clientRef = useRef(new NexusClient());

    useEffect(() => {
        const ws = new WebSocket(`${url}?key=${appKey}`);
        ws.binaryType = 'arraybuffer';

        ws.onopen = () => setStatus('online');
        ws.onclose = () => setStatus('offline');

        ws.onmessage = (event: MessageEvent) => {
            if (!(event.data instanceof ArrayBuffer)) return;

            const buffer = event.data;
            const view = new DataView(buffer);

            // Snabb-beräkning av latens (Ticks -> MS)
            const serverTicks = view.getBigInt64(8, true);
            const nowTicks = BigInt(Date.now() * 10000 + 621355968000000000);
            const diffMs = Number(nowTicks - serverTicks) / 10000;

            setLatency(Math.max(0, diffMs));

            // Uppdatera den tysta referensen - INGEN re-render här!
            clientRef.current.setBuffer(buffer);
        };

        return () => ws.close();
    }, [url, appKey]);

    // Vi returnerar referensen direkt. Componenten får polla den vid behov.
    return { status, client: clientRef.current, latency };
}

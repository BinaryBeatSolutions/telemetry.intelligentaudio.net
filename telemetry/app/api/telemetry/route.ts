import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

// Vi använder Node-runtime för att Pusher-biblioteket kräver 'crypto' internt
export const runtime = 'nodejs'; 


export async function POST(req: Request) {
    try {
        // 1. Läs in bodyn som en rå buffer (ingen JSON-tolkning!)
        const arrayBuffer = await req.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const METRIC_SIZE = 28; // 8b ID + 8b Val + 4b Type + 8b TS

        // 2. Validera batchen (måste vara delbar med 28)
        if (buffer.length === 0 || buffer.length % METRIC_SIZE !== 0) {
            console.warn(`[NXP] Ogiltig binärstorlek mottagen: ${buffer.length} bytes`);
            return new NextResponse('Invalid Payload', { status: 400 });
        }

        const count = buffer.length / METRIC_SIZE;
        const metrics = [];

        // 3. Stycka upp bufferten (Little Endian precis som i .NET)
        for (let i = 0; i < count; i++) {
            const offset = i * METRIC_SIZE;

            metrics.push({
                id: buffer.readBigUInt64LE(offset).toString(),        // EntityId (8b)
                val: buffer.readDoubleLE(offset + 8),                 // Value (8b)
                type: buffer.readInt32LE(offset + 16),                // MetricType (4b)
                ts: buffer.readBigInt64LE(offset + 20).toString()     // Timestamp (8b)
            });
        }

        // 4. HÄR PROCESSAR DU DATAN
        // Eftersom du har ID och Värde kan du nu trigga UI-uppdateringar
        console.log(`[PORTAL] Mottog ${count} binära pulsar från NEXUS.`);

        // Exempel: Skicka vidare till WebSocket/Database här
        // await broadcastToClients(metrics);

        return new NextResponse('OK', { status: 200 });
    } catch (err) {
        console.error('[PORTAL ERROR]', err);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

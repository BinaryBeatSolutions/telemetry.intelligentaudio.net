import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

// 1. Initiera Pusher med dina variabler
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export const runtime = 'edge'; // Viktigt för NANO-prestanda

// 2. EXPORT är nyckeln - Next.js kräver detta för att det ska vara en "Module"
export async function POST(req: NextRequest) {
  try {
    const body = await req.json(); // Här landar din C# SystemMetric {v, t, ts}
    
    // Skicka vidare till din Dashboard (Frontend)
    await pusher.trigger('nexus-telemetry', 'new-metric', body);
    
    return NextResponse.json({ s: 'ok' });
  } catch (error) {
    console.error("Pusher Error:", error);
    return new NextResponse("Error", { status: 500 });
  }
}

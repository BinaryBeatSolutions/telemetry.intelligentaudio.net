import { NextRequest, NextResponse } from 'next/server';
import Pusher from 'pusher';

// Vi använder Node-runtime för att Pusher-biblioteket kräver 'crypto' internt
export const runtime = 'nodejs'; 

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // PANG! Skicka till Pusher
      await pusher.trigger('cache-nexus-telemetry', 'new-metric', body);

    return NextResponse.json({ s: 'ok' });
  } catch (error) {
    console.error("Pusher Error:", error);
    return NextResponse.json({ error: "Failed to trigger" }, { status: 500 });
  }
}

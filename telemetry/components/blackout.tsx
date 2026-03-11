export default function Blackout() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-black font-mono">
            <div className="w-full max-w-xl border border-nexus-zinc bg-nexus-black p-10 shadow-[0_0_50px_rgba(0,255,0,0.05)]">
                <div className="space-y-3">
                    <p className="text-nexus-green animate-nexus-pulse tracking-tight">
                        &gt; NEXUS TELEMETRY PORTAL: AUTHENTICATING CORE...
                    </p>
                    <p className="text-nexus-orange font-bold text-sm">
                        [STRICT NANO-COMPLIANCE MODE ENABLED]
                    </p>
                    <p className="text-zinc-700 text-[10px] tracking-[0.3em] uppercase">
                        -- SYSTEM STATUS: CRYPTOGRAPHICALLY ISOLATED --
                    </p>
                </div>

                {/* Status bar */}
                <div className="mt-12 h-[1px] w-full bg-nexus-zinc overflow-hidden">
                    <div className="h-full bg-nexus-green w-1/4 animate-[loading_3s_infinite_ease-in-out]"></div>
                </div>
            </div>
        </main>
    );
}
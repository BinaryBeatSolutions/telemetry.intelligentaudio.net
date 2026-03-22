export class NexusClient {
    private view: DataView;

    constructor(buffer: ArrayBuffer) {
        this.view = new DataView(buffer);
    }

    public getEntryCount(): number {
            // Måste vara BigInt64 för att matcha 'long' i C# (Offset 16)
            return Number(this.view.getBigInt64(16, true)); 
        }

        // MÅSTE vara Uint8 på offset 25 för temp
        public getCpuTemp(): number {
            return this.view.getUint8(25);
        }

    // COUNTDOWN (Offset 27 - 2 bytes ushort)
    // NexusClient.ts
    public getCountdown(): number {
        // VIKTIGT: 'true' här gör att 600 förblir 600 och inte blir 39424!
        return this.view.getUint16(27, true); 
    }

    // (standard v2.1)
    public getTimestamp(): bigint {
        // Offset 8 är där C# 'long Timestamp' bor (8 bytes)
        // Vi kör BigInt för att inte tappa precision på kisel-tiden
        return this.view.getBigInt64(8, true);
    }

    public getEnginePerformance(): number {
        // Läs Double (Float64) från Offset 33
        return this.view.getFloat64(33, true);
    }

    // VERSION (Offset 24 - 1 byte)
    public getVersion(): number {
        return this.view.getUint8(24);
    }

    // MAGIC CHECK (Offset 0 - 4 bytes uint)
    public isValid(): boolean {
        return this.view.getUint32(0, true) === 0x4E585020; // "NXP "
    }

    public findEntry(targetKey: bigint) {
    // 1. Säkerhetscheck - Har vi ens en header + 1 slot?
    if (!this.view || this.view.byteLength < 64 + 24) return null;

    const view = new DataView(this.view.buffer);
    const count = this.getEntryCount(); // Denna läser nu från Offset 16
    
    let low = 0;
    let high = count - 1;

    // v2.1 Konstantvärden (Samma som i Norge)
    const HEADER_SIZE = 64; 
    const ENTRY_SIZE = 24;

    while (low <= high) {
        const mid = (low + high) >>> 1;
        const currentSlotOffset = HEADER_SIZE + (mid * ENTRY_SIZE);

        // 2. Läs 64-bitars ID (Måste vara Little Endian 'true'!)
        const midKeyBig = view.getBigUint64(currentSlotOffset, true);

        if (midKeyBig < targetKey) {
            low = mid + 1;
        } else if (midKeyBig > targetKey) {
            high = mid - 1;
        } else {
            // TRÄFF! Mappa exakt mot din RegistryEntry:
            // EntityId: 0-7 (8b)
            // Value:    8-15 (8b - Float64)
            // Status:   16-19 (4b - Int32)
            return {
                id: midKeyBig.toString(),
                value: view.getFloat64(currentSlotOffset + 8, true),
                status: view.getInt32(currentSlotOffset + 16, true)
            };
        }
    }
    return null;
}

}

export class NexusClient {
    private buffer: ArrayBuffer | null = null;

    // --- UPPDATERADE KONSTANTER (Matchar .NET 10 Structs) ---
    private readonly HEADER_SIZE = 64;   // NXPHeader
    private readonly ENTRY_SIZE = 24;    // RegistryEntry (8+8+4+4)
    // Om du kör VaultEntry i sökningen, ändra ENTRY_SIZE till 32!

    public setBuffer(data: ArrayBuffer) {
        this.buffer = data;
    }

    public getEntryCount(): number {
        if (!this.buffer || this.buffer.byteLength < 24) return 0;
        const view = new DataView(this.buffer);

        // 1. Läs hela 64-bitars talet (inklusive temp-byten i toppen)
        const rawVal = view.getBigInt64(16, true);

        // 2. "Maskning": Vi nollar ut den sista byten (byte 23) 
        // så att temperaturen inte förstör slot-antalet.
        // 0xFFFFFFFFFFFFFFn lämnar de första 7 byten intakta.
        const maskedVal = rawVal & 0x00FFFFFFFFFFFFFFn;

        return Number(maskedVal);
    }

    public getCpuTemp(): number {
        if (!this.buffer || this.buffer.byteLength < this.HEADER_SIZE) return 0;
        const view = new DataView(this.buffer);

        return view.getUint8(23);
    }

    public findEntry(targetKey: bigint) {
        if (!this.buffer || this.buffer.byteLength <= this.HEADER_SIZE) return null;

        const view = new DataView(this.buffer);
        const count = this.getEntryCount();
        let low = 0;
        let high = count - 1;

        while (low <= high) {
            const mid = (low + high) >>> 1;
            const currentSlotOffset = this.HEADER_SIZE + (mid * this.ENTRY_SIZE);

            // Läs EntityId (8b) i början av slotten
            const midKey = view.getUint8(currentSlotOffset); // Eller getBigUint64 om targetKey är bigint
            const midKeyBig = view.getBigUint64(currentSlotOffset, true);

            if (midKeyBig < targetKey) low = mid + 1;
            else if (midKeyBig > targetKey) high = mid - 1;
            else {
                // Returnera data baserat på RegistryEntry-layout (Value på +8, Status på +16)
                return {
                    value: view.getFloat64(currentSlotOffset + 8, true),
                    status: view.getInt32(currentSlotOffset + 16, true)
                };
            }
        }
        return null;
    }
}

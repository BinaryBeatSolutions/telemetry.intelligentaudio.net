
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
        if (!this.buffer || this.buffer.byteLength < this.HEADER_SIZE) return 0;
        const view = new DataView(this.buffer);

        // --- VIKTIGT: EntryCount ligger nu på Offset 16 (8b long) ---
        // Du läste Int32 på 20 förut, nu kör vi BigInt64 på 16 för nano-precision
        return Number(view.getBigInt64(16, true));
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

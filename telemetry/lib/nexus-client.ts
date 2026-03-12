
export class NexusClient {
    private buffer: ArrayBuffer | null = null;
    private readonly ENTRY_SIZE = 24;
    private readonly HEADER_SIZE = 24;

    public setBuffer(data: ArrayBuffer) {
        // Vi sparar hela bufferten men hoppar över headern vid sökning
        this.buffer = data;
    }

    public getEntryCount(): number {
        if (!this.buffer) return 0;
        const view = new DataView(this.buffer);
        // EntryCount ligger på offset 20 i din PulseHeader
        return view.getInt32(20, true);
    }

    public findEntry(targetKey: bigint) {
        if (!this.buffer || this.buffer.byteLength <= this.HEADER_SIZE) return null;

        const view = new DataView(this.buffer);
        const count = this.getEntryCount();
        let low = 0;
        let high = count - 1;

        while (low <= high) {
            const mid = (low + high) >>> 1;
            // Vi läser RegistryEntry som börjar efter Header (24 bytes)
            const midKey = view.getBigUint64(this.HEADER_SIZE + (mid * this.ENTRY_SIZE), true);

            if (midKey < targetKey) low = mid + 1;
            else if (midKey > targetKey) high = mid - 1;
            else return {
                offset: view.getBigUint64(this.HEADER_SIZE + (mid * this.ENTRY_SIZE) + 8, true),
                length: view.getBigUint64(this.HEADER_SIZE + (mid * this.ENTRY_SIZE) + 16, true)
            };
        }
        return null;
    }
}


# NEXUS V2.1 Technical Specification

## Resources & Links

- [**Project Pulse: Detailed information**](https://intelligentaudio.net/nexus-pulse)
- [**Explore Live Nexus Telemetry**](https://telemetry.intelligentaudio.net)
- [**Connect: LinkedIn**](https://www.linkedin.com/in/binarybeats/)

## Architect's Note

    The results of previous 1.51ns (mars 19 2026) prove that the combination of 
    a **64-byte header** and **24-byte entries** has eliminated virtually all 
    software-induced latency. The system operates at the physical frontier of 
    the memory bus (DDR5) bandwidth.
    We mount 10.4Gb as the speed of 1.56ns without any CPU overheat (29degrees).
    At this scale, software performance is dictated by the L1 cache. 
    Any regression exceeding 0.5ns is considered a violation of the NXP core principles.
---

### Visual Verification

The core performance and real-world jitter variance can be observed in real-time on the live dashboard:
This documentation defines the "Red Lines" for NEXUS V2. The system is optimized for single-digit nanosecond latency by utilizing symmetrical memory blocks, Cache Line Alignment, and Direct Memory Access (DMA).
[**Explore Live Nexus Telemetry**](https://telemetry.intelligentaudio.net)

## 1. NXP.Protocol (Data Layout)

The heart of the system. No classes, no padding, zero overhead.

### NXPHeader (64 Bytes)

Optimized for the CPU cache. By utilizing 64 bytes, we ensure the header occupies exactly one **Cache Line**, preventing false sharing.

| Offset | Type | Name | Description |
| :--- | :--- | :--- | :--- |
| 0 | `ulong` | **AppKeyHash** | Magic Number: `0x49414E4558555321` ("IANEXUS!") |
| 8 | `long` | **Timestamp** | Last write via `Stopwatch.GetTimestamp()` |
| 16 | `long` | **EntryCount** | Sacred Offset. Total number of 24-byte entries. |
| 24-63 | `byte[]` | **Reserved** | Padding for 64-byte alignment (Cache Line Alignment) |

### RegistryEntry (24 Bytes)

Symmetrical data block (8+8+4+4). Designed to fit perfectly within CPU registers.

| Size | Type | Name | Description |
| :--- | :--- | :--- | :--- |
| 8b | `ulong` | **EntityId** | Unique identifier (e.g., NameHash) |
| 8b | `double` | **Value** | High-precision metric value |
| 4b | `int` | **Status** | Status Flag (0=OK, 1=Warning, 2=Error) |
| 4b | `int` | **Metadata** | Reserved for future use (Maintains 24b symmetry) |

---

## 2. NEXUS.MemoryMappedManager (DMA)

The link between silicon and software.

- Method: Utilizes SafeMemoryMappedViewHandle to lock a raw byte* pointer in RAM.

- Zero-Copy: No copies are made between the file system and the application.
- Addressing:
- HeaderPtr: BasePointer + 0
- DataPtr: BasePointer + 64 (Data starts immediately following the header)

---

## 3. The Nano Rules (Performance Standards)

1. **Direct Indexing:** To locate an entry: `BasePtr + 64 + (Index * 24)`.
2. **Aggressive Inlining:** All critical methods (`GetEntryCount`, `Write`) are decorated with `[MethodImpl(MethodImplOptions.AggressiveInlining)]`.
3. **No Heap Allocations:** Zero `new` keywords in the critical loop. Only structs passed via pointers.
4. **Sequential Write:** Entries are written in order to leverage the CPU **Hardware Prefetcher**.

---

## 4. NEXUS V2 - Verified Performance (Architect.md)

**Environment:** .NET 10 LTS | Native AOT (x64) | DMA Pointer Access  
**Baseline:** NEXUS V2 Core Engine  
**Status:** ✅ VERIFIED BASELINE

### Core Engine Benchmarks (1,000,000 Slots)

| Operation | Avg. Latency | Throughput / Sec | Status |
| :--- | :--- | :--- | :--- |
| **Sequential Write** | **8.72 ns / slot** | ~114 million entries/s | **Extreme** |
| **Sequential Read** | **8.54 ns / slot** | ~117 million entries/s | **Extreme** |
| **Total Execution** | **17.79 ms** | 1M Full Lifecycle | **Sub-20ms Club** |

### Hardware Sympathy Metrics

| Component | Value | Architectural Benefit |
| :--- | :--- | :--- |
| **Header Alignment** | 64 Bytes | **L1 Cache Line Match.** Zero False Sharing. |
| **Slot Symmetry** | 24 Bytes | **Register Optimized.** 8+8+4+4 (DMA). |
| **Pointer Access** | Direct (`byte*`) | **Zero-Copy.** No .NET bounds-checking overhead. |

---

## 5. Dual-Stream Management (NEXUS.Vault)

To eliminate **Cache Pollution**, real-time data is separated from historical audit logs:

1. **Index Stream (nexusindex.ian)**

** Slot Size:** 24 Bytes

*Verified via Magic Header: 0x49414E4558555321 ("IANEXUS!")*

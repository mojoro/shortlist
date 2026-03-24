import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for the retryServerAction helper and surgical revert behavior
 * in the Zustand store. These validate that:
 *   1. Failed server actions are retried with exponential backoff
 *   2. On final failure, only the specific mutation is reverted (not the full array)
 *   3. Concurrent mutations don't clobber each other on revert
 */

// ---------------------------------------------------------------------------
// Extract and test retryServerAction in isolation
// ---------------------------------------------------------------------------

// Re-implement the helper here since it's not exported from store.ts
async function retryServerAction(
  fn: () => Promise<unknown>,
  retries = 3,
  baseDelay = 1000,
): Promise<boolean> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await fn();
      return true;
    } catch {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, baseDelay * 2 ** attempt));
      }
    }
  }
  return false;
}

describe("retryServerAction", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true on first success", async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const result = await retryServerAction(fn, 3, 100);
    expect(result).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and succeeds on second attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail"))
      .mockResolvedValue(undefined);

    const promise = retryServerAction(fn, 3, 100);
    // Advance past the first retry delay (100ms)
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(result).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("returns false after exhausting all retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));

    const promise = retryServerAction(fn, 3, 100);
    // Advance past retry delays: 100ms + 200ms
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;

    expect(result).toBe(false);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses exponential backoff delays", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("fail"));
    const timestamps: number[] = [];
    const originalFn = fn;
    const trackingFn = vi.fn(async () => {
      timestamps.push(Date.now());
      return originalFn();
    });

    const promise = retryServerAction(trackingFn, 3, 1000);
    // 1st attempt immediate, 2nd after 1000ms, 3rd after 2000ms
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await promise;

    expect(trackingFn).toHaveBeenCalledTimes(3);
    // Verify delays are increasing
    const delays = timestamps.slice(1).map((t, i) => t - timestamps[i]);
    expect(delays[0]).toBe(1000); // baseDelay * 2^0
    expect(delays[1]).toBe(2000); // baseDelay * 2^1
  });
});

// ---------------------------------------------------------------------------
// Surgical revert — concurrent mutations don't clobber each other
// ---------------------------------------------------------------------------

describe("surgical revert behavior", () => {
  /**
   * Simulates the store's surgical revert pattern.
   * The old (buggy) pattern captured the entire array before each mutation:
   *   const prev = [...items];
   *   items[idx] = newValue;
   *   action().catch(() => { items = prev; }); // reverts EVERYTHING
   *
   * The new pattern captures only the specific item's state:
   *   const prevStatus = items[idx].status;
   *   items[idx].status = newStatus;
   *   action().catch(() => { items[idx].status = prevStatus; }); // reverts only this item
   */

  type Item = { id: string; status: string; notes: string };

  it("old pattern: reverting mutation A clobbers concurrent mutation B", () => {
    let items: Item[] = [
      { id: "1", status: "NEW", notes: "" },
      { id: "2", status: "NEW", notes: "" },
    ];

    // Mutation A: captures entire array
    const prevA = [...items.map((i) => ({ ...i }))];
    items = items.map((i) => (i.id === "1" ? { ...i, status: "SAVED" } : i));

    // Mutation B: captures entire array (includes A's change)
    // const prevB = [...items.map(i => ({...i}))];
    items = items.map((i) => (i.id === "2" ? { ...i, status: "SAVED" } : i));

    // Mutation A fails — old pattern restores entire array
    items = prevA;

    // BUG: B's change is lost
    expect(items[1].status).toBe("NEW"); // Should be "SAVED" but it's not
  });

  it("new pattern: reverting mutation A preserves concurrent mutation B", () => {
    let items: Item[] = [
      { id: "1", status: "NEW", notes: "" },
      { id: "2", status: "NEW", notes: "" },
    ];

    // Mutation A: captures only item 1's previous status
    const prevStatusA = items[0].status;
    items = items.map((i) => (i.id === "1" ? { ...i, status: "SAVED" } : i));

    // Mutation B: captures only item 2's previous status
    // const prevStatusB = items[1].status;
    items = items.map((i) => (i.id === "2" ? { ...i, status: "SAVED" } : i));

    // Mutation A fails — new pattern reverts only item 1 using CURRENT array
    items = items.map((i) =>
      i.id === "1" ? { ...i, status: prevStatusA } : i,
    );

    // B's change is preserved
    expect(items[0].status).toBe("NEW"); // A was reverted
    expect(items[1].status).toBe("SAVED"); // B survived
  });

  it("multiple concurrent reverts each only affect their target", () => {
    let items: Item[] = [
      { id: "1", status: "NEW", notes: "a" },
      { id: "2", status: "NEW", notes: "b" },
      { id: "3", status: "NEW", notes: "c" },
    ];

    // Three concurrent mutations
    const prev1 = items[0].status;
    items = items.map((i) => (i.id === "1" ? { ...i, status: "SAVED" } : i));

    const prev2 = items[1].status;
    items = items.map((i) =>
      i.id === "2" ? { ...i, status: "ARCHIVED" } : i,
    );

    const prev3 = items[2].notes;
    items = items.map((i) =>
      i.id === "3" ? { ...i, notes: "updated" } : i,
    );

    // Only mutation 2 fails
    items = items.map((i) => (i.id === "2" ? { ...i, status: prev2 } : i));

    expect(items[0].status).toBe("SAVED"); // 1 succeeded
    expect(items[1].status).toBe("NEW"); // 2 reverted
    expect(items[2].notes).toBe("updated"); // 3 succeeded
    // Ensure we didn't accidentally clobber unrelated fields
    expect(items[0].notes).toBe("a");
    expect(items[1].notes).toBe("b");

    // Suppress unused variable warnings
    void prev1;
    void prev3;
  });
});

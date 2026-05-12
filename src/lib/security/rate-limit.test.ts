import { afterEach, describe, expect, it } from "vitest";
import {
  checkRateLimit,
  rateLimitMessage,
  resetRateLimitsForTests,
} from "./rate-limit";

afterEach(() => resetRateLimitsForTests());

describe("checkRateLimit", () => {
  it("allows attempts up to the configured max", async () => {
    const now = 1000;
    const tick = () => now;
    for (let i = 0; i < 5; i += 1) {
      const r = await checkRateLimit({
        key: "k",
        max: 5,
        windowMs: 1000,
        now: tick,
      });
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(4 - i);
    }
  });

  it("blocks the next attempt past the limit and reports retryAt", async () => {
    const now = 1000;
    const tick = () => now;
    for (let i = 0; i < 3; i += 1) {
      await checkRateLimit({ key: "k2", max: 3, windowMs: 1000, now: tick });
    }
    const denied = await checkRateLimit({
      key: "k2",
      max: 3,
      windowMs: 1000,
      now: tick,
    });
    expect(denied.ok).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAt).toBe(2000);
  });

  it("forgets attempts that fall outside the window", async () => {
    let now = 1000;
    const tick = () => now;
    for (let i = 0; i < 3; i += 1) {
      await checkRateLimit({ key: "k3", max: 3, windowMs: 1000, now: tick });
    }
    now = 2500; // > windowMs after the first attempt
    const r = await checkRateLimit({
      key: "k3",
      max: 3,
      windowMs: 1000,
      now: tick,
    });
    expect(r.ok).toBe(true);
  });

  it("isolates buckets by key", async () => {
    const now = 0;
    const tick = () => now;
    await checkRateLimit({ key: "a", max: 1, windowMs: 1000, now: tick });
    const r = await checkRateLimit({
      key: "b",
      max: 1,
      windowMs: 1000,
      now: tick,
    });
    expect(r.ok).toBe(true);
    const denied = await checkRateLimit({
      key: "a",
      max: 1,
      windowMs: 1000,
      now: tick,
    });
    expect(denied.ok).toBe(false);
  });
});

describe("rateLimitMessage", () => {
  it("renders an English message rounded up to the next second", () => {
    expect(rateLimitMessage(2000, "en", 1500)).toBe(
      "Too many attempts. Try again in 1s.",
    );
  });

  it("renders an Arabic message", () => {
    expect(rateLimitMessage(5000, "ar", 1000)).toContain("4");
    expect(rateLimitMessage(5000, "ar", 1000)).toContain("ثانية");
  });

  it("never reports zero seconds", () => {
    expect(rateLimitMessage(1000, "en", 1000)).toBe(
      "Too many attempts. Try again in 1s.",
    );
  });
});

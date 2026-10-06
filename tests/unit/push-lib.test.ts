import { describe, expect, it } from "vitest";
import { browserKind, unblockSteps } from "~/lib/push";

describe("push: unblock help", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile Safari/604.1", "ios"],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36", "android"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15", "safari"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0", "firefox"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36 Edg/129.0", "chromium"],
  ])("detects %s", (ua, kind) => {
    expect(browserKind(ua)).toBe(kind);
  });
  it("every browser gets steps", () => {
    for (const k of ["ios", "android", "safari", "firefox", "chromium"] as const) {
      expect(unblockSteps(k).length).toBeGreaterThan(1);
    }
  });
});

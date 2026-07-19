import { render } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";

// RecoveryPassword pulls in crypto + data modules at import time; stub them so
// the render smoke test stays focused on whether the warning is shown.
vi.mock("~/lib/crypto/recovery", () => ({
  DEFAULT_ITERATIONS: 1,
  SALT_BYTES: 16,
  WRAP_ALGO: "AES-GCM",
  deriveWrappingKey: vi.fn(),
  unwrapKey: vi.fn(),
  wrapKey: vi.fn(),
}));

vi.mock("~/lib/crypto/keystore", () => ({
  getKey: vi.fn(),
  putKey: vi.fn(),
}));

vi.mock("~/lib/data/relationship", () => ({
  getRelationshipWrap: vi.fn(),
  setRecoveryPassword: vi.fn(),
}));

const WARNING = "unreadable forever";

describe("RecoveryPassword — recovery warning surface", () => {
  it("shows the recovery warning in set mode", async () => {
    const RecoveryPassword = (await import("~/components/RecoveryPassword"))
      .default;
    const { container } = render(() => (
      <RecoveryPassword mode="set" relationshipId="rel-1" />
    ));
    expect(container.textContent).toContain(WARNING);
  });

  it("shows the recovery warning in change mode", async () => {
    const RecoveryPassword = (await import("~/components/RecoveryPassword"))
      .default;
    const { container } = render(() => (
      <RecoveryPassword mode="change" relationshipId="rel-1" />
    ));
    expect(container.textContent).toContain(WARNING);
  });

  it("does NOT show the recovery warning in restore mode", async () => {
    const RecoveryPassword = (await import("~/components/RecoveryPassword"))
      .default;
    const { container } = render(() => (
      <RecoveryPassword mode="restore" relationshipId="rel-1" />
    ));
    expect(container.textContent).not.toContain(WARNING);
  });
});

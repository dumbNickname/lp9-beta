import "fake-indexeddb/auto";
import { cleanup, fireEvent, render, waitFor } from "@solidjs/testing-library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKey } from "~/lib/crypto/aes";
import { deriveWrappingKey, wrapKey } from "~/lib/crypto/recovery";
import { getKey, putKey } from "~/lib/crypto/keystore";

// QA adversarial suite for the RecoveryPassword component's failure paths
// (restore). Real WebCrypto + real keystore (fake-indexeddb); the data layer
// (getRelationshipWrap) is mocked so we can feed a known blob / null.

const mockGetWrap = vi.fn();
const mockSetRecovery = vi.fn();

vi.mock("~/lib/data/relationship", () => ({
  getRelationshipWrap: (...a: unknown[]) => mockGetWrap(...a),
  setRecoveryPassword: (...a: unknown[]) => mockSetRecovery(...a),
}));

async function freshIDB() {
  const { IDBFactory } = await import("fake-indexeddb");
  globalThis.indexedDB = new IDBFactory();
}

// Real iteration count is 600k; that is far too slow for a component test.
// So restore tests supply a wrap built with a LOW iteration count and the
// component derives with the STORED iteration count (from the wrap record) --
// mirroring production, just faster.
const FAST_ITERS = 1000;

beforeEach(async () => {
  vi.clearAllMocks();
  await freshIDB();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PRD-22 QA: RecoveryPassword restore failure paths", () => {
  it("wrong password shows 'Couldn't unlock' and stores NO key", async () => {
    const relKey = await generateKey();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const wrappingKey = await deriveWrappingKey("the-real-password", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    mockGetWrap.mockResolvedValue({
      wrapped_key_blob: blob,
      wrap_salt: salt,
      wrap_iterations: FAST_ITERS,
      wrap_algo: "PBKDF2-SHA256",
    });

    const RecoveryPassword = (await import("~/components/RecoveryPassword")).default;
    const { getByLabelText, getByRole, findByRole } = render(() => (
      <RecoveryPassword mode="restore" relationshipId="rel-1" />
    ));

    fireEvent.input(getByLabelText(/recovery password/i), {
      target: { value: "WRONG-password" },
    });
    fireEvent.click(getByRole("button", { name: /unlock/i }));

    const alert = await findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/couldn't unlock/i);
    // Keystore untouched.
    expect(await getKey("rel-1")).toBeNull();
  });

  it("correct password restores the key to IndexedDB and calls onDone", async () => {
    const relKey = await generateKey();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const wrappingKey = await deriveWrappingKey("open-sesame", salt, FAST_ITERS);
    const blob = await wrapKey(relKey, wrappingKey);

    mockGetWrap.mockResolvedValue({
      wrapped_key_blob: blob,
      wrap_salt: salt,
      wrap_iterations: FAST_ITERS,
      wrap_algo: "PBKDF2-SHA256",
    });

    const onDone = vi.fn();
    const RecoveryPassword = (await import("~/components/RecoveryPassword")).default;
    const { getByLabelText, getByRole } = render(() => (
      <RecoveryPassword mode="restore" relationshipId="rel-2" onDone={onDone} />
    ));

    fireEvent.input(getByLabelText(/recovery password/i), {
      target: { value: "open-sesame" },
    });
    fireEvent.click(getByRole("button", { name: /unlock/i }));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(await getKey("rel-2")).not.toBeNull();
  });

  it("restore when no recovery password is set shows a clean message, no crash, no key stored", async () => {
    mockGetWrap.mockResolvedValue(null);

    const RecoveryPassword = (await import("~/components/RecoveryPassword")).default;
    const { getByLabelText, getByRole, findByRole } = render(() => (
      <RecoveryPassword mode="restore" relationshipId="rel-3" />
    ));

    fireEvent.input(getByLabelText(/recovery password/i), {
      target: { value: "whatever" },
    });
    fireEvent.click(getByRole("button", { name: /unlock/i }));

    const alert = await findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/no recovery password/i);
    expect(await getKey("rel-3")).toBeNull();
  });
});

describe("PRD-22 QA: RecoveryPassword set-mode guards", () => {
  it("set mode with mismatched confirm does NOT call the RPC", async () => {
    const RecoveryPassword = (await import("~/components/RecoveryPassword")).default;
    const { getAllByLabelText, getByLabelText, getByRole, findByRole } = render(() => (
      <RecoveryPassword mode="set" relationshipId="rel-4" />
    ));

    fireEvent.input(getByLabelText(/new password/i), { target: { value: "aaaa" } });
    // confirm field
    const confirm = getAllByLabelText(/confirm password/i)[0]!;
    fireEvent.input(confirm, { target: { value: "bbbb" } });
    fireEvent.click(getByRole("button", { name: /set password/i }));

    const alert = await findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/do not match/i);
    expect(mockSetRecovery).not.toHaveBeenCalled();
  });

  it("set mode with no local key shows a message and does NOT call the RPC", async () => {
    // No key in the (fresh) keystore for this relationship.
    const RecoveryPassword = (await import("~/components/RecoveryPassword")).default;
    const { getByLabelText, getAllByLabelText, getByRole, findByRole } = render(() => (
      <RecoveryPassword mode="set" relationshipId="rel-5" />
    ));

    fireEvent.input(getByLabelText(/new password/i), { target: { value: "match" } });
    fireEvent.input(getAllByLabelText(/confirm password/i)[0]!, {
      target: { value: "match" },
    });
    fireEvent.click(getByRole("button", { name: /set password/i }));

    const alert = await findByRole("alert");
    expect(alert.textContent ?? "").toMatch(/not available on this device/i);
    expect(mockSetRecovery).not.toHaveBeenCalled();
  });

  it("set mode with a local key wraps and calls setRecoveryPassword with 600k / PBKDF2-SHA256", async () => {
    // Put a real key in the keystore for this relationship.
    await putKey("rel-6", await generateKey());
    mockSetRecovery.mockResolvedValue(undefined);

    const RecoveryPassword = (await import("~/components/RecoveryPassword")).default;
    const onDone = vi.fn();
    const { getByLabelText, getAllByLabelText, getByRole } = render(() => (
      <RecoveryPassword mode="set" relationshipId="rel-6" onDone={onDone} />
    ));

    fireEvent.input(getByLabelText(/new password/i), { target: { value: "match-pw" } });
    fireEvent.input(getAllByLabelText(/confirm password/i)[0]!, {
      target: { value: "match-pw" },
    });
    fireEvent.click(getByRole("button", { name: /set password/i }));

    await waitFor(() => expect(mockSetRecovery).toHaveBeenCalled());
    const args = mockSetRecovery.mock.calls[0]!;
    // (relId, blob, salt, iterations, algo)
    expect(args[0]).toBe("rel-6");
    expect(args[1]).toBeInstanceOf(Uint8Array);
    expect((args[1] as Uint8Array).length).toBe(60); // iv(12)+key(32)+tag(16)
    expect((args[2] as Uint8Array).length).toBe(16); // salt
    expect(args[3]).toBe(600000);
    expect(args[4]).toBe("PBKDF2-SHA256");
    expect(onDone).toHaveBeenCalled();
  });
});

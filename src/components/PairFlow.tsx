import { createSignal, onCleanup, onMount, Show } from "solid-js";
import InviteQR from "~/components/InviteQR";
import QRScanner from "~/components/QRScanner";
import {
  base64ToBytes,
  bytesToBase64,
  exportKeyRaw,
  generateKey,
  importKeyRaw,
} from "~/lib/crypto/aes";
import { deleteKey, getKey, putKey } from "~/lib/crypto/keystore";
import {
  createPairInvite,
  getMyActiveRelationship,
  peekPairCode,
  redeemPairCode,
  revokePairInvite,
} from "~/lib/data/relationship";
import { normalizeScannedInput, parseInviteUrl, parseInvitePayload } from "~/lib/pairing/qr";
import { refreshRelationship } from "~/lib/stores/relationship";
import type { Archetype, PairInvitePeek } from "~/lib/data/types";

const POLL_MS = 3000;
const PENDING_INVITE_KEY = "pair_invite_pending";
const ARCHETYPE_HINT_KEY = "archetype_hint";
const VALID_ARCHETYPES: Archetype[] = [
  "getting_to_know",
  "established_couple",
  "close_friends",
];

// The AES key never leaves the device; only its temp keystore entry key.
function tempKeyId(code: string): string {
  return `invite:${code}`;
}

function readArchetypeHint(): Archetype {
  try {
    const raw = localStorage.getItem(ARCHETYPE_HINT_KEY);
    if (raw && (VALID_ARCHETYPES as string[]).includes(raw)) {
      return raw as Archetype;
    }
  } catch {
    // storage unavailable
  }
  return "getting_to_know";
}

interface PendingInvite {
  code: string;
  keyBase64: string;
}

function readPendingInvite(): PendingInvite | null {
  try {
    const raw = localStorage.getItem(PENDING_INVITE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingInvite;
    if (parsed && typeof parsed.code === "string" && typeof parsed.keyBase64 === "string") {
      return parsed;
    }
  } catch {
    // storage unavailable or malformed
  }
  return null;
}

function writePendingInvite(invite: PendingInvite): void {
  try {
    localStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(invite));
  } catch {
    // storage unavailable; reload-safety degrades but pairing still works
  }
}

function clearPendingInvite(): void {
  try {
    localStorage.removeItem(PENDING_INVITE_KEY);
  } catch {
    // storage unavailable
  }
}

// Map an RPC exception message to a friendly, user-facing string.
function friendlyRedeemError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (msg.includes("invalid code")) return "That invite code is not valid.";
  if (msg.includes("code already used")) return "That invite has already been used.";
  if (msg.includes("code expired")) return "That invite has expired.";
  if (msg.includes("cannot pair with yourself")) return "You cannot pair with yourself.";
  if (msg.includes("relationship already exists")) return "You are already paired with this person.";
  return "Could not pair. Please try again.";
}

type View = "landing" | "invite" | "join" | "confirm";

// The parsed invite payload held in memory until the user taps Join on the
// confirm view (D-25.1). The redeem/import/store only fires on that tap.
interface ConfirmState {
  code: string;
  keyBase64: string;
  peek: PairInvitePeek | null;
  peekLoading: boolean;
  peekError: string;
  busy: boolean;
  redeemError: string;
}

export default function PairFlow() {
  const [view, setView] = createSignal<View>("landing");

  // Invite subview state.
  const [invite, setInvite] = createSignal<PendingInvite | null>(null);
  const [inviteBusy, setInviteBusy] = createSignal(false);
  const [inviteError, setInviteError] = createSignal("");

  // Join subview state.
  const [joinError, setJoinError] = createSignal("");

  // Confirm subview state (parsed payload + peek preview, D-25.1/D-25.2).
  const [confirm, setConfirm] = createSignal<ConfirmState | null>(null);

  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const stopPolling = () => {
    if (pollTimer !== undefined) {
      clearInterval(pollTimer);
      pollTimer = undefined;
    }
  };

  // When a relationship appears, migrate the temp key onto the real id,
  // clean up, and refresh the store so AppGate switches to the dashboard.
  // The "set recovery password" prompt lives in the app shell (D-22.3),
  // not here, so pairing enters the app immediately.
  const onPaired = async (relationshipId: string, code: string) => {
    stopPolling();
    const key = await getKey(tempKeyId(code));
    if (key) {
      await putKey(relationshipId, key);
      await deleteKey(tempKeyId(code));
    }
    clearPendingInvite();
    await refreshRelationship();
  };


  const startPolling = (code: string) => {
    stopPolling();
    pollTimer = setInterval(() => {
      void (async () => {
        const rel = await getMyActiveRelationship();
        if (rel) await onPaired(rel.id, code);
      })();
    }, POLL_MS);
  };

  const beginInvite = async () => {
    setInviteError("");
    setInviteBusy(true);
    try {
      const archetype = readArchetypeHint();
      const code = await createPairInvite(archetype);
      const key = await generateKey();
      const keyBase64 = bytesToBase64(await exportKeyRaw(key));
      await putKey(tempKeyId(code), key);
      const pending: PendingInvite = { code, keyBase64 };
      writePendingInvite(pending);
      setInvite(pending);
      startPolling(code);
    } catch {
      setInviteError("Could not create an invite. Please try again.");
    } finally {
      setInviteBusy(false);
    }
  };

  const cancelInvite = async () => {
    const pending = invite();
    stopPolling();
    if (pending) {
      try {
        await revokePairInvite(pending.code);
      } catch {
        // Already consumed/expired/revoked — nothing to clean server-side.
      }
      await deleteKey(tempKeyId(pending.code));
    }
    clearPendingInvite();
    setInvite(null);
    setView("landing");
  };

  // Parse a scanned/pasted/deep-linked invite and route into the CONFIRM
  // view (D-25.1). This does NOT redeem — it only parses the payload, holds
  // it in memory, and peeks the inviter name for the confirm preview.
  const handleDecode = (input: string) => {
    // Accept either a full invite URL (deep link / scanned QR) or a bare
    // `v1:...` payload before parsing.
    const payload = normalizeScannedInput(input);
    const parsed = payload ? parseInvitePayload(payload) : null;
    if (!parsed) {
      setJoinError("That does not look like a valid invite.");
      setView("join");
      return;
    }
    setJoinError("");
    setConfirm({
      code: parsed.code,
      keyBase64: parsed.keyBase64,
      peek: null,
      peekLoading: true,
      peekError: "",
      busy: false,
      redeemError: "",
    });
    setView("confirm");
    void loadPeek(parsed.code);
  };

  const loadPeek = async (code: string) => {
    try {
      const peek = await peekPairCode(code);
      // Ignore if the user already navigated away or a newer decode replaced
      // this confirm state.
      if (confirm()?.code !== code) return;
      setConfirm((c) => (c ? { ...c, peek, peekLoading: false } : c));
    } catch (err) {
      if (confirm()?.code !== code) return;
      const msg = err instanceof Error ? err.message : "Could not load this invite.";
      setConfirm((c) =>
        c ? { ...c, peekLoading: false, peekError: msg } : c,
      );
    }
  };

  // Redeem happens ONLY here, on the explicit Join tap (D-25.1).
  const confirmJoin = async () => {
    const current = confirm();
    if (!current || current.busy || current.peekError) return;
    setConfirm((c) => (c ? { ...c, busy: true, redeemError: "" } : c));
    try {
      const relationshipId = await redeemPairCode(current.code);
      const key = await importKeyRaw(base64ToBytes(current.keyBase64));
      await putKey(relationshipId, key);
      await refreshRelationship();
      // Gate re-renders into the dashboard on the active relationship.
    } catch (err) {
      // Stay on the confirm view with a Back option; no key was stored.
      setConfirm((c) =>
        c ? { ...c, busy: false, redeemError: friendlyRedeemError(err) } : c,
      );
    }
  };

  const cancelConfirm = () => {
    setConfirm(null);
    setJoinError("");
    setView("join");
  };

  // Read a `#pair=<payload>` deep link off the current URL, if present, then
  // strip the fragment so it never re-triggers on re-render/reload. Guarded
  // for SSR (no window/history). Returns the raw payload or null.
  const consumeDeepLink = (): string | null => {
    if (typeof window === "undefined" || !window.location) return null;
    const payload = parseInviteUrl(window.location.href);
    if (payload === null) return null;
    try {
      if (window.history?.replaceState) {
        const { pathname, search } = window.location;
        window.history.replaceState(null, "", `${pathname}${search}`);
      } else {
        window.location.hash = "";
      }
    } catch {
      // History API unavailable; the fragment lingers but pairing still runs.
    }
    return payload;
  };

  // Reload-safety + deep-link handoff. A device is either the inviter (has an
  // outstanding pending invite -> RESTORE and re-show the waiting screen with
  // the QR/link/cancel, resume polling) or the joiner (opened a `#pair=` deep
  // link -> route into the CONFIRM view, no auto-redeem). The inviter path
  // wins if both somehow appear, so we only consume the deep link when no
  // invite is outstanding. The AES key persists in IndexedDB; pending
  // metadata in localStorage. (D-25.3)
  onMount(() => {
    const pending = readPendingInvite();
    if (pending) {
      setInvite(pending);
      setView("invite");
      startPolling(pending.code);
      return;
    }
    const deepLink = consumeDeepLink();
    if (deepLink) {
      handleDecode(deepLink);
    }
  });

  onCleanup(stopPolling);

  return (
    <section class="pair-flow">
      <Show when={view() === "landing"}>

        <div class="pair-flow-landing">
          <h2>Pair with your partner</h2>
          <p>
            Link your two accounts to start giving hearts. One of you invites,
            the other joins.
          </p>
          <div class="pair-flow-actions">
            <button type="button" onClick={() => setView("invite")}>
              Invite
            </button>
            <button type="button" onClick={() => setView("join")}>
              Join
            </button>
          </div>
        </div>
      </Show>

      <Show when={view() === "invite"}>
        <div class="pair-flow-invite">
          <h2>Invite your partner</h2>
          <Show
            when={invite()}
            fallback={
              <>
                <p>
                  Create an invite, then show the QR code or share the code with
                  your partner.
                </p>
                <Show when={inviteError()}>
                  <p class="error" role="alert">{inviteError()}</p>
                </Show>
                <div class="pair-flow-actions">
                  <button type="button" onClick={beginInvite} disabled={inviteBusy()}>
                    {inviteBusy() ? "Creating..." : "Create invite"}
                  </button>
                  <button type="button" onClick={() => setView("landing")}>
                    Back
                  </button>
                </div>
              </>
            }
          >
            <p class="pair-flow-waiting" role="status">
              Waiting for your partner to join...
            </p>
            <InviteQR
              code={invite()!.code}
              keyBase64={invite()!.keyBase64}
            />
            <div class="pair-flow-actions">
              <button type="button" onClick={cancelInvite}>
                Cancel invite
              </button>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={view() === "join"}>
        <div class="pair-flow-join">
          <h2>Join your partner</h2>
          <p>Scan the QR code your partner is showing, or paste their invite.</p>
          <Show when={joinError()}>
            <p class="error" role="alert">{joinError()}</p>
          </Show>
          <QRScanner onDecode={(payload) => handleDecode(payload)} />
          <div class="pair-flow-actions">
            <button type="button" onClick={() => setView("landing")}>
              Back
            </button>
          </div>
        </div>
      </Show>

      <Show when={view() === "confirm"}>
        <div class="pair-flow-confirm">
          <Show when={confirm()?.peekLoading}>
            <p class="pair-flow-waiting" role="status">Loading invite...</p>
          </Show>

          <Show when={confirm() && !confirm()!.peekLoading && confirm()!.peekError}>
            <h2>Invite unavailable</h2>
            <p class="error" role="alert">{confirm()!.peekError}</p>
            <div class="pair-flow-actions">
              <button type="button" onClick={cancelConfirm}>
                Back
              </button>
            </div>
          </Show>

          <Show when={confirm() && !confirm()!.peekLoading && !confirm()!.peekError}>
            <h2>
              Join {confirm()!.peek?.display_name || "your partner"}?
            </h2>
            <p>
              Pairing links your two accounts so you can start giving hearts.
            </p>
            <Show when={confirm()!.redeemError}>
              <p class="error" role="alert">{confirm()!.redeemError}</p>
            </Show>
            <div class="pair-flow-actions">
              <button
                type="button"
                onClick={() => void confirmJoin()}
                disabled={confirm()!.busy}
              >
                {confirm()!.busy ? "Joining..." : "Join"}
              </button>
              <button
                type="button"
                onClick={cancelConfirm}
                disabled={confirm()!.busy}
              >
                Cancel
              </button>
            </div>
          </Show>
        </div>
      </Show>
    </section>
  );
}

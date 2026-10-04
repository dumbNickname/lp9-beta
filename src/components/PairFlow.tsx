import { createSignal, onCleanup, onMount, Show } from "solid-js";
import HeartIcon from "~/components/HeartIcon";
import InviteQR from "~/components/InviteQR";
import { initial } from "~/components/PairBadge";
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
import { errorMessage } from "~/lib/data/errors";
import { normalizeScannedInput, parseInvitePayload } from "~/lib/pairing/qr";
import {
  captureInviteFromUrl,
  clearPendingJoin,
  joinConfirmed,
} from "~/lib/pairing/pendingJoin";
import {
  onNewRelationship,
  relationships,
  setAddingPartner,
} from "~/lib/stores/relationship";
import {
  type PendingInvite,
  clearPendingInvite,
  readPendingInvite,
  tempKeyId,
  writePendingInvite,
} from "~/lib/pairing/pendingInvite";
import { profile } from "~/lib/stores/profile";
import type { Archetype, PairInvitePeek } from "~/lib/data/types";

const POLL_MS = 3000;
const ARCHETYPE_HINT_KEY = "archetype_hint";
const VALID_ARCHETYPES: Archetype[] = [
  "getting_to_know",
  "established_couple",
  "close_friends",
];

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

// Map an RPC exception message to a friendly, user-facing string.
function friendlyRedeemError(err: unknown): string {
  const msg = errorMessage(err);
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
  const myName = () => profile()?.display_name || "You";
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
  // Relationships that existed when the flow opened (PRD-43).
  const knownIds = new Set(relationships().map((r) => r.id));

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
    // The store may already have adopted it on a focus refresh.
    const key = await getKey(tempKeyId(code));
    if (key) {
      await putKey(relationshipId, key);
      await deleteKey(tempKeyId(code));
    }
    clearPendingInvite();
    await onNewRelationship(relationshipId);
  };


  const startPolling = (code: string) => {
    stopPolling();
    pollTimer = setInterval(() => {
      void (async () => {
        // Newest active relationship; ignore ones that existed before this
        // invite so an already-paired user can pair again (PRD-43).
        const rel = await getMyActiveRelationship();
        if (rel && !knownIds.has(rel.id)) await onPaired(rel.id, code);
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
      const pending: PendingInvite = { code, keyBase64, knownIds: [...knownIds] };
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
      clearPendingJoin();
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
      if (joinConfirmed()) void confirmJoin();
    } catch (err) {
      if (confirm()?.code !== code) return;
      const msg = err instanceof Error ? err.message : "Could not load this invite.";
      // Reopening an already-used invite link (no home-screen icon) while
      // already paired: just go back to the app.
      if (msg.includes("already been used") && relationships().length > 0) {
        clearPendingJoin();
        setConfirm(null);
        setAddingPartner(false);
        return;
      }
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
      clearPendingJoin();
      await onNewRelationship(relationshipId);
      // Gate re-renders into the dashboard on the active relationship.
    } catch (err) {
      // Stay on the confirm view with a Back option; no key was stored.
      setConfirm((c) =>
        c ? { ...c, busy: false, redeemError: friendlyRedeemError(err) } : c,
      );
    }
  };

  const cancelConfirm = () => {
    clearPendingJoin();
    setConfirm(null);
    setJoinError("");
    setView("join");
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
    // The shell may already have captured it (e.g. before onboarding).
    const deepLink = captureInviteFromUrl();
    if (deepLink) {
      handleDecode(deepLink);
    }
  });

  onCleanup(stopPolling);

  const confirmName = () => confirm()?.peek?.display_name || "your partner";

  return (
    <section class="pair-flow">
      <Show when={view() === "landing"}>
        <div class="pair-flow-landing">
          <div class="pair-hero" aria-hidden="true">
            <span class="avatar avatar--me">{initial(myName())}</span>
            <span class="pair-hero-link">
              <span class="pair-hero-dot" />
              <span class="pair-hero-dot" />
              <span class="pair-hero-dot" />
            </span>
            <span class="avatar avatar--partner avatar--empty">?</span>
          </div>
          <h2 class="pair-flow-title">Pair with your partner</h2>
          <p class="pair-flow-lede">One of you invites, the other joins.</p>
          <div class="pair-choices">
            <button
              type="button"
              class="pair-choice pair-choice--invite"
              aria-label="Invite"
              aria-describedby="pair-choice-invite-hint"
              onClick={() => setView("invite")}
            >
              <span class="pair-choice-icon" aria-hidden="true">
                <QrIcon />
              </span>
              <span class="pair-choice-label">Invite</span>
              <span id="pair-choice-invite-hint" class="pair-choice-hint">Show a QR or send a link</span>
            </button>
            <button
              type="button"
              class="pair-choice pair-choice--join"
              aria-label="Join"
              aria-describedby="pair-choice-join-hint"
              onClick={() => setView("join")}
            >
              <span class="pair-choice-icon" aria-hidden="true">
                <ScanIcon />
              </span>
              <span class="pair-choice-label">Join</span>
              <span id="pair-choice-join-hint" class="pair-choice-hint">Scan their QR or paste a link</span>
            </button>
          </div>
        </div>
      </Show>

      <Show when={view() === "invite"}>
        <div class="pair-flow-invite card">
          <h2 class="pair-flow-title">Invite your partner</h2>
          <Show
            when={invite()}
            fallback={
              <>
                <p class="pair-flow-lede">
                  You'll get a QR code to show and a link to send.
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
              <span class="pulse-dot" aria-hidden="true" />
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
        <div class="pair-flow-join card">
          <h2 class="pair-flow-title">Join your partner</h2>
          <p class="pair-flow-lede">Point the camera at their QR, or paste their link.</p>
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
        <div class="pair-flow-confirm card">
          <Show when={confirm()?.peekLoading}>
            <p class="pair-flow-waiting" role="status">
              <span class="pulse-dot" aria-hidden="true" />
              Opening invite...
            </p>
          </Show>

          <Show when={confirm() && !confirm()!.peekLoading && confirm()!.peekError}>
            <div class="pair-hero pair-hero--broken" aria-hidden="true">
              <span class="avatar avatar--me">{initial(myName())}</span>
              <span class="pair-hero-link">
                <span class="pair-hero-dot" />
                <span class="pair-hero-gap" />
                <span class="pair-hero-dot" />
              </span>
              <span class="avatar avatar--partner avatar--empty">?</span>
            </div>
            <h2 class="pair-flow-title">Invite unavailable</h2>
            <p class="error" role="alert">{confirm()!.peekError}</p>
            <p class="pair-flow-lede">Ask your partner for a fresh invite, or invite them yourself.</p>
            <div class="pair-flow-actions">
              <button type="button" onClick={() => { cancelConfirm(); setView("invite"); }}>
                Invite them instead
              </button>
              <button type="button" onClick={cancelConfirm}>
                Back
              </button>
            </div>
          </Show>

          <Show when={confirm() && !confirm()!.peekLoading && !confirm()!.peekError}>
            <div class="pair-hero" aria-hidden="true">
              <span class="avatar avatar--me">{initial(myName())}</span>
              <span class="avatar-heart">
                <HeartIcon filled />
              </span>
              <span class="avatar avatar--partner">{initial(confirmName())}</span>
            </div>
            <h2 class="pair-flow-title">
              Join {confirmName()}?
            </h2>
            <p class="pair-flow-lede">
              You'll share one private notebook. Only you two can read the notes.
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

function QrIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 24 24">
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19v1M19 14h1" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 24 24">
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M7 12h10" />
    </svg>
  );
}

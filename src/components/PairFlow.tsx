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
  redeemPairCode,
  revokePairInvite,
} from "~/lib/data/relationship";
import { buildInvitePayload, parseInvitePayload } from "~/lib/pairing/qr";
import { refreshRelationship } from "~/lib/stores/relationship";
import type { Archetype } from "~/lib/data/types";

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

type View = "landing" | "invite" | "join";

export default function PairFlow() {
  const [view, setView] = createSignal<View>("landing");

  // Invite subview state.
  const [invite, setInvite] = createSignal<PendingInvite | null>(null);
  const [inviteBusy, setInviteBusy] = createSignal(false);
  const [inviteError, setInviteError] = createSignal("");

  // Join subview state.
  const [joinBusy, setJoinBusy] = createSignal(false);
  const [joinError, setJoinError] = createSignal("");

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

  const handleDecode = async (payload: string) => {
    const parsed = parseInvitePayload(payload);
    if (!parsed) {
      setJoinError("That does not look like a valid invite.");
      return;
    }
    setJoinError("");
    setJoinBusy(true);
    try {
      const relationshipId = await redeemPairCode(parsed.code);
      const key = await importKeyRaw(base64ToBytes(parsed.keyBase64));
      await putKey(relationshipId, key);
      await refreshRelationship();
      // Gate re-renders into the dashboard on the active relationship.
    } catch (err) {
      setJoinError(friendlyRedeemError(err));
    } finally {
      setJoinBusy(false);
    }
  };

  // Reload-safety: if an invite was outstanding, resume the waiting screen.
  // The AES key persists in IndexedDB; the pending metadata in localStorage.
  onMount(() => {
    const pending = readPendingInvite();
    if (pending) {
      setInvite(pending);
      setView("invite");
      startPolling(pending.code);
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
              payload={buildInvitePayload(invite()!.code, invite()!.keyBase64)}
              code={invite()!.code}
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
          <Show when={joinBusy()}>
            <p class="pair-flow-waiting" role="status">Pairing...</p>
          </Show>
          <Show when={joinError()}>
            <p class="error" role="alert">{joinError()}</p>
          </Show>
          <QRScanner onDecode={(payload) => void handleDecode(payload)} />
          <div class="pair-flow-actions">
            <button type="button" onClick={() => setView("landing")}>
              Back
            </button>
          </div>
        </div>
      </Show>
    </section>
  );
}

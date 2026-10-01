import { createSignal, Show } from "solid-js";
import {
  DEFAULT_ITERATIONS,
  SALT_BYTES,
  WRAP_ALGO,
  deriveWrappingKey,
  unwrapKey,
  wrapKey,
} from "~/lib/crypto/recovery";
import { getKey, putKey } from "~/lib/crypto/keystore";
import {
  getRelationshipWrap,
  setRecoveryPassword,
} from "~/lib/data/relationship";
import RecoveryWarning from "~/components/RecoveryWarning";
import { LockIcon } from "~/components/Icons";

function KeyIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 24 24">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2" />
    </svg>
  );
}

export type RecoveryMode = "set" | "change" | "restore";

interface Props {
  mode: RecoveryMode;
  relationshipId: string;
  // set: skipped without setting a password.
  onSkip?: () => void;
  // set/change: password written. restore: key restored to IndexedDB.
  onDone?: () => void;
}

const HEADINGS: Record<RecoveryMode, string> = {
  set: "Keep your notes safe",
  change: "Change recovery password",
  restore: "Unlock your comments",
};

const SUBMIT_LABELS: Record<RecoveryMode, string> = {
  set: "Set password",
  change: "Change password",
  restore: "Unlock",
};

export default function RecoveryPassword(props: Props) {
  const [password, setPassword] = createSignal("");
  const [confirm, setConfirm] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  const needsConfirm = () => props.mode === "set" || props.mode === "change";

  // set/change: wrap the locally-held key with a key derived from the new
  // password and write the blob. The plaintext key is already on this
  // device (IndexedDB), so no old password is needed to re-wrap.
  const handleSetOrChange = async () => {
    const relKey = await getKey(props.relationshipId);
    if (!relKey) {
      setError("Your key is not available on this device.");
      return;
    }
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const wrappingKey = await deriveWrappingKey(
      password(),
      salt,
      DEFAULT_ITERATIONS,
    );
    const blob = await wrapKey(relKey, wrappingKey);
    await setRecoveryPassword(
      props.relationshipId,
      blob,
      salt,
      DEFAULT_ITERATIONS,
      WRAP_ALGO,
    );
    props.onDone?.();
  };

  // restore: fetch the blob, derive with the entered password, unwrap. A
  // wrong password or tampered blob throws in unwrapKey; we surface a clean
  // message and store no key.
  const handleRestore = async () => {
    const wrap = await getRelationshipWrap(props.relationshipId);
    if (!wrap) {
      setError("No recovery password has been set for this relationship.");
      return;
    }
    const wrappingKey = await deriveWrappingKey(
      password(),
      wrap.wrap_salt,
      wrap.wrap_iterations,
    );
    const key = await unwrapKey(wrap.wrapped_key_blob, wrappingKey);
    await putKey(props.relationshipId, key);
    props.onDone?.();
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!password()) {
      setError("Please enter a password.");
      return;
    }
    if (needsConfirm() && password() !== confirm()) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      if (props.mode === "restore") {
        await handleRestore();
      } else {
        await handleSetOrChange();
      }
    } catch {
      // Wrong password / tampered blob / network: no key is stored.
      setError(
        props.mode === "restore"
          ? "Couldn't unlock. Check your password and try again."
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      class="recovery-password"
      classList={{ "recovery-password--set": props.mode === "set" }}
      onSubmit={handleSubmit}
    >
      <div class="recovery-art" aria-hidden="true">
        <KeyIcon />
      </div>
      <h2>{HEADINGS[props.mode]}</h2>

      <Show when={needsConfirm()}>
        <ul class="recovery-facts">
          <li>
            <span class="recovery-fact-icon recovery-fact-icon--ok" aria-hidden="true">
              <LockIcon />
            </span>
            Notes are encrypted. Only your two devices hold the key.
          </li>
          <li>
            <span class="recovery-fact-icon recovery-fact-icon--warn" aria-hidden="true">!</span>
            New phone? This password brings your notes back. Forget it, and
            they stay locked.
          </li>
        </ul>
        <details class="recovery-more">
          <summary>How recovery works</summary>
          <RecoveryWarning />
        </details>
      </Show>

      <label>
        {props.mode === "restore" ? "Recovery password" : "New password"}
        <input
          type="password"
          value={password()}
          onInput={(e) => setPassword(e.currentTarget.value)}
          autocomplete={props.mode === "restore" ? "current-password" : "new-password"}
          required
        />
      </label>

      <Show when={needsConfirm()}>
        <label>
          Confirm password
          <input
            type="password"
            value={confirm()}
            onInput={(e) => setConfirm(e.currentTarget.value)}
            autocomplete="new-password"
            required
          />
        </label>
      </Show>

      <Show when={error()}>
        <p class="error" role="alert">{error()}</p>
      </Show>

      <div class="pair-flow-actions">
        <button type="submit" disabled={busy()}>
          {busy() ? "Working..." : SUBMIT_LABELS[props.mode]}
        </button>
        <Show when={props.mode === "set" && props.onSkip}>
          <button type="button" onClick={() => props.onSkip?.()} disabled={busy()}>
            Skip for now
          </button>
        </Show>
      </div>
    </form>
  );
}

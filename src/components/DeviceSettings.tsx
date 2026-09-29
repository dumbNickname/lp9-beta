import { createResource, createSignal, Show } from "solid-js";
import { confirmSheet } from "~/components/ConfirmSheet";
import RecoveryPassword from "~/components/RecoveryPassword";
import { getKey } from "~/lib/crypto/keystore";
import { getRelationshipWrap } from "~/lib/data/relationship";
import { resetAccount } from "~/lib/session";

interface Props {
  relationshipId: string | null;
  onKeyRestored?: () => void;
}

type Panel = null | "change" | "restore";

// "This device" settings for anonymous mode (PRD-45): recovery password
// status + change/restore, honest data note, and the reset escape hatch.
export default function DeviceSettings(props: Props) {
  const [open, setOpen] = createSignal(false);
  const [panel, setPanel] = createSignal<Panel>(null);
  const [resetting, setResetting] = createSignal(false);
  const [saved, setSaved] = createSignal("");

  const [status, { refetch }] = createResource(
    () => (open() && props.relationshipId ? props.relationshipId : null),
    async (relId) => {
      const [key, wrap] = await Promise.all([
        getKey(relId).catch(() => null),
        getRelationshipWrap(relId).catch(() => null),
      ]);
      return { hasKey: key !== null, hasPassword: wrap !== null };
    },
  );

  const reset = async () => {
    const ok = await confirmSheet({
      title: "Reset this device?",
      body:
        "This clears your keys on this device and signs you out, so you start fresh as a new anonymous user. Your partner keeps their account. Without a recovery password you can't get back in.",
      confirmLabel: "Reset device",
      tone: "danger",
    });
    if (!ok) return;
    setResetting(true);
    await resetAccount();
    if (typeof window !== "undefined") window.location.reload();
  };

  const done = (msg: string) => {
    setPanel(null);
    setSaved(msg);
    void refetch();
    props.onKeyRestored?.();
  };

  return (
    <section class="settings" aria-label="This device">
      <button
        type="button"
        class="link-button settings-toggle"
        aria-expanded={open()}
        aria-controls="settings-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open() ? "Hide settings" : "Settings & this device"}
      </button>

      <Show when={open()}>
        <div id="settings-panel" class="card settings-panel">
          <h2 class="templates-title">This device</h2>
          <p class="settings-note">
            You're using the app without an account. Your hearts and coupons are
            stored on our server, but only this browser can get to them — clearing
            it or switching devices means starting over. Notes are end-to-end
            encrypted; the key lives here.
          </p>

          <Show when={props.relationshipId}>
            <div class="settings-row">
              <div>
                <p class="settings-label">Recovery password</p>
                <p class="settings-value">
                  <Show when={!status.loading} fallback={"Checking..."}>
                    {status()?.hasPassword
                      ? "Set — you can unlock notes on a new device."
                      : "Not set — notes are only readable here."}
                  </Show>
                </p>
              </div>
              <Show when={status() && status()!.hasKey}>
                <button type="button" class="quiet small" onClick={() => setPanel("change")}>
                  {status()?.hasPassword ? "Change" : "Set"}
                </button>
              </Show>
              <Show when={status() && !status()!.hasKey && status()!.hasPassword}>
                <button type="button" class="quiet small" onClick={() => setPanel("restore")}>
                  Unlock notes
                </button>
              </Show>
            </div>

            <Show when={panel()}>
              {(mode) => (
                <div class="settings-sub">
                  <RecoveryPassword
                    mode={mode()}
                    relationshipId={props.relationshipId!}
                    onDone={() => done(mode() === "restore" ? "Notes unlocked." : "Recovery password saved.")}
                  />
                  <button type="button" class="quiet small" onClick={() => setPanel(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </Show>
            <Show when={saved()}>
              <p class="composer-sent" role="status">{saved()}</p>
            </Show>
          </Show>

          <div class="settings-row settings-danger">
            <div>
              <p class="settings-label">Start fresh</p>
              <p class="settings-value">For testing, or handing this device to someone else.</p>
            </div>
            <button
              type="button"
              class="quiet small"
              onClick={() => void reset()}
              disabled={resetting()}
            >
              {resetting() ? "Resetting..." : "Reset device"}
            </button>
          </div>
        </div>
      </Show>
    </section>
  );
}

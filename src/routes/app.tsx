import { Show, createEffect, createSignal, onMount } from "solid-js";
import { APP_NAME } from "~/constants";
import { loading as sessionLoading, user } from "~/lib/session";
import {
  profile,
  profileLoading,
  refreshProfile,
  useProfileFocusRefresh,
} from "~/lib/stores/profile";
import {
  addingPartner,
  justPaired,
  relationship,
  relationships,
  relationshipLoading,
  refreshRelationship,
  setAddingPartner,
  setJustPaired,
  useRelationshipFocusRefresh,
} from "~/lib/stores/relationship";
import { captureInviteFromUrl, pendingJoin } from "~/lib/pairing/pendingJoin";
import PairedMoment from "~/components/PairedMoment";
import Onboarding from "~/components/Onboarding";
import PairFlow from "~/components/PairFlow";
import RecoveryPassword from "~/components/RecoveryPassword";
import ConfirmHost from "~/components/ConfirmSheet";
import Dashboard from "~/components/Dashboard";
import DeviceSettings from "~/components/DeviceSettings";

// One-time "set recovery password" prompt, tracked per relationship in
// localStorage so it shows once and survives reloads (D-22.3).
function recoveryPromptedKey(relId: string): string {
  return `recovery_prompted:${relId}`;
}

function wasRecoveryPrompted(relId: string): boolean {
  try {
    return localStorage.getItem(recoveryPromptedKey(relId)) !== null;
  } catch {
    return false;
  }
}

function markRecoveryPrompted(relId: string): void {
  try {
    localStorage.setItem(recoveryPromptedKey(relId), "1");
  } catch {
    // storage unavailable; prompt may reappear next session (acceptable).
  }
}

export default function AppShell() {
  // Grab a `#pair=` invite before anything else can drop it (onboarding,
  // remounts). PairFlow reads it from the pendingJoin signal.
  onMount(() => {
    captureInviteFromUrl();
  });
  // Already paired and opening someone's invite: go straight to the
  // new-pair flow, which lands on the confirm step.
  createEffect(() => {
    if (pendingJoin() && relationship() && !relationshipLoading()) setAddingPartner(true);
  });

  createEffect(() => {
    if (user()) {
      void refreshProfile();
      void refreshRelationship();
    }
  });
  useProfileFocusRefresh();
  useRelationshipFocusRefresh();

  // Whether the recovery overlay is currently dismissed for the active
  // relationship. Recomputed when the active relationship changes.
  const [recoveryDone, setRecoveryDone] = createSignal(false);
  createEffect(() => {
    const rel = relationship();
    setRecoveryDone(rel ? wasRecoveryPrompted(rel.id) : true);
  });

  const dismissRecovery = (relId: string) => {
    markRecoveryPrompted(relId);
    setRecoveryDone(true);
  };


  return (
    <main class="app-main">
      <h1 class="visually-hidden">{APP_NAME}</h1>
      <Show when={!sessionLoading() && user()} fallback={<p>Loading...</p>}>
        <Show when={!profileLoading()} fallback={<p>Loading...</p>}>
          <Show when={profile()?.display_name} fallback={<Onboarding />}>
            <Show when={!relationshipLoading()} fallback={<p>Loading...</p>}>
              <Show when={relationship() && !addingPartner()} fallback={
                <>
                  <Show when={relationship()}>
                    <div class="adding-partner-bar">
                      <p class="eyebrow">New pair — a separate notebook</p>
                      <button type="button" class="quiet small" onClick={() => setAddingPartner(false)}>
                        Back to my pair
                      </button>
                    </div>
                  </Show>
                  <PairFlow />
                </>
              }>
                <Show when={justPaired() === relationship()?.id}>
                  <PairedMoment
                    myName={profile()!.display_name!}
                    relationship={relationship()!}
                    userId={user()!.id}
                    onDone={() => setJustPaired(null)}
                  />
                </Show>
                <Show when={!recoveryDone() && justPaired() !== relationship()?.id}>
                  <RecoveryPassword
                    mode="set"
                    relationshipId={relationship()!.id}
                    onDone={() => dismissRecovery(relationship()!.id)}
                    onSkip={() => dismissRecovery(relationship()!.id)}
                  />
                </Show>
                {/* Keyed by id, not object: refreshes return new objects and
                    must not remount the dashboard (lost drafts/scroll). */}
                <Show when={relationship()?.id} keyed>
                  {(id: string) => (
                    <Dashboard
                      relationship={relationships().find((r) => r.id === id) ?? relationship()!}
                      userId={user()!.id}
                      displayName={profile()!.display_name!}
                    />
                  )}
                </Show>
              </Show>
            </Show>
          </Show>
        </Show>
      </Show>
      <Show when={!relationship()}>
        <footer class="app-reset">
          <details class="app-reset-details">
            <summary>This device</summary>
            <DeviceSettings relationshipId={null} />
          </details>
        </footer>
      </Show>
      <ConfirmHost />
    </main>
  );
}

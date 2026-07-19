import { Show, createEffect, createSignal } from "solid-js";
import { APP_NAME } from "~/constants";
import { loading as sessionLoading, user } from "~/lib/session";
import {
  profile,
  profileLoading,
  refreshProfile,
  useProfileFocusRefresh,
} from "~/lib/stores/profile";
import {
  relationship,
  relationshipLoading,
  refreshRelationship,
  useRelationshipFocusRefresh,
} from "~/lib/stores/relationship";
import Onboarding from "~/components/Onboarding";
import PairFlow from "~/components/PairFlow";
import RecoveryPassword from "~/components/RecoveryPassword";

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
    <main>
      <h1>{APP_NAME}</h1>
      <Show when={!sessionLoading() && user()} fallback={<p>Loading...</p>}>
        <Show when={!profileLoading()} fallback={<p>Loading...</p>}>
          <Show when={profile()?.display_name} fallback={<Onboarding />}>
            <Show when={!relationshipLoading()} fallback={<p>Loading...</p>}>
              <Show when={relationship()} fallback={<PairFlow />}>
                <Show when={!recoveryDone()}>
                  <RecoveryPassword
                    mode="set"
                    relationshipId={relationship()!.id}
                    onDone={() => dismissRecovery(relationship()!.id)}
                    onSkip={() => dismissRecovery(relationship()!.id)}
                  />
                </Show>
                <p>Welcome back, {profile()!.display_name}!</p>
              </Show>
            </Show>
          </Show>
        </Show>
      </Show>
    </main>
  );
}

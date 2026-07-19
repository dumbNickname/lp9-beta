import { Show, createEffect } from "solid-js";
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

export default function AppShell() {
  createEffect(() => {
    if (user()) {
      void refreshProfile();
      void refreshRelationship();
    }
  });
  useProfileFocusRefresh();
  useRelationshipFocusRefresh();

  return (
    <main>
      <h1>{APP_NAME}</h1>
      <Show when={!sessionLoading() && user()} fallback={<p>Loading...</p>}>
        <Show when={!profileLoading()} fallback={<p>Loading...</p>}>
          <Show when={profile()?.display_name} fallback={<Onboarding />}>
            <Show when={!relationshipLoading()} fallback={<p>Loading...</p>}>
              <Show when={relationship()} fallback={<PairFlow />}>
                <p>Welcome back, {profile()!.display_name}!</p>
              </Show>
            </Show>
          </Show>
        </Show>
      </Show>
    </main>
  );
}

import { Show, onMount } from "solid-js";
import { APP_NAME } from "~/constants";
import { loading as sessionLoading, user } from "~/lib/session";
import {
  profile,
  profileLoading,
  refreshProfile,
  useProfileFocusRefresh,
} from "~/lib/stores/profile";
import Onboarding from "~/components/Onboarding";

export default function AppShell() {
  onMount(() => {
    void refreshProfile();
  });
  useProfileFocusRefresh();

  return (
    <main>
      <h1>{APP_NAME}</h1>
      <Show when={!sessionLoading() && !profileLoading()} fallback={<p>Loading...</p>}>
        <Show when={user()}>
          <Show when={profile()?.display_name} fallback={<Onboarding />}>
            <p>Welcome back, {profile()!.display_name}!</p>
          </Show>
        </Show>
      </Show>
    </main>
  );
}

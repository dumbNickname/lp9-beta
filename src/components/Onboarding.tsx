import { createSignal, For, Show } from "solid-js";
import { saveProfile, refreshProfile } from "~/lib/stores/profile";
import Callout from "~/components/Callout";

const ARCHETYPES = [
  { value: "getting_to_know", label: "Getting to know each other" },
  { value: "established_couple", label: "Established couple" },
  { value: "close_friends", label: "Close friends" },
] as const;

const LOCALES = [
  { value: "en", label: "English" },
  { value: "pl", label: "Polski" },
  { value: "de", label: "Deutsch" },
] as const;

export default function Onboarding() {
  const [name, setName] = createSignal("");
  const [locale, setLocale] = createSignal<"en" | "pl" | "de">("en");
  const [archetype, setArchetype] = createSignal<string>("getting_to_know");
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal("");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const trimmed = name().trim();
    if (!trimmed) {
      setError("Display name is required.");
      return;
    }
    if (trimmed.length > 50) {
      setError("Display name must be 50 characters or fewer.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await saveProfile({ display_name: trimmed, locale: locale() });
      try {
        localStorage.setItem("archetype_hint", archetype());
      } catch {
        // storage unavailable
      }
      await refreshProfile();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form class="onboarding" onSubmit={handleSubmit}>
      <Callout variant="info">
        <p class="nudge">
          Without linking an account, you cannot recover your data if you
          clear your browser or switch devices.
        </p>
      </Callout>

      <label>
        Display name
        <input
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          maxLength={50}
          required
          placeholder="How your partner will see you"
        />
      </label>

      <label>
        Language
        <select
          value={locale()}
          onChange={(e) => setLocale(e.currentTarget.value as "en" | "pl" | "de")}
        >
          <For each={LOCALES}>
            {(l) => <option value={l.value}>{l.label}</option>}
          </For>
        </select>
      </label>

      <label>
        What describes you best?
        <select
          value={archetype()}
          onChange={(e) => setArchetype(e.currentTarget.value)}
        >
          <For each={ARCHETYPES}>
            {(a) => <option value={a.value}>{a.label}</option>}
          </For>
        </select>
      </label>

      <Show when={error()}>
        <p class="error" role="alert">{error()}</p>
      </Show>

      <button type="submit" disabled={submitting()}>
        {submitting() ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}

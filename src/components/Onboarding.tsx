import { createSignal, For, Show } from "solid-js";
import { saveProfile, refreshProfile } from "~/lib/stores/profile";

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
      <p class="nudge">
        Without linking an account, you cannot recover your data if you
        clear your browser or switch devices.
      </p>

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

      <fieldset>
        <legend>Language</legend>
        <For each={LOCALES}>{(l) => (
          <label>
            <input
              type="radio"
              name="locale"
              value={l.value}
              checked={locale() === l.value}
              onChange={() => setLocale(l.value)}
            />
            {l.label}
          </label>
        )}</For>
      </fieldset>

      <fieldset>
        <legend>What describes you best?</legend>
        <For each={ARCHETYPES}>{(a) => (
          <label>
            <input
              type="radio"
              name="archetype"
              value={a.value}
              checked={archetype() === a.value}
              onChange={() => setArchetype(a.value)}
            />
            {a.label}
          </label>
        )}</For>
      </fieldset>

      <Show when={error()}>
        <p class="error" role="alert">{error()}</p>
      </Show>

      <button type="submit" disabled={submitting()}>
        {submitting() ? "Saving..." : "Continue"}
      </button>
    </form>
  );
}

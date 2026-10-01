import { createResource, createSignal, For, Show } from "solid-js";
import HeartIcon from "~/components/HeartIcon";
import { initial } from "~/components/PairBadge";
import { peekPairCode } from "~/lib/data/relationship";
import { parseInvitePayload } from "~/lib/pairing/qr";
import { pendingJoin, setJoinConfirmed } from "~/lib/pairing/pendingJoin";
import { saveProfile, refreshProfile } from "~/lib/stores/profile";
import Callout from "~/components/Callout";

const ARCHETYPES = [
  { value: "getting_to_know", label: "New together" },
  { value: "established_couple", label: "Long-term" },
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

  // Arrived through an invite link: show who is waiting, skip the
  // relationship question (the inviter already chose it).
  const inviteCode = () => {
    const p = pendingJoin();
    return p ? (parseInvitePayload(p)?.code ?? null) : null;
  };
  const [inviter] = createResource(inviteCode, (code) =>
    peekPairCode(code).catch(() => null),
  );
  const inviterName = () => inviter()?.display_name || null;
  // Invite variant while the peek loads or once it found the inviter; an
  // expired/used link falls back to the normal welcome (PairFlow explains).
  const joining = () => !!inviteCode() && (inviter.loading || !!inviterName());

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    const trimmed = name().trim();
    if (!trimmed) {
      setError("Tell us your name first.");
      return;
    }
    if (trimmed.length > 50) {
      setError("Keep it to 50 characters or fewer.");
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
      // The button said "Join <name>", so the confirm step can go ahead.
      if (joining() && inviterName()) setJoinConfirmed(true);
      await refreshProfile();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form class="onboarding" onSubmit={handleSubmit}>
      <div class="onboarding-art" aria-hidden="true">
        <Show
          when={joining()}
          fallback={
            <span class="onboarding-hearts">
              <HeartIcon filled class="onboarding-heart onboarding-heart--a" />
              <HeartIcon filled class="onboarding-heart onboarding-heart--b" />
              <HeartIcon filled class="onboarding-heart onboarding-heart--c" />
            </span>
          }
        >
          <span class="pair-avatars onboarding-invite-avatars">
            <span class="avatar avatar--me">{initial(name() || "?")}</span>
            <span class="avatar-heart">
              <HeartIcon filled />
            </span>
            <span class="avatar avatar--partner">{initial(inviterName() ?? "?")}</span>
          </span>
        </Show>
      </div>

      <Show
        when={joining()}
        fallback={
          <>
            <h2 class="onboarding-title">
              Notice the small things. <em>Say them.</em>
            </h2>
            <p class="onboarding-lede">Hearts and short notes for your person.</p>
          </>
        }
      >
        <p class="eyebrow">You're invited</p>
        <h2 class="onboarding-title">
          <Show when={inviterName()} fallback={<>Opening your invite…</>}>
            <em>{inviterName()}</em> is waiting for you
          </Show>
        </h2>
      </Show>

      <label class="onboarding-name">
        <span>Your name</span>
        <input
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          maxLength={50}
          required
          autocomplete="given-name"
          placeholder={joining() ? "So they know it's you" : "How your partner will see you"}
          aria-label="Display name"
        />
      </label>

      <Show when={!joining()}>
        <fieldset class="chips-field">
          <legend>You two are</legend>
          <div class="chips" role="radiogroup" aria-label="What describes you best?">
            <For each={ARCHETYPES}>
              {(a) => (
                <button
                  type="button"
                  role="radio"
                  class="chip-option"
                  aria-checked={archetype() === a.value}
                  onClick={() => setArchetype(a.value)}
                >
                  {a.label}
                </button>
              )}
            </For>
          </div>
        </fieldset>
      </Show>

      <Show when={error()}>
        <p class="error" role="alert">{error()}</p>
      </Show>

      <button type="submit" class="onboarding-go" disabled={submitting()}>
        {submitting()
          ? "Saving..."
          : joining() && inviterName()
            ? `Join ${inviterName()}`
            : "Continue"}
      </button>

      <div class="onboarding-foot">
        <label class="onboarding-lang">
          <span class="visually-hidden">Language</span>
          <select
            value={locale()}
            onChange={(e) => setLocale(e.currentTarget.value as "en" | "pl" | "de")}
          >
            <For each={LOCALES}>
              {(l) => <option value={l.value}>{l.label}</option>}
            </For>
          </select>
        </label>
        <Callout variant="info">
          <p class="onboarding-note">
            No sign-up needed. Without linking an account, you cannot recover
            your data if you clear your browser or switch devices.
          </p>
        </Callout>
      </div>
    </form>
  );
}

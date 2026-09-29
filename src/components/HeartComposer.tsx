import { createSignal, Show } from "solid-js";
import HeartPicker from "~/components/HeartPicker";
import { COMMENT_MAX } from "~/lib/crypto/comments";
import { friendlyPointsError } from "~/lib/data/points";
import type { HeartAmount } from "~/lib/data/types";
import { addDays, localDateString } from "~/lib/format/date";
import { giveHearts } from "~/lib/stores/points";

const BACKDATE_DAYS = 30;

const PROMPTS = [
  "What did they do that you loved?",
  "A small thing you noticed today...",
  "What made you smile about them?",
  "Something you'd like to thank them for...",
];

interface Props {
  relationshipId: string;
  userId: string;
  partnerName: string;
  hasKey: boolean;
  onRestoreKey: () => void;
}

export default function HeartComposer(props: Props) {
  const [amount, setAmount] = createSignal<HeartAmount | null>(null);
  const [text, setText] = createSignal("");
  const [pickDate, setPickDate] = createSignal(false);
  const [eventDate, setEventDate] = createSignal(localDateString());
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [sent, setSent] = createSignal(false);
  const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]!;

  const today = () => localDateString();
  const remaining = () => COMMENT_MAX - text().length;

  const reset = () => {
    setAmount(null);
    setText("");
    setPickDate(false);
    setEventDate(localDateString());
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    const a = amount();
    if (!a) {
      setError("Choose how many hearts first.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await giveHearts(
        props.relationshipId,
        props.userId,
        a,
        props.hasKey ? text() : "",
        pickDate() ? eventDate() : today(),
      );
      reset();
      setSent(true);
    } catch (err) {
      setError(friendlyPointsError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form class="card composer" onSubmit={submit} aria-labelledby="composer-title">
      <h2 id="composer-title" class="composer-title">
        Appreciate {props.partnerName}
      </h2>

      <HeartPicker
        value={amount()}
        onChange={(v) => {
          setAmount(v);
          setSent(false);
        }}
        disabled={busy()}
      />

      <Show
        when={props.hasKey}
        fallback={
          <p class="composer-locked">
            Comments are end-to-end encrypted and this device doesn't have the
            key yet. You can still send hearts, or{" "}
            <button type="button" class="link-button" onClick={() => props.onRestoreKey()}>
              unlock with your recovery password
            </button>
            .
          </p>
        }
      >
        <label class="composer-comment">
          <span class="visually-hidden">Comment (optional)</span>
          <textarea
            rows={3}
            maxLength={COMMENT_MAX}
            placeholder={prompt}
            value={text()}
            onInput={(e) => {
              setText(e.currentTarget.value);
              setSent(false);
            }}
            disabled={busy()}
          />
          <span
            class="composer-counter"
            classList={{ "is-low": remaining() <= 20 }}
            aria-live="polite"
          >
            {remaining()}
          </span>
        </label>
      </Show>

      <div class="composer-when">
        <Show
          when={pickDate()}
          fallback={
            <button type="button" class="link-button" onClick={() => setPickDate(true)}>
              This happened earlier?
            </button>
          }
        >
          <label>
            When did it happen?
            <input
              type="date"
              min={addDays(today(), -BACKDATE_DAYS)}
              max={today()}
              value={eventDate()}
              onInput={(e) => setEventDate(e.currentTarget.value)}
              disabled={busy()}
            />
          </label>
        </Show>
      </div>

      <Show when={error()}>
        <p class="error" role="alert">{error()}</p>
      </Show>

      <div class="composer-actions">
        <button type="submit" disabled={busy() || !amount()}>
          {busy() ? "Sending..." : "Send"}
        </button>
        <Show when={sent()}>
          <p class="composer-sent" role="status">
            Sent. {props.partnerName} will see it next time they open the app.
          </p>
        </Show>
      </div>
    </form>
  );
}

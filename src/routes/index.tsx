import { A } from "@solidjs/router";
import { For } from "solid-js";
import HeartIcon from "~/components/HeartIcon";
import { APP_NAME } from "~/constants";

const STEPS = [
  {
    title: "Notice",
    body: "Something small and kind happened. Give your partner one to five hearts and a line about what you loved.",
  },
  {
    title: "Say it",
    body: "Your note is end-to-end encrypted: only the two of you can read it. No likes, no leaderboard.",
  },
  {
    title: "Treat each other",
    body: "Hearts you receive can be spent on coupons you both agreed to — a slow breakfast, a movie night, a walk.",
  },
];

export default function Home() {
  return (
    <main class="home">
      <section class="hero">
        <h1 class="eyebrow">{APP_NAME}</h1>
        <p class="hero-title">
          Notice the small things.
          <br />
          <em>Say them out loud.</em>
        </p>
        <p class="hero-lede">
          A quiet little notebook for couples and close friends. Give each
          other hearts with a short note whenever you catch them being
          lovely — then trade hearts for the treats you both said yes to.
        </p>
        <div class="hero-actions">
          <A href="/app" class="button">
            Start together
          </A>
          <a href="#how" class="link-quiet">
            How it works
          </a>
        </div>
        <div class="hero-note card" aria-hidden="true">
          <div class="note-meta">
            <span class="note-who">From Sam</span>
            <span class="heart-row">
              <HeartIcon filled />
              <HeartIcon filled />
              <HeartIcon filled />
            </span>
          </div>
          <blockquote class="note-text">
            You made coffee before my early call and left the good mug out.
            I noticed.
          </blockquote>
          <span class="note-date">this morning</span>
        </div>
      </section>

      <section id="how" class="how" aria-labelledby="how-title">
        <h2 id="how-title" class="section-title">How it works</h2>
        <ol class="how-list">
          <For each={STEPS}>
            {(s, i) => (
              <li class="how-step">
                <span class="how-num" aria-hidden="true">{i() + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            )}
          </For>
        </ol>
      </section>

      <section class="honest" aria-labelledby="honest-title">
        <h2 id="honest-title" class="section-title">Plainly</h2>
        <ul class="honest-list">
          <li>No sign-up needed to start. Without linking an account you can't recover your data if you clear your browser or switch devices.</li>
          <li>Notes are encrypted on your device. We store hearts, dates and coupons so the app works — we just never show a scoreboard.</li>
          <li>Free and open source (AGPL-3.0).</li>
        </ul>
      </section>
    </main>
  );
}

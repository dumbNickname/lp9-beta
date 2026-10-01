import { fireEvent, render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import type { FeedItem } from "~/lib/stores/points";

const note = (id: string, giver: string, comment: string | null): FeedItem =>
  ({
    id,
    relationship_id: "r1",
    giver_id: giver,
    receiver_id: giver === "me" ? "p" : "me",
    amount: 2,
    comment_ciphertext: comment ? "x" : null,
    comment_iv: comment ? "y" : null,
    event_date: "2026-09-01",
    created_at: "2026-09-01T10:00:00Z",
    edited_at: null,
    comment,
    locked: false,
  }) as unknown as FeedItem;

describe("NoteJar", () => {
  it("only holds partner notes with text; tap pulls one out", async () => {
    (await import("~/lib/privacy")).setPrivateMode(false);
    const NoteJar = (await import("~/components/NoteJar")).default;
    const feed = [note("1", "p", "you hummed"), note("2", "me", "mine"), note("3", "p", null)];
    const { getByRole, container, getByText } = render(() => (
      <NoteJar feed={feed} userId="me" partnerName="Bob" />
    ));
    expect(container.querySelectorAll(".jar-heart").length).toBe(1);
    fireEvent.click(getByRole("button", { name: /memory jar/i }));
    expect(getByText("you hummed")).toBeInTheDocument();
  });

  it("respects private mode", async () => {
    (await import("~/lib/privacy")).setPrivateMode(true);
    const NoteJar = (await import("~/components/NoteJar")).default;
    const { getByRole, queryByText } = render(() => (
      <NoteJar feed={[note("1", "p", "secret")]} userId="me" partnerName="Bob" />
    ));
    fireEvent.click(getByRole("button", { name: /memory jar/i }));
    expect(queryByText("secret")).toBeNull();
    (await import("~/lib/privacy")).setPrivateMode(false);
  });
});

import { cleanup, fireEvent, render, screen } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { localDateString } from "~/lib/format/date";
import type { FeedItem } from "~/lib/stores/points";

const today = localDateString();
const note = (id: string, giver: string, comment: string | null, amount = 2): FeedItem =>
  ({
    id,
    relationship_id: "r1",
    giver_id: giver,
    receiver_id: giver === "me" ? "p" : "me",
    amount,
    comment_ciphertext: null,
    comment_iv: null,
    event_date: today,
    created_at: new Date().toISOString(),
    edited_at: null,
    comment,
    locked: false,
  }) as unknown as FeedItem;

afterEach(cleanup);

describe("Garland", () => {
  it("lights today's bulb and opens that day's notes", async () => {
    (await import("~/lib/privacy")).setPrivateMode(false);
    const Garland = (await import("~/components/Garland")).default;
    const { container } = render(() => (
      <Garland feed={[note("1", "p", "you hummed"), note("2", "me", "thanks")]} userId="me" partnerName="Bob" />
    ));
    expect(container.querySelectorAll(".garland-bulb")).toHaveLength(14);
    const lit = container.querySelectorAll(".garland-bulb:not(:disabled)");
    expect(lit).toHaveLength(1);
    fireEvent.click(lit[0]!);
    expect(screen.getByText("you hummed")).toBeInTheDocument();
    expect(screen.getByText("Bob to you")).toBeInTheDocument();
  });

  it("day peek honours private mode", async () => {
    (await import("~/lib/privacy")).setPrivateMode(true);
    const Garland = (await import("~/components/Garland")).default;
    const { container } = render(() => <Garland feed={[note("1", "p", "secret")]} userId="me" partnerName="Bob" />);
    fireEvent.click(container.querySelector(".garland-bulb:not(:disabled)")!);
    expect(screen.queryByText("secret")).toBeNull();
    (await import("~/lib/privacy")).setPrivateMode(false);
  });
});

describe("Together almanac", () => {
  it("words view shows only my own words", async () => {
    (await import("~/lib/privacy")).setPrivateMode(false);
    const Together = (await import("~/components/Together")).default;
    render(() => (
      <Together feed={[note("1", "me", "lovely coffee"), note("2", "p", "pancakes")]} userId="me" partnerName="Bob" />
    ));
    fireEvent.click(screen.getByRole("button", { name: "Words" }));
    expect(screen.getByText("coffee")).toBeInTheDocument();
    expect(screen.queryByText("pancakes")).toBeNull();
  });

  it("words view is hidden in private mode", async () => {
    (await import("~/lib/privacy")).setPrivateMode(true);
    const Together = (await import("~/components/Together")).default;
    render(() => <Together feed={[note("1", "me", "lovely coffee")]} userId="me" partnerName="Bob" />);
    fireEvent.click(screen.getByRole("button", { name: "Words" }));
    expect(screen.queryByText("coffee")).toBeNull();
    (await import("~/lib/privacy")).setPrivateMode(false);
  });

  it("season and clock render", async () => {
    const Together = (await import("~/components/Together")).default;
    const { container } = render(() => <Together feed={[note("1", "me", null)]} userId="me" partnerName="Bob" />);
    expect(container.querySelectorAll(".season-week")).toHaveLength(12);
    fireEvent.click(screen.getByRole("button", { name: "Clock" }));
    expect(container.querySelectorAll(".dayclock-petal")).toHaveLength(1);
  });
});

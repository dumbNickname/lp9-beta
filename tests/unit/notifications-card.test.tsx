import { cleanup, fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.fn();
const sendTestPush = vi.fn();
const testPushResult = vi.fn();

vi.mock("~/lib/supabase", () => ({ supabase: { rpc: vi.fn() }, getSupabase: vi.fn() }));
vi.mock("~/lib/push", async (orig) => ({
  ...(await orig<typeof import("~/lib/push")>()),
  currentPushState: () => state(),
  enablePush: vi.fn(),
  disablePush: vi.fn(),
}));
vi.mock("~/lib/data/push", () => ({
  sendTestPush: () => sendTestPush(),
  testPushResult: () => testPushResult(),
}));

beforeEach(() => {
  history.replaceState(null, "", "/app");
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

describe("NotificationsCard", () => {
  it("own card; no debug test without ?debug=true", async () => {
    state.mockResolvedValue("off");
    const { default: Card } = await import("~/components/NotificationsCard");
    render(() => <Card />);
    expect(await screen.findByRole("heading", { name: "Notifications" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Turn on" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send test" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Local test" })).toBeNull();
  });

  it("denied: shows unblock steps and re-checks", async () => {
    state.mockResolvedValueOnce("denied").mockResolvedValueOnce("off");
    const { default: Card } = await import("~/components/NotificationsCard");
    render(() => <Card />);
    expect(await screen.findByText(/Blocked in your browser/)).toBeInTheDocument();
    expect(document.querySelectorAll(".notify-steps li").length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole("button", { name: "Check again" }));
    expect(await screen.findByRole("button", { name: "Turn on" })).toBeInTheDocument();
  });

  it("?debug=true: test push shows the server answer", async () => {
    history.replaceState(null, "", "/app?debug=true#settings");
    state.mockResolvedValue("on");
    sendTestPush.mockResolvedValue("queued");
    testPushResult.mockResolvedValue({ status_code: 200, body: '{"sent":1}', error: null });
    const { default: Card } = await import("~/components/NotificationsCard");
    render(() => <Card />);
    fireEvent.click(await screen.findByRole("button", { name: "Send test" }));
    await waitFor(() => expect(screen.getByText(/HTTP 200/)).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText(/"sent":1/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Local test" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Page test" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear held" })).toBeInTheDocument();
  });

  it("?debug=true: Local test uses a fresh tag each time (no silent replace)", async () => {
    history.replaceState(null, "", "/app?debug=true#settings");
    state.mockResolvedValue("on");
    const show = vi.fn().mockResolvedValue(undefined);
    const reg = { showNotification: show, getNotifications: vi.fn().mockResolvedValue([]), pushManager: { getSubscription: vi.fn().mockResolvedValue(null) } };
    const sw = { getRegistration: vi.fn().mockResolvedValue(reg), addEventListener: vi.fn(), removeEventListener: vi.fn() };
    Object.defineProperty(navigator, "serviceWorker", { value: sw, configurable: true });
    vi.stubGlobal("Notification", { permission: "granted" });
    const { default: Card } = await import("~/components/NotificationsCard");
    render(() => <Card />);
    const btn = await screen.findByRole("button", { name: "Local test" });
    fireEvent.click(btn);
    await waitFor(() => expect(show).toHaveBeenCalledTimes(1));
    await new Promise((r) => setTimeout(r, 5));
    fireEvent.click(btn);
    await waitFor(() => expect(show).toHaveBeenCalledTimes(2));
    const tags = show.mock.calls.map((c) => (c[1] as { tag: string }).tag);
    expect(tags[0]).not.toBe(tags[1]);
  });

  it("service worker push alerts again when it replaces a same-tag notification", async () => {
    const sw = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8");
    expect(sw).toContain("renotify: true");
  });

  it("?debug=true: reports a missing server setup", async () => {
    history.replaceState(null, "", "/app?debug=true");
    state.mockResolvedValue("on");
    sendTestPush.mockResolvedValue("not_configured");
    const { default: Card } = await import("~/components/NotificationsCard");
    render(() => <Card />);
    fireEvent.click(await screen.findByRole("button", { name: "Send test" }));
    expect(await screen.findByText(/Vault secrets/)).toBeInTheDocument();
  });
});

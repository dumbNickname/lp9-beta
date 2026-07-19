import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import RecoveryWarning from "~/components/RecoveryWarning";

describe("RecoveryWarning", () => {
  it("states forgotten password = comments unreadable forever", () => {
    const { container } = render(() => <RecoveryWarning />);
    expect(container.textContent).toContain("unreadable forever");
  });

  it("states the recovery password is the only way to restore comments", () => {
    const { container } = render(() => <RecoveryWarning />);
    expect(container.textContent).toContain("only way to restore");
  });

  it("says comments are end-to-end encrypted and key lives on paired devices", () => {
    const { container } = render(() => <RecoveryWarning />);
    expect(container.textContent).toContain("end-to-end encrypted");
    expect(container.textContent).toContain("paired devices");
  });

  it("distinguishes server-recoverable data from key-gated comment text", () => {
    const { container } = render(() => <RecoveryWarning />);
    expect(container.textContent).toContain("stored on our");
  });

  it("never claims data is only on your device (forbidden per DESIGN §3)", () => {
    const { container } = render(() => <RecoveryWarning />);
    expect(container.textContent?.toLowerCase()).not.toContain(
      "only on your device",
    );
  });

  it("renders as a non-blocking note, not an alert", () => {
    const { getByRole, queryByRole } = render(() => <RecoveryWarning />);
    expect(getByRole("note")).toBeInTheDocument();
    expect(queryByRole("alert")).toBeNull();
  });
});

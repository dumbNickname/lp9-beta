import Callout from "~/components/Callout";

// Honest recovery copy per DESIGN.md §12b (forgotten password = old comments
// unreadable forever) and §3 (never claim data is "only on your device").
// Sentences are plain string literals so Phase 7 i18n extraction is trivial;
// no dynamic sentence building.
export default function RecoveryWarning() {
  return (
    <Callout variant="warning" title="How recovery works">
      <p>
        Your comments are end-to-end encrypted. The key that unlocks them
        lives only on your paired devices.
      </p>
      <p>
        A recovery password is the only way to restore your comments on a new
        device. If you forget it, your old comments are unreadable forever
        &mdash; there is no backdoor.
      </p>
      <p>
        Your other data (like your profile and coupons) is stored on our
        servers and can be recovered by signing in; only the comment text is
        gated by this key.
      </p>
    </Callout>
  );
}

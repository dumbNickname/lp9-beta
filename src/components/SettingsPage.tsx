import DeviceSettings from "~/components/DeviceSettings";
import InstallApp from "~/components/InstallApp";
import NotificationsCard from "~/components/NotificationsCard";
import PairBadge from "~/components/PairBadge";
import PrivacyToggle from "~/components/PrivacyToggle";
import ThemeToggle from "~/components/ThemeToggle";

const HOME = import.meta.env.SERVER_BASE_URL || "/";

interface Props {
  myName: string;
  partnerName: string | null;
  relationshipId: string;
  onBack: () => void;
  onNewPair: () => void;
}

// Settings page (PRD-51): its own view at /app#settings, not a panel
// under the content. Everything "about me / this device" in one place.
export default function SettingsPage(props: Props) {
  return (
    <div class="settings-page">
      <div class="settings-top">
        <button type="button" class="quiet small settings-back" onClick={() => props.onBack()}>
          ← Back
        </button>
        <h1 class="settings-title">Settings</h1>
      </div>

      <section class="card settings-panel" aria-labelledby="you-title">
        <h2 id="you-title" class="templates-title">You</h2>
        <PairBadge myName={props.myName} partnerName={props.partnerName} />
        <div class="settings-row">
          <div>
            <p class="settings-label">Private mode</p>
            <p class="settings-value">
              Veils notes and private wishes on this device. Also the eye in the top bar.
            </p>
          </div>
          <PrivacyToggle />
        </div>
        <div class="settings-row">
          <div>
            <p class="settings-label">Theme</p>
            <p class="settings-value">Light, dark, or follow your device.</p>
          </div>
          <ThemeToggle />
        </div>
        <InstallApp />
      </section>

      <NotificationsCard />

      <section class="card settings-panel" aria-labelledby="pairs-title">
        <h2 id="pairs-title" class="templates-title">Pairs</h2>
        <div class="settings-row">
          <div>
            <p class="settings-label">New pair</p>
            <p class="settings-value">
              Start a separate notebook with someone else. Your current pair stays as it is.
            </p>
          </div>
          <button type="button" class="quiet small" onClick={() => props.onNewPair()}>
            + New pair
          </button>
        </div>
      </section>

      <DeviceSettings relationshipId={props.relationshipId} />

      <section class="card settings-panel" aria-labelledby="about-title">
        <h2 id="about-title" class="templates-title">About</h2>
        <nav class="settings-links" aria-label="About">
          <a href={HOME}>Home</a>
          <a href={`${HOME}privacy`}>Privacy</a>
          <a href={`${HOME}terms`}>Terms</a>
        </nav>
      </section>
    </div>
  );
}

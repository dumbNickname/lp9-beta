// Small line icons shared across the app. Decorative (aria-hidden): callers
// provide the accessible label.

export function TicketIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 16.5V14a2 2 0 0 0 0-4z" />
      <path d="M14.5 6.5v11" stroke-dasharray="1.6 1.8" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5c.6 4.2 2.3 5.9 6.5 6.5-4.2.6-5.9 2.3-6.5 6.5-.6-4.2-2.3-5.9-6.5-6.5 4.2-.6 5.9-2.3 6.5-6.5z" />
      <path d="M18.5 15.5c.2 1.4.8 2 2.2 2.2-1.4.2-2 .8-2.2 2.2-.2-1.4-.8-2-2.2-2.2 1.4-.2 2-.8 2.2-2.2z" />
    </svg>
  );
}

export function EyeIcon(props: { closed?: boolean }) {
  return (
    <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
      {props.closed && <path d="M4 4l16 16" />}
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </svg>
  );
}

export function HelpIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4" />
      <circle cx="12" cy="16.6" r=".6" fill="currentColor" />
    </svg>
  );
}

export function GiftIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="9" width="16" height="11" rx="1.8" />
      <path d="M3.5 9h17M12 9v11" />
      <path d="M12 9c-1.2-3.2-5.5-4.3-5.5-1.6C6.5 9 9.5 9 12 9zM12 9c1.2-3.2 5.5-4.3 5.5-1.6C17.5 9 14.5 9 12 9z" />
    </svg>
  );
}

export function NotebookIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 48 48" aria-hidden="true">
      <rect x="9" y="6" width="30" height="36" rx="4" />
      <path d="M15 6v36" />
      <path d="M21 16h11M21 22h8" />
      <path d="M27 35.5c-.2 0-.4 0-.5-.2-2.6-2.1-4.8-4-4.8-6.6 0-1.6 1.2-2.8 2.7-2.8 1 0 1.9.5 2.6 1.4.7-.9 1.6-1.4 2.6-1.4 1.5 0 2.7 1.2 2.7 2.8 0 2.6-2.2 4.5-4.8 6.6-.1.1-.3.2-.5.2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function QrIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.2" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" />
      <path d="M14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM14 19v1M19 14h1" />
    </svg>
  );
}

export function ScanIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
      <path d="M7 12h10" />
    </svg>
  );
}

export function KeyIcon() {
  return (
    <svg class="line-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2" />
    </svg>
  );
}

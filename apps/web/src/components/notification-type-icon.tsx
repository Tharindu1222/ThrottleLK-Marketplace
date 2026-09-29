type IconGroup = 'message' | 'success' | 'alert' | 'promo' | 'default';

function groupForType(type: string): IconGroup {
  if (
    type === 'new_message' ||
    type === 'listing_inquiry' ||
    type.includes('message')
  ) {
    return 'message';
  }
  if (type.endsWith('_approved') || type === 'promo_approved') {
    return 'success';
  }
  if (
    type.endsWith('_rejected') ||
    type.includes('warning') ||
    type.includes('expired')
  ) {
    return 'alert';
  }
  if (
    type.startsWith('promo_') ||
    type === 'saved_search_match' ||
    type === 'price_drop'
  ) {
    return 'promo';
  }
  return 'default';
}

const TILE =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ring-black/10';

export function NotificationTypeIcon({ type }: { type: string }) {
  const group = groupForType(type);
  const styles: Record<IconGroup, string> = {
    message: `${TILE} bg-accent/10 text-accent`,
    success: `${TILE} bg-emerald-50 text-emerald-700`,
    alert: `${TILE} bg-amber-50 text-amber-700`,
    promo: `${TILE} bg-surface text-foreground`,
    default: `${TILE} bg-surface text-muted`,
  };

  return (
    <span className={styles[group]} aria-hidden>
      {group === 'message' ? <ChatIcon /> : null}
      {group === 'success' ? <CheckIcon /> : null}
      {group === 'alert' ? <AlertIcon /> : null}
      {group === 'promo' ? <TagIcon /> : null}
      {group === 'default' ? <BellIcon /> : null}
    </span>
  );
}

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v6A2.5 2.5 0 0 1 16.5 16H10l-3.5 3v-3H7.5A2.5 2.5 0 0 1 5 13.5v-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M8.5 12.2 11 14.7 15.5 9.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M12 4.5 20 19H4L12 4.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M12 10v4.5M12 16.8v.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M4 12.5V7.5A2 2 0 0 1 6 5.5h5.2L19.5 13a1.5 1.5 0 0 1 0 2.1l-4.4 4.4a1.5 1.5 0 0 1-2.1 0L4.5 11.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="8.2" cy="8.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path
        d="M12 4.5a5 5 0 0 1 5 5v2.2c0 .7.2 1.3.6 1.9l.9 1.2H5.5l.9-1.2c.4-.6.6-1.2.6-1.9V9.5a5 5 0 0 1 5-5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M10 18a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

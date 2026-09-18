'use client';

import { useState } from 'react';

export function DealerShareButton({
  label,
  copiedLabel,
  title,
  className = '',
}: {
  label: string;
  copiedLabel: string;
  title: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url, text: title });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — clipboard may be blocked
    }
  }

  return (
    <button
      type="button"
      onClick={() => void onShare()}
      className={className}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="h-4 w-4"
      >
        <path
          d="M15 8.5a3 3 0 1 0-2.83-4H12a3 3 0 0 0 0 6h.17A3 3 0 0 0 15 8.5ZM9 15.5a3 3 0 1 0-2.83 4H6a3 3 0 1 0 0-6h.17A3 3 0 0 0 9 15.5Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="m13.5 7.5-5 4M13.5 16.5l-5-4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      {copied ? copiedLabel : label}
    </button>
  );
}

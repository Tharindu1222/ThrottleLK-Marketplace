'use client';

import { useCallback, useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

export function TurnstileField({
  onToken,
}: {
  onToken: (token: string) => void;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  const mount = useCallback(() => {
    if (!siteKey || !hostRef.current || !window.turnstile || widgetId.current) {
      return;
    }
    widgetId.current = window.turnstile.render(hostRef.current, {
      sitekey: siteKey,
      theme: 'auto',
      callback: (token) => onTokenRef.current(token),
      'expired-callback': () => onTokenRef.current(''),
      'error-callback': () => onTokenRef.current(''),
    });
  }, [siteKey]);

  useEffect(() => {
    if (!siteKey) return;

    const existing = document.querySelector(
      'script[data-throttlelk-turnstile]',
    ) as HTMLScriptElement | null;
    if (window.turnstile) {
      mount();
    } else if (existing) {
      existing.addEventListener('load', mount);
    } else {
      const script = document.createElement('script');
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.dataset.throttlelkTurnstile = 'true';
      script.addEventListener('load', mount);
      document.head.appendChild(script);
    }

    return () => {
      existing?.removeEventListener('load', mount);
    };
  }, [mount, siteKey]);

  if (!siteKey) return null;

  return (
    <div
      ref={hostRef}
      className="flex justify-center"
      aria-label="CAPTCHA"
    />
  );
}

export function turnstileEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
}

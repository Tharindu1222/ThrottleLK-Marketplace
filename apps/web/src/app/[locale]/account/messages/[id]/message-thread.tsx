'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type Counterpart = {
  id: string;
  displayName: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
};

type Message = {
  id: string;
  senderUserId: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

type Thread = {
  id: string;
  listingTitle: string;
  listingSlug: string | null;
  role: 'buyer' | 'seller';
  counterpart: Counterpart | null;
  messages: Message[];
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

function Avatar({
  counterpart,
  size = 'md',
}: {
  counterpart: Counterpart | null;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm';
  const name = counterpart?.fullName || counterpart?.displayName || '?';
  if (counterpart?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={counterpart.avatarUrl}
        alt=""
        className={`${dim} shrink-0 rounded-full object-cover ring-1 ring-black/10`}
      />
    );
  }
  return (
    <span
      className={`${dim} inline-flex shrink-0 items-center justify-center rounded-full bg-[#ececec] font-[family-name:var(--font-display)] tracking-wide text-foreground ring-1 ring-black/10`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

function formatMsgTime(iso: string, locale: Locale) {
  return new Date(iso).toLocaleString(locale === 'si' ? 'si-LK' : 'en-LK', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short',
  });
}

export function MessageThread({
  locale,
  conversationId,
}: {
  locale: Locale;
  conversationId: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (access: string) => {
      const data = await apiGet<Thread>(
        `/api/v1/conversations/${conversationId}`,
        { token: access },
      );
      setThread(data);
    },
    [conversationId],
  );

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void load(access).catch((err) =>
      setError(err instanceof Error ? err.message : 'Failed'),
    );
    const timer = window.setInterval(() => {
      void load(access).catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [thread?.messages.length]);

  async function onReply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const message = String(data.get('message') ?? '').trim();
    if (!message) return;
    setError(null);
    setBusy(true);
    try {
      await apiSend(`/api/v1/conversations/${conversationId}/messages`, {
        token,
        body: { message },
      });
      form.reset();
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="mt-8 border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-sm text-muted">
          <Link
            href={`/${locale}/login`}
            className="font-medium text-foreground underline decoration-black/20 underline-offset-2 transition hover:text-accent"
          >
            {t(locale, 'login')}
          </Link>
        </p>
      </div>
    );
  }

  if (!thread) {
    return <p className="mt-8 text-sm text-muted">{error ?? 'Loading…'}</p>;
  }

  const name =
    thread.counterpart?.fullName ||
    thread.counterpart?.displayName ||
    t(locale, 'seller');

  return (
    <div className="mx-auto mt-4 flex h-[min(72vh,640px)] max-w-2xl flex-col overflow-hidden border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_16px_40px_-24px_rgba(0,0,0,0.28)] lg:max-w-none">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-2.5">
        <Link
          href={`/${locale}/account/messages`}
          className="text-xs text-muted transition hover:text-foreground"
        >
          ← {t(locale, 'backToInbox')}
        </Link>
        {thread.listingSlug ? (
          <Link
            href={`/${locale}/bikes/${thread.listingSlug}`}
            className="truncate text-xs font-medium text-muted transition hover:text-accent"
          >
            {t(locale, 'viewListing')}
          </Link>
        ) : null}
      </div>

      {/* Contact header */}
      <div className="flex items-center gap-3 border-b border-black/10 px-4 py-3">
        <Avatar counterpart={thread.counterpart} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-[family-name:var(--font-display)] text-lg leading-tight tracking-wide text-foreground">
            {name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {thread.listingTitle}
            <span className="mx-1.5 text-black/20">·</span>
            {thread.role === 'seller'
              ? t(locale, 'asSeller')
              : t(locale, 'asBuyer')}
          </p>
        </div>
        {thread.counterpart?.phone ? (
          <a
            href={`tel:${thread.counterpart.phone}`}
            className="shrink-0 rounded-full border border-black/12 px-3 py-1.5 text-xs text-foreground transition hover:border-accent hover:text-accent"
            title={thread.counterpart.phone}
          >
            {t(locale, 'call')}
          </a>
        ) : null}
      </div>

      {/* Messages */}
      <div
        ref={scrollerRef}
        className="flex-1 space-y-2 overflow-y-auto bg-[#f7f7f7] px-3 py-4 sm:px-4"
      >
        {thread.messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`w-fit max-w-[78%] px-3.5 py-2 text-[13px] leading-snug shadow-sm sm:max-w-[70%] ${
                m.mine
                  ? 'rounded-2xl rounded-br-md bg-[#1a1a1a] text-white'
                  : 'rounded-2xl rounded-bl-md border border-black/10 bg-white text-foreground'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p
                className={`mt-1 text-[10px] tabular-nums ${
                  m.mine ? 'text-white/55' : 'text-muted'
                }`}
              >
                {formatMsgTime(m.createdAt, locale)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={onReply}
        className="flex items-end gap-2 border-t border-black/10 bg-white p-3"
      >
        <textarea
          name="message"
          required
          rows={1}
          placeholder={t(locale, 'message')}
          className="max-h-28 min-h-[42px] flex-1 resize-none rounded-full border border-black/10 bg-[#f5f5f5] px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button
          type="submit"
          disabled={busy}
          aria-label={t(locale, 'sendMessage')}
          className="inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_18px_-10px_rgba(225,6,0,0.9)] transition hover:brightness-110 disabled:opacity-60"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="currentColor"
            aria-hidden
          >
            <path d="M3.4 20.6 21 12 3.4 3.4 3 10.5 14 12 3 13.5z" />
          </svg>
        </button>
      </form>
      {error ? (
        <p className="border-t border-black/5 px-4 py-2 text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}

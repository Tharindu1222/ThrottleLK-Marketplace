'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

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
  messages: Message[];
};

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

  async function onReply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;
    const form = new FormData(e.currentTarget);
    const message = String(form.get('message') ?? '');
    setError(null);
    try {
      await apiSend(`/api/v1/conversations/${conversationId}/messages`, {
        token,
        body: { message },
      });
      e.currentTarget.reset();
      await load(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }

  if (!token) {
    return (
      <p className="mt-6 text-muted">
        <Link href={`/${locale}/login`} className="text-accent underline">
          {t(locale, 'login')}
        </Link>
      </p>
    );
  }

  if (!thread) {
    return (
      <p className="mt-6 text-muted">
        {error ?? 'Loading…'}
      </p>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
          {thread.listingTitle}
        </h2>
        <div className="flex gap-3 text-sm">
          {thread.listingSlug ? (
            <Link
              href={`/${locale}/bikes/${thread.listingSlug}`}
              className="text-accent underline"
            >
              {t(locale, 'viewListing')}
            </Link>
          ) : null}
          <Link
            href={`/${locale}/account/messages`}
            className="text-muted underline"
          >
            {t(locale, 'backToInbox')}
          </Link>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {thread.messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] border border-white/10 p-3 text-sm ${
              m.mine ? 'ml-auto bg-accent/10' : 'bg-surface/40'
            }`}
          >
            <p className="whitespace-pre-wrap">{m.body}</p>
            <p className="mt-1 text-xs text-muted">
              {new Date(m.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={onReply} className="mt-6 grid gap-3">
        <textarea
          name="message"
          required
          rows={3}
          placeholder={t(locale, 'message')}
          className="bg-background px-3 py-2 text-sm ring-1 ring-white/10"
        />
        <button
          type="submit"
          className="bg-accent px-4 py-2 font-[family-name:var(--font-display)] text-background"
        >
          {t(locale, 'sendMessage')}
        </button>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </form>
    </div>
  );
}

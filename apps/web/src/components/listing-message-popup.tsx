'use client';

import Link from 'next/link';
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { apiGet, apiSend } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  mine: boolean;
};

type ConversationRow = {
  id: string;
  listingId: string;
};

type ThreadPayload = {
  id: string;
  messages: ChatMessage[];
};

type StartResult = {
  conversationId: string;
  message: ChatMessage;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
}

function SellerAvatar({
  name,
  src,
}: {
  name: string;
  src?: string | null;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white"
      />
    );
  }
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-medium tracking-wide text-accent ring-2 ring-white"
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function ListingMessagePopup({
  locale,
  dialogId,
  listingId,
  listingTitle,
  sellerName,
  sellerAvatarUrl,
  onClose,
}: {
  locale: Locale;
  dialogId?: string;
  listingId: string;
  listingTitle: string;
  sellerName: string;
  sellerAvatarUrl?: string | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [token, setToken] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const loadThread = useCallback(async (access: string, id: string) => {
    const thread = await apiGet<ThreadPayload>(`/api/v1/conversations/${id}`, {
      token: access,
    });
    setConversationId(thread.id);
    setMessages(thread.messages);
  }, []);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;

    let cancelled = false;
    void (async () => {
      try {
        const rows = await apiGet<ConversationRow[]>('/api/v1/conversations', {
          token: access,
          searchParams: { listingId, limit: '1' },
        });
        const existing = rows.find((row) => row.listingId === listingId);
        if (!existing || cancelled) return;
        await loadThread(access, existing.id);
      } catch {
        if (!cancelled) setError(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [listingId, loadThread]);

  useEffect(() => {
    if (!token || !conversationId) return;
    const timer = window.setInterval(() => {
      void loadThread(token, conversationId).catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [token, conversationId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function onSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const access = token ?? getAccessToken();
    if (!access) {
      const next = encodeURIComponent(
        `${window.location.pathname}${window.location.search}`,
      );
      window.location.href = `/${locale}/login?next=${next}`;
      return;
    }
    const body = draft.trim();
    if (!body || sending) return;

    setError(null);
    setSending(true);
    try {
      if (conversationId) {
        const result = await apiSend<{ message: ChatMessage }>(
          `/api/v1/conversations/${conversationId}/messages`,
          { token: access, body: { message: body } },
        );
        setMessages((prev) =>
          prev.some((m) => m.id === result.message.id)
            ? prev
            : [...prev, { ...result.message, mine: true }],
        );
      } else {
        const result = await apiSend<StartResult>('/api/v1/conversations', {
          token: access,
          body: { listingId, message: body },
        });
        setConversationId(result.conversationId);
        setMessages((prev) => [
          ...prev,
          { ...result.message, mine: true },
        ]);
      }
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSending(false);
    }
  }

  const ui = (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-end bg-black/25 p-4 pb-20 sm:p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id={dialogId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex w-full max-w-[22.5rem] flex-col items-end gap-3"
      >
        <section className="flex h-[min(32rem,calc(100dvh-10rem))] w-full flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_64px_-20px_rgba(0,0,0,0.45)]">
          <header className="flex items-center gap-3 bg-accent px-4 py-3 text-white">
            <div className="min-w-0 flex-1">
              <p
                id={titleId}
                className="truncate font-[family-name:var(--font-display)] text-lg leading-tight tracking-wide"
              >
                {sellerName}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/80">
                {listingTitle}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t(locale, 'closeChat')}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f6f6f6] px-3 py-4">
            {messages.length === 0 ? (
              <p className="rounded-2xl bg-white px-3.5 py-3 text-center text-[13px] leading-relaxed text-muted shadow-sm">
                {t(locale, 'chatEmpty')}
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${
                    m.mine ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {m.mine ? null : (
                    <SellerAvatar name={sellerName} src={sellerAvatarUrl} />
                  )}
                  <p
                    className={`w-fit max-w-[78%] whitespace-pre-wrap break-words px-3.5 py-2.5 text-[13px] leading-snug shadow-sm ${
                      m.mine
                        ? 'rounded-[1.15rem] rounded-br-md border border-black/10 bg-white text-foreground'
                        : 'rounded-[1.15rem] rounded-bl-md bg-accent text-white'
                    }`}
                  >
                    {m.body}
                  </p>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => void onSend(e)}
            className="flex items-center gap-2 border-t border-black/10 bg-white px-3 py-3"
          >
            <label htmlFor={inputId} className="sr-only">
              {t(locale, 'message')}
            </label>
            <textarea
              ref={inputRef}
              id={inputId}
              name="message"
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t(locale, 'chatPlaceholder')}
              className="max-h-24 min-h-[2.75rem] flex-1 resize-none rounded-full border border-black/10 bg-[#f5f5f5] px-4 py-2.5 text-sm outline-none transition placeholder:text-muted focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/15"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label={t(locale, 'sendMessage')}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-[0_8px_18px_-10px_rgba(225,6,0,0.9)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M3.4 20.6 21 12 3.4 3.4 3 10.5 14 12 3 13.5z" />
              </svg>
            </button>
          </form>
          {error ? (
            <p className="border-t border-black/5 px-4 py-2 text-xs text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </section>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/${locale}/account/messages${conversationId ? `/${conversationId}` : ''}`}
            aria-label={t(locale, 'openConversation')}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.9)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t(locale, 'closeChat')}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-[0_10px_24px_-12px_rgba(225,6,0,0.9)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="1.85"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(ui, document.body);
}

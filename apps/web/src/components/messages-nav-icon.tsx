'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { t, type Locale } from '@/lib/i18n';
import { HeaderNavBadge, headerIconButtonClass } from './header-nav-badge';

type ConversationItem = {
  id: string;
  listingTitle: string;
  listingSlug: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  role: 'buyer' | 'seller';
  counterpart?: {
    fullName: string;
    displayName: string;
    phone: string | null;
    avatarUrl: string | null;
  } | null;
  lastMessagePreview?: string | null;
  lastMessageMine?: boolean;
  unread?: boolean;
};

const DROPDOWN_LIMIT = 8;
const POLL_MS = 30_000;

function formatWhen(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function ChatBubblesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 10a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v2a5 5 0 0 1-5 5h-.5L11 19.5V17H13a5 5 0 0 1-5-5v-2Z" />
      <path d="M6.5 8.5A4.5 4.5 0 0 0 2 13v1.5A4.5 4.5 0 0 0 6.5 19H7l2 1.8V19h-.5" />
    </svg>
  );
}

export function MessagesNavIcon({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (access: string) => {
    const list = await apiGet<ConversationItem[]>('/api/v1/conversations', {
      token: access,
    });
    setItems(list.slice(0, DROPDOWN_LIMIT));
    setUnread(list.filter((c) => c.unread).length);
  }, []);

  useEffect(() => {
    const access = getAccessToken();
    setToken(access);
    if (!access) return;
    void refresh(access).catch(() => undefined);
    const id = window.setInterval(() => {
      void refresh(access).catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!token) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className={headerIconButtonClass}
        aria-label={
          unread > 0
            ? t(locale, 'unreadMessages').replace('{n}', String(unread))
            : t(locale, 'messages')
        }
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            setError(null);
            void refresh(token).catch((err) =>
              setError(err instanceof Error ? err.message : 'Failed'),
            );
          }
        }}
      >
        <ChatBubblesIcon className="h-5 w-5" />
        <HeaderNavBadge count={unread} />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden border border-black/10 bg-white shadow-[0_1px_0_rgba(0,0,0,0.06),0_16px_40px_-20px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
            <p className="font-[family-name:var(--font-display)] text-sm tracking-wide text-foreground">
              {t(locale, 'messages')}
            </p>
            <Link
              href={`/${locale}/account/messages`}
              className="text-xs text-muted transition hover:text-accent"
              onClick={() => setOpen(false)}
            >
              {t(locale, 'viewAllMessages')}
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {error ? (
              <p className="px-4 py-3 text-sm text-red-600">{error}</p>
            ) : null}
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">
                {t(locale, 'noMessages')}
              </p>
            ) : (
              items.map((c) => {
                const name =
                  c.counterpart?.fullName ||
                  c.counterpart?.displayName ||
                  c.listingTitle;
                return (
                <button
                  key={c.id}
                  type="button"
                  className={`block w-full border-b border-black/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-surface/80 ${
                    c.unread ? 'bg-accent/[0.04]' : ''
                  }`}
                  onClick={() => {
                    if (c.unread) {
                      setUnread((n) => Math.max(0, n - 1));
                      setItems((rows) =>
                        rows.map((row) =>
                          row.id === c.id ? { ...row, unread: false } : row,
                        ),
                      );
                    }
                    setOpen(false);
                    router.push(`/${locale}/account/messages/${c.id}`);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">
                      {name}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted">
                      {formatWhen(c.lastMessageAt ?? c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted">
                    {c.lastMessagePreview || c.listingTitle}
                  </p>
                </button>
                );
              })
            )}
          </div>

          <div className="border-t border-black/10 px-4 py-3">
            <Link
              href={`/${locale}/account/messages`}
              className="text-sm font-medium text-foreground transition hover:text-accent"
              onClick={() => setOpen(false)}
            >
              {t(locale, 'openInbox')}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

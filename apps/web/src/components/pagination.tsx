import Link from 'next/link';
import { pageRange, visiblePageNumbers } from '@/lib/visible-pages';

type PaginationProps = {
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  total?: number;
  limit?: number;
  ariaLabel?: string;
  variant?: 'public' | 'admin';
  hrefForPage?: (page: number) => string;
  onPage?: (page: number) => void;
  disabled?: boolean;
  previousLabel?: string;
  nextLabel?: string;
  pageOfTemplate?: string;
  showingTemplate?: string;
  scroll?: boolean;
};

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function Pagination({
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  total,
  limit,
  ariaLabel = 'Pagination',
  variant = 'public',
  hrefForPage,
  onPage,
  disabled = false,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  pageOfTemplate,
  showingTemplate,
  scroll = true,
}: PaginationProps) {
  const isAdmin = variant === 'admin';
  // Hide chrome for empty result sets (avoids "Showing 0–0 of 0" + mt-6 waste).
  if (totalPages <= 0 || total === 0) return null;

  const numbers = visiblePageNumbers(page, totalPages);
  const range =
    total != null && limit != null ? pageRange(page, limit, total) : null;

  const btn = (opts: {
    label: string;
    target: number;
    enabled: boolean;
    current?: boolean;
  }) => {
    const className = cx(
      'inline-flex min-h-11 min-w-11 max-w-full items-center justify-center whitespace-normal px-3 text-center text-sm transition',
      isAdmin
        ? 'rounded-lg border border-[var(--admin-border-strong)] text-[var(--admin-muted)] disabled:opacity-40'
        : 'rounded-md border border-black/10 text-muted disabled:opacity-40',
      opts.current &&
        (isAdmin
          ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] text-[var(--admin-text)]'
          : 'border-accent bg-accent text-white'),
      opts.enabled &&
        !opts.current &&
        (isAdmin
          ? 'hover:border-[var(--admin-accent)] hover:text-[var(--admin-text)]'
          : 'hover:border-accent hover:text-foreground'),
    );
    if (hrefForPage && opts.enabled) {
      return (
        <Link
          href={hrefForPage(opts.target)}
          className={className}
          aria-label={opts.label}
          aria-current={opts.current ? 'page' : undefined}
          scroll={scroll}
        >
          {opts.label}
        </Link>
      );
    }
    return (
      <button
        type="button"
        className={className}
        disabled={!opts.enabled || disabled}
        aria-label={opts.label}
        aria-current={opts.current ? 'page' : undefined}
        onClick={() => {
          if (!opts.enabled || disabled) return;
          onPage?.(opts.target);
        }}
      >
        {opts.label}
      </button>
    );
  };

  const showing =
    range && showingTemplate && total
      ? showingTemplate
          .replace('{from}', String(range.from))
          .replace('{to}', String(range.to))
          .replace('{total}', String(total))
      : range && total
        ? `Showing ${range.from}–${range.to} of ${total}`
        : null;

  return (
    <nav
      className={cx(
        'mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between',
        isAdmin && 'text-[var(--admin-muted)]',
      )}
      aria-label={ariaLabel}
    >
      {showing ? (
        <p className={cx('min-w-0 break-words text-sm', isAdmin ? 'text-[var(--admin-faint)]' : 'text-muted')}>
          {showing}
        </p>
      ) : (
        <span />
      )}
      {totalPages > 1 ? (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {btn({
            label: previousLabel,
            target: page - 1,
            enabled: hasPreviousPage,
          })}
          <span className="inline-flex min-h-11 items-center px-2 text-sm sm:hidden">
            {pageOfTemplate
              ? pageOfTemplate
                  .replace('{page}', String(page))
                  .replace('{pages}', String(totalPages))
              : `${page} / ${totalPages}`}
          </span>
          <div className="hidden min-w-0 flex-wrap items-center gap-1.5 sm:flex">
            {numbers.map((item, i) =>
              item === 'ellipsis' ? (
                <span
                  key={`e-${i}`}
                  className="px-1 text-sm"
                  aria-hidden
                >
                  …
                </span>
              ) : (
                <span key={item}>
                  {btn({
                    label: String(item),
                    target: item,
                    enabled: item !== page,
                    current: item === page,
                  })}
                </span>
              ),
            )}
          </div>
          {btn({
            label: nextLabel,
            target: page + 1,
            enabled: hasNextPage,
          })}
        </div>
      ) : null}
    </nav>
  );
}

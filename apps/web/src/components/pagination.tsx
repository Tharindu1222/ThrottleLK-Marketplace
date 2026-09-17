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
  if (totalPages <= 0) return null;

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
      'inline-flex min-h-10 min-w-10 items-center justify-center px-3 text-sm transition',
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
        'mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        isAdmin && 'text-[var(--admin-muted)]',
      )}
      aria-label={ariaLabel}
    >
      {showing ? (
        <p className={cx('text-sm', isAdmin ? 'text-[var(--admin-faint)]' : 'text-muted')}>
          {showing}
        </p>
      ) : (
        <span />
      )}
      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {btn({
            label: previousLabel,
            target: page - 1,
            enabled: hasPreviousPage,
          })}
          <span className="px-2 text-sm sm:hidden">
            {pageOfTemplate
              ? pageOfTemplate
                  .replace('{page}', String(page))
                  .replace('{pages}', String(totalPages))
              : `${page} / ${totalPages}`}
          </span>
          <div className="hidden items-center gap-1.5 sm:flex">
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

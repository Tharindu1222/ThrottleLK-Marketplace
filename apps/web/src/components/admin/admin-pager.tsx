'use client';

export function AdminPager({
  page,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPage,
}: {
  page: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-end gap-3 text-sm text-[var(--admin-muted)]">
      <button
        type="button"
        disabled={!hasPreviousPage}
        onClick={() => onPage(page - 1)}
        className="rounded-lg border border-[var(--admin-border-strong)] px-3 py-1.5 disabled:opacity-40"
      >
        Previous
      </button>
      <span>
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={!hasNextPage}
        onClick={() => onPage(page + 1)}
        className="rounded-lg border border-[var(--admin-border-strong)] px-3 py-1.5 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        Something went wrong
      </h1>
      <p className="mt-4 text-muted">
        That page failed to load. Try again, or go back to the marketplace.
      </p>
      {error.message ? (
        <p className="mx-auto mt-3 max-w-xl font-mono text-xs break-words text-red-700">
          {error.message}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={() => {
            reset();
            window.location.reload();
          }}
          className="inline-flex border border-black/15 px-5 py-2.5 text-sm hover:border-accent hover:text-accent"
        >
          Try again
        </button>
        <a
          href="/en"
          className="inline-flex bg-accent px-5 py-2.5 text-sm text-white"
        >
          Go home
        </a>
      </div>
    </main>
  );
}

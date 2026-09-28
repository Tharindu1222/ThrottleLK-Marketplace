import Link from 'next/link';

export default function RootNotFound() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-wide">
        Page not found
      </h1>
      <p className="mt-4 text-muted">
        That address is not a ThrottleLK page. Browse bikes or return home.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Link
          href="/en"
          className="inline-flex border border-black/15 px-5 py-2.5 text-sm hover:border-accent hover:text-accent"
        >
          Go home
        </Link>
        <Link
          href="/en/bikes"
          className="inline-flex bg-accent px-5 py-2.5 text-sm text-white"
        >
          Browse bikes
        </Link>
      </div>
    </main>
  );
}

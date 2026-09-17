export const headerIconButtonClass =
  'relative inline-flex h-10 min-h-10 min-w-10 items-center justify-center rounded-full text-muted transition hover:bg-black/[0.05] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function HeaderNavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute top-0.5 right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
      {count > 99 ? '99+' : count}
    </span>
  );
}

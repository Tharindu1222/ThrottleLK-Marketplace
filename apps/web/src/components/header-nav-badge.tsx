'use client';

import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';

export const headerIconButtonClass =
  'relative inline-flex h-11 min-h-11 min-w-11 items-center justify-center rounded-full text-muted transition hover:bg-black/[0.05] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function HeaderNavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute top-0.5 right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white ring-2 ring-background">
      {count > 99 ? '99+' : count}
    </span>
  );
}

/**
 * Anchors a header popover to its trigger and keeps the panel inside the viewport.
 * Callers set width with `w-[min(100vw-1rem,22rem)]` (or a narrower max-width).
 */
export function HeaderDropdown({
  anchorRef,
  className = '',
  children,
  role,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
  role?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    top: 0,
    left: 8,
    visibility: 'hidden',
  });

  useLayoutEffect(() => {
    function place() {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (!anchor || !panel) return;

      const margin = 8;
      const anchorRect = anchor.getBoundingClientRect();
      const maxWidth = window.innerWidth - margin * 2;
      panel.style.width = '';
      panel.style.maxWidth = '';
      const measured = panel.getBoundingClientRect().width;
      const width = Math.min(measured, maxWidth);
      let left = anchorRect.right - width;
      if (left < margin) left = margin;
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - margin - width);
      }
      const top = anchorRect.bottom + 8;
      const available = window.innerHeight - top - margin;
      const next: CSSProperties = {
        position: 'fixed',
        top,
        left,
        width,
        maxWidth,
        visibility: 'visible',
        zIndex: 60,
      };
      if (panel.scrollHeight > available && available > 120) {
        next.maxHeight = available;
        next.overflowY = 'auto';
      }

      setStyle((prev) => {
        if (
          prev.top === next.top &&
          prev.left === next.left &&
          prev.width === next.width &&
          prev.maxWidth === next.maxWidth &&
          prev.maxHeight === next.maxHeight &&
          prev.visibility === 'visible'
        ) {
          return prev;
        }
        return next;
      });
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchorRef]);

  return (
    <div ref={panelRef} role={role} style={style} className={className}>
      {children}
    </div>
  );
}

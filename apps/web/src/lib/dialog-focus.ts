export function nextTabTarget<T>(opts: {
  shiftKey: boolean;
  active: T | null;
  focusable: T[];
  isInside: boolean;
}): T | 'default' {
  const { shiftKey, active, focusable, isInside } = opts;
  if (focusable.length === 0) return 'default';
  const first = focusable[0]!;
  const last = focusable[focusable.length - 1]!;
  if (shiftKey) {
    if (!isInside || active === first) return last;
    return 'default';
  }
  if (!isInside || active === last) return first;
  return 'default';
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getFocusable(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (el) => el.getAttribute('aria-hidden') !== 'true',
  );
}

'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';

export type DialogFocusTrapOptions = {
  initialFocusRef?: RefObject<HTMLElement | null>;
  restore?: boolean;
  lockScroll?: boolean;
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (el) => el.getAttribute('aria-hidden') !== 'true',
  );
}

function nextTabTarget(
  shiftKey: boolean,
  active: Element | null,
  focusable: HTMLElement[],
  isInside: boolean,
): HTMLElement | 'default' {
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

function attachTrap(
  node: HTMLElement,
  opts: DialogFocusTrapOptions,
): () => void {
  const restore = opts.restore ?? true;
  const lockScroll = opts.lockScroll ?? true;
  const previous = document.activeElement as HTMLElement | null;
  const overflow = document.body.style.overflow;
  if (lockScroll) document.body.style.overflow = 'hidden';
  if (!node.hasAttribute('tabindex')) node.tabIndex = -1;
  node.setAttribute('data-focus-trap', 'true');

  const focusInitial = () => {
    const initial =
      opts.initialFocusRef?.current ?? getFocusable(node)[0] ?? node;
    if (initial && typeof initial.focus === 'function') initial.focus();
  };
  focusInitial();
  const retries = [0, 16, 50].map((ms) => window.setTimeout(focusInitial, ms));

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable(node);
    if (focusable.length === 0) {
      e.preventDefault();
      node.focus();
      return;
    }
    const target = nextTabTarget(
      e.shiftKey,
      document.activeElement,
      focusable,
      node.contains(document.activeElement),
    );
    if (target === 'default') return;
    e.preventDefault();
    target.focus();
  };

  document.addEventListener('keydown', onKey);
  return () => {
    for (const id of retries) window.clearTimeout(id);
    document.removeEventListener('keydown', onKey);
    node.removeAttribute('data-focus-trap');
    if (lockScroll) document.body.style.overflow = overflow;
    if (restore && previous && typeof previous.focus === 'function') {
      previous.focus();
    }
  };
}

/**
 * Trap Tab focus inside the element with `dialogId` while `active` is true.
 * Resolves the node by id (with a short retry) so portal mount timing is safe.
 */
export function useDialogFocusTrap(
  active: boolean,
  dialogId: string,
  options?: DialogFocusTrapOptions,
) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useLayoutEffect(() => {
    if (!active || !dialogId) return;

    let detached = false;
    let dispose: (() => void) | undefined;
    let raf = 0;
    let tries = 0;

    const attempt = () => {
      if (detached) return;
      const node = document.getElementById(dialogId);
      if (node instanceof HTMLElement) {
        dispose = attachTrap(node, optionsRef.current ?? {});
        return;
      }
      if (tries++ < 10) {
        raf = window.requestAnimationFrame(attempt);
      }
    };

    attempt();

    return () => {
      detached = true;
      if (raf) window.cancelAnimationFrame(raf);
      dispose?.();
    };
  }, [active, dialogId]);
}

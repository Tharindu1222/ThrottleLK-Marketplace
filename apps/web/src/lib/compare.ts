const COMPARE_KEY = 'throttlelk_compare';
const MAX_COMPARE = 3;

export type CompareItem = {
  id: string;
  slug: string;
  title: string;
};

export function getCompareItems(): CompareItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CompareItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function setCompareItems(items: CompareItem[]) {
  localStorage.setItem(COMPARE_KEY, JSON.stringify(items.slice(0, MAX_COMPARE)));
  window.dispatchEvent(new Event('throttlelk-compare'));
}

export function toggleCompare(item: CompareItem): {
  items: CompareItem[];
  added: boolean;
  full: boolean;
} {
  const current = getCompareItems();
  const exists = current.some((c) => c.id === item.id);
  if (exists) {
    const items = current.filter((c) => c.id !== item.id);
    setCompareItems(items);
    return { items, added: false, full: false };
  }
  if (current.length >= MAX_COMPARE) {
    return { items: current, added: false, full: true };
  }
  const items = [...current, item];
  setCompareItems(items);
  return { items, added: true, full: false };
}

export function clearCompare() {
  setCompareItems([]);
}

export { MAX_COMPARE };

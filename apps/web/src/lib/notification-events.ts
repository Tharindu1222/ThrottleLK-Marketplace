const EVENT = 'throttlelk-notifications-changed';
const STORAGE_KEY = 'throttlelk-notifications-updated';

export function notifyNotificationsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(EVENT));
  try {
    localStorage.setItem(STORAGE_KEY, `${Date.now()}-${Math.random()}`);
  } catch {
    /* Same-tab updates still work without storage. */
  }
}

/** Keeps all alert surfaces current, including other tabs and returning to a hidden tab. */
export function watchNotifications(refresh: () => void, interval = 30_000) {
  const visibleRefresh = () => {
    if (document.visibilityState === 'visible') refresh();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === 'throttlelk_user')
      visibleRefresh();
  };
  window.addEventListener(EVENT, visibleRefresh);
  window.addEventListener('focus', visibleRefresh);
  window.addEventListener('throttlelk-session', visibleRefresh);
  window.addEventListener('storage', onStorage);
  document.addEventListener('visibilitychange', visibleRefresh);
  const timer = window.setInterval(visibleRefresh, interval);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener(EVENT, visibleRefresh);
    window.removeEventListener('focus', visibleRefresh);
    window.removeEventListener('throttlelk-session', visibleRefresh);
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', visibleRefresh);
  };
}

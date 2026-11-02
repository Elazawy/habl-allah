import { useEffect, useRef } from 'react';

// Refresh only visible pages; resume immediately after returning to a tab.
export function useVisibleRefresh(refresh, enabled = true) {
  const latestRefresh = useRef(refresh);
  useEffect(() => { latestRefresh.current = refresh; }, [refresh]);
  useEffect(() => {
    if (!enabled) return;
    let running = false;
    const run = async () => {
      if (document.visibilityState === 'hidden' || running) return;
      running = true;
      try { await latestRefresh.current(); }
      catch (error) { console.error('[competition refresh failed]', error); }
      finally { running = false; }
    };
    const timer = window.setInterval(run, 30000);
    document.addEventListener('visibilitychange', run);
    window.addEventListener('focus', run);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('focus', run);
    };
  }, [enabled]);
}

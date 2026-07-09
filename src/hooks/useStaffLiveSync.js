import { useEffect, useCallback } from 'react';

/** Подгрузка данных при возврате в PWA и пока сокеты недоступны */
export function useStaffLiveSync(refresh) {
  const run = useCallback(() => {
    if (document.visibilityState === 'visible') refresh();
  }, [refresh]);

  useEffect(() => {
    run();

    const onVisible = () => run();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    const interval = setInterval(run, 10000);

    const onSwMessage = (event) => {
      if (event.data?.type === 'ecafe-refresh') run();
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      clearInterval(interval);
      navigator.serviceWorker?.removeEventListener('message', onSwMessage);
    };
  }, [run]);
}

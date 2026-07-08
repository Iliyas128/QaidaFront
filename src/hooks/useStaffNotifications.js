import { useEffect } from 'react';
import { enableNotificationSound } from '../utils/notificationSound';

export function useStaffNotifications() {
  useEffect(() => {
    const unlock = () => {
      enableNotificationSound();
    };

    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    document.addEventListener('touchstart', unlock, { passive: true });
    enableNotificationSound();

    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);
}

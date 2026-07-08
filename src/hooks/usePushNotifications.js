import { useEffect } from 'react';
import { api } from '../api';
import { isPushGranted, isPushSupported, subscribeToPush } from '../utils/pushNotifications';

export function usePushNotifications(establishmentId) {
  useEffect(() => {
    if (!establishmentId || !isPushSupported() || !isPushGranted()) return;
    subscribeToPush(establishmentId, api).catch(() => {});
  }, [establishmentId]);
}

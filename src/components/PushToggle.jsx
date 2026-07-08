import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import {
  isPushGranted,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../utils/pushNotifications';

export default function PushToggle({ establishmentId }) {
  const { t } = useTranslation();
  const supported = isPushSupported();
  const [enabled, setEnabled] = useState(isPushGranted);
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    if (!supported || !establishmentId) return;
    setLoading(true);
    try {
      if (enabled) {
        await unsubscribeFromPush(api);
        setEnabled(false);
      } else {
        const ok = await subscribeToPush(establishmentId, api);
        setEnabled(ok);
      }
    } finally {
      setLoading(false);
    }
  }, [supported, establishmentId, enabled]);

  if (!supported) return null;

  return (
    <button
      type="button"
      className={`sound-toggle btn btn-sm ${enabled ? 'btn-secondary' : 'sound-toggle-pulse'}`}
      onClick={toggle}
      disabled={loading}
      title={enabled ? t('notifications.pushOn') : t('notifications.pushOff')}
      aria-label={enabled ? t('notifications.pushOn') : t('notifications.pushOff')}
    >
      {enabled ? '📲' : '🔕'}
    </button>
  );
}

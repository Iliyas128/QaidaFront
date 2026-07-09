import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { isPushSupported, subscribeToPush } from '../utils/pushNotifications';
import { enableNotificationSound, playTestSound, setSoundEnabled } from '../utils/notificationSound';

const DISMISS_KEY = 'ecafe-notify-banner-dismissed';

function isDismissed() {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function NotifyPermissionBanner({ establishmentId }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState(isDismissed);
  const [permission, setPermission] = useState(() =>
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  const supported = isPushSupported();
  if (!supported || hidden || permission === 'granted' || permission === 'denied' || !establishmentId) {
    return null;
  }

  const enable = async () => {
    setLoading(true);
    try {
      setSoundEnabled(true);
      const soundOk = await enableNotificationSound();
      if (soundOk) playTestSound();

      const ok = await subscribeToPush(establishmentId, api);
      setPermission('Notification' in window ? Notification.permission : 'unsupported');
      if (ok) setHidden(true);
    } finally {
      setLoading(false);
    }
  };

  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // Ignore unavailable storage.
    }
  };

  return (
    <div className="notify-banner">
      <span className="notify-banner-text">{t('notifications.bannerText')}</span>
      <div className="notify-banner-actions">
        <button type="button" className="btn btn-sm btn-primary" onClick={enable} disabled={loading}>
          {loading ? t('common.loading') : t('notifications.bannerEnable')}
        </button>
        <button type="button" className="btn btn-sm btn-secondary" onClick={dismiss}>
          {t('notifications.bannerLater')}
        </button>
      </div>
    </div>
  );
}

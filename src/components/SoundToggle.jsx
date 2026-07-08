import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  enableNotificationSound,
  isSoundEnabled,
  playTestSound,
  setSoundEnabled,
} from '../utils/notificationSound';

export default function SoundToggle() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(isSoundEnabled);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const ok = await enableNotificationSound();
    setReady(ok);
    return ok;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = async () => {
    if (enabled) {
      setSoundEnabled(false);
      setEnabled(false);
      return;
    }

    setSoundEnabled(true);
    setEnabled(true);
    const ok = await refresh();
    if (ok) playTestSound();
  };

  const needsEnable = enabled && !ready;

  return (
    <button
      type="button"
      className={`sound-toggle btn btn-sm ${needsEnable ? 'sound-toggle-pulse' : 'btn-secondary'}`}
      onClick={toggle}
      title={enabled ? t('notifications.soundOn') : t('notifications.soundOff')}
      aria-label={enabled ? t('notifications.soundOn') : t('notifications.soundOff')}
    >
      {enabled ? '🔔' : '🔕'}
    </button>
  );
}

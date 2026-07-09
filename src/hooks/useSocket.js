import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken } from '../api';
import { getSocketUrl } from '../utils/pushNotifications';

function socketTransports() {
  const host = window.location.hostname;
  if (host.includes('vercel.app') || host === '185.113.132.17') {
    return ['polling'];
  }
  return ['websocket', 'polling'];
}

export function useSocket(establishmentId, role) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!establishmentId) {
      setSocket(null);
      return;
    }

    const token = getAccessToken();
    const s = io(getSocketUrl(), {
      auth: { token },
      transports: socketTransports(),
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    const join = () => {
      s.emit('join:establishment', { establishmentId, role });
    };

    s.on('connect', join);
    if (s.connected) join();

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !s.connected) {
        s.connect();
      } else if (document.visibilityState === 'visible') {
        join();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    setSocket(s);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      s.off('connect', join);
      s.disconnect();
      setSocket(null);
    };
  }, [establishmentId, role]);

  return socket;
}

export function useClientSocket(establishmentId) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!establishmentId) {
      setSocket(null);
      return;
    }

    const s = io(getSocketUrl(), {
      transports: socketTransports(),
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    const join = () => {
      s.emit('join:table', { establishmentId });
    };

    s.on('connect', join);
    if (s.connected) join();

    setSocket(s);

    return () => {
      s.off('connect', join);
      s.disconnect();
      setSocket(null);
    };
  }, [establishmentId]);

  return socket;
}

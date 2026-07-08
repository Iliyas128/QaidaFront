import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken } from '../api';
import { getSocketUrl } from '../utils/pushNotifications';

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
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    const join = () => {
      s.emit('join:establishment', { establishmentId, role });
    };

    s.on('connect', join);
    if (s.connected) join();

    setSocket(s);

    return () => {
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
      transports: ['websocket', 'polling'],
      reconnection: true,
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

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function getApiUrl() {
  return API_BASE;
}

export function getSocketUrl() {
  return SOCKET_URL || window.location.origin;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function subscribeToPush(establishmentId, api) {
  if (!('PushManager' in window) || !establishmentId) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  await registerServiceWorker();
  const reg = await navigator.serviceWorker.ready;

  const { publicKey } = await api.push.getVapidKey();
  if (!publicKey) return false;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await api.push.subscribe({
    establishmentId,
    subscription: sub.toJSON(),
  });

  return true;
}

export async function unsubscribeFromPush(api) {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await api.push.unsubscribe({ endpoint: sub.endpoint });
    await sub.unsubscribe();
  }
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isPushGranted() {
  return Notification.permission === 'granted';
}

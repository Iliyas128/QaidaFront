const STORAGE_KEY = 'ecafe-sound';

let ctx = null;
let audioReady = false;

function getContext() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function isSoundEnabled() {
  return localStorage.getItem(STORAGE_KEY) !== 'false';
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

export async function enableNotificationSound() {
  const audio = getContext();
  if (!audio) return false;

  try {
    if (audio.state === 'suspended') await audio.resume();

    const buffer = audio.createBuffer(1, 1, 22050);
    const source = audio.createBufferSource();
    source.buffer = buffer;
    source.connect(audio.destination);
    source.start(0);

    audioReady = audio.state === 'running';
    return audioReady;
  } catch {
    return audioReady;
  }
}

export function unlockNotificationSound() {
  enableNotificationSound();
}

function playTone(freq, start, duration, volume = 0.35, type = 'sine') {
  const audio = getContext();
  if (!audio) return;

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

async function playIfEnabled(playFn) {
  if (!isSoundEnabled()) return;
  const ready = await enableNotificationSound();
  if (!ready) return;
  playFn();
}

export function playNewOrderSound() {
  playIfEnabled(() => {
    const audio = getContext();
    const t = audio.currentTime;
    for (let i = 0; i < 4; i++) {
      const offset = i * 0.75;
      playTone(880, t + offset, 0.4, 0.45);
      playTone(1175, t + offset + 0.22, 0.4, 0.45);
    }
  });
}

export function playOrderReadySound() {
  playIfEnabled(() => {
    const audio = getContext();
    const t = audio.currentTime;
    for (let i = 0; i < 3; i++) {
      const offset = i * 0.85;
      playTone(523, t + offset, 0.3, 0.42);
      playTone(784, t + offset + 0.2, 0.3, 0.44);
      playTone(1047, t + offset + 0.42, 0.45, 0.48);
    }
  });
}

export function playWaiterCallSound() {
  playIfEnabled(() => {
    const audio = getContext();
    const t = audio.currentTime;
    for (let i = 0; i < 6; i++) {
      playTone(740, t + i * 0.38, 0.28, 0.5, 'square');
      playTone(980, t + i * 0.38 + 0.14, 0.22, 0.4, 'square');
    }
  });
}

export function playTestSound() {
  playNewOrderSound();
}

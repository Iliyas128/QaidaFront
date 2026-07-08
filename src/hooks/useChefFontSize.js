import { useState, useEffect } from 'react';

const STORAGE_KEY = 'chefFontSize';
const SIZES = ['normal', 'large', 'xlarge'];

export function useChefFontSize() {
  const [size, setSize] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SIZES.includes(saved) ? saved : 'large';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, size);
  }, [size]);

  const stepDown = () => {
    const idx = SIZES.indexOf(size);
    if (idx > 0) setSize(SIZES[idx - 1]);
  };

  const stepUp = () => {
    const idx = SIZES.indexOf(size);
    if (idx < SIZES.length - 1) setSize(SIZES[idx + 1]);
  };

  return { size, stepDown, stepUp, canStepDown: size !== 'normal', canStepUp: size !== 'xlarge' };
}

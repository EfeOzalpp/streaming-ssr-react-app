// src/services/media/image-upgrade-manager.ts
let totalImages = 0;
let loadedLowRes = 0;
let listeners: (() => void)[] = [];
let upgradeTimeout: ReturnType<typeof setTimeout> | null = null;

export const setUpgradeTimeout = (ms: number = 5000) => {
  if (upgradeTimeout) return;
  upgradeTimeout = setTimeout(() => {
    listeners.forEach(fn => fn());
    listeners = [];
  }, ms);
};

export const registerImage = () => {
  totalImages++;
  setUpgradeTimeout();
};

export const notifyLowResLoaded = () => {
  loadedLowRes++;
  if (loadedLowRes >= totalImages) {
    listeners.forEach(fn => fn());
    listeners = [];
  }
};

export const onAllLowResLoaded = (callback: () => void) => {
  listeners.push(callback);
};

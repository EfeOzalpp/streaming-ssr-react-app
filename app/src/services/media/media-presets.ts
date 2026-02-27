export type ImagePreset = 'default' | 'thumb';

export const IMAGE_PRESET = {
  default: {
    imgLowWidth: 128,
    imgLowQuality: 30,
    imgMediumWidth: 960,
    imgMediumQuality: 60,
    imgHighWidth: 2400,
    imgHighQuality: 90,
    // behavior
    allowAutoHigh: true,
    enableHighFallbackTimer: true,
  },
  thumb: {
    // tuned for small UI cards / grids
    imgLowWidth: 96,
    imgLowQuality: 30,
    imgMediumWidth: 640,
    imgMediumQuality: 60,
    imgHighWidth: 960,     // cap high for thumbs
    imgHighQuality: 75,
    // behavior
    allowAutoHigh: false,        // don’t push all thumbs to high
    enableHighFallbackTimer: false,
  },
} as const;
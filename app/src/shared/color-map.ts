// src/shared/color-map.ts
export interface ProjectColor {
  rgb: string;         // "204, 85, 41"
  tooltipAlpha?: number;
  defaultAlpha?: number;
  themeColor?: string; // optional override for theme-color
}

export const projectColors: Record<string, ProjectColor> = {
  'Rotary Lamp': {
    rgb: '230, 120, 40',
    tooltipAlpha: 0.6,
    defaultAlpha: 0.6,
    themeColor: 'rgba(72, 161, 161, 1)'
  },
  'Ice Cream Scoop': {
    rgb: '234, 92, 140',
    tooltipAlpha: 0.6,
    defaultAlpha: 0.6,
    themeColor: 'rgba(23, 27, 24, 1)'
  },
  'Data Visualization': {
    rgb: '153, 199, 7',
    tooltipAlpha: 0.8,
    defaultAlpha: 0.6,
    themeColor: 'rgba(28, 30, 31, 1)'
  },
  'Evade the Rock': {
    rgb: '115, 130, 255',
    tooltipAlpha: 0.6,
    defaultAlpha: 0.6,
    themeColor: 'rgb(25, 25, 25)'
  },
  'Dynamic App': {
    rgb: '140, 200, 255',
    tooltipAlpha: 0.6,
    defaultAlpha: 0.6,
    themeColor: 'rgba(17, 17, 17, 1)'
  },
};

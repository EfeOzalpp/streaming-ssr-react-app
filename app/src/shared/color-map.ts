// src/shared/color-map.ts
export interface ProjectColor {
  rgb: string;         // "204, 85, 41"
  tooltipAlpha?: number;
  defaultAlpha?: number;
  themeColor?: string; // optional override for theme-color
}

export const projectColors: Record<string, ProjectColor> = {
  'Rotary Lamp': {
    rgb: '235, 117, 63',
    tooltipAlpha: 0.6,
    defaultAlpha: 0.6,
    themeColor: 'rgb(235, 117, 63)'
  },
  'Ice Cream Scoop': {
    rgb: '224, 102, 170',
    tooltipAlpha: 0.6,
    defaultAlpha: 0.6,
    themeColor: 'rgb(17, 24, 18)'
  },
  'Data Visualization': {
    rgb: '153, 199, 7',
    tooltipAlpha: 0.6,
    defaultAlpha: 0.6,
    themeColor: 'rgba(28, 30, 31, 1)'
  },
  'Evade the Rock': {
    rgb: '115, 130, 255',
    tooltipAlpha: 0.4,
    defaultAlpha: 0.3,
    themeColor: 'rgb(25, 25, 25)'
  },
  'Dynamic App': {
    rgb: '140, 200, 255',
    tooltipAlpha: 0.6,
    defaultAlpha: 0.6,
    themeColor: 'rgba(17, 17, 17, 1)'
  },
  'Agentic Tools': {
    rgb: '74, 74, 74',
    tooltipAlpha: 0.5,
    defaultAlpha: 0.4,
    themeColor: 'rgb(74, 74, 74)'
  },
};

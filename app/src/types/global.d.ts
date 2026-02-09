// src/types/global.d.ts

// allow importing JSON and media
declare module "*.json" {
  const value: any;
  export default value;
}
declare module "*.svg" { const url: string; export default url; }

// RAW loaders
declare module "*.css?raw" { const css: string; export default css; }
declare module "*?raw" { const content: string; export default content; }

// (keep your Window augmentation if you need it)
declare global {
  interface Window {
    __DYNAMIC_STYLE_IDS__?: Set<string>;
  }
}

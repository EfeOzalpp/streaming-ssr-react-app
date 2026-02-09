// src/behaviors/load-lottie.ts
let _promise: Promise<any> | null = null;

/** Explicit preload trigger (e.g. in App.tsx useEffect) */
export function loadLottie() {
  if (!_promise) {
    _promise = import(
      /* webpackChunkName: "lottie-web" */
      'lottie-web'   // SVG-only build
    ).then(m => m.default ?? m);
  }
  return _promise;
}

/** Proxy so you can keep `import lottie from '../utils/lottie'` */
const lottie: any = new Proxy({}, {
  get(_target, prop: string) {
    return (...args: any[]) =>
      loadLottie().then(mod => mod[prop](...args));
  }
});

export default lottie;

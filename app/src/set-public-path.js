/* global __webpack_public_path__ */
if (process.env.NODE_ENV === 'development') {
  const fromWindow = window.__ASSET_ORIGIN__;
  const origin = fromWindow || `http://${window.location.hostname}:3000/`;
  // eslint-disable-next-line no-undef
  __webpack_public_path__ = origin.endsWith('/') ? origin : origin + '/';
}

// src/server/index.jsx
import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import React from 'react';
import express from 'express';
import { StaticRouter } from 'react-router';
import { renderToPipeableStream, renderToString } from 'react-dom/server';
import App from '../App';
import { ChunkExtractor } from '@loadable/server';
import { CacheProvider } from '@emotion/react';
import { createEmotion } from './emotion';
import { createProxyMiddleware } from 'http-proxy-middleware'; 

import compression from 'compression';
import highScoreRoute from './game/highScoreRoute';

import { SsrDataProvider } from '../state/providers/ssr-data-context';
import { prepareSsrData } from './prepareSsrData';
import { ssrRegistry } from '../ssr/registry';
import { routeRegistry } from '../ssr/route-registry';
import { getEphemeralSeed } from './seed';

import { buildHtmlOpen, buildHtmlClose } from './html';
import { buildCriticalCss } from './cssPipeline';

import {
  resolveStatsFile,
  loadManifestIfAny,
  readFontCss,
  buildPreloadLinks,
  buildDynamicImagePreloads,
} from './assets';

const app = express();
app.use(express.json());
app.set('trust proxy', 1);

// enable gzip compression for HTML, CSS, JS, JSON, etc.
app.use(
  compression({
    threshold: 1024,
  })
);

const IS_DEV = process.env.NODE_ENV !== 'production';

// Host/port logic that works for both Railway (prod) and LAN/local (dev)
const PORT = Number(process.env.PORT) || 3001;
const HOST =
  process.env.HOST || (IS_DEV ? '192.168.29.199' : '0.0.0.0'); // LAN? set HOST=192.168.x.x in dev

// Dev asset origin: respect overrides, otherwise use HOST and default CRA port 3000
const DEV_CLIENT_PORT = Number(process.env.DEV_CLIENT_PORT) || 3000;
const DEV_HOST_FOR_ASSETS = process.env.DEV_HOST_FOR_ASSETS || HOST;
const DEV_ASSETS_ORIGIN = `http://${DEV_HOST_FOR_ASSETS}:${DEV_CLIENT_PORT}/`;

const { BUILD_DIR, STATS_FILE, ASSET_MANIFEST } = resolveStatsFile();

/** API routes */
app.use('/api', highScoreRoute);

/** Static assets */
app.use(express.static(path.join(process.cwd(), 'public'), { maxAge: '1y', index: false }));

if (IS_DEV) {
  // proxy CRA dev server assets + websocket
  app.use('/static', createProxyMiddleware({ target: DEV_ASSETS_ORIGIN, changeOrigin: true, ws: true }));
  app.use('/sockjs-node', createProxyMiddleware({ target: DEV_ASSETS_ORIGIN, changeOrigin: true, ws: true }));
} else {
  app.use('/static', express.static(path.join(BUILD_DIR, 'static'), { maxAge: '1y', index: false }));
  app.use(express.static(BUILD_DIR, { index: false }));
}

// Optional health route for quick checks/logs
app.get('/healthz', (_req, res) => res.status(200).send('ok'));

/** SSR catch-all */
app.get('/*', async (req, res) => {
  const isDynamicTheme = req.path.startsWith('/dynamic-theme');

  if (!fs.existsSync(STATS_FILE)) {
    res.status(500).send('<pre>Missing build artifacts. Run `npm run build` or `npm run dev:ssr`.</pre>');
    return;
  }

  let ssrPayload = { seed: null, preloaded: {}, preloadLinks: [] };

  // Dynamic route bootstrap state
  let dynamicPreload = null;
  let dynamicPreloadLinks = [];
  let dynamicSnapshotHtml = '';
  let dynamicSeed = null;

  if (!isDynamicTheme) {
    const { seed } = getEphemeralSeed();
    ssrPayload = await prepareSsrData(seed);
  } else {
    const desc = routeRegistry['dynamic-theme'];
    if (!desc || typeof desc.render !== 'function' || typeof desc.fetch !== 'function') {
      res.status(500).send('<pre>dynamic-theme descriptor missing or invalid.</pre>');
      return;
    }

    const rawSeed = Number((req.query || {}).seed);
    dynamicSeed = Number.isFinite(rawSeed) ? rawSeed : getEphemeralSeed().seed;

    const fetchPromise = desc.fetch.length === 0 ? desc.fetch() : desc.fetch(dynamicSeed);
    dynamicPreload = await fetchPromise;

    dynamicPreloadLinks = buildDynamicImagePreloads(dynamicPreload?.images || [], 8);

    const sectionNode = desc.render(dynamicPreload);
    dynamicSnapshotHtml = renderToString(sectionNode);
  }

  const extractor = new ChunkExtractor({
    statsFile: STATS_FILE,
    publicPath: IS_DEV ? DEV_ASSETS_ORIGIN : '/',
  });
  const { cache, extractCriticalToChunks, constructStyleTagsFromChunks } = createEmotion();

  const jsx = extractor.collectChunks(
    <CacheProvider value={cache}>
      <SsrDataProvider value={ssrPayload}>
        <StaticRouter location={req.url}>
          <App />
        </StaticRouter>
      </SsrDataProvider>
    </CacheProvider>
  );

  const prerender = renderToString(jsx);
  const emotionChunks = extractCriticalToChunks(prerender);
  const emotionStyleTags = constructStyleTagsFromChunks(emotionChunks);

  const manifest = loadManifestIfAny(IS_DEV, ASSET_MANIFEST);

  const iconSvg = '/freshmedia-icon.svg';
  const iconIco = !IS_DEV && manifest?.files?.['favicon.ico'] ? manifest.files['favicon.ico'] : '/favicon.ico';

  const allFonts = readFontCss();
  const fontsCss = isDynamicTheme
    ? { rubikCss: allFonts.rubikCss, orbitronCss: allFonts.orbitronCss, poppinsCss: '', epilogueCss: '' }
    : allFonts;

  const preloadLinks = isDynamicTheme
    ? dynamicPreloadLinks
    : (() => {
        const firstKey = Object.keys(ssrPayload.preloaded || {})[0];
        const firstData = firstKey ? ssrPayload.preloaded[firstKey] : null;
        return buildPreloadLinks(firstData);
      })();

  let extraCriticalCss = '';
  if (!isDynamicTheme) {
    const keys = Object.keys(ssrPayload.preloaded || {}).slice(0, 3);
    const allFiles = keys.flatMap((k) => ssrRegistry[k]?.criticalCssFiles ?? []);
    const uniqueFiles = Array.from(new Set(allFiles));
    if (uniqueFiles.length > 0) {
      try {
        extraCriticalCss = await buildCriticalCss(uniqueFiles);
      } catch {
        extraCriticalCss = '';
      }
    }
  } else {
    const d = routeRegistry['dynamic-theme'];
    const files = (d && d.criticalCssFiles) || [];
    if (files.length > 0) {
      try {
        extraCriticalCss = await buildCriticalCss(files);
      } catch {
        extraCriticalCss = '';
      }
    }
  }

  // Filter CRA/Loadable CSS on /dynamic-theme (keep JS, drop CSS tags)
  const rawLinkTags = extractor.getLinkTags();
  const extractorLinkTags = isDynamicTheme
    ? rawLinkTags.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/g, '')
    : rawLinkTags;
  const extractorStyleTags = isDynamicTheme ? '' : extractor.getStyleTags();

  const htmlOpen = buildHtmlOpen({
    IS_DEV,
    routePath: req.path,
    iconSvg,
    iconIco,
    preloadLinks,
    fontsCss,
    extractorLinkTags,
    extractorStyleTags,
    emotionStyleTags,
    extraCriticalCss,
    injectBeforeRoot: isDynamicTheme ? dynamicSnapshotHtml : '',
  });

  const dynamicBootstrap = isDynamicTheme
    ? `<script>window.__DYNAMIC_PRELOAD__=${JSON.stringify({ ...(dynamicPreload || {}), seed: dynamicSeed }).replace(
        /</g,
        '\\u003c'
      )}</script>`
    : '';
const scriptTags = extractor.getScriptTags();
console.log("[SSR] scriptTags snippet:", scriptTags.slice(0, 300));
console.log("[SSR] scriptTags length:", scriptTags.length);

  const htmlClose = buildHtmlClose(ssrPayload, extractor.getScriptTags(), dynamicBootstrap);

  let didError = false;
  const ABORT_MS = IS_DEV ? 30000 : 10000;

  const stream = renderToPipeableStream(jsx, {
    onShellReady() {
      res.statusCode = didError ? 500 : 200;
      console.log('[SSR] shell ready', req.method, req.url);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.write(htmlOpen);
      stream.pipe(res);
    },
    onAllReady() {
      console.log('[SSR] all ready', req.method, req.url);
      clearTimeout(abortTimer);
      res.write(htmlClose);
      res.end();
    },
    onShellError(err) {
      clearTimeout(abortTimer);
      console.error('[SSR] Shell error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('An error occurred while loading the app.');
    },
    onError(err) {
      didError = true;
      console.error('[SSR] Error:', err);
    },
  });

  const abortTimer = setTimeout(() => {
    if (!res.writableEnded) {
      console.warn('[SSR] Aborting stream after timeout');
      stream.abort();
    }
  }, ABORT_MS);
});

app.listen(PORT, HOST, () => {
  console.log(
    `SSR server running at http://${HOST}:${PORT} (${IS_DEV ? 'development' : 'production'})`
  );
});

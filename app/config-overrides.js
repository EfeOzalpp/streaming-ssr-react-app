// config-overrides.js
const path = require('path');
const postcssPrefixSelector = require('postcss-prefix-selector');
const LoadablePlugin = require('@loadable/webpack-plugin');

module.exports = function override(config, env) {
  // Resolve aliases & fallbacks (prevent bundling Node-only deps in browser)
  config.resolve = {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias || {}),
      'skia-canvas': false, // q5 may try to resolve this (Node-only)
      canvas: false,        // belt & suspenders
    },
    fallback: {
      ...(config.resolve?.fallback || {}),
      fs: false,
      path: false,
      assert: false,
      buffer: false,
      child_process: false,
      crypto: false,
      dns: false,
      http: false,
      https: false,
      net: false,
      os: false,
      stream: false,
      tls: false,
      url: false,
      util: false,
      zlib: false,
    },
  };

  // --- Quiet some 3rd-party source-map warnings (optional)
  const oneOfRule = config.module.rules.find((rule) => Array.isArray(rule.oneOf));
  if (oneOfRule) {
    // 1) Allow raw CSS via ?raw (you had this)
    oneOfRule.oneOf.unshift({
      test: /\.css$/i,
      resourceQuery: /raw/,
      use: 'raw-loader',
      include: path.resolve(__dirname, 'src'),
    });

    // 2) Inject PostCSS prefixer (you had this)
    const cssRule = oneOfRule.oneOf.find(
      (rule) => rule.test && rule.test.toString().includes('.css') && Array.isArray(rule.use)
    );
    if (cssRule) {
      const cssLoaderIndex = cssRule.use.findIndex(
        (loader) => loader.loader && loader.loader.includes('css-loader')
      );
      if (cssLoaderIndex !== -1) {
        cssRule.use.splice(cssLoaderIndex + 1, 0, {
          loader: require.resolve('postcss-loader'),
          options: {
            postcssOptions: (loaderContext) => {
              const file = loaderContext.resourcePath || '';
              const isFontCss = /[\\/]fonts[\\/]/i.test(file) || /[\\/]fonts2[\\/]/i.test(file);
              return {
                plugins: isFontCss
                  ? []
                  : [
                      postcssPrefixSelector({
                        prefix: '#main-shell',
                        transform: (prefix, selector, prefixed) => {
                          if (
                            selector.startsWith('html') ||
                            selector.startsWith('body') ||
                            selector.startsWith(':root') ||
                            selector.includes('#dynamic-theme') ||
                            selector.includes('#dynamic-theme-ssr') ||
                            selector.includes('#shadow-dynamic-app') ||
                            selector.includes('::slotted')
                          ) {
                            return selector;
                          }
                          return prefixed;
                        },
                      }),
                    ],
              };
            },
          },
        });
      }
    } else {
      console.warn('Could not find base CSS rule to patch postcss-loader');
    }

    // 3) Add Emotion + Loadable babel plugins to client build (you had this)
    const babelRules = oneOfRule.oneOf.filter(
      (rule) => rule.loader && rule.loader.includes('babel-loader') && rule.options
    );
    for (const br of babelRules) {
      br.options.plugins = br.options.plugins || [];

      const hasEmotion = br.options.plugins.some((p) => {
        const name = Array.isArray(p) ? p[0] : p;
        return typeof name === 'string' && name.includes('@emotion/babel-plugin');
      });
      if (!hasEmotion) br.options.plugins.push(require.resolve('@emotion/babel-plugin'));

      const hasLoadable = br.options.plugins.some((p) => {
        const name = Array.isArray(p) ? p[0] : p;
        return typeof name === 'string' && name.includes('@loadable/babel-plugin');
      });
      if (!hasLoadable) br.options.plugins.push(require.resolve('@loadable/babel-plugin'));
    }

    // 4) Suppress noisy source-map-loader warnings from specific packages (optional)
    oneOfRule.oneOf = oneOfRule.oneOf.map((r) => {
      if (r.loader && r.loader.includes('source-map-loader')) {
        return {
          ...r,
          exclude: [
            /node_modules[\\/]@tootallnate[\\/]once/,
            /node_modules[\\/]http-proxy-agent/,
            /node_modules[\\/]https-proxy-agent/,
            /node_modules[\\/]saxes/,
            /node_modules[\\/]xmlchars/,
          ],
        };
      }
      return r;
    });
  }

  // --- Emit loadable-stats.json for SSR chunk discovery (you had this)
  config.plugins.push(
    new LoadablePlugin({
      filename: 'loadable-stats.json',
      writeToDisk: true,
    })
  );

  return config;
};

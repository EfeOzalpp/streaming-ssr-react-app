// webpack.server.js
const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = (_env, argv) => {
  const mode = argv.mode || 'production';

  return {
    name: 'server',
    mode,
    target: 'node',
    entry: path.resolve(__dirname, 'src/server/index.jsx'),
    output: {
      path: path.resolve(__dirname, 'build-ssr'),
      filename: 'server.js',
      libraryTarget: 'commonjs2',
      clean: true,
    },
    externals: [
      nodeExternals({
        allowlist: [
          /^@loadable\//,
          /^@emotion\//,
          /^react-router-dom$/,
          /^react-router$/,
        ],
      }),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      // ⬇ Force CJS by resolving package root (main) instead of ESM
      alias: {
        '@loadable/component': require.resolve('@loadable/component'),
      },
      // bias resolution toward CJS conditions in Node
      conditionNames: ['require', 'node', 'default'],
      mainFields: ['main', 'module'],
    },
    module: {
      rules: [
        { test: /\.css$/i, use: 'null-loader' },
        {
          test: /\.(png|jpe?g|gif|svg|ico|webp|avif|bmp|woff2?|eot|ttf|otf)$/i,
          type: 'asset/resource',
          generator: { filename: 'static/media/[name].[contenthash:8][ext][query]' },
        },
        {
          test: /\.[jt]sx?$/i,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              configFile: false,
                presets: [
                  [require.resolve('@babel/preset-env'), { targets: { node: 'current' } }],
                  [require.resolve('@babel/preset-react'), { runtime: 'automatic', importSource: '@emotion/react' }],
                  require.resolve('@babel/preset-typescript'),
                ],
              plugins: [
                require.resolve('@loadable/babel-plugin'),
                require.resolve('@emotion/babel-plugin'),
              ],
            },
          },
        },
      ],
    },
    devtool: 'source-map',
    node: { __dirname: false, __filename: false },
    stats: 'minimal',
  };
};

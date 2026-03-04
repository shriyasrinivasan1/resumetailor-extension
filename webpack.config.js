const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const Dotenv = require('dotenv-webpack');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    // Three separate entry points — each becomes its own self-contained bundle in dist/
    entry: {
      popup: './src/popup/index.jsx',
      content_script: './src/content/content_script.js',
      background: './src/background/service_worker.js',
    },

    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true, // wipe dist/ on each build
    },

    module: {
      rules: [
        // Transpile JSX and modern JS for Chrome 120+
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { chrome: '120' } }],
                ['@babel/preset-react', { runtime: 'automatic' }],
              ],
            },
          },
        },
        // Bundle CSS into JS (injected via <style> tag at runtime in popup)
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },

    resolve: {
      extensions: ['.js', '.jsx'],
    },

    plugins: [
      // Injects ANTHROPIC_API_KEY at build time from .env file.
      // Create .env with ANTHROPIC_API_KEY=sk-ant-... before running npm run build.
      new Dotenv({
        // safe: true would block builds when the key is empty — we validate at runtime instead
        systemvars: true, // also picks up variables set in the shell environment
      }),

      // Generates dist/popup.html from our template, auto-injecting <script> for popup.js
      new HtmlWebpackPlugin({
        template: './public/popup.html',
        filename: 'popup.html',
        chunks: ['popup'],
      }),

      // Copy static assets into dist/
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: '.' },
          { from: 'public/icons', to: 'icons', noErrorOnMissing: true },
        ],
      }),
    ],

    // Chrome extensions cannot use eval-based source maps
    devtool: isDev ? 'cheap-module-source-map' : false,

    optimization: {
      // Each entry must be a single self-contained file.
      // Chrome loads extension scripts directly — there's no chunk loader at runtime.
      splitChunks: false,
      runtimeChunk: false,
    },
  };
};

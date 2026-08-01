/**
 * Modern browser build for NeDB Promise (P2).
 *
 * Replaces the legacy browserify@2.25 based build (which cannot parse the
 * ES6+/async-await source) with an esbuild powered bundle.
 *
 * Notes:
 *  - Stream API is Node-only (see README): the browser build stubs lib/stream.js
 *    so require('stream') never ships into the browser bundle.
 *  - Node built-ins events/path/util are polyfilled (events, path-browserify, util).
 *
 * Usage:
 *   node browser-version/build-modern.js
 *   # or:  npm run build:browser
 */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const TMP = path.join(__dirname, '.browser-build'); // temp staging (gitignored)
const LIB_SRC = path.join(REPO_ROOT, 'lib');
const OUT_DIR = path.join(__dirname, 'out');
const STREAM_STUB = path.join(TMP, 'stream-stub.js'); // Node-only stream stub

function ensureDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

(async () => {
  try {
    // Stage a copy of lib/ with browser-specific replacements applied.
    ensureDir(TMP);
    // Stub for Node-only stream API so datastore.js can bundle in the browser.
    fs.writeFileSync(STREAM_STUB, 'module.exports = { streamMixins: {} };\n');
    fs.cpSync(LIB_SRC, path.join(TMP, 'lib'), { recursive: true });
    fs.copyFileSync(
      path.join(__dirname, 'browser-specific', 'lib', 'customUtils.js'),
      path.join(TMP, 'lib', 'customUtils.js')
    );
    fs.copyFileSync(
      path.join(__dirname, 'browser-specific', 'lib', 'storage.js'),
      path.join(TMP, 'lib', 'storage.js')
    );
    fs.copyFileSync(STREAM_STUB, path.join(TMP, 'lib', 'stream.js'));

    const entry = path.join(TMP, 'lib', 'datastore.js');
    const shared = {
      bundle: true,
      platform: 'browser',
      format: 'iife',
      globalName: 'nedb',
      alias: {
        events: 'events',
        path: 'path-browserify',
        util: 'util',
      },
      logLevel: 'warning',
    };

    ensureDir(OUT_DIR);

    // Full (unminified) bundle: kept for dev/debugging.
    await esbuild.build({
      ...shared,
      entryPoints: [entry],
      outfile: path.join(OUT_DIR, 'nedb.js'),
    });

    // Minified bundle: default build artifact.
    await esbuild.build({
      ...shared,
      entryPoints: [entry],
      outfile: path.join(OUT_DIR, 'nedb.min.js'),
      minify: true,
    });

    console.log('Browser build finished with success');
    console.log('  out/nedb.js     ', fs.statSync(path.join(OUT_DIR, 'nedb.js')).size, 'bytes');
    console.log('  out/nedb.min.js ', fs.statSync(path.join(OUT_DIR, 'nedb.min.js')).size, 'bytes');
  } catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
  } finally {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
})();

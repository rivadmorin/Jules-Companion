/**
 * Project Build & Compilation Script for Jules Companion.
 * @module scripts/build
 * @description Compiles all TypeScript source files into CommonJS distribution modules using esbuild.
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

/**
 * Recursively scans a target directory and discovers all TypeScript (.ts) source entrypoints.
 * Excludes test files and node_modules from compilation output.
 *
 * @param {string} dir - The directory path to traverse.
 * @returns {string[]} Array of absolute file paths for discovered TypeScript files.
 */
function getTsFiles(dir) {
  let results = [];
  // Read current directory entries with file types for efficient traversal
  const list = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);

    // Step 1: Recursively traverse subdirectories
    if (entry.isDirectory()) {
      results = results.concat(getTsFiles(fullPath));
    // Step 2: Collect valid TypeScript source files
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

// 1. Resolve source scripts directory and collect all TypeScript entrypoints
const scriptsDir = path.resolve(__dirname);
const entryPoints = getTsFiles(scriptsDir);

// 2. Execute synchronous esbuild compilation targeting Node.js CommonJS
esbuild.buildSync({
  entryPoints,
  outdir: path.resolve(__dirname, '../dist'),
  platform: 'node',
  format: 'cjs',
  target: 'node18',
  sourcemap: false
});

// 3. Output compilation success summary to terminal
console.log(`⚡ Built ${entryPoints.length} TypeScript entrypoints to dist/`);

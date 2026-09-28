const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

function getTsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(getTsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

const scriptsDir = path.resolve(__dirname);
const entryPoints = getTsFiles(scriptsDir);

esbuild.buildSync({
  entryPoints,
  outdir: path.resolve(__dirname, '../dist'),
  platform: 'node',
  format: 'cjs'
});

console.log(`⚡ Built ${entryPoints.length} TypeScript entrypoints to dist/`);

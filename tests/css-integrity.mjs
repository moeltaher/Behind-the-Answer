import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function walk(directory) {
  const entries = await readdir(directory);
  const files = [];

  for (const entry of entries) {
    if (entry === '.git' || entry === 'node_modules') continue;
    const path = join(directory, entry);
    const info = await stat(path);
    if (info.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }

  return files;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasRuntimeReference(className, source) {
  const literal = new RegExp(`(^|[^A-Za-z0-9_-])${escapeRegExp(className)}([^A-Za-z0-9_-]|$)`);
  if (literal.test(source)) return true;

  const modifierAt = className.indexOf('--');
  if (modifierAt === -1) return false;

  const prefix = className.slice(0, modifierAt + 2);
  const suffix = className.slice(modifierAt + 2);
  return source.includes(`${prefix}\${`) && source.includes(suffix);
}

const files = await walk(ROOT);
const cssFiles = files.filter(file => file.startsWith(join(ROOT, 'css')) && extname(file) === '.css');
const runtimeFiles = files.filter(file =>
  file === join(ROOT, 'index.html') ||
  (file.startsWith(join(ROOT, 'js')) && extname(file) === '.js')
);
const runtimeSource = (await Promise.all(runtimeFiles.map(file => readFile(file, 'utf8')))).join('\n');
const failures = [];

for (const file of cssFiles) {
  const css = await readFile(file, 'utf8');
  const classes = new Set();

  for (const match of css.matchAll(/\.([A-Za-z_][A-Za-z0-9_-]*)/g)) {
    classes.add(match[1]);
  }

  for (const className of classes) {
    if (!hasRuntimeReference(className, runtimeSource)) {
      failures.push(`${file.slice(ROOT.length + 1)} contains unused class selector .${className}`);
    }
  }
}

if (failures.length) {
  console.error('CSS integrity check failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`CSS integrity check passed across ${cssFiles.length} stylesheets.`);

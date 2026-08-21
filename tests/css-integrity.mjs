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
const cssSources = await Promise.all(cssFiles.map(async file => [file, await readFile(file, 'utf8')]));
const allCss = cssSources.map(([, css]) => css).join('\n');
const failures = [];

for (const [file, css] of cssSources) {
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

const customPropertyDefinitions = new Set(
  [...allCss.matchAll(/(^|[;{]\s*)(--[A-Za-z0-9_-]+)\s*:/gm)].map(match => match[2])
);
const cssPropertyUses = new Set(
  [...allCss.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map(match => match[1])
);
const runtimePropertyUses = new Set(
  [...runtimeSource.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)].map(match => match[1])
);
const allPropertyUses = new Set([...cssPropertyUses, ...runtimePropertyUses]);

for (const property of customPropertyDefinitions) {
  if (!allPropertyUses.has(property)) failures.push(`Unused CSS custom property: ${property}`);
}

for (const property of runtimePropertyUses) {
  if (!customPropertyDefinitions.has(property)) {
    failures.push(`Runtime references undefined CSS custom property: ${property}`);
  }
}

const keyframes = new Set(
  [...allCss.matchAll(/@keyframes\s+([A-Za-z_][A-Za-z0-9_-]*)/g)].map(match => match[1])
);
for (const name of keyframes) {
  const usage = new RegExp(`animation(?:-name)?\\s*:[^;{}]*\\b${escapeRegExp(name)}\\b`);
  if (!usage.test(allCss)) failures.push(`Unused CSS keyframes: ${name}`);
}

if (failures.length) {
  console.error('CSS integrity check failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`CSS integrity check passed across ${cssFiles.length} stylesheets, including runtime CSS-variable references.`);

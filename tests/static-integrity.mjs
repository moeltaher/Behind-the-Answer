import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css', '.md', '.yml', '.yaml']);
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs']);
const REMOVED_STATE_FIELDS = ['visibility', 'discovery', 'finalEnding'];
const allowedLegacyReferences = new Set(['js/core/storage.js']);

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

function relative(path) {
  return path.slice(ROOT.length + 1).replaceAll('\\', '/');
}

function localPath(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  return normalize(resolve(dirname(fromFile), specifier));
}

const files = await walk(ROOT);
const textFiles = files.filter(file => TEXT_EXTENSIONS.has(extname(file)));
const sourceFiles = files.filter(file => SOURCE_EXTENSIONS.has(extname(file)));
const fileSet = new Set(files.map(file => normalize(file)));
const failures = [];

for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  const importPattern = /(?:from\s+|import\s*)['"]([^'"]+)['"]/g;

  for (const match of source.matchAll(importPattern)) {
    const target = localPath(file, match[1]);
    if (target && !fileSet.has(target)) {
      failures.push(`${relative(file)} imports missing file ${match[1]}`);
    }
  }
}

const indexPath = join(ROOT, 'index.html');
const index = await readFile(indexPath, 'utf8');
for (const match of index.matchAll(/(?:href|src)="(\.\/[^"?#]+)"/g)) {
  const target = normalize(resolve(ROOT, match[1]));
  if (!fileSet.has(target)) failures.push(`index.html references missing asset ${match[1]}`);
}

for (const file of textFiles) {
  const rel = relative(file);
  if (allowedLegacyReferences.has(rel)) continue;
  const source = await readFile(file, 'utf8');

  for (const field of REMOVED_STATE_FIELDS) {
    const pattern = new RegExp(`\\b${field}\\b`);
    if (pattern.test(source)) {
      failures.push(`${rel} still references removed state field "${field}"`);
    }
  }
}

const bannedImports = ['game-data.js'];
for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  for (const banned of bannedImports) {
    if (source.includes(banned)) failures.push(`${relative(file)} still imports legacy ${banned}`);
  }
}

if (failures.length) {
  console.error('Static integrity check failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`Static integrity check passed across ${textFiles.length} text files.`);

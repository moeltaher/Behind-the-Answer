import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCENES_BY_STAGE } from '../js/data/stage-backgrounds.js';
import { createIntroRoutes } from '../js/scenes/intro.js';
import { createMiningRoutes } from '../js/scenes/mining.js';
import { createFactoryRoutes } from '../js/scenes/factory.js';
import { createDatacenterRoutes } from '../js/scenes/datacenter.js';
import { createDataRoutes } from '../js/scenes/data.js';
import { createAnnotationRoutes } from '../js/scenes/annotation.js';
import { createTrainingRoutes } from '../js/scenes/training.js';
import { createEvaluationRoutes } from '../js/scenes/evaluation.js';
import { createDeploymentRoutes } from '../js/scenes/deployment.js';
import { createEndingRoutes } from '../js/scenes/ending.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css', '.md', '.yml', '.yaml']);
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs']);
const REMOVED_STATE_PATHS = [
  'metrics.visibility',
  'metrics.discovery',
  'metrics.quality',
  'flags.finalEnding'
];
const LEGACY_SCAN_EXCLUSIONS = new Set([
  'js/core/storage.js',
  'tests/static-integrity.mjs'
]);

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

  for (const match of source.matchAll(/['"](\.\/assets\/[^'"?#]+)['"]/g)) {
    const target = normalize(resolve(ROOT, match[1]));
    if (!fileSet.has(target)) {
      failures.push(`${relative(file)} references missing runtime asset ${match[1]}`);
    }
  }
}

const indexPath = join(ROOT, 'index.html');
const index = await readFile(indexPath, 'utf8');
for (const match of index.matchAll(/(?:href|src)="(\.\/[^"?#]+)"/g)) {
  const target = normalize(resolve(ROOT, match[1]));
  if (!fileSet.has(target)) failures.push(`index.html references missing asset ${match[1]}`);
}

for (const file of sourceFiles) {
  const rel = relative(file);
  if (LEGACY_SCAN_EXCLUSIONS.has(rel)) continue;
  const source = await readFile(file, 'utf8');

  for (const statePath of REMOVED_STATE_PATHS) {
    if (source.includes(statePath)) {
      failures.push(`${rel} still references removed state path "${statePath}"`);
    }
  }

  if (source.includes('game-data.js')) {
    failures.push(`${rel} still imports legacy game-data.js`);
  }
}

const factories = [
  createIntroRoutes,
  createMiningRoutes,
  createFactoryRoutes,
  createDatacenterRoutes,
  createDataRoutes,
  createAnnotationRoutes,
  createTrainingRoutes,
  createEvaluationRoutes,
  createDeploymentRoutes,
  createEndingRoutes
];
const registeredScenes = new Set(
  factories.flatMap(factory => Object.keys(factory({})))
);
const mappedScenes = Object.values(SCENES_BY_STAGE).flat();
const mappedSet = new Set(mappedScenes);

if (mappedScenes.length !== mappedSet.size) {
  failures.push('SCENES_BY_STAGE contains duplicate scene ids.');
}

for (const scene of mappedSet) {
  if (!registeredScenes.has(scene)) failures.push(`Mapped scene has no registered route: ${scene}`);
}
for (const scene of registeredScenes) {
  if (!mappedSet.has(scene)) failures.push(`Registered route has no stage mapping: ${scene}`);
}

if (failures.length) {
  console.error('Static integrity check failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`Static integrity check passed across ${textFiles.length} text files and ${registeredScenes.size} routes.`);

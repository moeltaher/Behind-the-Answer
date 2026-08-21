import { readFile, readdir, stat } from 'node:fs/promises';
import { extname, dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_STATE } from '../js/core/state.js';
import { STORAGE_KEY, SETTINGS_KEY } from '../js/core/storage.js';
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
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs']);
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css', '.md', '.yml', '.yaml']);

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

function importedNames(importList) {
  return importList
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => part.split(/\s+as\s+/)[0].trim());
}

const files = await walk(ROOT);
const fileSet = new Set(files.map(file => normalize(file)));
const textFiles = files.filter(file => TEXT_EXTENSIONS.has(extname(file)));
const sourceFiles = files.filter(file => SOURCE_EXTENSIONS.has(extname(file)));
const runtimeSources = sourceFiles.filter(file => relative(file).startsWith('js/'));
const failures = [];
const importedRuntimeFiles = new Set();
const importedRuntimeNames = new Map();
const referencedAssets = new Set();
const runtimeText = new Map();

for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8');
  if (relative(file).startsWith('js/')) runtimeText.set(normalize(file), source);
  const importPattern = /(?:from\s+|import\s*)['"]([^'"]+)['"]/g;

  for (const match of source.matchAll(importPattern)) {
    const target = localPath(file, match[1]);
    if (!target) continue;

    if (!fileSet.has(target)) {
      failures.push(`${relative(file)} imports missing file ${match[1]}`);
      continue;
    }

    if (relative(file).startsWith('js/') && relative(target).startsWith('js/')) {
      importedRuntimeFiles.add(target);
    }
  }

  const namedImportPattern = /import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/gs;
  for (const match of source.matchAll(namedImportPattern)) {
    const target = localPath(file, match[2]);
    if (!target || !relative(target).startsWith('js/')) continue;

    const names = importedRuntimeNames.get(target) || new Set();
    for (const name of importedNames(match[1])) names.add(name);
    importedRuntimeNames.set(target, names);
  }
}

for (const file of textFiles) {
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/assets\/images\/[^'"\s)]+/g)) {
    referencedAssets.add(normalize(resolve(ROOT, match[0])));
  }
}

const indexPath = join(ROOT, 'index.html');
const index = await readFile(indexPath, 'utf8');
for (const match of index.matchAll(/(?:href|src)="(\.\/[^"?#]+)"/g)) {
  const target = normalize(resolve(ROOT, match[1]));
  if (!fileSet.has(target)) failures.push(`index.html references missing file ${match[1]}`);
}

for (const file of runtimeSources) {
  if (relative(file) !== 'js/app.js' && !importedRuntimeFiles.has(normalize(file))) {
    failures.push(`Unused runtime JavaScript file: ${relative(file)}`);
  }

  const source = runtimeText.get(normalize(file));
  const names = importedRuntimeNames.get(normalize(file)) || new Set();
  const exportPattern = /export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
  for (const match of source.matchAll(exportPattern)) {
    if (!names.has(match[1])) {
      failures.push(`Unused runtime export: ${relative(file)}#${match[1]}`);
    }
  }
}

for (const file of files) {
  if (!relative(file).startsWith('assets/images/')) continue;
  if (!referencedAssets.has(normalize(file))) {
    failures.push(`Unused image asset: ${relative(file)}`);
  }
}

for (const file of files.filter(file => relative(file).startsWith('css/') && extname(file) === '.css')) {
  const ref = `./${relative(file)}`;
  if (!index.includes(`href="${ref}"`)) {
    failures.push(`Unused stylesheet: ${relative(file)}`);
  }
}

if (STORAGE_KEY.includes('_v') || SETTINGS_KEY.includes('_v')) {
  failures.push('Storage keys must describe the current schema without version suffixes.');
}

if (Object.hasOwn(DEFAULT_STATE, 'chapter')) {
  failures.push('DEFAULT_STATE contains derived chapter state.');
}

for (const field of [
  'annotationIndex',
  'annotationCorrect',
  'annotationAnswered',
  'annotationCounts',
  'trainingConfigured'
]) {
  if (Object.hasOwn(DEFAULT_STATE.flags, field)) {
    failures.push(`DEFAULT_STATE contains derived flag: ${field}`);
  }
}

const stateSourcePath = normalize(join(ROOT, 'js/core/state.js'));
const runtimeOutsideState = [...runtimeText.entries()]
  .filter(([file]) => file !== stateSourcePath)
  .map(([, source]) => source)
  .join('\n');

for (const field of Object.keys(DEFAULT_STATE.flags)) {
  const dotRef = new RegExp(`\\.flags\\.${field}\\b`);
  const bracketRef = new RegExp(`\\.flags\\[['\"]${field}['\"]\\]`);
  if (!dotRef.test(runtimeOutsideState) && !bracketRef.test(runtimeOutsideState)) {
    failures.push(`Unused state flag: DEFAULT_STATE.flags.${field}`);
  }
}

for (const file of runtimeSources) {
  const source = runtimeText.get(normalize(file));
  if (source.includes('setChapter')) {
    failures.push(`Manual chapter progress API found in ${relative(file)}.`);
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

const stageMapPath = normalize(join(ROOT, 'js/data/stage-backgrounds.js'));
const transitionText = [...runtimeText.entries()]
  .filter(([file]) => file !== stageMapPath)
  .map(([, source]) => source)
  .join('\n');

for (const scene of registeredScenes) {
  if (scene === 'intro') continue;
  const quotedScene = new RegExp(`['\"]${scene}['\"]`);
  if (!quotedScene.test(transitionText)) {
    failures.push(`Registered scene has no inbound runtime reference: ${scene}`);
  }
}

if (failures.length) {
  console.error('Static integrity check failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`Static integrity check passed across ${textFiles.length} text files and ${registeredScenes.size} routes.`);

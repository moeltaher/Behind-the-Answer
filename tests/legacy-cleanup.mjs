import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const removedPaths = [
  'css/ending.css',
  'assets/images/characters/supervisor.svg'
];
const bannedRuntimeTokens = [
  'persistentFooter',
  'waitingPromptText',
  'finalMessage',
  'computeSel'
];

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory)) {
    const path = join(directory, entry);
    const info = await stat(path);
    if (info.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

for (const relativePath of removedPaths) {
  if (await exists(join(ROOT, relativePath))) failures.push(`removed path returned: ${relativePath}`);
}

const runtimeFiles = [join(ROOT, 'index.html'), ...(await walk(join(ROOT, 'js'))).filter(path => path.endsWith('.js'))];
const runtimeSources = await Promise.all(runtimeFiles.map(async path => [path, await readFile(path, 'utf8')]));
for (const token of bannedRuntimeTokens) {
  for (const [path, source] of runtimeSources) {
    if (source.includes(token)) failures.push(`legacy runtime token ${token} found in ${path.slice(ROOT.length + 1)}`);
  }
}

const actorPath = join(ROOT, 'js/data/supporting-actors.js');
const endingPath = join(ROOT, 'js/scenes/ending.js');
const actorSource = await readFile(actorPath, 'utf8');
const actorObjectMatch = actorSource.match(/const SUPPORTING_ACTORS = \{([\s\S]*?)\n\};/);
const objectBody = actorObjectMatch?.[1] ?? '';
const actorIds = [...objectBody.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*):/gm)].map(match => match[1]);

// A role is live only when gameplay references it. The registry definition itself and
// the ending summary must not be allowed to keep an otherwise dead role alive.
// DATACENTER_WORKERS remains part of the gameplay source because it is the operational
// mapping consumed by the datacenter scene, not a result-only summary.
const actorOperationalSource = actorObjectMatch ? actorSource.replace(actorObjectMatch[0], '') : actorSource;
const gameplaySource = [
  actorOperationalSource,
  ...runtimeSources
    .filter(([path]) => path !== actorPath && path !== endingPath)
    .map(([, source]) => source)
].join('\n');
for (const id of actorIds) {
  if (!new RegExp(`\\b${id}\\b`).test(gameplaySource)) failures.push(`supporting actor registry entry has no in-game reference outside results: ${id}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Legacy cleanup guard passed: ${removedPaths.length} paths, ${bannedRuntimeTokens.length} runtime tokens, ${actorIds.length} supporting actors with in-game references.`);

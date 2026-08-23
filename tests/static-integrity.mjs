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

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const SOURCE_EXTENSIONS=new Set(['.js','.mjs']),TEXT_EXTENSIONS=new Set(['.js','.mjs','.html','.css','.md','.yml','.yaml']);
async function walk(directory){const entries=await readdir(directory),files=[];for(const entry of entries){if(entry==='.git'||entry==='node_modules')continue;const path=join(directory,entry),info=await stat(path);if(info.isDirectory())files.push(...await walk(path));else files.push(path);}return files;}
const relative=path=>path.slice(ROOT.length+1).replaceAll('\\','/');
function localPath(fromFile,specifier){if(!specifier.startsWith('.'))return null;return normalize(resolve(dirname(fromFile),specifier));}
function importedNames(importList){return importList.split(',').map(part=>part.trim()).filter(Boolean).map(part=>part.split(/\s+as\s+/)[0].trim());}
const files=await walk(ROOT),fileSet=new Set(files.map(file=>normalize(file))),textFiles=files.filter(file=>TEXT_EXTENSIONS.has(extname(file))),sourceFiles=files.filter(file=>SOURCE_EXTENSIONS.has(extname(file))),runtimeSources=sourceFiles.filter(file=>relative(file).startsWith('js/')),failures=[],importedRuntimeFiles=new Set(),importedRuntimeNames=new Map(),referencedAssets=new Set(),runtimeText=new Map();
for(const file of sourceFiles){const source=await readFile(file,'utf8');if(relative(file).startsWith('js/'))runtimeText.set(normalize(file),source);for(const match of source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)){const target=localPath(file,match[1]);if(!target)continue;if(!fileSet.has(target)){failures.push(`${relative(file)} imports missing file ${match[1]}`);continue;}if(relative(file).startsWith('js/')&&relative(target).startsWith('js/'))importedRuntimeFiles.add(target);}for(const match of source.matchAll(/import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"]/gs)){const target=localPath(file,match[2]);if(!target||!relative(target).startsWith('js/'))continue;const names=importedRuntimeNames.get(target)||new Set();for(const name of importedNames(match[1]))names.add(name);importedRuntimeNames.set(target,names);}}
for(const file of textFiles){const source=await readFile(file,'utf8');for(const match of source.matchAll(/assets\/images\/[^'"\s)]+/g))referencedAssets.add(normalize(resolve(ROOT,match[0])));}
const htmlFiles=files.filter(file=>extname(file)==='.html');if(htmlFiles.length!==1||relative(htmlFiles[0])!=='index.html')failures.push(`Runtime must have exactly one HTML entry page (index.html); found: ${htmlFiles.map(relative).join(', ')||'none'}.`);
const indexPath=join(ROOT,'index.html'),index=await readFile(indexPath,'utf8');for(const match of index.matchAll(/(?:href|src)="(\.\/[^"?#]+)"/g)){const target=normalize(resolve(ROOT,match[1]));if(!fileSet.has(target))failures.push(`index.html references missing file ${match[1]}`);}
for(const file of runtimeSources){if(relative(file)!=='js/app.js'&&!importedRuntimeFiles.has(normalize(file)))failures.push(`Unused runtime JavaScript file: ${relative(file)}`);const source=runtimeText.get(normalize(file)),names=importedRuntimeNames.get(normalize(file))||new Set();for(const match of source.matchAll(/export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g)){if(!names.has(match[1]))failures.push(`Unused runtime export: ${relative(file)}#${match[1]}`);}}
for(const file of files){if(relative(file).startsWith('assets/images/')&&!referencedAssets.has(normalize(file)))failures.push(`Unused image asset: ${relative(file)}`);}
for(const file of files.filter(file=>relative(file).startsWith('css/')&&extname(file)==='.css')){const ref=`./${relative(file)}`;if(!index.includes(`href="${ref}"`))failures.push(`Unused stylesheet: ${relative(file)}`);}
if(STORAGE_KEY.includes('_v')||SETTINGS_KEY.includes('_v'))failures.push('Storage keys must describe the current schema without version suffixes.');
if(Object.hasOwn(DEFAULT_STATE,'chapter'))failures.push('DEFAULT_STATE contains derived chapter state.');
for(const field of ['annotationIndex','annotationCorrect','annotationAnswered','annotationCounts','trainingConfigured','trainingCompute','tookBreak','dcCoolingRestored'])if(Object.hasOwn(DEFAULT_STATE.flags,field))failures.push(`DEFAULT_STATE contains obsolete or derived flag: ${field}`);

const statePath=normalize(join(ROOT,'js/core/state.js')),storagePath=normalize(join(ROOT,'js/core/storage.js'));
const gameplaySources=[...runtimeText.entries()].filter(([file])=>file!==statePath&&file!==storagePath).map(([,source])=>source).join('\n');
for(const field of Object.keys(DEFAULT_STATE.flags)){
  const anyRef=new RegExp(`\\.${field}\\b`);
  if(!anyRef.test(gameplaySources)){failures.push(`Unused gameplay state flag: DEFAULT_STATE.flags.${field}`);continue;}
  // Strip actual writes only. The negative lookahead prevents === / == comparisons
  // from being mistaken for assignment and producing false write-only warnings.
  const sourceWithoutDirectWrites=gameplaySources.replace(new RegExp(`\\.${field}\\s*(?:=(?!=)|\\+=|-=|\\+\\+|--)`,'g'),'');
  if(!anyRef.test(sourceWithoutDirectWrites))failures.push(`Write-only gameplay state flag: DEFAULT_STATE.flags.${field}`);
}
for(const file of runtimeSources){const source=runtimeText.get(normalize(file));if(source.includes('setChapter'))failures.push(`Manual chapter progress API found in ${relative(file)}.`);}
const domainPath=normalize(join(ROOT,'js/domain/game-rules.js'));for(const [file,source] of runtimeText.entries()){if(file===domainPath)continue;for(const signature of ['function hasUnresolved(','function unresolvedReadyIndices(','function exposedCurrentUnresolvedIndices(','function neededExtraChecks(','function confirmedAnnotations(','function survivableFailures(','const DEPLOY_CAPACITY_LIMITS =','const FAILOVER_INGRESS_LIMITS ='])if(source.includes(signature))failures.push(`Duplicated domain rule outside game-rules.js: ${relative(file)} contains ${signature.trim()}`);}
const bannedRuntimePhrases=['post-training','workflow','restart أو rollback','(gold label)','history-each-time','interface-only','task-status--resumed'];for(const [file,source] of runtimeText.entries())for(const phrase of bannedRuntimePhrases)if(source.includes(phrase))failures.push(`Obsolete or untranslated runtime phrase in ${relative(file)}: ${phrase}`);
const factories=[createIntroRoutes,createMiningRoutes,createFactoryRoutes,createDatacenterRoutes,createDataRoutes,createAnnotationRoutes,createTrainingRoutes,createEvaluationRoutes,createDeploymentRoutes,createEndingRoutes],registeredScenes=new Set(factories.flatMap(factory=>Object.keys(factory({})))),mappedScenes=Object.values(SCENES_BY_STAGE).flat(),mappedSet=new Set(mappedScenes);
if(mappedScenes.length!==mappedSet.size)failures.push('SCENES_BY_STAGE contains duplicate scene ids.');for(const scene of mappedSet)if(!registeredScenes.has(scene))failures.push(`Mapped scene has no registered route: ${scene}`);for(const scene of registeredScenes)if(!mappedSet.has(scene))failures.push(`Registered route has no stage mapping: ${scene}`);
const stageMapPath=normalize(join(ROOT,'js/data/stage-backgrounds.js')),transitionText=[...runtimeText.entries()].filter(([file])=>file!==stageMapPath).map(([,source])=>source).join('\n');for(const scene of registeredScenes){if(scene==='intro')continue;const quotedScene=new RegExp(`['\"]${scene}['\"]`);if(!quotedScene.test(transitionText))failures.push(`Registered scene has no inbound runtime reference: ${scene}`);}
if(failures.length){console.error('Static integrity check failed:\n- '+failures.join('\n- '));process.exit(1);}console.log(`Static integrity check passed across ${textFiles.length} text files and ${registeredScenes.size} routes, with one-page, state-liveness and legacy guards.`);

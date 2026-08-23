import { access, readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const removedPaths=['css/ending.css','assets/images/characters/supervisor.svg'];
const bannedRuntimeTokens=['persistentFooter','waitingPromptText','finalMessage','computeSel','.flags.tookBreak','.flags.dcCoolingRestored','task-status--resumed','dataFollowup.reason'];
async function exists(path){try{await access(path);return true;}catch{return false;}}
async function walk(directory){const files=[];for(const entry of await readdir(directory)){const path=join(directory,entry),info=await stat(path);if(info.isDirectory())files.push(...await walk(path));else files.push(path);}return files;}
for(const relativePath of removedPaths)if(await exists(join(ROOT,relativePath)))failures.push(`removed path returned: ${relativePath}`);
const runtimeFiles=[join(ROOT,'index.html'),...(await walk(join(ROOT,'js'))).filter(path=>path.endsWith('.js'))],runtimeSources=await Promise.all(runtimeFiles.map(async path=>[path,await readFile(path,'utf8')]));
for(const token of bannedRuntimeTokens)for(const [path,source] of runtimeSources)if(source.includes(token))failures.push(`legacy runtime token ${token} found in ${path.slice(ROOT.length+1)}`);
const actorPath=join(ROOT,'js/data/supporting-actors.js'),endingPath=join(ROOT,'js/scenes/ending.js'),actorSource=await readFile(actorPath,'utf8'),actorObjectMatch=actorSource.match(/const SUPPORTING_ACTORS = \{([\s\S]*?)\n\};/),objectBody=actorObjectMatch?.[1]??'',actorIds=[...objectBody.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*):/gm)].map(match=>match[1]),actorOperationalSource=actorObjectMatch?actorSource.replace(actorObjectMatch[0],''):actorSource,gameplaySource=[actorOperationalSource,...runtimeSources.filter(([path])=>path!==actorPath&&path!==endingPath).map(([,source])=>source)].join('\n');
for(const id of actorIds)if(!new RegExp(`\\b${id}\\b`).test(gameplaySource))failures.push(`supporting actor registry entry has no in-game reference outside results: ${id}`);
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log(`Legacy cleanup guard passed: ${removedPaths.length} removed paths, ${bannedRuntimeTokens.length} banned runtime tokens, ${actorIds.length} live supporting actors.`);

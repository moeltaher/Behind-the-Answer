import { DEFAULT_STATE, clone, escapeHtml as h, replaceObjectContents } from './core/state.js';
import { loadState, saveState as persistState, loadSettings, saveSettings } from './core/storage.js';
import { addDecision as recordDecision } from './core/decisions.js';
import { tone as playTone } from './core/audio.js';
import { applySettings } from './core/accessibility.js';
import { addLedger as recordLedger, renderLedger as drawLedger } from './core/ledger.js';
import { createRouter } from './core/router.js';
import { CHAPTERS } from './data/chapters.js';
import { DEMO_PROMPT } from './data/story.js';
import { characterForScene } from './data/characters.js';
import { backdropForScene, stageForScene } from './data/stage-backgrounds.js';
import { monitorTile } from './components/hud.js';
import { renderJourneyProgress, chapterIntro as drawChapterIntro } from './components/progress.js';
import { abstraction as drawAbstraction } from './components/abstraction.js';
import { bindDialogs } from './components/dialogs.js';
import { characterCard } from './components/character-card.js';
import { sceneGuidance } from './components/scene-guidance.js';
import { createIntroRoutes } from './scenes/intro.js';
import { createMiningRoutes } from './scenes/mining.js';
import { createFactoryRoutes } from './scenes/factory.js';
import { createDatacenterRoutes } from './scenes/datacenter.js';
import { createDataRoutes } from './scenes/data.js';
import { createAnnotationRoutes } from './scenes/annotation.js';
import { createTrainingRoutes } from './scenes/training.js';
import { createEvaluationRoutes } from './scenes/evaluation.js';
import { createDeploymentRoutes } from './scenes/deployment.js';
import { createEndingRoutes } from './scenes/ending.js';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const sceneEl=$('#scene');
const stageBackdrop=$('#stageBackdrop');
const progressEl=$('#journeyProgress');
const progressFill=$('#progressFill');
const chapterLabel=$('#chapterLabel');
const chapterTitle=$('#chapterTitle');
const ledgerBtn=$('#ledgerBtn');
const promptBtn=$('#promptBtn');
const promptDialog=$('#promptDialog');
const ledgerDialog=$('#ledgerDialog');
const ledgerContent=$('#ledgerContent');
const settingsDialog=$('#settingsDialog');
const confirmResetDialog=$('#confirmResetDialog');
const persistentFooter=$('#persistentFooter');
const waitingPromptText=$('#waitingPromptText');

const state=loadState(DEFAULT_STATE);
const settings=loadSettings();
function saveState(){ persistState(state); }
function addDecision(id,label,effectText){ recordDecision(state,id,label,effectText); saveState(); }
function addLedger(chapter,human,work,system,details=''){ recordLedger(state,chapter,human,work,system,details); saveState(); }
function renderLedger(){ drawLedger(state,CHAPTERS,ledgerContent); }
function tone(frequency=440,duration=.06,type='sine'){ playTone(settings,frequency,duration,type); }
function updateBackdrop(){
  const backdrop=backdropForScene(state.scene);
  if(!backdrop){
    stageBackdrop.style.removeProperty('--stage-image');
    stageBackdrop.dataset.stage='';
    delete document.body.dataset.stage;
    return;
  }
  stageBackdrop.style.setProperty('--stage-image',`url("${backdrop.image}")`);
  stageBackdrop.dataset.stage=backdrop.group;
  document.body.dataset.stage=backdrop.group;
}

const ctx={ $, $$, state, settings, h, chapters:CHAPTERS, progressEl, progressFill, chapterLabel, chapterTitle, ledgerBtn, promptBtn, promptDialog, ledgerDialog, ledgerContent, settingsDialog, confirmResetDialog, persistentFooter, saveState, addDecision, addLedger, renderLedger, tone, monitorTile };
const router=createRouter({state,settings,sceneEl,save:saveState,tone});
const PRE_JOURNEY_SCENES=new Set(['intro','zoomOut']);
function currentChapterIndex(){ if(PRE_JOURNEY_SCENES.has(state.scene))return-1; const stage=stageForScene(state.scene); return CHAPTERS.findIndex(chapter=>chapter.key===stage); }
function sceneHtml(content){ const index=currentChapterIndex(); renderJourneyProgress(ctx,index); promptBtn.hidden=index<0; persistentFooter.hidden=true; updateBackdrop(); const character=characterForScene(state.scene); const guidance=sceneGuidance(state.scene,state); router.html(`${characterCard(character)}${guidance}${content}`); }
Object.assign(ctx,{html:sceneHtml,bind:router.bind,go:router.go});
ctx.chapterIntro=(index,next)=>drawChapterIntro(ctx,index,next);
ctx.abstraction=(humans,word,line,next)=>drawAbstraction(ctx,humans,word,line,next);
ctx.resetGame=(goToIntro=false)=>{ replaceObjectContents(state,clone(DEFAULT_STATE)); saveState(); ledgerContent.innerHTML=''; ledgerDialog.close(); settingsDialog.close(); confirmResetDialog.close(); if(promptDialog.open)promptDialog.close(); if(goToIntro)router.go('intro'); else router.render(); };
[
  createIntroRoutes,createMiningRoutes,createFactoryRoutes,createDatacenterRoutes,createDataRoutes,
  createAnnotationRoutes,createTrainingRoutes,createEvaluationRoutes,createDeploymentRoutes,createEndingRoutes
].forEach(createRoutes=>router.register(createRoutes(ctx)));
if(!router.routes[state.scene]){ state.scene='intro'; saveState(); }
bindDialogs(ctx);
for(const id of ['reduceMotion','highContrast','largeText','soundOn']){ $(`#${id}`).addEventListener('change',event=>{ settings[id]=event.target.checked; saveSettings(settings); applySettings(settings); }); }
if(waitingPromptText)waitingPromptText.textContent=`«${DEMO_PROMPT}»`;
applySettings(settings); updateBackdrop(); router.render();

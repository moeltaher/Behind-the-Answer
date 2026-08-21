import {
  DATA_ITEMS,
  ANNOTATION_TASKS,
  EVAL_TASKS,
  SUPPORT_TASKS
} from '../data/content-tasks.js';
import { stageForScene } from '../data/stage-backgrounds.js';
import { STAGE_TASKS } from '../data/stage-tasks.js';
import { taskPanel } from './task-flow.js';

const NO_GUIDANCE_SCENES = new Set([
  'mineOrientation','mineInspection','mineEnd','transportMontage','abstract1',
  'factoryOrientation','factoryOutcome','abstract2','hardwareMontage',
  'dcCoolingOutcome','abstract3',
  'dataCleanSummary','abstract4',
  'annotationIntro','annotationReview','annotationEnd','abstract5',
  'trainingEval',
  'safetyOutcome','launchOutcome','abstract7',
  'onCall','deployEnd','abstract8',
  'pipelineAssemble','aiAbstraction','finalAnswer','timelineReveal','peopleReveal','results','finalMessage','methodology'
]);

function annotationRejected(state) {
  return state.flags.annotationResults.some(result => !result.acceptedAsReasonable);
}

function statusFor(scene, state) {
  if (scene === 'mineTask' && state.flags.miningWarning) return 'decision';
  if (scene === 'factoryIncident' || scene === 'dcCooling' || scene === 'trainingRun' || scene === 'launchDecision') return 'decision';
  if (scene === 'annotationReview' && annotationRejected(state)) return 'decision';
  if (scene === 'deployIncident' && state.flags.deployTabs.length === 3) return 'decision';
  return 'active';
}

function progressFor(stage, state, scene) {
  switch (stage) {
    case 'mining': return `الحصة: ${state.flags.miningCount}/12 وحدة`;
    case 'factory': return scene === 'factoryIncident' ? 'تجاوز حد الجسيمات: قرار مطلوب' : 'الدفعة قيد المراقبة';
    case 'datacenter':
      if (scene === 'dcWorkers') return `الأدوار المطلوبة: ${Math.min(state.flags.revealedWorkers.length, 3)}/3`;
      if (scene === 'dcCooling') return 'اختبار المجموعة: قرار تبريد مطلوب';
      return `تركيب الخادم: ${state.flags.serverSteps.length}/4`;
    case 'data':
      if (scene === 'dataOrigins') return `مصادر مطلوبة: ${Math.min(state.flags.dataOrigins.length, 3)}/3`;
      return `مراجعة الدفعة: ${state.flags.dataIndex}/${DATA_ITEMS.length}`;
    case 'annotation': return `المهام: ${state.flags.annotationResults.length}/${ANNOTATION_TASKS.length}`;
    case 'training': return scene === 'trainingRun' ? `العطل عند 35% — ${state.flags.trainingCompute} مجموعات مخصصة` : 'إعداد السعة ونقطة الحفظ';
    case 'evaluation':
      if (scene === 'safetyTest') return 'اختبار سلامة يمر عبر بوابة إصلاح قبل الإطلاق';
      if (scene === 'launchDecision') return 'قرار الجاهزية بعد إصلاح خلل السلامة';
      return `مهام التقييم: ${Math.min(state.flags.evalIndex, EVAL_TASKS.length)}/${EVAL_TASKS.length}`;
    case 'deployment':
      if (scene === 'deployIncident') return `التشخيص: ${state.flags.deployTabs.length}/3 أقسام`;
      if (scene === 'supportTask') return `بلاغات الحادث: ${state.flags.supportIndex}/${SUPPORT_TASKS.length}`;
      return 'وزّع 100% من الحمل مع احترام السعات وترك هامش تشغيل';
    default: return '';
  }
}

export function sceneGuidance(scene, state) {
  if (scene.startsWith('intro') || scene.startsWith('ch') || NO_GUIDANCE_SCENES.has(scene)) return '';
  const stage = stageForScene(scene);
  const task = STAGE_TASKS[stage];
  if (!task) return '';
  return taskPanel(task, { status: statusFor(scene, state), progress: progressFor(stage, state, scene), compact: true });
}

import {
  DATA_ITEMS,
  ANNOTATION_TASKS,
  EVAL_TASKS,
  SUPPORT_TASKS
} from '../data/content-tasks.js';
import { stageForScene } from '../data/stage-backgrounds.js';
import { STAGE_TASKS } from '../data/stage-tasks.js';
import { taskPanel } from './task-flow.js';

const COMPLETE_SCENES = new Set([
  'mineEnd', 'abstract1',
  'factoryOutcome', 'abstract2',
  'abstract3',
  'dataCleanSummary', 'abstract4',
  'annotationEnd', 'abstract5',
  'trainingEval',
  'launchOutcome', 'abstract7',
  'deployEnd', 'abstract8',
  'results', 'finalMessage'
]);

const RESUMED_SCENES = new Set(['mineInspection', 'onCall', 'safetyOutcome']);

function annotationRejected(state) {
  return state.flags.annotationResults.some(result => !result.acceptedAsReasonable);
}

function statusFor(scene, state) {
  if (COMPLETE_SCENES.has(scene)) return 'complete';
  if (scene === 'mineTask' && state.flags.miningWarning) return 'decision';
  if (scene === 'factoryIncident' || scene === 'dcCooling' || scene === 'trainingRun' || scene === 'launchDecision') {
    return 'decision';
  }
  if (scene === 'annotationReview' && annotationRejected(state)) return 'decision';
  if (scene === 'deployIncident' && state.flags.deployTabs.length === 3) return 'decision';
  if (RESUMED_SCENES.has(scene)) return 'resumed';
  return 'active';
}

function progressFor(stage, state, scene) {
  switch (stage) {
    case 'mining':
      return `الحصة: ${state.flags.miningCount}/12 وحدة`;
    case 'factory':
      if (state.flags.factoryChoice) return 'قرار الجودة اتُخذ';
      if (scene === 'factoryMonitor' || scene === 'factoryIncident') return 'الدفعة قيد المراقبة';
      return `التجهيز: ${state.flags.factoryPPE.length}/4`;
    case 'datacenter':
      if (scene === 'dcWorkers') return `الأدوار المطلوبة: ${Math.min(state.flags.revealedWorkers.length, 3)}/3`;
      if (scene === 'dcCooling') return 'اختبار المجموعة: قرار تبريد مطلوب';
      return `تركيب الخادم: ${state.flags.serverSteps.length}/4`;
    case 'data':
      if (scene === 'dataOrigins') return `مصادر استُكشفت: ${state.flags.dataOrigins.length}`;
      return `مراجعة الدفعة: ${state.flags.dataIndex}/${DATA_ITEMS.length}`;
    case 'annotation':
      if (scene === 'annotationReview') return 'الوردية أُرسلت للمراجعة';
      return `المهام: ${state.flags.annotationResults.length}/${ANNOTATION_TASKS.length}`;
    case 'training':
      if (state.flags.trainingIncidentChoice) return 'جولة التدريب مكتملة';
      return scene === 'trainingRun' ? 'جولة التدريب: 35%' : 'إعداد الجولة';
    case 'evaluation':
      if (scene === 'safetyTest' || scene === 'safetyOutcome') return 'اختبار السلامة';
      if (scene === 'launchDecision' || scene === 'launchOutcome') return 'قرار الجاهزية للإطلاق';
      return `مقارنات الإجابات: ${Math.min(state.flags.evalIndex, EVAL_TASKS.length)}/${EVAL_TASKS.length}`;
    case 'deployment':
      if (scene === 'deployIncident') return `التشخيص: ${state.flags.deployTabs.length}/3 أقسام`;
      if (scene === 'supportTask') return `بلاغات الحادث: ${state.flags.supportIndex}/${SUPPORT_TASKS.length}`;
      if (scene === 'onCall') return 'الخدمة عادت؛ متابعة أثر الحادث';
      return 'اختبار توزيع الحمل';
    case 'ending':
      return 'اربط الواجهة بالسلسلة التي سبقتها';
    default:
      return '';
  }
}

export function sceneGuidance(scene, state) {
  if (scene.startsWith('intro') || scene.startsWith('ch')) return '';

  const stage = stageForScene(scene);
  const task = STAGE_TASKS[stage];
  if (!task) return '';

  return taskPanel(task, {
    status: statusFor(scene, state),
    progress: progressFor(stage, state, scene),
    compact: true
  });
}

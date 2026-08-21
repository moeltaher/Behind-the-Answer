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
  'mineOrientation','mineInspection','mineEnd','abstract1',
  'factoryOrientation','factoryOutcome','abstract2',
  'dcCoolingOutcome','dcWorkers','abstract3',
  'dataFollowup','dataCleanSummary','abstract4',
  'annotationIntro','annotationReview','annotationEnd','abstract5',
  'trainingEval','abstract6',
  'safetyOutcome','safetyRetest','launchOutcome','abstract7',
  'onCall','deployEnd','abstract8',
  'pipelineAssemble','transferChallenge','finalAnswer','results','finalMessage'
]);

function statusFor(scene, state) {
  if (scene === 'mineTask' && state.flags.miningWarning) return 'decision';
  if (scene === 'factoryIncident' || scene === 'dcCooling' || scene === 'trainingRun' || scene === 'launchDecision') return 'decision';
  if (scene === 'deployIncident' && state.flags.deployTabs.length === 3) return 'decision';
  return 'active';
}

function progressFor(stage, state, scene) {
  switch (stage) {
    case 'mining': return `الحصة: ${state.flags.miningCount}/12 — الوقت: ${state.flags.miningMinutes}/72 دقيقة`;
    case 'factory': return scene === 'factoryIncident' ? 'تجاوز حد الجسيمات: قرار مطلوب' : 'الدفعة قيد المراقبة';
    case 'datacenter':
      if (scene === 'dcCooling') return 'اختبار المجموعة: قرار تبريد مطلوب';
      return `تركيب الخادم: ${state.flags.serverSteps.length}/4`;
    case 'data': {
      const passed=state.flags.dataStatuses.filter(status=>status==='ready').length;
      const pending=state.flags.dataStatuses.filter(status=>status==='pending').length;
      if (scene === 'dataOrigins') return `استكشاف اختياري: فتحت ${state.flags.dataOrigins.length} مصدرًا`;
      return `مراجعة الدفعة: ${state.flags.dataIndex}/${DATA_ITEMS.length} — مرّت ${passed} / معلقة ${pending}`;
    }
    case 'annotation': return `المهام: ${state.flags.annotationResults.length}/${ANNOTATION_TASKS.length} — وقت غير مدفوع: ${state.flags.annotationUnpaidMinutes} دقيقة`;
    case 'training': return scene === 'trainingRun' ? `العطل عند 35% — ${state.flags.trainingCompute} مجموعات حوسبة مخصصة` : 'إعداد تكلفة الحوسبة ونقطة الحفظ';
    case 'evaluation':
      if (scene === 'safetyTest') return 'اختبار سلامة → إصلاح → إعادة اختبار إلزامية';
      if (scene === 'launchDecision') return 'بوابات إصدار أساسية + أعمال إضافية سببية إن وجدت';
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

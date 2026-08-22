import { DATA_ITEMS, ANNOTATION_TASKS, EVAL_TASKS, SUPPORT_TASKS } from '../data/content-tasks.js';
import { stageForScene } from '../data/stage-backgrounds.js';
import { STAGE_TASKS } from '../data/stage-tasks.js';
import { taskPanel } from './task-flow.js';

const SPECIAL_TASKS = {
  intro: { title:'ابدأ من الطلب الذي يبدو بسيطًا', how:'أرسل الطلب التجريبي ثم اتبع ما تكشفه اللعبة خلف الواجهة.', done:'عندما تبدأ الرحلة وتنتقل من شاشة المستخدم إلى السلسلة التي تقف خلف الإجابة.', constraint:'الطلب ثابت حتى يمكن مقارنة ما يراه المستخدم بما يتطلبه النظام خلفه.' },
  zoomOut: { title:'اخرج من الواجهة إلى سلسلة العمل والبنية', how:'تابع الانتقال الذي يكشف أن الإجابة لا تبدأ لحظة الضغط على إرسال.', done:'عندما تظهر أول مرحلة من مراحل الرحلة.', constraint:'هذا انتقال تعليمي، وليس ادعاءً بأن كل عناصر السلسلة تحدث عند كل طلب.' },
  pipelineAssemble: { title:'أعد تركيب ما لعبته في ثلاثة أزمنة مختلفة', how:'ميّز بين ما بُني تاريخيًا، ودورة التطوير المتكررة، والتشغيل المستمر.', done:'عندما تصبح مستعدًا لتطبيق الفكرة على منتج مختلف.', constraint:'ترتيب اللعب ليس مخططًا هندسيًا زمنيًا للنظام.' },
  transferChallenge: { title:'انقل الفكرة إلى خدمة RAG مختلفة', how:'صنّف كل عنصر إلى: بُني قبل الطلب، يحدث مع الطلب الحالي، أو تشغيل مستمر.', done:'عندما تصنف العناصر الخمسة وفق زمنها الصحيح.', constraint:'لا تحفظ ترتيب اللعبة؛ طبّق المعيار السببي على منتج آخر.' },
  finalAnswer: { title:'قارن الإجابة النهائية بما أصبح مرئيًا خلفها', how:'راجع الفرق بين الطلب الحالي وبين العمل والبنية اللذين سبقا الطلب أو يستمران أثناء التشغيل.', done:'عندما تنتقل إلى نتائج رحلتك وسجل القرارات.', constraint:'الإجابة المعروضة لا تزعم أن كل العمل السابق يتكرر مع كل ضغطة إرسال.' },
  results: { title:'راجع آثار قراراتك وسجل العمل الكامل', how:'اقرأ النتائج حسب محاورها، وراجع lineage البيانات وسجل القرارات بدل اختزالها في درجة واحدة.', done:'عندما تنتهي من مراجعة ما حدث عبر الرحلة والنسخ المرشحة.', constraint:'لا تجمع اللعبة الحقوق والجودة والعمل والموثوقية في رقم كلي واحد.' },
  finalMessage: { title:'أغلق الرحلة مع الاحتفاظ بالفكرة الأساسية', how:'راجع الرسالة الختامية أو ابدأ رحلة جديدة إذا أردت اختبار مسار مختلف.', done:'عندما تقرر إنهاء الجلسة أو إعادة اللعب.', constraint:'الهدف هو فهم البنية والعمل والقرارات خلف الواجهة، لا الوصول إلى نتيجة مثالية واحدة.' }
};

const CHAPTER_TASK = /^ch(\d+)Intro$/;
const ABSTRACT_TASK = /^abstract(\d+)$/;

function stageTaskFromNumber(number) {
  const keys=['mining','factory','datacenter','data','annotation','training','evaluation','deployment'];
  return STAGE_TASKS[keys[number-1]] || null;
}

function taskFor(scene) {
  if(SPECIAL_TASKS[scene]) return SPECIAL_TASKS[scene];
  const chapter=scene.match(CHAPTER_TASK);
  if(chapter) return stageTaskFromNumber(Number(chapter[1]));
  const abstract=scene.match(ABSTRACT_TASK);
  if(abstract) return stageTaskFromNumber(Number(abstract[1]));
  const stage=stageForScene(scene);
  return STAGE_TASKS[stage] || {
    title:'أكمل الخطوة الحالية قبل الانتقال',
    how:'نفّذ الإجراء الظاهر في هذا المشهد وراجع أثره قبل المتابعة.',
    done:'عندما يظهر أثر الخطوة ويصبح الانتقال التالي متاحًا.',
    constraint:'لا تعتبر أي عمل مكتملًا قبل أن تنفذه أو تعرض اللعبة إغلاقه صراحة.'
  };
}

function statusFor(scene, state) {
  if (scene === 'mineTask' && state.flags.miningWarning) return 'decision';
  if (scene === 'factoryIncident' || scene === 'dcCooling' || scene === 'trainingRun' || scene === 'launchDecision') return 'decision';
  if (scene === 'checkpointEval' && !state.flags.checkpointEvalComplete) return 'decision';
  if (scene === 'safetyOutcome' || scene === 'safetyRetest' || scene === 'dataFollowup' || scene === 'annotationReview' || scene === 'transferChallenge') return 'decision';
  if (scene === 'deployIncident' && state.flags.deployTabs.length === 3) return 'decision';
  if (scene === 'results' || scene === 'finalMessage') return 'complete';
  return 'active';
}

function progressFor(stage, state, scene) {
  switch (stage) {
    case 'mining': return `الحصة: ${state.flags.miningCount}/12 — الوقت: ${state.flags.miningMinutes}/72 دقيقة`;
    case 'factory': return scene === 'factoryIncident' ? 'تجاوز حد الجسيمات: قرار مطلوب' : 'الدفعة قيد المراقبة';
    case 'datacenter': return scene === 'dcCooling' ? 'اختبار المجموعة: قرار تبريد مطلوب' : `تركيب الخادم: ${state.flags.serverSteps.length}/4`;
    case 'data': {
      const passed=state.flags.dataStatuses.filter(status=>status==='ready').length;
      const pending=state.flags.dataStatuses.filter(status=>status==='pending').length;
      if(scene==='dataOrigins') return `استكشاف اختياري: فتحت ${state.flags.dataOrigins.length} مصدرًا`;
      return `مراجعة الدفعة: ${state.flags.dataIndex}/${DATA_ITEMS.length} — مرّت ${passed} / معلقة ${pending}`;
    }
    case 'annotation': return `المهام: ${state.flags.annotationResults.length}/${ANNOTATION_TASKS.length} — وقت غير مدفوع: ${state.flags.annotationUnpaidMinutes} دقيقة`;
    case 'training': {
      const unresolved=state.flags.dataStatuses.flatMap((status,index)=>status==='ready'&&state.flags.dataChecks[index]&&Object.values(state.flags.dataChecks[index]).includes('unresolved')?[index]:[]);
      const reviewed=new Set([...state.flags.dataTrainingApproved,...state.flags.dataTrainingHeld]);
      const reviewedUnresolved=unresolved.filter(index=>reviewed.has(index)).length;
      if(scene==='trainingRun') return `revision ${state.flags.candidateRevision} — العطل عند 35% — ${state.flags.trainingCompute} مجموعات مخصصة`;
      if(scene==='trainingEval') return `revision ${state.flags.candidateRevision} — جولة post-training مكتملة`;
      return unresolved.length ? `أهلية البيانات: ${reviewedUnresolved}/${unresolved.length} مواد غير محسومة حُسم قرار دخولها` : 'أهلية البيانات مكتملة — اختر الحوسبة ونقطة الحفظ';
    }
    case 'evaluation':
      if(scene==='checkpointEval') return state.flags.checkpointEvalComplete?'تقييم checkpoint مكتمل':'تقييم checkpoint: 3 مقارنات مطلوبة';
      if(scene==='safetyTest'||scene==='safetyOutcome'||scene==='safetyRetest') return `revision ${state.flags.candidateRevision} — اختبار سلامة → إصلاح → إعادة اختبار`;
      if(scene==='launchDecision'||scene==='launchOutcome') return `revision ${state.flags.candidateRevision} — بوابات الإصدار: ${state.flags.releaseGates.length}/4`;
      return `مهام التقييم: ${Math.min(state.flags.evalIndex,EVAL_TASKS.length)}/${EVAL_TASKS.length}`;
    case 'deployment':
      if(scene==='deployLoad'&&state.flags.deferredExtraChecks.length) return `فحوص المراقبة المغلقة: ${state.flags.monitoringChecksCompleted.length}/${state.flags.deferredExtraChecks.length}`;
      if(scene==='deployLoad'&&state.flags.deployLoad) return `اختبار N‑1: ${state.flags.deployFailoverChecks.length}/3 حالات خروج`;
      if(scene==='deployIncident') return `التشخيص: ${state.flags.deployTabs.length}/3 أقسام`;
      if(scene==='supportTask') return `بلاغات الحادث: ${state.flags.supportIndex}/${SUPPORT_TASKS.length}`;
      return 'وزّع 100% من الحمل ضمن السعات ثم اختبر حالات الخروج';
    default: return '';
  }
}

export function sceneGuidance(scene, state) {
  const task=taskFor(scene);
  const stage=stageForScene(scene);
  let progress=progressFor(stage,state,scene);
  if(scene==='transferChallenge') progress=state.flags.transferChoice==='build-use'?'التصنيف مكتمل':'5 عناصر تحتاج تصنيفًا';
  if(scene==='pipelineAssemble') progress='حوّل ترتيب اللعب إلى: بناء تاريخي / تطوير متكرر / تشغيل مستمر';
  if(scene==='finalAnswer') progress='عد إلى الطلب الأصلي وافصل ما يحدث الآن عما بُني سابقًا';
  if(scene==='results') progress=`revision الحالية: ${state.flags.candidateRevision} — قرارات مسجلة: ${state.decisions.length}`;
  return taskPanel(task,{status:statusFor(scene,state),progress,compact:true});
}

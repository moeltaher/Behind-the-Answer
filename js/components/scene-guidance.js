import {
  DATA_ITEMS,
  ANNOTATION_TASKS,
  EVAL_TASKS,
  SUPPORT_TASKS
} from '../data/content-tasks.js';
import { stageForScene } from '../data/stage-backgrounds.js';
import { STAGE_TASKS } from '../data/stage-tasks.js';
import { supportingRoleStrip } from './supporting-role-strip.js';
import { taskPanel, causalDecision, choiceRequirement } from './task-flow.js';

const NO_TASK_GUIDANCE_SCENES = new Set([
  'mineEnd','abstract1',
  'factoryOutcome','abstract2',
  'dcCoolingOutcome','dcWorkers','abstract3',
  'dataCleanSummary','abstract4',
  'annotationEnd','abstract5',
  'trainingEval','abstract6',
  'safetyOutcome','launchOutcome','abstract7',
  'deployEnd','abstract8',
  'pipelineAssemble','finalAnswer','results','finalMessage'
]);

function annotationRejected(state) {
  return state.flags.annotationResults.filter(result => result.reviewRejected || !result.acceptedAsReasonable).length;
}

function hasLaunchVerification(state) {
  return state.flags.trainingCheckpoint === 'recent'
    || (state.flags.trainingCompute === '8' && state.flags.trainingIncidentChoice === 'continue');
}

function statusFor(scene, state) {
  if (scene === 'mineTask' && state.flags.miningWarning) return 'decision';
  if (['factoryIncident','dcCooling','dataClean','dataFollowup','annotationTask','trainingRun','evalTask','safetyTest','supportTask'].includes(scene)) return 'decision';
  if (scene === 'annotationReview' && annotationRejected(state)) return 'decision';
  if (scene === 'launchDecision') return hasLaunchVerification(state) ? 'decision' : 'resumed';
  if (scene === 'deployIncident' && state.flags.deployTabs.length === 3) return 'decision';
  if (['mineInspection','safetyRetest','onCall'].includes(scene)) return 'resumed';
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
      const ready=state.flags.dataStatuses.filter(status=>status==='ready').length;
      const pending=state.flags.dataStatuses.filter(status=>status==='pending').length;
      if (scene === 'dataOrigins') return `استكشاف اختياري: فتحت ${state.flags.dataOrigins.length} مصدرًا`;
      if (scene === 'dataFollowup') return 'المراجعة حسمت الحقوق وبقي قرار الخصوصية';
      return `مراجعة الدفعة: ${state.flags.dataIndex}/${DATA_ITEMS.length} — جاهز ${ready} / معلق ${pending}`;
    }
    case 'annotation': return `المهام: ${state.flags.annotationResults.length}/${ANNOTATION_TASKS.length} — وقت غير مدفوع: ${state.flags.annotationUnpaidMinutes} دقيقة`;
    case 'training': return scene === 'trainingRun' ? `العطل عند 35% — ${state.flags.trainingCompute} مجموعات حوسبة مخصصة` : 'إعداد تكلفة الحوسبة ونقطة الحفظ';
    case 'evaluation':
      if (scene === 'safetyTest') return 'اختبار سلامة → إصلاح → إعادة اختبار إلزامية';
      if (scene === 'safetyRetest') return 'الإصلاح اكتمل — ثبّت نتيجة إعادة الاختبار قبل الجاهزية';
      if (scene === 'launchDecision') return 'قرار الجاهزية بعد اجتياز إعادة اختبار السلامة';
      return `مهام التقييم: ${Math.min(state.flags.evalIndex, EVAL_TASKS.length)}/${EVAL_TASKS.length}`;
    case 'deployment':
      if (scene === 'deployIncident') return `التشخيص: ${state.flags.deployTabs.length}/3 أقسام`;
      if (scene === 'supportTask') return `بلاغات الحادث: ${state.flags.supportIndex}/${SUPPORT_TASKS.length}`;
      if (scene === 'onCall') return 'الخدمة عادت — انتقل إلى أثر الحادث على المستخدمين';
      return 'وزّع 100% من الحمل مع احترام السعات وترك هامش تشغيل';
    default: return '';
  }
}

function supportingRoles(scene, state) {
  const roles = {
    mineOrientation: ['supervisor'],
    mineTask: state.flags.miningWarning ? ['coworker','supervisor'] : ['supervisor','coworker'],
    mineInspection: ['maintenance','supervisor'],
    factoryOrientation: ['maintenance','qualityInspector'],
    factoryMonitor: ['qualityInspector'],
    factoryIncident: ['maintenance','qualityInspector'],
    dcInstall: ['electricalEngineer','networkOperator'],
    dcCooling: ['coolingTech'],
    dataOrigins: ['contentCreators'],
    dataClean: ['contentCreators'],
    dataFollowup: ['dataReviewer'],
    annotationIntro: ['dataReviewer'],
    trainingSetup: ['infraTeam'],
    deployLoad: ['operationsTeam']
  }[scene] || [];
  return roles.length ? supportingRoleStrip(roles, 'أشخاص وأدوار مرتبطة بهذه الخطوة') : '';
}

function causalGuidance(scene, state) {
  if (scene === 'mineTask' && state.flags.miningWarning) {
    return causalDecision({
      action: 'كررت العمل في القطاع ب الأسرع حتى ظهر التحذير أثناء الوردية.',
      event: 'سُجل اهتزاز غير معتاد في القطاع ب، ولذلك توقفت المهمة العادية.',
      decision: 'أغلق القطاع للفحص أو اتركه مفتوحًا ثم واصل الحصة.',
      note: 'اختيار القطاع ب لا يعني أنك سببت الخطر؛ لكنه وضعك أمام التحذير الذي ظهر أثناء تنفيذ العمل.'
    });
  }
  if (scene === 'factoryIncident') {
    return causalDecision({
      action: 'بدأت مراقبة الدفعة التالية بعد قراءة أولية ضمن النطاق.',
      event: 'ارتفع مؤشر الجسيمات من 18 إلى 49 وتجاوز الحد التحذيري 40.',
      decision: 'أوقف الخط للتحقيق أو أكمل الدفعة مع تشديد الفحص النهائي.',
      note: 'المراقبة كشفت التجاوز؛ لم تتسبب فيه. القرار ظهر لأن الحد تغير أثناء تنفيذ المهمة.'
    });
  }
  if (scene === 'dcCooling') {
    return causalDecision({
      action: 'أكملت خطوات تركيب الخادم وشغلت اختبار المجموعة.',
      event: 'أثناء الاختبار لم تعد وحدة التبريد رقم 3 تستجيب.',
      decision: 'انقل مهام الاختبار إلى سعة سليمة أو أوقف الاختبار حتى الإصلاح.'
    });
  }
  if (scene === 'dataFollowup') {
    return causalDecision({
      action: 'أوقفت المادة للمراجعة بدل تمريرها مباشرة.',
      event: 'حسمت المراجعة حق الاستخدام، لكنها كشفت أن بيانات اتصال غير لازمة ما زالت داخل المادة.',
      decision: 'نقّح بيانات الاتصال أو احتفظ بالمادة كما هي.',
      note: 'ظهرت هذه الخيارات بسبب نتيجة المراجعة السابقة؛ لم تكن موجودة قبل حسم حق الاستخدام.'
    });
  }
  if (scene === 'annotationReview' && annotationRejected(state)) {
    return causalDecision({
      action: 'أنهيت التصنيفات وأرسلتها إلى مراجعة الجودة.',
      event: `رفض المراجع ${annotationRejected(state) === 1 ? 'مهمة واحدة' : `${annotationRejected(state)} مهام`}، فأصبح القرار مؤثرًا في العمل والدخل المؤكد.`,
      decision: 'أرسل اعتراضًا أو أغلق الوردية مع بقاء الرفض.',
      note: 'خيار الاعتراض ظهر بعد قرار مراجع آخر، وليس كخيار منفصل بلا سبب.'
    });
  }
  if (scene === 'trainingRun') {
    return causalDecision({
      action: `اخترت ${state.flags.trainingCompute} مجموعات حوسبة وبدأت جولة التطوير.`,
      event: 'خرجت مجموعة واحدة من الخدمة عند 35% من الجولة.',
      decision: 'أوقف الجولة لتشخيص العطل أو استمر بالسعة المتبقية.',
      note: 'اختيار عدد المجموعات لم يسبب العطل؛ لكنه يحدد مقدار الهامش المتبقي بعد حدوثه.'
    });
  }
  if (scene === 'safetyRetest') {
    return causalDecision({
      action: 'أرسلت خلل السلامة الذي ظهر في الاختبار السابق إلى الإصلاح.',
      event: 'تغير السلوك وأصبح الرد لا يقدم التفاصيل التشغيلية التي أوقفت الإطلاق.',
      decision: 'ثبّت نتيجة إعادة الاختبار الإلزامية قبل الانتقال إلى قرار الجاهزية.',
      note: 'هذه ليست حزمة اختيارية جديدة؛ إنها نتيجة مباشرة لخلل السلامة الذي اكتُشف سابقًا.'
    });
  }
  if (scene === 'launchDecision' && hasLaunchVerification(state)) {
    const causes = [];
    if (state.flags.trainingCheckpoint === 'recent') causes.push('اختيار نقطة الحفظ الأحدث أنشأ تحققًا إضافيًا من تغيير النبرة');
    if (state.flags.trainingCompute === '8' && state.flags.trainingIncidentChoice === 'continue') causes.push('الاستمرار بعد عطل الحوسبة بهامش أضيق أنشأ فحص استقرار إضافيًا');
    return causalDecision({
      action: 'اجتزت إعادة اختبار السلامة ووصلت إلى بوابة الجاهزية.',
      event: `${causes.join('، و')}.`,
      decision: 'احسم كيف تتعامل مع أعمال التحقق المتبقية وموعد الإصدار.',
      note: 'هذه الأعمال نتجت عن اختيارات سابقة في جولة التدريب، وليست تكرارًا لاختبار السلامة.'
    });
  }
  if (scene === 'deployIncident' && state.flags.deployTabs.length === 3) {
    return causalDecision({
      action: 'وزعت الحمل بنجاح ثم فحصت الشبكة والخوادم وخدمة النموذج.',
      event: 'الشبكة مستقرة والسعة متاحة، بينما يرتفع استهلاك الذاكرة داخل الإصدار الجديد.',
      decision: 'أعد تشغيل الوحدات المتأثرة أو ارجع إلى الإصدار السابق.',
      note: 'الخيارات ظهرت بعد اكتمال التشخيص؛ لا تفترض اللعبة أن توزيع الحمل هو سبب عطل الذاكرة.'
    });
  }
  return '';
}

function requiredChoiceGuidance(scene) {
  const prompts = {
    dataClean: ['اختر إجراءً لهذا العنصر.', 'الاحتفاظ أو التنقيح أو المراجعة أو الاستبعاد هو العمل المطلوب نفسه. يجب اختيار أحدها قبل الانتقال للعنصر التالي.'],
    annotationTask: ['اختر تصنيفًا وفق دليل المشروع.', 'هذه الأزرار هي إجابة المهمة الحالية. لن تظهر المهمة التالية قبل اختيار تصنيف.'],
    evalTask: ['اختر التقييم الذي يطابق معيار المهمة.', 'قارن البدائل ثم اختر واحدًا لإكمال المقارنة الحالية.'],
    safetyTest: ['حدد المشكلة الأساسية في الرد.', 'اختيارك هنا يحدد ما إذا التقطت خلل السلامة قبل انتقاله إلى المراجعة التالية.'],
    supportTask: ['اختر طريقة معالجة بلاغ المستخدم.', 'الخياران نتجا عن البلاغ الذي وصل بعد الحادث، ويختلفان في السرعة وفي مقدار الأدلة المحفوظة.']
  };
  const prompt = prompts[scene];
  return prompt ? choiceRequirement(prompt[0], prompt[1]) : '';
}

export function sceneGuidance(scene, state) {
  if (scene.startsWith('intro') || scene.startsWith('ch')) return '';
  const stage = stageForScene(scene);
  const task = STAGE_TASKS[stage];
  if (!task) return '';
  const taskMarkup = NO_TASK_GUIDANCE_SCENES.has(scene)
    ? ''
    : taskPanel(task, { status: statusFor(scene, state), progress: progressFor(stage, state, scene), compact: true });
  return `${taskMarkup}${supportingRoles(scene, state)}${causalGuidance(scene, state)}${requiredChoiceGuidance(scene)}`;
}

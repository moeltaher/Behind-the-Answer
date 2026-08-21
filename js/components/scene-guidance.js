import {
  DATA_ITEMS,
  ANNOTATION_TASKS,
  EVAL_TASKS,
  SUPPORT_TASKS
} from '../data/content-tasks.js';
import { stageForScene } from '../data/stage-backgrounds.js';
import { STAGE_TASKS } from '../data/stage-tasks.js';
import { supportingActor } from '../data/supporting-actors.js';
import {
  taskPanel,
  eventPanel,
  decisionPrompt,
  taskOutcome,
  actorStrip,
  actorMessage,
  institutionCard
} from './task-flow.js';

const COMPLETE_SCENES = new Set([
  'mineEnd', 'abstract1',
  'factoryOutcome', 'abstract2',
  'dcWorkers', 'abstract3',
  'dataCleanSummary', 'abstract4',
  'annotationEnd', 'abstract5',
  'trainingEval',
  'launchOutcome', 'abstract7',
  'deployEnd', 'abstract8',
  'results', 'finalMessage'
]);

const DECISION_SCENES = new Set([
  'factoryIncident',
  'dcCooling',
  'annotationReview',
  'trainingRun',
  'launchDecision'
]);

const RESUMED_SCENES = new Set([
  'mineInspection',
  'onCall',
  'safetyOutcome'
]);

const ACTOR_IDS_BY_SCENE = {
  mineOrientation: ['supervisor'],
  mineTask: ['supervisor', 'coworker'],
  mineInspection: ['supervisor', 'maintenance'],
  transportMontage: ['transportTeam'],
  abstract1: ['transportTeam'],

  factoryOrientation: ['maintenance', 'qualityInspector'],
  factoryMonitor: ['qualityInspector'],
  factoryIncident: ['maintenance', 'qualityInspector'],
  factoryOutcome: ['qualityInspector'],
  hardwareMontage: ['maintenance', 'qualityInspector'],
  abstract2: ['maintenance', 'qualityInspector'],

  dcInstall: ['electricalEngineer', 'networkOperator'],
  dcCooling: ['coolingTech', 'electricalEngineer'],
  dcWorkers: [
    'cleaner',
    'electricalEngineer',
    'securityWorker',
    'coolingTech',
    'cableTech',
    'networkOperator'
  ],
  abstract3: ['coolingTech', 'electricalEngineer', 'networkOperator'],

  dataOrigins: ['contentCreators'],
  dataClean: ['contentCreators', 'dataReviewer'],
  dataCleanSummary: ['contentCreators', 'dataReviewer'],
  abstract4: ['contentCreators', 'dataReviewer'],

  annotationIntro: ['dataReviewer'],
  annotationTask: ['dataReviewer'],
  annotationReview: ['dataReviewer'],
  annotationEnd: ['dataReviewer'],
  abstract5: ['dataReviewer'],

  trainingSetup: ['infraTeam'],
  trainingRun: ['infraTeam'],
  trainingEval: ['infraTeam'],

  evalTask: ['languageReviewer'],
  safetyTest: ['safetyTester'],
  safetyOutcome: ['safetyTester'],
  launchDecision: ['releaseManager', 'safetyTester'],
  launchOutcome: ['releaseManager'],
  abstract7: ['safetyTester', 'languageReviewer'],

  deployLoad: ['operationsTeam'],
  deployIncident: ['operationsTeam'],
  onCall: ['operationsTeam', 'affectedUser'],
  supportTask: ['affectedUser'],
  deployEnd: ['operationsTeam'],
  abstract8: ['operationsTeam', 'affectedUser'],

  pipelineAssemble: ['transportTeam', 'infraTeam', 'languageReviewer'],
  peopleReveal: [
    'transportTeam',
    'maintenance',
    'contentCreators',
    'safetyTester',
    'operationsTeam'
  ]
};

const TASK_CHOICE_PROMPTS = {
  dataClean: 'اختر إجراءً لإكمال مراجعة هذا العنصر.',
  annotationTask: 'اختر تصنيفًا لإكمال هذه المهمة.',
  evalTask: 'اختر التقييم الذي يطابق معيار المهمة.',
  safetyTest: 'اختر المشكلة الأساسية لإكمال اختبار السلامة.',
  supportTask: 'اختر طريقة التعامل مع بلاغ المستخدم.'
};

const INCIDENTS = {
  factoryIncident: {
    title: 'ارتفع عدد الجسيمات أثناء مراقبة الدفعة',
    trigger: 'بعد بدء المراقبة ارتفع المؤشر من 18 إلى 49.',
    meaning: 'استمرار الخط قد يرفع نسبة الوحدات المعيبة. هذا الحدث ظهر أثناء تنفيذ المهمة ولم ينتج عن ضغطة عشوائية.',
    question: 'كيف ستتعامل مع تنبيه الجودة؟'
  },
  dcCooling: {
    title: 'تعطلت وحدة تبريد أثناء اختبار المجموعة',
    trigger: 'بعد تشغيل اختبار الخادم لم تعد وحدة التبريد رقم 3 تستجيب.',
    meaning: 'العطل حدث أثناء الاختبار؛ يجب اختيار طريقة للتعامل معه قبل اعتبار المجموعة جاهزة.',
    question: 'كيف ستتعامل مع عطل التبريد؟',
    message: {
      actor: 'coolingTech',
      text: 'وحدة التبريد رقم 3 لا تستجيب أثناء اختبار المجموعة.',
      label: 'يبلغ عن العطل'
    }
  },
  trainingRun: {
    title: 'أصبحت وحدة حوسبة غير متاحة أثناء الجولة',
    trigger: 'بدأ التدريب ثم فُقدت إحدى وحدات الحوسبة عند تقدم 35%.',
    meaning: 'اختيار سعة الحوسبة لم يسبب العطل؛ لكنه يحدد مقدار السعة المتبقية بعد حدوثه.',
    question: 'هل توقف الجولة للفحص أم تستمر بقدرة أقل؟'
  },
  launchDecision: {
    title: 'ظهر تعارض بين الاختبارات وموعد الإصدار',
    trigger: 'بعد المراجعة بقي 14 اختبارًا بينما الموعد المخطط للإطلاق غدًا.',
    meaning: 'الخيارات ظهرت لأن الوقت المتاح لا يكفي لإنهاء كل الاختبارات مع الحفاظ على الموعد نفسه.',
    causal: 'after',
    question: 'كيف ستتعامل مع تعارض الموعد والاختبارات؟',
    message: {
      actor: 'releaseManager',
      text: 'الموعد المخطط للإطلاق غدًا، ونحتاج قرارًا بشأن ما تبقى من الاختبارات.',
      label: 'تحدد القيد الزمني'
    }
  }
};

function actorsFor(scene) {
  return (ACTOR_IDS_BY_SCENE[scene] || [])
    .map(supportingActor)
    .filter(Boolean);
}

function progressFor(stage, state) {
  switch (stage) {
    case 'mining':
      return `التقدم: ${state.flags.miningCount}/12 وحدة`;
    case 'factory':
      return state.flags.factoryChoice
        ? 'قرار الجودة اتُخذ'
        : `معدات الحماية: ${state.flags.factoryPPE.length}/4`;
    case 'datacenter':
      return `تركيب الخادم: ${state.flags.serverSteps.length}/4 خطوات`;
    case 'data':
      return `مراجعة الدفعة: ${state.flags.dataIndex}/${DATA_ITEMS.length} عناصر`;
    case 'annotation':
      return `المهام المكتملة: ${state.flags.annotationAnswered}/${ANNOTATION_TASKS.length}`;
    case 'training':
      if (state.flags.trainingIncidentChoice) return 'جولة التدريب: مكتملة';
      return state.flags.trainingConfigured
        ? 'جولة التدريب: 35%'
        : 'الإعداد: لم يبدأ بعد';
    case 'evaluation':
      return `مقارنات الإجابات: ${Math.min(state.flags.evalIndex, EVAL_TASKS.length)}/${EVAL_TASKS.length}`;
    case 'deployment':
      return state.flags.supportIndex
        ? `بلاغات الحادث: ${state.flags.supportIndex}/${SUPPORT_TASKS.length}`
        : 'تشغيل الخدمة: قيد الاختبار';
    case 'ending':
      return 'الخطوة الأخيرة: ربط الواجهة بالسلسلة';
    default:
      return '';
  }
}

function statusFor(scene, state) {
  if (COMPLETE_SCENES.has(scene)) return 'complete';
  if (scene === 'mineTask' && state.flags.miningWarning) return 'decision';
  if (DECISION_SCENES.has(scene)) return 'decision';
  if (scene === 'deployIncident' && state.flags.deployTabs.length === 3) {
    return 'decision';
  }
  if (RESUMED_SCENES.has(scene)) return 'resumed';
  return 'active';
}

function renderIncident(scene, state) {
  if (scene === 'mineTask' && state.flags.miningWarning) {
    return [
      actorMessage(
        supportingActor('coworker'),
        'لاحظت حركة غير معتادة في الجدار عند القطاع ب.',
        'ينبّهك أثناء العمل'
      ),
      eventPanel({
        title: 'ظهر خطر في القطاع ب',
        trigger: 'بعد استخراج 6 وحدات أشار زميل موسى إلى حركة غير معتادة في الجدار.',
        meaning: 'لا يمكن مواصلة المهمة بصورة عادية قبل اتخاذ قرار بشأن الخطر.',
        actors: actorsFor(scene)
      }),
      decisionPrompt('كيف ستتعامل مع خطر الجدار؟')
    ].join('');
  }

  if (scene === 'annotationReview' && state.flags.annotationCounts.rejected) {
    return [
      actorMessage(
        supportingActor('dataReviewer'),
        'رفضت مهمة واحدة وفق معيار المراجعة في المنصة.',
        'يصدر قرار المراجعة'
      ),
      eventPanel({
        title: 'المراجع رفض إحدى المهام بعد انتهاء الوردية',
        trigger: 'بعد إرسال التصنيفات راجع طرف آخر العمل ورفض مهمة واحدة.',
        meaning: 'ظهر خيار الاعتراض لأن شخصًا آخر اتخذ قرارًا يؤثر في أجر أماني.',
        causal: 'after',
        actors: actorsFor(scene)
      }),
      decisionPrompt('هل ستعترض على قرار المراجع؟')
    ].join('');
  }

  if (scene === 'deployIncident') {
    return [
      eventPanel({
        title: 'ارتفعت نسبة الأخطاء أثناء اختبار الخدمة',
        trigger: 'بعد توزيع الحمل وتشغيل الخدمة ظهرت أخطاء لدى مستخدمين، ويجب فحص الشبكة والخوادم وخدمة النموذج.',
        meaning: 'افتح الأقسام الثلاثة أولًا. بعد معرفة المؤشرات ستظهر خيارات الاستعادة. لا تفترض اللعبة أن توزيعك للحمل هو سبب عطل الذاكرة.',
        actors: actorsFor(scene)
      }),
      state.flags.deployTabs.length === 3
        ? decisionPrompt('بعد فحص الأقسام، كيف ستعيد الخدمة؟')
        : ''
    ].join('');
  }

  const incident = INCIDENTS[scene];
  if (!incident) return '';

  const message = incident.message
    ? actorMessage(
      supportingActor(incident.message.actor),
      incident.message.text,
      incident.message.label
    )
    : '';

  return [
    message,
    eventPanel({
      title: incident.title,
      trigger: incident.trigger,
      meaning: incident.meaning,
      causal: incident.causal,
      actors: actorsFor(scene)
    }),
    decisionPrompt(incident.question)
  ].join('');
}

function taskChoiceGuidance(scene) {
  const prompt = TASK_CHOICE_PROMPTS[scene];
  if (!prompt) return '';

  return decisionPrompt(
    prompt,
    'هذه الخيارات هي جزء من المهمة نفسها، وليست حادثًا طارئًا. يجب اختيار أحدها لإكمال الخطوة الحالية.'
  );
}

function contextualMessages(scene) {
  const parts = [];

  if (scene === 'mineOrientation') {
    parts.push(actorMessage(
      supportingActor('supervisor'),
      'نحتاج 12 وحدة قبل مغادرة الشاحنة. إذا ظهر خطر سجّله، لكن وقت التوقف يحسب على الوردية.',
      'يحدد قواعد الوردية'
    ));
  }

  if (scene === 'supportTask') {
    parts.push(actorMessage(
      supportingActor('affectedUser'),
      'أنا واحد من المستخدمين الذين وصل إليهم أثر الحادث، وهذا البلاغ يشرح ما حدث لي.',
      'يرسل بلاغًا'
    ));
  }

  if (['annotationIntro', 'annotationTask', 'annotationReview', 'annotationEnd'].includes(scene)) {
    parts.push(institutionCard({
      name: 'منصة «مهمة»',
      type: 'منصة عمل رقمية',
      role: 'توزع المهام، تعرض معيار المشروع، وتسجل القبول والرفض والدفع.',
      symbol: '▦'
    }));
  }

  if (scene === 'launchDecision') {
    parts.push(institutionCard({
      name: 'خطة الإصدار',
      type: 'قيد تنظيمي',
      role: 'تحدد موعد الإطلاق المخطط وتخلق تعارضًا مع الوقت المتبقي للاختبارات.',
      symbol: '◷'
    }));
  }

  return parts.join('');
}

function outcomeGuidance(scene, state) {
  if (scene === 'mineInspection') {
    return taskOutcome({
      choice: 'إيقاف العمل للفحص',
      result: 'تم تثبيت الدعامة وسُجل وقت توقف.',
      resume: 'أكمل الوحدات المتبقية حتى 12/12.'
    });
  }

  if (scene === 'factoryOutcome') {
    const stopped = state.flags.factoryChoice === 'stop';
    return taskOutcome({
      choice: stopped ? 'إيقاف الخط والفحص' : 'الاستمرار حتى نهاية الدفعة',
      result: stopped
        ? 'عادت المؤشرات إلى النطاق وتأخرت الدفعة.'
        : 'وصلت الدفعة في الموعد لكن نسبة الرفض ارتفعت.',
      resume: 'انتقل بالمكونات التي اجتازت الفحص إلى الخطوة التالية.',
      complete: true
    });
  }

  if (scene === 'trainingEval') {
    const paused = state.flags.trainingIncidentChoice === 'pause';
    return taskOutcome({
      choice: paused ? 'إيقاف الجولة وتشخيص العطل' : 'الاستمرار بقدرة أقل',
      result: paused
        ? 'عولج العطل ثم استؤنف التدريب حتى النهاية.'
        : 'اكتملت الجولة مع ضغط أعلى على الموارد.',
      resume: 'أرسل النسخة الناتجة إلى المراجعة البشرية.',
      complete: true
    });
  }

  if (scene === 'safetyOutcome') {
    return taskOutcome({
      choice: 'إجابة اختبار السلامة',
      result: state.flags.safetyChoice === 'details'
        ? 'التقطت أن الرد كشف تفاصيل تشغيلية أكثر مما ينبغي.'
        : 'توجد مشكلة سلامة أهم من الاختيار المحدد.',
      resume: 'انتقل إلى قرار الإطلاق.'
    });
  }

  if (scene === 'launchOutcome') {
    const delayed = state.flags.launchChoice === 'delay';
    return taskOutcome({
      choice: delayed ? 'تأجيل الإطلاق' : 'إكمال الاختبارات الحرجة فقط',
      result: delayed
        ? 'اتسعت مساحة الاختبار مقابل وقت وتكلفة إضافيين.'
        : 'حُفظ الموعد مع بقاء اختبارات غير مكتملة.',
      resume: 'انتقل إلى تشغيل الخدمة.',
      complete: true
    });
  }

  if (scene === 'onCall') {
    return taskOutcome({
      choice: state.flags.deployRecovery === 'rollback'
        ? 'العودة إلى الإصدار السابق'
        : 'إعادة تشغيل الوحدات',
      result: 'عادت الخدمة، لكن أثر الحادث ما زال يصل إلى المستخدمين.',
      resume: 'انتقل إلى بلاغات المستخدمين.'
    });
  }

  if (['mineEnd', 'dataCleanSummary', 'annotationEnd', 'deployEnd'].includes(scene)) {
    return taskOutcome({
      result: 'تحقق شرط إكمال المهمة في هذه المرحلة.',
      resume: 'راجع الناتج ثم انتقل إلى المرحلة التالية.',
      complete: true
    });
  }

  if (scene === 'results') {
    return taskOutcome({
      result: 'ربطت واجهة الإجابة بالمراحل والأشخاص والقرارات التي سبقتها.',
      resume: 'راجع الخاتمة أو دفتر السلسلة.',
      complete: true
    });
  }

  return '';
}

export function sceneGuidance(scene, state) {
  if (scene.startsWith('intro') || scene.startsWith('ch')) return '';

  const stage = stageForScene(scene);
  const task = STAGE_TASKS[stage];
  if (!task) return '';

  const actors = actorsFor(scene);
  return [
    taskPanel(task, {
      status: statusFor(scene, state),
      progress: progressFor(stage, state)
    }),
    actors.length ? actorStrip(actors) : '',
    contextualMessages(scene),
    renderIncident(scene, state),
    taskChoiceGuidance(scene),
    outcomeGuidance(scene, state)
  ].join('');
}

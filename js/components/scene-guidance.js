import { STAGE_TASKS } from '../data/stage-tasks.js';
import { supportingActor } from '../data/supporting-actors.js';
import { taskPanel, eventPanel, decisionPrompt, taskOutcome, actorStrip, actorMessage } from './task-flow.js';

const STAGE_KEYS = ['mining','factory','datacenter','data','annotation','training','evaluation','deployment','ending'];
const COMPLETE_SCENES = new Set(['mineEnd','abstract1','factoryOutcome','abstract2','dcWorkers','abstract3','dataCleanSummary','abstract4','annotationEnd','abstract5','trainingEval','launchOutcome','abstract7','deployEnd','abstract8','results','finalMessage']);

const ACTORS = {
  mineOrientation:['supervisor'], mineTask:['supervisor','coworker'], mineInspection:['supervisor','maintenance'], transportMontage:['transportTeam'],
  factoryOrientation:['maintenance','qualityInspector'], factoryMonitor:['qualityInspector'], factoryIncident:['maintenance','qualityInspector'], factoryOutcome:['qualityInspector'], hardwareMontage:['maintenance'],
  dcInstall:['electricalEngineer','networkOperator'], dcCooling:['coolingTech','electricalEngineer'], dcWorkers:['coolingTech','electricalEngineer','networkOperator'],
  dataOrigins:['dataReviewer'], dataClean:['dataReviewer'], dataCleanSummary:['dataReviewer'],
  annotationIntro:['dataReviewer'], annotationTask:['dataReviewer'], annotationReview:['dataReviewer'], annotationEnd:['dataReviewer'],
  trainingSetup:['infraTeam'], trainingRun:['infraTeam'], trainingEval:['infraTeam'],
  evalTask:['languageReviewer'], safetyTest:['safetyTester'], safetyOutcome:['safetyTester'], launchDecision:['releaseManager','safetyTester'], launchOutcome:['releaseManager'],
  deployLoad:['operationsTeam'], deployIncident:['operationsTeam'], onCall:['operationsTeam','affectedUser'], supportTask:['affectedUser'], deployEnd:['operationsTeam'],
  pipelineAssemble:['transportTeam','infraTeam','languageReviewer'], peopleReveal:['transportTeam','operationsTeam','safetyTester']
};

function progressFor(stage, state) {
  switch (stage) {
    case 'mining': return `التقدم: ${state.flags.miningCount}/12 وحدة`;
    case 'factory': return state.flags.factoryChoice ? 'قرار الجودة اتُخذ' : `معدات الحماية: ${state.flags.factoryPPE.length}/4`;
    case 'datacenter': return `تركيب الخادم: ${state.flags.serverSteps.length}/4 خطوات`;
    case 'data': return `مراجعة الدفعة: ${state.flags.dataIndex}/8 عناصر`;
    case 'annotation': return `المهام المكتملة: ${state.flags.annotationAnswered}/9`;
    case 'training': return state.flags.trainingIncidentChoice ? 'جولة التدريب: مكتملة' : state.flags.trainingConfigured ? 'جولة التدريب: 35%' : 'الإعداد: لم يبدأ بعد';
    case 'evaluation': return `مقارنات الإجابات: ${Math.min(state.flags.evalIndex,3)}/3`;
    case 'deployment': return state.flags.supportIndex ? `بلاغات الحادث: ${state.flags.supportIndex}/3` : 'تشغيل الخدمة: قيد الاختبار';
    case 'ending': return 'الخطوة الأخيرة: ربط الواجهة بالسلسلة';
    default: return '';
  }
}

function statusFor(scene, stage, state) {
  if (COMPLETE_SCENES.has(scene)) return 'complete';
  if (scene === 'mineTask' && state.flags.miningWarning) return 'decision';
  if (['factoryIncident','dcCooling','annotationReview','trainingRun','launchDecision'].includes(scene)) return 'decision';
  if (scene === 'deployIncident' && state.flags.deployTabs.length === 3) return 'decision';
  if (['mineInspection','onCall','safetyOutcome'].includes(scene)) return 'resumed';
  return 'active';
}

function actorsFor(scene) {
  return (ACTORS[scene] || []).map(supportingActor).filter(Boolean);
}

function incidentGuidance(scene, state) {
  if (scene === 'mineTask' && state.flags.miningWarning) return eventPanel({title:'ظهر خطر في القطاع ب',trigger:'بعد استخراج 6 وحدات أشار زميل موسى إلى حركة غير معتادة في الجدار.',meaning:'لا يمكن مواصلة المهمة بصورة عادية قبل اتخاذ قرار بشأن الخطر.',actors:actorsFor(scene)}) + decisionPrompt('كيف ستتعامل مع خطر الجدار؟');
  if (scene === 'factoryIncident') return eventPanel({title:'ارتفع عدد الجسيمات أثناء مراقبة الدفعة',trigger:'بعد بدء المراقبة ارتفع المؤشر من 18 إلى 49.',meaning:'استمرار الخط قد يرفع نسبة الوحدات المعيبة. هذا الحدث ظهر أثناء تنفيذ المهمة ولم ينتج عن ضغطة عشوائية.',actors:actorsFor(scene)}) + decisionPrompt('كيف ستتعامل مع تنبيه الجودة؟');
  if (scene === 'dcCooling') return eventPanel({title:'تعطلت وحدة تبريد أثناء اختبار المجموعة',trigger:'بعد تشغيل اختبار الخادم لم تعد وحدة التبريد رقم 3 تستجيب.',meaning:'العطل حدث أثناء الاختبار؛ يجب اختيار طريقة للتعامل معه قبل اعتبار المجموعة جاهزة.',actors:actorsFor(scene)}) + decisionPrompt('كيف ستتعامل مع عطل التبريد؟');
  if (scene === 'annotationReview' && state.flags.annotationCounts.rejected) return eventPanel({title:'المراجع رفض إحدى المهام بعد انتهاء الوردية',trigger:'بعد إرسال التصنيفات راجع طرف آخر العمل ورفض مهمة واحدة.',meaning:'ظهر خيار الاعتراض لأن شخصًا آخر اتخذ قرارًا يؤثر في أجر أماني.',causal:'after',actors:actorsFor(scene)}) + decisionPrompt('هل ستعترض على قرار المراجع؟');
  if (scene === 'trainingRun') return eventPanel({title:'أصبحت وحدة حوسبة غير متاحة أثناء الجولة',trigger:'بدأ التدريب ثم فُقدت إحدى وحدات الحوسبة عند تقدم 35%.',meaning:'اختيار سعة الحوسبة لم يسبب العطل؛ لكنه يحدد مقدار السعة المتبقية بعد حدوثه.',actors:actorsFor(scene)}) + decisionPrompt('هل توقف الجولة للفحص أم تستمر بقدرة أقل؟');
  if (scene === 'launchDecision') return eventPanel({title:'ظهر تعارض بين الاختبارات وموعد الإصدار',trigger:'بعد المراجعة بقي 14 اختبارًا بينما الموعد المخطط للإطلاق غدًا.',meaning:'الخيارات ظهرت لأن الوقت المتاح لا يكفي لإنهاء كل الاختبارات مع الحفاظ على الموعد نفسه.',causal:'after',actors:actorsFor(scene)}) + actorMessage(supportingActor('releaseManager'),'الموعد المخطط للإطلاق غدًا، ونحتاج قرارًا بشأن ما تبقى من الاختبارات.','تحدد القيد الزمني') + decisionPrompt('كيف ستتعامل مع تعارض الموعد والاختبارات؟');
  if (scene === 'deployIncident') {
    const base = eventPanel({title:'ارتفعت نسبة الأخطاء أثناء اختبار الخدمة',trigger:'بعد توزيع الحمل وتشغيل الخدمة ظهرت أخطاء لدى مستخدمين، ويجب فحص الشبكة والخوادم وخدمة النموذج.',meaning:'افتح الأقسام الثلاثة أولًا. بعد معرفة المؤشرات ستظهر خيارات الاستعادة.',actors:actorsFor(scene)});
    return base + (state.flags.deployTabs.length === 3 ? decisionPrompt('بعد فحص الأقسام، كيف ستعيد الخدمة؟') : '');
  }
  return '';
}

function taskChoiceGuidance(scene) {
  const labels = {
    dataClean:'اختر إجراءً لإكمال مراجعة هذا العنصر.',
    annotationTask:'اختر تصنيفًا لإكمال هذه المهمة.',
    evalTask:'اختر التقييم الذي يطابق معيار المهمة.',
    safetyTest:'اختر المشكلة الأساسية لإكمال اختبار السلامة.',
    supportTask:'اختر طريقة التعامل مع بلاغ المستخدم.'
  };
  return labels[scene] ? decisionPrompt(labels[scene], 'هذه الخيارات هي جزء من المهمة نفسها، وليست حادثًا طارئًا. يجب اختيار أحدها لإكمال الخطوة الحالية.') : '';
}

function outcomeGuidance(scene, state) {
  if (scene === 'mineInspection') return taskOutcome({choice:'إيقاف العمل للفحص',result:'تم تثبيت الدعامة وسُجل وقت توقف.',resume:'أكمل الوحدات المتبقية حتى 12/12.'});
  if (scene === 'factoryOutcome') return taskOutcome({choice:state.flags.factoryChoice === 'stop' ? 'إيقاف الخط والفحص' : 'الاستمرار حتى نهاية الدفعة',result:state.flags.factoryChoice === 'stop' ? 'عادت المؤشرات إلى النطاق وتأخرت الدفعة.' : 'وصلت الدفعة في الموعد لكن نسبة الرفض ارتفعت.',resume:'انتقل بالمكونات التي اجتازت الفحص إلى الخطوة التالية.',complete:true});
  if (scene === 'trainingEval') return taskOutcome({choice:state.flags.trainingIncidentChoice === 'pause' ? 'إيقاف الجولة وتشخيص العطل' : 'الاستمرار بقدرة أقل',result:state.flags.trainingIncidentChoice === 'pause' ? 'عولج العطل ثم استؤنف التدريب حتى النهاية.' : 'اكتملت الجولة مع ضغط أعلى على الموارد.',resume:'أرسل النسخة الناتجة إلى المراجعة البشرية.',complete:true});
  if (scene === 'safetyOutcome') return taskOutcome({choice:'إجابة اختبار السلامة',result:state.flags.safetyChoice === 'details' ? 'التقطت أن الرد كشف تفاصيل تشغيلية أكثر مما ينبغي.' : 'توجد مشكلة سلامة أهم من الاختيار المحدد.',resume:'انتقل إلى قرار الإطلاق.'});
  if (scene === 'launchOutcome') return taskOutcome({choice:state.flags.launchChoice === 'delay' ? 'تأجيل الإطلاق' : 'إكمال الاختبارات الحرجة فقط',result:state.flags.launchChoice === 'delay' ? 'اتسعت مساحة الاختبار مقابل وقت وتكلفة إضافيين.' : 'حُفظ الموعد مع بقاء اختبارات غير مكتملة.',resume:'انتقل إلى تشغيل الخدمة.',complete:true});
  if (scene === 'onCall') return taskOutcome({choice:state.flags.deployRecovery === 'rollback' ? 'العودة إلى الإصدار السابق' : 'إعادة تشغيل الوحدات',result:'عادت الخدمة، لكن أثر الحادث ما زال يصل إلى المستخدمين.',resume:'انتقل إلى بلاغات المستخدمين.'});
  if (['mineEnd','dataCleanSummary','annotationEnd','deployEnd'].includes(scene)) return taskOutcome({result:'تحقق شرط إكمال المهمة في هذه المرحلة.',resume:'راجع الناتج ثم انتقل إلى المرحلة التالية.',complete:true});
  return '';
}

export function sceneGuidance(scene, state) {
  const stage = STAGE_KEYS[Math.max(0, Math.min(8, state.chapter))];
  const task = STAGE_TASKS[stage];
  if (!task || scene.startsWith('intro') || scene.startsWith('ch')) return '';
  const actors = actorsFor(scene);
  return `${taskPanel(task,{status:statusFor(scene,stage,state),progress:progressFor(stage,state),compact:false})}${actors.length ? actorStrip(actors) : ''}${incidentGuidance(scene,state)}${taskChoiceGuidance(scene)}${outcomeGuidance(scene,state)}`;
}

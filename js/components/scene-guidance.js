import { DATA_ITEMS, ANNOTATION_TASKS, EVAL_TASKS, SUPPORT_TASKS } from '../data/content-tasks.js';
import { stageForScene } from '../data/stage-backgrounds.js';
import { STAGE_TASKS } from '../data/stage-tasks.js';
import { recoveryDispositionComplete, survivableFailures, MAX_SURVIVABLE_FAILURES } from '../domain/game-rules.js';
import { taskPanel } from './task-flow.js';

const T=(title,how,done,constraint)=>({title,how,done,constraint});
const TASKS={
  intro:T('أرسل الطلب التجريبي','أرسل الطلب الثابت ثم اتبع ما تكشفه اللعبة.','عندما تبدأ الرحلة.','الطلب ثابت حتى يمكن مقارنة المراحل.'),
  zoomOut:T('انتقل إلى أول طبقة خلف الإجابة','تابع إلى مرحلة المواد.','عندما تبدأ مرحلة المواد.','ترتيب اللعب تعليمي لا هندسي.'),
  mineOrientation:T('راجع قواعد الوردية وابدأ','راجع الوقت والأجر والقطاع الأسرع ثم ابدأ.','عندما تدخل منطقة العمل.','الأرقام افتراضات تعليمية.'),
  mineInspection:T('أغلق خطر الاهتزاز','افحص السبب، شخّصه، أصلحه، ثم أعد اختبار الاهتزاز.','عندما يثبت الاختبار أن الخطر مغلق.','إغلاق القطاع لا يساوي تشخيصًا أو إصلاحًا.'),
  factoryIncident:T('اختر هل توقف الخط أم تستمر','سجل قرارك فقط؛ التنفيذ سيظهر في الخطوة التالية.','عندما تسجل القرار.','قرار الاستمرار لا يكمل الدفعة ولا يفحصها.'),
  factoryOutcome:T('أكمل العمل المفتوح في المصنع','نفّذ الخطوة الظاهرة الآن: صيانة أو إنتاج أو فحص أو قرار نقل الدين.','عندما تجتاز الدفعة الفحص ويصبح مصير الصيانة صريحًا.','الإنتاج والفحص والصيانة حالات منفصلة.'),
  dcInstall:T('ركّب الخادم','ثبّت الخادم، ثم الطاقة والشبكة، ثم التسجيل.','عندما تكتمل الخطوات الأربع.','هذا ترتيب السيناريو.'),
  dcCooling:T('اختر مسار العمل أثناء عطل التبريد','انقل الاختبار أو أوقفه.','عندما تسجل القرار.','القرار لا يصلح العطل.'),
  dcCoolingOutcome:T('أصلح التبريد وتحقق منه','نفّذ الإصلاح، ثم قِس الحرارة وأعد الاختبار.','عندما تجتاز المجموعة إعادة الاختبار.','الإصلاح لا يساوي دليل نجاحه.'),
  dataOrigins:T('ابدأ مراجعة المواد','ابدأ الدفعة مباشرة أو استكشف أمثلة المصادر أولًا.','عندما تبدأ المادة الأولى.','الاستكشاف اختياري وليس درجة.'),
  dataClean:T('قرّر مصير المادة الحالية','اختر إجراءً يناسب المشكلة الظاهرة في هذه المادة.','عندما تسجل المادة.','حالة المسار لا تمحو حالة الأدلة.'),
  dataFollowup:T('احسم الخصوصية بعد مراجعة الحق','راجع ما حُسم ثم قرر مصير بيانات الاتصال.','عندما تصبح نتيجة المادة مكتملة.','حسم الحقوق لا يحسم الخصوصية.'),
  dataCleanSummary:T('راجع نتيجة المواد الخمس','قارن ما مر وما علق وما استبعد وما بقي عليه دليل مفتوح.','عندما تنتقل إلى التصنيف.','المسار والدليل مستقلان.'),
  annotationTask:T('صنّف المثال الحالي','اختر الفئة الأنسب واستخدم «غير واضح» عند نقص السياق.','عندما تسجل اختيارك.','الحكم وفق الدليل المعروض.'),
  annotationReview:T('راجع القرار والنزاع','قارن اختيارك بالدليل ثم تعامل مع الاعتراض إن ظهر.','عندما تغلق المراجعة.','رفض المراجع لا يثبت خطأ العامل.'),
  trainingSetup:T('جهّز نسخة التدريب','احسم المواد غير الواضحة ثم اختر نقطة الحفظ.','عندما تبدأ نسخة مرشحة جديدة.','الحوسبة ثابتة عند 8 مجموعات.'),
  trainingRun:T('اختر ما تفعله بعد عطل الحوسبة','توقف للاستعادة أو استمر عند الحد الأدنى.','عندما تسجل القرار.','الاستمرار ينشئ فحص استقرار.'),
  trainingRecovery:T('استعد الحوسبة وتحقق منها','استعد أو استبدل المجموعة، أثبت 8/8، ثم استأنف الجولة.','عندما تعود الجولة للعمل بعد تحقق السعة.','الإصلاح وحده لا يثبت الاستعادة.'),
  trainingEval:T('راجع ناتج الجولة','راجع أثر العطل وسلسلة البيانات ثم انتقل للتقييم.','عندما تنتقل للتقييم.','اكتمال الجولة لا يعني الجاهزية.'),
  evalTask:T('قيّم الإجابتين','قارن الإجابات وفق المطلوب وأكمل المعايرة.','عندما تنهي الأمثلة الثلاثة والمعايرة.','هذه نتيجة لعمل المقيّم.'),
  checkpointEval:T('قارن نقطة الحفظ','اختبر النتائج على العينات الثلاث.','عندما تكتمل المقارنة.','الحداثة ليست أفضل تلقائيًا.'),
  safetyTest:T('حدد خلل السلامة','اختر المشكلة في الرد الافتراضي.','عندما تسجلها.','لا تعرض اللعبة تعليمات ضارة فعلية.'),
  safetyOutcome:T('طبّق تعديل السياسة','نفّذ التغيير ثم انتقل لإعادة الاختبار.','عندما يصبح التعديل جاهزًا لإعادة الاختبار.','هذا ليس تغيير أوزان.'),
  safetyRetest:T('أعد اختبار السلوك','تحقق من زوال المشكلة وثبت النتيجة.','عندما تثبت النتيجة.','التعديل بلا إعادة اختبار لا يغلق الخلل.'),
  governanceReview:T('أغلق حواجز البيانات المفتوحة','عالج كل مادة غير محسومة بحسب نوع المشكلة.','عندما تصبح مواد النسخة قابلة للمرور.','تغيير مادة مستخدمة يبطل أدلة النسخة الحالية.'),
  releaseGateReview:T('راجع بوابات الإصدار','ثبت الأدلة، وشخّص السعة ثم أصلحها ثم أعد قياسها.','عندما تكتمل البوابات الأربع.','التشخيص والإصلاح والقياس خطوات مختلفة.'),
  launchDecision:T('اتخذ قرار الإصدار','نفّذ الفحوص الإضافية الآن أو انقل المفتوح منها للمراقبة.','عندما تعتمد القرار.','قرار الإصدار لا يفتح الخدمة.'),
  launchOutcome:T('انتقل من قرار الإصدار إلى التشغيل','راجع القرار ثم ابدأ تجهيز التشغيل.','عندما تبدأ مرحلة التشغيل.','فتح الحركة فعل مستقل.'),
  deployLoad:T('اضبط توزيع الحمل','وزع 100% مع احترام سعة كل مركز.','عندما تحفظ التوزيع.','صلاحية الحالة العادية لا تعني المرونة.'),
  deployFailover:T('اختبر خروج المراكز الثلاثة','نفذ كل حالة واقرأ سبب نجاحها أو فشلها، ثم حسّن التوزيع أو سجل القيد.','عندما تصبح نتيجة المرونة صريحة.','السقف لا يكشف قبل الاختبار.'),
  deployGoLive:T('افتح حركة المستخدمين','نفذ فتح الحركة كفعل مستقل.','عندما تصبح الخدمة متاحة.','الجاهزية لا تساوي فتح الخدمة.'),
  deployMonitoring:T('نفّذ الفحوص المؤجلة','ابدأ نافذة المراقبة وأغلق دين التحقق.','عندما لا يبقى فحص مفتوح.','استمرار الخدمة لا يغلق الدين.'),
  deployIncident:T('شخّص سبب الحادث','افحص الشبكة والخوادم وخدمة النموذج.','عندما تحدد المشتبه وتختار مسار الاستعادة.','المرونة لا تثبت سبب الحادث.'),
  onCall:T('تحقق من الاستعادة','ثبت القياسات ثم احسم مصير الإصدار المشتبه به.','عندما تصبح العودة مثبتة ومصير الخطر صريحًا.','إجراء الاستعادة ليس دليل نجاح.'),
  supportTask:T('عالج البلاغ الحالي','وازن بين سرعة الاستعادة وحفظ الأدلة.','عندما تعالج البلاغين.','البديلان يختلفان في السرعة والأدلة.'),
  deployEnd:T('راجع أعمال التشغيل','راجع التوزيع والمرونة وفتح الحركة والمراقبة والاستعادة والدعم.','عندما تركب الصورة الكاملة.','التشغيل عمل مستمر.'),
  pipelineAssemble:T('صنّف أجزاء الرحلة زمنيًا','راجع ما بُني تاريخيًا وما يحدث مع الطلب وما يستمر في التشغيل.','عندما تعود إلى الطلب والإجابة الأصلية.','ترتيب اللعب ليس خطًا هندسيًا زمنيًا.'),
  finalAnswer:T('اربط الإجابة بما جعلها ممكنة','قارن ما بُني قبل الطلب بما يحدث عند الإرسال وما يستمر في التشغيل.','عندما تنتقل إلى اختبار نقل الفكرة.','قرارات بعيدة لا تغيّر نص الإجابة بلا علاقة سببية.'),
  transferChallenge:T('صنّف العناصر الخمسة','ضع كل عنصر في زمنه السببي الصحيح.','عندما تصنف العناصر الخمسة تصنيفًا صحيحًا.','الهدف نقل معيار السببية إلى منتج آخر.'),
  results:T('راجع نتيجة الرحلة','راجع البشر والقرارات وسلسلة البيانات وأي دين متبقٍ.','هذه هي الخاتمة النهائية للعبة.','النتيجة تلخص ما حدث ولا تعيد كتابة التاريخ.')
};
const CHAPTER=/^ch(\d+)Intro$/,ABSTRACT=/^abstract(\d+)$/;
function stageTask(number){return STAGE_TASKS[['mining','factory','datacenter','data','annotation','training','evaluation','deployment'][number-1]];}
function taskFor(scene){if(TASKS[scene])return TASKS[scene];const chapter=scene.match(CHAPTER);if(chapter)return stageTask(Number(chapter[1]));if(ABSTRACT.test(scene))return T('راجع اختصار المرحلة','اقرأ الأدوار والناتج ثم تابع.','عندما تبدأ المرحلة التالية.','هذه شاشة انعكاس لا مهمة تشغيلية.');return STAGE_TASKS[stageForScene(scene)]||T('أكمل الخطوة الحالية','نفذ الإجراء الظاهر.','عندما يصبح الانتقال متاحًا.','لا تعتبر العمل مكتملًا قبل دليل.');}
function statusFor(scene,state){
  const f=state.flags;
  if(ABSTRACT.test(scene)||['dcWorkers','dataCleanSummary','annotationEnd','trainingEval','launchOutcome','deployEnd','results'].includes(scene))return'complete';
  if(scene==='mineEnd')return f.miningIncidentChoice==='continue'&&f.miningInspectionStage!=='verified'?'debt':'complete';
  if(scene==='mineTask'&&f.miningWarning)return f.miningForcedInspection?'action':'decision';
  if(scene==='mineInspection')return f.miningInspectionStage==='verified'?'complete':'action';
  if(scene==='factoryIncident'||scene==='dcCooling'||scene==='trainingRun'||scene==='launchDecision')return'decision';
  if(scene==='factoryOutcome'){if(f.factoryDisposition===null&&f.factoryChoice==='continue'&&f.factoryProductionStage==='inspected')return'decision';if(f.factoryDisposition==='carry'&&f.factoryProductionStage==='inspected')return'debt';return f.factoryProductionStage==='inspected'&&f.factoryRemediationStage==='verified'?'complete':'action';}
  if(scene==='dcCoolingOutcome')return f.dcCoolingStage==='verified'?'complete':'action';
  if(scene==='annotationReview')return f.annotationResults.some(result=>result.reviewRejected||!result.acceptedAsReasonable)?'decision':'action';
  if(scene==='trainingRecovery')return'action';
  if(scene==='checkpointEval')return f.checkpointEvalComplete?'complete':'active';
  if(scene==='safetyTest')return'decision';
  if(['safetyOutcome','safetyRetest','governanceReview','releaseGateReview','deployGoLive','deployMonitoring'].includes(scene))return'action';
  if(scene==='deployFailover'){if(f.deployFailoverChecks.length<3)return'action';return hasFailoverChoice(state)?'decision':'action';}
  if(scene==='deployIncident')return f.deployTabs.length===3?'decision':'active';
  if(scene==='onCall'){if(recoveryDispositionComplete(state))return'complete';if(f.deployRecovery==='restart'&&f.deployRecoveryVerifiedFor==='restart'&&f.deployRecoveryDisposition===null)return'decision';return'action';}
  if(scene==='supportTask')return'decision';
  if(scene==='transferChallenge')return f.transferChoice==='build-use'?'complete':'active';
  return'active';
}
function hasFailoverChoice(state){const f=state.flags;if(!Array.isArray(f.deployLoad)||f.deployFailoverChecks.length!==3)return false;return survivableFailures(f.deployLoad)<MAX_SURVIVABLE_FAILURES;}
function factoryProgress(f){const production=f.factoryProductionStage==='idle'?'لم تبدأ':f.factoryProductionStage==='awaiting-completion'?'تنتظر الإكمال':f.factoryProductionStage==='complete'?'تنتظر الفحص':'اجتازت الفحص';return`الدفعة: ${production} — الصيانة: ${f.factoryMaintenanceDebt?'مفتوحة':'مغلقة'}`;}
function progress(stage,state,scene){const f=state.flags;if(stage==='mining')return`الحصة: ${f.miningCount}/12 — الوقت: ${f.miningMinutes}/72 دقيقة`;if(stage==='factory')return factoryProgress(f);if(stage==='datacenter')return`التبريد: ${f.dcCoolingStage==='verified'?'مغلق':f.dcCoolingStage==='repaired'?'ينتظر التحقق':f.dcCoolingStage==='open'?'عطل مفتوح':`تركيب ${f.serverSteps.length}/4`}`;if(stage==='data')return`مراجعة الدفعة: ${f.dataIndex}/${DATA_ITEMS.length}`;if(stage==='annotation')return`المهام: ${f.annotationResults.length}/${ANNOTATION_TASKS.length} — غير مدفوع: ${f.annotationUnpaidMinutes} دقيقة`;if(stage==='training')return scene==='trainingRecovery'?`الاستعادة: ${f.trainingRecoveryStage==='none'?'تنتظر الإصلاح':f.trainingRecoveryStage==='repaired'?'تنتظر التحقق':'8/8 مثبتة — الاستئناف متبقٍ'}`:`النسخة ${f.candidateRevision||'قيد الإعداد'}`;if(stage==='evaluation'){if(scene==='launchOutcome')return`قرار الإصدار: ${f.launchChoice==='fast'?'مع دين مراقبة':f.launchChoice==='delay'?'بعد إغلاق الفحوص':'معتمد'} — البوابات: ${f.releaseGates.length}/4`;if(['releaseGateReview','launchDecision'].includes(scene))return`بوابات الإصدار: ${f.releaseGates.length}/4`;return`مهام التقييم: ${Math.min(f.evalIndex,EVAL_TASKS.length)}/${EVAL_TASKS.length}`;}if(stage==='deployment'){if(scene==='deployFailover')return`اختبار الخروج: ${f.deployFailoverChecks.length}/3`;if(scene==='deployGoLive')return f.deployTrafficOpen?'الحركة مفتوحة':'الحركة مغلقة';if(scene==='deployMonitoring')return`فحوص المراقبة: ${f.monitoringChecksCompleted.length}/${f.deferredExtraChecks.length}`;if(scene==='deployIncident')return`التشخيص: ${f.deployTabs.length}/3`;if(scene==='supportTask')return`البلاغات: ${f.supportIndex}/${SUPPORT_TASKS.length}`;return f.deployDraftLoad?'تعديل المحاولة السابقة':'';}return'';}
export function sceneGuidance(scene,state){let p=progress(stageForScene(scene),state,scene);if(scene==='transferChallenge')p=state.flags.transferChoice==='build-use'?'التصنيف مكتمل':'5 عناصر تحتاج تصنيفًا';if(scene==='results')p=`النسخة الحالية: ${state.flags.candidateRevision} — قرارات: ${state.decisions.length}`;return taskPanel(taskFor(scene),{status:statusFor(scene,state),progress:p,compact:true});}
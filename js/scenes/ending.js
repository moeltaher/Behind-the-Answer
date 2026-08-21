import { CHAPTERS } from '../data/chapters.js';
import { DEMO_PROMPT } from '../data/story.js';
import { storyCharacters } from '../data/characters.js';
import { characterGrid } from '../components/character-card.js';
import { EVAL_TASKS } from '../data/content-tasks.js';

const PIPELINE_STEPS = CHAPTERS.slice(0, -1).map(chapter => chapter.pipelineLabel);
const REQUIRED_DC_REVEALS = 3;
const SECONDARY_LABOR = [
  'عمال النقل والمعالجة',
  'فرق الصيانة والفحص',
  'عمال النظافة والأمن',
  'فنيو الكهرباء والتبريد والكابلات',
  'مشغلو الشبكات',
  'مختبرو السلامة',
  'مراجعو اللغة'
];
const FIXED_ANSWER = 'أعتذر عن التأخر في تسليم العمل. واجهت ظرفًا أدى إلى تأخير الإنجاز، وأعمل حاليًا على استكماله في أقرب وقت. أشكرك على تفهمك.';

function discovery(state) {
  return {
    dataOrigins: state.flags.dataOrigins.length,
    extraWorkers: Math.max(0, state.flags.revealedWorkers.length - REQUIRED_DC_REVEALS)
  };
}

function selectedDecisions(state, matcher) {
  return state.decisions.filter(decision => matcher(decision.id));
}

function decisionRows(decisions, h) {
  if (!decisions.length) return '<p class="muted">لا توجد قرارات مسجلة في هذا المحور.</p>';
  return decisions.map(decision => `<div class="decision-row"><strong>${h(decision.label)}</strong><div class="small muted">${h(decision.effectText)}</div></div>`).join('');
}

function deliveryState(state) {
  if (state.flags.deployRecovery === 'restart') {
    return {
      time: '2.4 ثانية',
      status: 'احتاج الطلب إلى إعادة محاولة واحدة في سيناريو اللعب لأن إعادة التشغيل أعادت الخدمة بسرعة من دون إزالة المشتبه به نفسه.'
    };
  }
  return {
    time: '1.3 ثانية',
    status: 'وصل الطلب بعد استعادة الخدمة إلى الإصدار السابق المشتبه بأنه أكثر استقرارًا في هذا السيناريو.'
  };
}

export function createEndingRoutes(ctx) {
  const h = ctx.h;
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, addLedger, renderLedger, resetGame } = ctx;
  const ledgerDialog = ctx.ledgerDialog;
  const people = storyCharacters();

  function ch9Intro() { chapterIntro(8, 'pipelineAssemble'); }

  function pipelineAssemble() {
    html(`<div class="centered"><span class="eyebrow">تجميع الرحلة</span><h1 class="scene-title">رحلة اللعب خطية، لكن النظام الحقيقي ليس خطًا واحدًا.</h1><div class="system-map"><section class="view-panel"><h3>السلسلة المادية</h3><div class="view-list"><span>استخراج ومعالجة مواد</span><span>مكونات وأجهزة</span><span>خوادم ومركز بيانات</span></div></section><section class="view-panel"><h3>دورة تطوير النموذج</h3><div class="view-list"><span>بيانات</span><span>↔ تصنيف ومراجعة</span><span>↔ تدريب</span><span>↔ تقييم</span></div><p class="small muted">قد تتكرر هذه الأعمال أكثر من مرة ولا تقع دائمًا بالترتيب نفسه.</p></section><section class="view-panel"><h3>التشغيل</h3><div class="view-list"><span>إطلاق</span><span>استخدام</span><span>تشغيل ودعم</span><span>↺ معلومات تعود إلى التطوير</span></div></section></div><div class="reality-note reality-note--wide"><strong>الدقة الزمنية</strong> عندما ترسل طلبًا الآن لا يبدأ التعدين والتصنيع والتدريب من جديد. هذه المراحل بنت النظام سابقًا، بينما الاستخدام اللحظي يعتمد على البنية القائمة.</div><div class="action-row center"><button id="compressAI" class="primary-btn">شاهد كيف تختصر الواجهة هذا كله</button></div></div>`);
    $('#compressAI').addEventListener('click', () => go('aiAbstraction'));
  }

  function aiAbstraction() {
    html(`<div class="abstraction-stage"><div class="centered"><div class="view-list abstraction-summary">${PIPELINE_STEPS.map(step => `<span>${h(step)}</span>`).join('')}</div><div class="pipeline-arrow">↓</div><div class="abstract-word filled">ذكاء اصطناعي</div><p class="muted">تضغط الواجهة مراحل ومواد وأعمالًا متعددة داخل اسم واحد وتجربة استخدام بسيطة.</p><div class="action-row center"><button id="backPrompt" class="primary-btn">ارجع إلى الطلب التجريبي</button></div></div></div>`);
    $('#backPrompt').addEventListener('click', () => go('finalAnswer'));
  }

  function finalAnswer() {
    const delivery=deliveryState(state);
    html(`<div class="chat-shell"><div class="chat-logo">ن</div><div class="message user">${h(DEMO_PROMPT)}</div><div class="message ai"><strong>الإجابة:</strong><br>${h(FIXED_ANSWER)}</div><div class="delivery-state"><strong>${delivery.time} — زمن افتراضي</strong><span>${h(delivery.status)}</span></div><div class="reality-note"><strong>ما الذي تغير وما الذي لم يتغير؟</strong> صياغة رسالة الاعتذار ثابتة لأن قرارات التعدين والتصنيع والتبريد لا تجعل الجملة نفسها أفضل لغويًا. لكن قرار الاستعادة في التشغيل أصبح له أثر مرئي على كيفية وصول الطلب في سيناريو اللعب.</div><div class="action-row"><button id="behindAnswer" class="primary-btn">افتح ما وراء هذه اللحظة</button></div></div>`);
    $('#behindAnswer').addEventListener('click', () => go('timelineReveal'));
  }

  function timelineReveal() {
    const delivery=deliveryState(state);
    html(`<div><span class="eyebrow">لحظة إرسال الطلب</span><h1 class="display-title">${delivery.time} ليست عمر السلسلة</h1><div class="dual-view"><div class="view-panel"><h3>ما بُني قبل طلبك</h3><div class="view-list"><span>الأجهزة</span><span>مراكز البيانات</span><span>البيانات</span><span>التدريب</span><span>التقييم</span><span>الإطلاق</span></div></div><div class="view-panel"><h3>ما يحدث عند الضغط على «إرسال»</h3><div class="view-list"><span>يصل الطلب إلى الخدمة</span><span>تستقبله الخوادم</span><span>يشغَّل النموذج</span><span>تعود النتيجة أو يعاد الطلب إذا فشلت المحاولة</span></div></div></div><div class="action-row"><button id="showPeople" class="primary-btn">أعد البشر إلى الصورة</button></div></div>`);
    $('#showPeople').addEventListener('click', () => go('peopleReveal'));
  }

  function peopleReveal() {
    html(`<div class="centered"><span class="eyebrow">ما أخفته الكلمات المختصرة</span><h1 class="scene-title">لم ينتج هؤلاء الأشخاص إجابتك كلمةً كلمة.</h1><p class="scene-subtitle">لكن أنواع العمل التي يمثلونها ساهمت في بناء وتشغيل البنية التي جعلت الإجابة ممكنة.</p><div class="people-wall">${characterGrid(people)}</div><div class="card flat"><h2>وأدوار أخرى ظهرت في الرحلة</h2><div class="view-list">${SECONDARY_LABOR.map(role => `<span>${h(role)}</span>`).join('')}</div></div><div class="action-row center"><button id="showResults" class="primary-btn">افتح نتيجة رحلتك</button></div></div>`);
    $('#showResults').addEventListener('click', () => go('results'));
  }

  function results() {
    const explored = discovery(state);
    const labor = selectedDecisions(state, id => id.startsWith('mine-') || id.startsWith('annotation-'));
    const materialAndData = selectedDecisions(state, id => id.startsWith('factory-') || id.startsWith('data-') || id.startsWith('dc-'));
    const trainingAndLaunch = selectedDecisions(state, id => id.startsWith('training-') || id.startsWith('train-') || id.startsWith('safety-') || id.startsWith('launch-'));
    const operations = selectedDecisions(state, id => id.startsWith('deploy-') || id.startsWith('support-'));
    const safety = state.flags.safetyChoice === 'details'
      ? 'اكتشفت الخلل في اختبار السلامة، ثم مر عبر إصلاح وإعادة اختبار قبل قرار الجاهزية.'
      : 'لم تلتقط الخلل أولًا؛ أوقفته مراجعة ثانية ثم مر عبر إصلاح وإعادة اختبار قبل قرار الجاهزية.';
    const evaluation = `طابقت معيار السيناريو في ${state.flags.evalCorrectCount} من ${EVAL_TASKS.length} مهام تقييم. هذه نتيجة لأداء المقيّم، وليست درجة جودة للنموذج.`;

    html(`<div><span class="eyebrow">نتيجة رحلتك</span><h1 class="display-title">النتيجة أدلة من قراراتك، لا متوسط نقاط.</h1><p class="scene-subtitle">كل محور يعرض القرارات والآثار التي رأيتها. لا توجد أرقام خفية تجمع عبء عامل مع تكلفة شركة أو خطر تقني في درجة واحدة.</p><div class="evidence-results"><section class="evidence-card"><h2>العمل والوقت</h2><div class="decision-list">${decisionRows(labor,h)}</div></section><section class="evidence-card"><h2>المواد والبيانات والبنية</h2><div class="decision-list">${decisionRows(materialAndData,h)}</div></section><section class="evidence-card"><h2>التدريب والتحقق والسلامة</h2><div class="decision-list">${decisionRows(trainingAndLaunch,h)}</div></section><section class="evidence-card"><h2>التشغيل ودعم المستخدم</h2><div class="decision-list">${decisionRows(operations,h)}</div></section></div><div class="dual-view"><div class="view-panel"><h3>عملية التقييم البشري</h3><p>${h(evaluation)}</p></div><div class="view-panel"><h3>اختبار السلامة</h3><p>${h(safety)}</p></div></div><div class="card flat discovery-summary"><h2>استكشاف إضافي</h2><p>فتحت ${explored.dataOrigins} من بطاقات مصادر البيانات، وكشفت ${explored.extraWorkers} أدوار إضافية في مركز البيانات بعد الحد الأدنى المطلوب. هذا عداد استكشاف، وليس درجة نجاح.</p></div><div class="action-row"><button id="resultsLedger" class="secondary-btn">عرض دفتر السلسلة</button><button id="toFinalMessage" class="primary-btn">إلى الخاتمة</button></div></div>`);
    $('#resultsLedger').addEventListener('click', () => { renderLedger(); ledgerDialog.showModal(); });
    $('#toFinalMessage').addEventListener('click', () => go('finalMessage'));
  }

  function finalMessage() {
    addLedger(8,'المستخدم','كتابة الطلب وقراءة النتيجة','الإجابة التي يراها المستخدم','الواجهة هي نهاية السلسلة، وليست بدايتها.');
    html(`<div class="centered"><span class="eyebrow">نهاية الرحلة</span><h1 class="display-title">الواجهة هي نهاية السلسلة، وليست بدايتها.</h1><p class="scene-subtitle">الإجابة تظهر في لحظة. السلسلة التي جعلتها ممكنة لا تظهر معها.</p><div class="dual-view final-comparison"><div class="view-panel"><h3>ما يظهر في المنتج</h3><div class="view-list"><span>اسم المنتج</span><span>مربع المحادثة</span><span>زر إرسال</span><span>إجابة سريعة</span></div></div><div class="view-panel"><h3>ما تختصره الواجهة</h3><div class="view-list"><span>عمال</span><span>مصانع</span><span>مراكز بيانات</span><span>مؤلفون</span><span>مراجعون</span><span>طاقة</span><span>وقت</span></div></div></div><p class="sources-note">الشخصيات والشركات والأرقام داخل اللعبة خيالية ومركبة. الغرض تمثيل أنواع من العمل والحوافز والمخاطر، لا وصف سلسلة توريد واحدة لكل نموذج.</p><div class="action-row center"><button id="replay" class="secondary-btn">ابدأ الرحلة مرة أخرى</button><button id="method" class="primary-btn">اقرأ عن المنهجية</button></div></div>`);
    $('#replay').addEventListener('click', () => resetGame(true));
    $('#method').addEventListener('click', () => go('methodology'));
  }

  function methodology() {
    html(`<div><span class="eyebrow">عن اللعبة</span><h1 class="scene-title">المنهجية والدقة التقنية</h1><div class="card flat"><h2>ما الذي تمثله اللعبة؟</h2><p>تجربة تعليمية مبسطة حول السلسلة المادية والبشرية المرتبطة بأنظمة الذكاء الاصطناعي. الشخصيات والأرقام خيالية ومركبة.</p></div><div class="card flat methodology-card"><h2>كيف تُقرأ النتائج؟</h2><p>النتائج تعرض أدلة من القرارات نفسها. لا توجد منظومة نقاط خفية وراء النتيجة النهائية، كما تفصل اللعبة بين أداء المقيّم واختبار السلامة وقرار الجاهزية وموثوقية التشغيل.</p></div><div class="card flat methodology-card"><h2>لماذا تبدو الرحلة خطية؟</h2><p>هذا ترتيب تعليمي. في الواقع قد تتكرر أعمال البيانات والتصنيف والتدريب والتقييم، وقد تعود معلومات التشغيل إلى التطوير.</p></div><div class="card flat methodology-card"><h2>الفرق بين بناء النظام واستخدامه</h2><p>استخراج المواد وتصنيع الأجهزة وتجهيز البيانات والتدريب والتقييم تحدث قبل الاستخدام النهائي. عندما ترسل طلبًا، تستخدم الخدمة بنية ونموذجًا بُنيا سابقًا.</p></div><div class="card flat methodology-card"><h2>الخصوصية</h2><p>لا يوجد خادم خلفي ولا حساب مستخدم. تحفظ اللعبة تقدمك وإعداداتك داخل التخزين المحلي في متصفحك فقط.</p></div><div class="action-row"><button id="methodHome" class="primary-btn">العودة إلى النهاية</button></div></div>`);
    $('#methodHome').addEventListener('click', () => go('finalMessage'));
  }

  return { ch9Intro,pipelineAssemble,aiAbstraction,finalAnswer,timelineReveal,peopleReveal,results,finalMessage,methodology };
}

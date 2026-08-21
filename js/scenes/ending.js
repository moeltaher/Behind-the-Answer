import { CHAPTERS } from '../data/chapters.js';
import { DEMO_PROMPT } from '../data/story.js';
import { storyCharacters } from '../data/characters.js';
import { characterGrid } from '../components/character-card.js';

const PIPELINE_STEPS = CHAPTERS.slice(0, -1).map(chapter => chapter.pipelineLabel);
const BASELINE = {
  pressure: 50,
  cost: 50,
  burden: 42,
  dataQuality: 62,
  modelQuality: 62,
  reliability: 62,
  serviceQuality: 62
};
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

function direction(value, baseline) {
  const delta = value - baseline;
  if (delta >= 4) return ['↑', 'زاد'];
  if (delta <= -4) return ['↓', 'انخفض'];
  return ['→', 'بقي قريبًا من نقطة البداية'];
}

function resultCard(title, key, value, interpretation) {
  const [arrow, label] = direction(value, BASELINE[key]);
  return `<article class="metric-card"><span>${title}</span><strong>${arrow} ${label}</strong><small>${interpretation}</small></article>`;
}

function resultInterpretation(name, value) {
  const delta = value - BASELINE[name];
  const up = delta >= 4;
  const down = delta <= -4;
  const copies = {
    pressure: up ? 'قرارات أكثر حافظت على السرعة والموعد تحت ضغط.' : down ? 'قرارات أكثر منحت مساحة للتوقف والفحص.' : 'لم يتحرك ضغط السرعة كثيرًا عن نقطة البداية.',
    cost: up ? 'تحملت الشركة وقتًا أو حوسبة أو مراجعة إضافية في قرارات أكثر.' : down ? 'اختيارات أكثر خفضت تكلفة الشركة أو وقتها المباشر.' : 'لم تتحرك تكلفة الشركة كثيرًا عن نقطة البداية.',
    burden: up ? 'انتقل ضغط أو مخاطرة أكبر إلى العمال.' : down ? 'انخفض العبء النسبي على العمال في عدد أكبر من القرارات.' : 'ظل عبء العامل قريبًا من نقطة البداية.',
    dataQuality: up ? 'قرارات التجهيز والتصنيف كانت أكثر حذرًا واتساقًا مع معيار السيناريو.' : down ? 'تراكمت اختيارات أضعفت حذر تجهيز البيانات.' : 'ظل مسار البيانات قريبًا من نقطة البداية.',
    modelQuality: up ? 'إجاباتك في مهام الملاءمة طابقت معيار السيناريو بدرجة أكبر.' : down ? 'فاتتك معايير ملاءمة أكثر في مهام التقييم.' : 'ظل أداء مهام الملاءمة قريبًا من نقطة البداية.',
    reliability: up ? 'قرارات البنية والتحقق والاستعادة دعمت موثوقية أكبر.' : down ? 'بقيت مخاطر تشغيل أو تحقق أكبر.' : 'بقيت الموثوقية قريبة من نقطة البداية.',
    serviceQuality: up ? 'عولجت بلاغات المستخدمين بطريقة ربطتها بالحادث بصورة أفضل.' : down ? 'اختيارات الدعم فقدت بعض معلومات الحادث أو اعتمدت على استجابة عامة.' : 'بقيت جودة الدعم قريبة من نقطة البداية.'
  };
  return copies[name];
}

function discovery(state) {
  return {
    dataOrigins: state.flags.dataOrigins.length,
    extraWorkers: Math.max(0, state.flags.revealedWorkers.length - REQUIRED_DC_REVEALS)
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
    html(`<div class="chat-shell"><div class="chat-logo">ن</div><div class="message user">${h(DEMO_PROMPT)}</div><div class="message ai"><strong>الإجابة:</strong><br>${h(FIXED_ANSWER)}</div><div class="small muted">ظهرت الإجابة خلال 1.2 ثانية — زمن افتراضي داخل اللعبة</div><div class="reality-note"><strong>لماذا لم تتغير صياغة الإجابة حسب كل قراراتك؟</strong> لأن قرارات التعدين والتصنيع والتبريد والسلامة والدعم لا تربطها علاقة سببية مباشرة بصياغة رسالة الاعتذار هذه. تظهر آثارها في نتيجة الرحلة بدل صناعة سببية غير حقيقية.</div><div class="action-row"><button id="behindAnswer" class="primary-btn">افتح ما وراء هذه اللحظة</button></div></div>`);
    $('#behindAnswer').addEventListener('click', () => go('timelineReveal'));
  }

  function timelineReveal() {
    html(`<div><span class="eyebrow">لحظة إرسال الطلب</span><h1 class="display-title">1.2 ثانية ليست عمر السلسلة</h1><div class="dual-view"><div class="view-panel"><h3>ما بُني قبل طلبك</h3><div class="view-list"><span>الأجهزة</span><span>مراكز البيانات</span><span>البيانات</span><span>التدريب</span><span>التقييم</span><span>الإطلاق</span></div></div><div class="view-panel"><h3>ما يحدث عند الضغط على «إرسال»</h3><div class="view-list"><span>يصل الطلب إلى الخدمة</span><span>تستقبله الخوادم</span><span>يشغَّل النموذج</span><span>تعود النتيجة</span></div></div></div><div class="action-row"><button id="showPeople" class="primary-btn">أعد البشر إلى الصورة</button></div></div>`);
    $('#showPeople').addEventListener('click', () => go('peopleReveal'));
  }

  function peopleReveal() {
    html(`<div class="centered"><span class="eyebrow">ما أخفته الكلمات المختصرة</span><h1 class="scene-title">لم ينتج هؤلاء الأشخاص إجابتك كلمةً كلمة.</h1><p class="scene-subtitle">لكن أنواع العمل التي يمثلونها ساهمت في بناء وتشغيل البنية التي جعلت الإجابة ممكنة.</p><div class="people-wall">${characterGrid(people)}</div><div class="card flat"><h2>وأدوار أخرى ظهرت في الرحلة</h2><div class="view-list">${SECONDARY_LABOR.map(role => `<span>${h(role)}</span>`).join('')}</div></div><div class="action-row center"><button id="showResults" class="primary-btn">افتح نتيجة رحلتك</button></div></div>`);
    $('#showResults').addEventListener('click', () => go('results'));
  }

  function results() {
    const metrics = state.metrics;
    const explored = discovery(state);
    const decisions = state.decisions.length
      ? state.decisions.map(decision => `<div class="decision-row"><strong>${h(decision.label)}</strong><div class="small muted">${h(decision.effectText)}</div></div>`).join('')
      : '<p class="muted">لم تسجل قرارات بعد.</p>';
    const safety = state.flags.safetyChoice === 'details'
      ? 'اكتشفت مشكلة السلامة في الاختبار.'
      : 'فاتتك مشكلة السلامة في الاختبار.';
    const verification = state.flags.launchChoice === 'delay'
      ? 'اخترت إكمال نطاق التحقق قبل الإطلاق.'
      : 'اخترت الإطلاق بعد الاختبارات الحرجة فقط.';

    html(`<div><span class="eyebrow">نتيجة رحلتك</span><h1 class="display-title">النتيجة اتجاهات، لا درجة واحدة.</h1><p class="scene-subtitle">تعرض البطاقات كيف حركت قراراتك كل بُعد مقارنة بنقطة البداية الافتراضية. لا تمثل الأرقام الداخلية درجة أخلاقية أو مقياسًا حقيقيًا من 100.</p><div class="results-grid">${resultCard('ضغط الإنتاج','pressure',metrics.pressure,resultInterpretation('pressure',metrics.pressure))}${resultCard('تكلفة الشركة','cost',metrics.cost,resultInterpretation('cost',metrics.cost))}${resultCard('عبء العامل','burden',metrics.burden,resultInterpretation('burden',metrics.burden))}${resultCard('حوكمة وجودة البيانات','dataQuality',metrics.dataQuality,resultInterpretation('dataQuality',metrics.dataQuality))}${resultCard('ملاءمة المخرجات','modelQuality',metrics.modelQuality,resultInterpretation('modelQuality',metrics.modelQuality))}${resultCard('موثوقية البنية والخدمة','reliability',metrics.reliability,resultInterpretation('reliability',metrics.reliability))}${resultCard('جودة دعم المستخدم','serviceQuality',metrics.serviceQuality,resultInterpretation('serviceQuality',metrics.serviceQuality))}</div><div class="dual-view"><div class="view-panel"><h3>السلامة</h3><p>${h(safety)}</p></div><div class="view-panel"><h3>تغطية التحقق قبل الإطلاق</h3><p>${h(verification)}</p></div></div><div class="card flat discovery-summary"><h2>استكشاف إضافي</h2><p>فتحت ${explored.dataOrigins} من بطاقات مصادر البيانات، وكشفت ${explored.extraWorkers} أدوار إضافية في مركز البيانات بعد الحد الأدنى المطلوب. هذا عداد استكشاف، وليس درجة نجاح.</p></div><div class="card flat results-decisions"><h2>قراراتك</h2><div class="decision-list">${decisions}</div></div><div class="action-row"><button id="resultsLedger" class="secondary-btn">عرض دفتر السلسلة</button><button id="toFinalMessage" class="primary-btn">إلى الخاتمة</button></div></div>`);
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
    html(`<div><span class="eyebrow">عن اللعبة</span><h1 class="scene-title">المنهجية والدقة التقنية</h1><div class="card flat"><h2>ما الذي تمثله اللعبة؟</h2><p>تجربة تعليمية مبسطة حول السلسلة المادية والبشرية المرتبطة بأنظمة الذكاء الاصطناعي. الشخصيات والأرقام خيالية ومركبة.</p></div><div class="card flat methodology-card"><h2>كيف تُقرأ النتائج؟</h2><p>النتائج اتجاهات مقارنة بنقطة بداية افتراضية، وليست درجات جودة أو أحكامًا أخلاقية. كما تفصل اللعبة بين ملاءمة المخرجات والسلامة والجاهزية وموثوقية الخدمة.</p></div><div class="card flat methodology-card"><h2>لماذا تبدو الرحلة خطية؟</h2><p>هذا ترتيب تعليمي. في الواقع قد تتكرر أعمال البيانات والتصنيف والتدريب والتقييم، وقد تعود معلومات التشغيل إلى التطوير.</p></div><div class="card flat methodology-card"><h2>الفرق بين بناء النظام واستخدامه</h2><p>استخراج المواد وتصنيع الأجهزة وتجهيز البيانات والتدريب والتقييم تحدث قبل الاستخدام النهائي. عندما ترسل طلبًا، تستخدم الخدمة بنية ونموذجًا بُنيا سابقًا.</p></div><div class="card flat methodology-card"><h2>الخصوصية</h2><p>لا يوجد خادم خلفي ولا حساب مستخدم. تحفظ اللعبة تقدمك وإعداداتك داخل التخزين المحلي في متصفحك فقط.</p></div><div class="action-row"><button id="methodHome" class="primary-btn">العودة إلى النهاية</button></div></div>`);
    $('#methodHome').addEventListener('click', () => go('finalMessage'));
  }

  return { ch9Intro,pipelineAssemble,aiAbstraction,finalAnswer,timelineReveal,peopleReveal,results,finalMessage,methodology };
}

import { CHAPTERS } from '../data/chapters.js';
import { DEMO_PROMPT } from '../data/story.js';
import { storyCharacters } from '../data/characters.js';
import { characterGrid } from '../components/character-card.js';

const PIPELINE_STEPS = CHAPTERS.slice(0, -1).map(chapter => chapter.pipelineLabel);
const REQUIRED_DC_REVEALS = 3;
const OPTIONAL_DC_REVEALS = 3;
const OPTIONAL_DATA_ORIGINS = 12;
const DISCOVERY_MAX = OPTIONAL_DC_REVEALS + OPTIONAL_DATA_ORIGINS;

const SECONDARY_LABOR = [
  'عمال النقل والمعالجة',
  'فرق الصيانة والفحص',
  'عمال النظافة والأمن',
  'فنيو الكهرباء والتبريد والكابلات',
  'مشغلو الشبكات',
  'مختبرو السلامة',
  'مراجعو اللغة'
];

function renderPipeline() {
  return PIPELINE_STEPS.map((step, index) =>
    `<div class="pipeline-step">${step}</div>${index < PIPELINE_STEPS.length - 1 ? '<div class="pipeline-arrow">↓</div>' : ''}`
  ).join('');
}

function level(value) {
  if (value >= 68) return 'مرتفع';
  if (value >= 38) return 'متوسط';
  return 'منخفض';
}

function discoveryCount(state) {
  const optionalWorkers = Math.max(
    0,
    Math.min(OPTIONAL_DC_REVEALS, state.flags.revealedWorkers.length - REQUIRED_DC_REVEALS)
  );
  return optionalWorkers + Math.min(OPTIONAL_DATA_ORIGINS, state.flags.dataOrigins.length);
}

function discoveryPercent(state) {
  return Math.round((discoveryCount(state) / DISCOVERY_MAX) * 100);
}

function resultInterpretation(name, value) {
  const label = level(value);
  const copies = {
    pressure: label === 'مرتفع'
      ? 'ضغط أكبر للحفاظ على السرعة والموعد.'
      : label === 'منخفض'
        ? 'مساحة أكبر للتوقف والفحص.'
        : 'توازن نسبي بين السرعة والتوقف.',
    cost: label === 'مرتفع'
      ? 'الشركة تحملت جزءًا أكبر من تكلفة الوقت والحوسبة والمراجعة.'
      : label === 'منخفض'
        ? 'جرى تقليل تكلفة الشركة في عدد أكبر من القرارات.'
        : 'التكلفة موزعة بين أكثر من طرف.',
    burden: label === 'مرتفع'
      ? 'جزء أكبر من الضغط والمخاطر انتقل إلى العمال.'
      : label === 'منخفض'
        ? 'انخفض العبء النسبي على العمال في قرارات أكثر.'
        : 'عبء العمل بقي متوسطًا عبر السلسلة.',
    dataQuality: label === 'مرتفع'
      ? 'قرارات التجهيز والتصنيف دعمت بيانات أكثر اتساقًا وحذرًا.'
      : label === 'منخفض'
        ? 'تراكمت اختيارات أضعفت جودة مواد البيانات.'
        : 'جودة البيانات متوسطة مع تنازلات واضحة.',
    modelQuality: label === 'مرتفع'
      ? 'اختيارات التدريب والتقييم دعمت مخرجات أفضل في هذا السيناريو.'
      : label === 'منخفض'
        ? 'تراكمت اختيارات أضعفت أداء النموذج في الاختبارات.'
        : 'أداء النموذج متوسط في الاختبارات التي تعرضها اللعبة.',
    reliability: label === 'مرتفع'
      ? 'اختيارات البنية والإطلاق دعمت موثوقية أعلى.'
      : label === 'منخفض'
        ? 'بقيت مخاطر أكبر في البنية أو الإصدار أو الاستعادة.'
        : 'موثوقية البنية والخدمة متوسطة.',
    serviceQuality: label === 'مرتفع'
      ? 'التعامل مع بلاغات المستخدمين كان أكثر دقة وربطًا بالحادث.'
      : label === 'منخفض'
        ? 'عولجت البلاغات بصورة عامة قللت قيمة المعلومات العائدة للتشغيل.'
        : 'جودة التعامل مع المستخدمين متوسطة.'
  };
  return copies[name];
}

function answerForModelQuality(modelQuality) {
  if (modelQuality >= 70) {
    return 'أعتذر عن التأخر في تسليم العمل. واجهت ظرفًا أدى إلى تأخير الإنجاز، وأعمل حاليًا على استكماله في أقرب وقت. أشكرك على تفهمك.';
  }
  if (modelQuality >= 45) {
    return 'أعتذر عن التأخير في تسليم العمل. حصل تأخير في الإنجاز وسأحاول إنهاء المطلوب في أقرب وقت. شكرًا لتفهمك.';
  }
  return 'أعتذر عن التأخير. العمل لم يكتمل في الوقت المحدد بسبب ظروف مختلفة، وسيتم إنهاؤه لاحقًا.';
}

export function createEndingRoutes(ctx) {
  const h = ctx.h;
  const $ = ctx.$;
  const state = ctx.state;
  const {
    setChapter,
    chapterIntro,
    html,
    go,
    addLedger,
    renderLedger,
    resetGame
  } = ctx;
  const metric = ctx.metric;
  const ledgerDialog = ctx.ledgerDialog;
  const people = storyCharacters();

  function ch9Intro() {
    chapterIntro(8, 'pipelineAssemble');
  }

  function pipelineAssemble() {
    setChapter(8);
    html(`<div class="centered"><span class="eyebrow">تجميع الرحلة</span><h1 class="scene-title">هذه هي السلسلة التي مررت بها</h1><div class="pipeline">${renderPipeline()}</div><div class="reality-note reality-note--wide"><strong>تنبيه مهم للدقة:</strong> عندما ترسل طلبًا الآن لا يبدأ عمال التعدين والمصانع عملهم من جديد. هذه المراحل بنت الأجهزة والبيانات والنموذج سابقًا، بينما يعتمد الاستخدام اللحظي على البنية التي أصبحت موجودة بالفعل.</div><div class="action-row center"><button id="compressAI" class="primary-btn">شاهد كيف تختصر الواجهة كل هذه المراحل</button></div></div>`);
    $('#compressAI').addEventListener('click', () => go('aiAbstraction'));
  }

  function aiAbstraction() {
    html(`<div class="abstraction-stage"><div class="centered"><div class="view-list abstraction-summary">${PIPELINE_STEPS.map(step => `<span>${h(step)}</span>`).join('')}</div><div class="pipeline-arrow">↓</div><div class="abstract-word filled">ذكاء اصطناعي</div><p class="muted">تُضغط مراحل ومواد وأعمال كثيرة داخل اسم منتج وواجهة واحدة.</p><div class="action-row center"><button id="backPrompt" class="primary-btn">ارجع إلى الطلب التجريبي</button></div></div></div>`);
    $('#backPrompt').addEventListener('click', () => go('finalAnswer'));
  }

  function finalAnswer() {
    const modelQuality = state.metrics.modelQuality;
    const answer = answerForModelQuality(modelQuality);
    const qualityNote = modelQuality >= 70
      ? 'اختيارات التدريب والتقييم في مسارك دعمت نسخة أكثر ملاءمة في هذا السيناريو.'
      : modelQuality >= 45
        ? 'بعض تنازلات التدريب والتقييم ظهرت في صياغة أقل ملاءمة.'
        : 'تراكمت تنازلات في التدريب والتقييم، لذلك تظهر إجابة أضعف وأكثر عمومية.';

    html(`<div class="chat-shell"><div class="chat-logo">ن</div><div class="message user">${h(DEMO_PROMPT)}</div><div class="message ai"><strong>الإجابة:</strong><br>${h(answer)}</div><div class="small muted">ظهرت الإجابة خلال 1.2 ثانية — زمن افتراضي داخل اللعبة</div><div class="reality-note"><strong>أثر اختيارات النموذج على هذه النسخة</strong>${h(qualityNote)} قرارات التعدين والتصنيع والتشغيل لا تغيّر صياغة الإجابة مباشرة.</div><div class="action-row"><button id="behindAnswer" class="primary-btn">ماذا حدث في هذه اللحظة القصيرة؟</button></div></div>`);
    $('#behindAnswer').addEventListener('click', () => go('timelineReveal'));
  }

  function timelineReveal() {
    html(`<div><span class="eyebrow">لحظة إرسال الطلب</span><h1 class="display-title">1.2 ثانية ليست عمر السلسلة</h1><p class="scene-subtitle">هذا الزمن يمثل طلبًا افتراضيًا في نهاية الرحلة. أما الأجهزة والبيانات والنموذج فبُنيت عبر أعمال حدثت قبل استخدامك له.</p><div class="dual-view"><div class="view-panel"><h3>ما حدث قبل استخدامك للنموذج</h3><div class="view-list"><span>استخراج مواد</span><span>صناعة أجهزة</span><span>إنشاء مراكز بيانات</span><span>إنتاج وتجهيز بيانات</span><span>تدريب</span><span>تقييم</span><span>إطلاق</span></div></div><div class="view-panel"><h3>ما يحدث عندما تضغط «إرسال»</h3><div class="view-list"><span>يصل طلبك إلى الخدمة</span><span>تستقبله الخوادم</span><span>يشغَّل النموذج لإنتاج النتيجة</span><span>تعاد الإجابة إلى شاشتك</span></div></div></div><div class="alert goodish"><strong>المساران مترابطان، لكنهما ليسا الشيء نفسه.</strong><span>الطلب القصير يعتمد على كل ما بُني في المسار الأول.</span></div><div class="action-row"><button id="showPeople" class="primary-btn">أعد البشر إلى الصورة</button></div></div>`);
    $('#showPeople').addEventListener('click', () => go('peopleReveal'));
  }

  function peopleReveal() {
    html(`<div class="centered"><span class="eyebrow">ما أخفته الكلمات المختصرة</span><h1 class="scene-title">لم ينتج هؤلاء الأشخاص إجابتك كلمةً كلمة.</h1><p class="scene-subtitle">لكن أنواع العمل التي يمثلونها ساهمت في بناء وتشغيل البنية التي جعلت إنتاج الإجابة ممكنًا.</p><div class="people-wall">${characterGrid(people)}</div><div class="card flat"><h2>وغيرهم ممن مروا في السلسلة</h2><div class="view-list">${SECONDARY_LABOR.map(role => `<span>${h(role)}</span>`).join('')}</div></div><div class="action-row center"><button id="showResults" class="primary-btn">افتح نتيجة رحلتك</button></div></div>`);
    $('#showResults').addEventListener('click', () => go('results'));
  }

  function results() {
    const metrics = state.metrics;
    const discovery = discoveryPercent(state);
    const found = discoveryCount(state);
    const decisions = state.decisions.length
      ? state.decisions.map(decision => `<div class="decision-row"><strong>${h(decision.label)}</strong><div class="small muted">${h(decision.effectText)}</div></div>`).join('')
      : '<p class="muted">لم تسجل قرارات بعد.</p>';

    html(`<div><span class="eyebrow">نتيجة متعددة الأبعاد</span><h1 class="display-title">سلسلتك ليست وصفًا واحدًا.</h1><p class="scene-subtitle">تعرض النتيجة أبعادًا منفصلة حتى لا تتحول قرارات مختلفة سببيًا إلى رقم جودة واحد مضلل.</p><div class="results-grid">${metric('ضغط الإنتاج', metrics.pressure, level(metrics.pressure))}${metric('تكلفة الشركة', metrics.cost, level(metrics.cost))}${metric('عبء العامل', metrics.burden, level(metrics.burden))}${metric('جودة البيانات', metrics.dataQuality, level(metrics.dataQuality))}${metric('جودة النموذج', metrics.modelQuality, level(metrics.modelQuality))}${metric('موثوقية البنية والخدمة', metrics.reliability, level(metrics.reliability))}${metric('جودة دعم المستخدم', metrics.serviceQuality, level(metrics.serviceQuality))}</div><div class="card flat"><p><strong>ضغط الإنتاج:</strong> ${h(resultInterpretation('pressure', metrics.pressure))}</p><p><strong>تكلفة الشركة:</strong> ${h(resultInterpretation('cost', metrics.cost))}</p><p><strong>عبء العامل:</strong> ${h(resultInterpretation('burden', metrics.burden))}</p><p><strong>جودة البيانات:</strong> ${h(resultInterpretation('dataQuality', metrics.dataQuality))}</p><p><strong>جودة النموذج:</strong> ${h(resultInterpretation('modelQuality', metrics.modelQuality))}</p><p><strong>الموثوقية:</strong> ${h(resultInterpretation('reliability', metrics.reliability))}</p><p><strong>دعم المستخدم:</strong> ${h(resultInterpretation('serviceQuality', metrics.serviceQuality))}</p></div><div class="card flat discovery-summary"><h2>استكشافك الاختياري: ${discovery}%</h2><p>اكتشفت ${found} من ${DISCOVERY_MAX} عنصرًا اختياريًا: مصادر البيانات والأدوار الإضافية في مركز البيانات بعد الحد الأدنى المطلوب. خطوات التشخيص الإلزامية لا تدخل في هذا المؤشر.</p></div><div class="card flat results-decisions"><h2>قراراتك</h2><div class="decision-list">${decisions}</div></div><div class="action-row"><button id="resultsLedger" class="secondary-btn">عرض دفتر السلسلة</button><button id="toFinalMessage" class="primary-btn">إلى الخاتمة</button></div></div>`);

    $('#resultsLedger').addEventListener('click', () => {
      renderLedger();
      ledgerDialog.showModal();
    });
    $('#toFinalMessage').addEventListener('click', () => go('finalMessage'));
  }

  function finalMessage() {
    addLedger(
      8,
      'المستخدم',
      'كتابة الطلب وقراءة النتيجة',
      'الإجابة التي يراها المستخدم',
      'الواجهة هي نهاية السلسلة، وليست بدايتها.'
    );

    html(`<div class="centered"><span class="eyebrow">نهاية الرحلة</span><h1 class="display-title">الواجهة هي نهاية السلسلة، وليست بدايتها.</h1><p class="scene-subtitle">الإجابة تظهر في لحظة. السلسلة التي تجعلها ممكنة لا تظهر معها.</p><div class="dual-view final-comparison"><div class="view-panel"><h3>ما يظهر أو يُختصر في واجهة المنتج</h3><div class="view-list"><span>اسم المنتج</span><span>كلمة «ذكاء اصطناعي»</span><span>مربع المحادثة</span><span>زر إرسال</span><span>إجابة سريعة</span><span>وصف مثل «متاح دائمًا»</span></div></div><div class="view-panel"><h3>ما تتكون منه السلسلة</h3><div class="view-list"><span>عمال</span><span>مهندسون</span><span>مقاولون</span><span>مصانع</span><span>مراكز بيانات</span><span>مؤلفون</span><span>مراجعون</span><span>طاقة</span><span>وقت</span></div></div></div><p class="sources-note">الشخصيات والشركات والأرقام داخل اللعبة خيالية ومركبة. الغرض هو تمثيل أنواع من العمل والحوافز والمخاطر، لا الادعاء بأن كل نموذج يعتمد على المورد نفسه أو أن كل طلب يمر لحظيًا بكل المراحل.</p><div class="action-row center"><button id="replay" class="secondary-btn">ابدأ الرحلة مرة أخرى</button><button id="method" class="primary-btn">اقرأ عن المنهجية</button></div></div>`);
    $('#replay').addEventListener('click', () => resetGame(true));
    $('#method').addEventListener('click', () => go('methodology'));
  }

  function methodology() {
    html(`<div><span class="eyebrow">عن اللعبة</span><h1 class="scene-title">المنهجية والدقة التقنية</h1><div class="card flat"><h2>ما الذي تمثله اللعبة؟</h2><p>«خلف الإجابة» تجربة تعليمية مبسطة حول سلسلة الإمداد والعمل المرتبط بأنظمة الذكاء الاصطناعي. الشخصيات والشركات والأرقام خيالية، وصُممت المواقف لتمثيل أنواع من العمل والحوافز والمخاطر.</p><p>لا تدعي اللعبة أن جميع النماذج تعتمد على الموردين أو الممارسات نفسها، أو أن كل طلب يعيد تشغيل التعدين والتصنيع والتدريب.</p></div><div class="card flat methodology-card"><h2>كيف تُقرأ النتيجة؟</h2><p>لا يوجد مقياس واحد لـ«الجودة». تفصل اللعبة بين جودة البيانات وجودة النموذج وموثوقية البنية وجودة دعم المستخدم، ولا تغيّر قرارات التعدين أو المصنع صياغة إجابة النموذج مباشرة.</p></div><div class="card flat methodology-card"><h2>العمل البشري لا يقع في مرحلة واحدة</h2><p>تبسط اللعبة التصنيف والتقييم في مراحل منفصلة للتعلم، لكن هذه الأعمال قد تحدث قبل التدريب وأثناء الضبط وبعد التدريب وبعد الإطلاق، وقد تتكرر أكثر من مرة.</p></div><div class="card flat methodology-card"><h2>التصنيع نفسه سلسلة أوسع</h2><p>تختصر مرحلة المصنع تصميم الرقائق والتصنيع الدقيق والتغليف والذاكرة والشبكات والتجميع في مشهد واحد حتى تظل اللعبة قابلة للعب. كما تختصر بناء مراكز البيانات وشبكات الكهرباء والاتصالات في البنية التي تراها.</p></div><div class="card flat methodology-card"><h2>الفرق بين بناء النظام واستخدامه</h2><p>استخراج المواد وتصنيع الأجهزة وتجهيز البيانات والتدريب والتقييم تحدث قبل الاستخدام النهائي. عندما ترسل طلبًا، تستخدم الخدمة بنية ونموذجًا بُنيا سابقًا.</p></div><div class="card flat methodology-card"><h2>الخصوصية</h2><p>لا يوجد خادم خلفي ولا قاعدة بيانات ولا حساب مستخدم. تحفظ اللعبة تقدمك وإعداداتك داخل التخزين المحلي في متصفحك فقط.</p></div><div class="action-row"><button id="methodHome" class="primary-btn">العودة إلى النهاية</button></div></div>`);
    $('#methodHome').addEventListener('click', () => go('finalMessage'));
  }

  return {
    ch9Intro,
    pipelineAssemble,
    aiAbstraction,
    finalAnswer,
    timelineReveal,
    peopleReveal,
    results,
    finalMessage,
    methodology
  };
}

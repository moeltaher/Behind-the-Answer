import { storyCharacters } from '../data/characters.js';
import { characterGrid } from '../components/character-card.js';

const PIPELINE_STEPS = [
  'استخراج المواد',
  'صناعة الأجهزة',
  'مراكز البيانات',
  'تجهيز البيانات',
  'تصنيف البيانات',
  'تدريب النموذج',
  'المراجعة البشرية',
  'تشغيل الخدمة'
];

const ENDING_COPY = {
  fast: [
    'سلسلة سريعة',
    'وصلت إلى المنتج بسرعة نسبيًا، بينما انتقل جزء أكبر من تكلفة السرعة إلى العمال والجودة والاختبارات.'
  ],
  careful: [
    'سلسلة حذرة',
    'دفعت تكلفة أعلى وتأخيرًا أكبر في بعض المراحل، بينما عولجت مخاطر أكثر قبل انتقالها إلى المرحلة التالية.'
  ],
  invisible: [
    'سلسلة قليلة الظهور',
    'وصلت إلى النهاية بينما ظل جزء كبير من العمل خارج الشاشة أو خارج دفتر السلسلة.'
  ],
  mixed: [
    'سلسلة مختلطة',
    'لم يتحرك الضغط في اتجاه واحد. في مراحل تحملته الشركة، وفي مراحل أخرى انتقل إلى العامل أو إلى جودة المنتج.'
  ]
};

function renderPipeline() {
  return PIPELINE_STEPS
    .map((step, index) => `
      <div class="pipeline-step">${step}</div>
      ${index < PIPELINE_STEPS.length - 1 ? '<div class="pipeline-arrow">↓</div>' : ''}
    `)
    .join('');
}

function metricLabel(value) {
  if (value >= 68) return 'مرتفع';
  if (value >= 38) return 'متوسط';
  return 'منخفض';
}

function endingType(metrics) {
  if (metrics.pressure >= 64 && metrics.cost <= 48) return 'fast';
  if (metrics.quality >= 72 && metrics.cost >= 56) return 'careful';
  if (metrics.visibility <= 30) return 'invisible';
  return 'mixed';
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
    saveState,
    addLedger,
    renderLedger,
    resetGame
  } = ctx;
  const metric = ctx.metric;
  const ledgerDialog = ctx.ledgerDialog;
  const people = storyCharacters();

  function ch9Intro() {
    chapterIntro(8, '', '', 'pipelineAssemble');
  }

  function pipelineAssemble() {
    setChapter(8);

    html(`
      <div class="centered">
        <span class="eyebrow">تجميع الرحلة</span>
        <h1 class="scene-title">هذه هي السلسلة التي مررت بها</h1>

        <div class="pipeline">${renderPipeline()}</div>

        <div class="reality-note reality-note--wide">
          <strong>تنبيه مهم للدقة:</strong>
          عندما ترسل طلبًا الآن لا يبدأ عمال التعدين والمصانع عملهم من جديد. هذه المراحل بنت الأجهزة والبيانات والنموذج سابقًا. عند الاستخدام تعتمد إجابتك على البنية التي أصبحت موجودة بالفعل وعلى الخوادم التي تشغّل النموذج في تلك اللحظة.
        </div>

        <div class="action-row center">
          <button id="compressAI" class="primary-btn">شاهد ما يراه المستخدم من كل هذا</button>
        </div>
      </div>
    `);

    $('#compressAI').addEventListener('click', () => go('aiAbstraction'));
  }

  function aiAbstraction() {
    html(`
      <div class="abstraction-stage">
        <div class="centered">
          <div class="people-wall">${characterGrid(people)}</div>
          <div class="abstract-word filled">ذكاء اصطناعي</div>
          <p class="muted">تُضغط مراحل ومواد وأعمال كثيرة داخل اسم منتج واحد.</p>
          <div class="action-row center">
            <button id="backPrompt" class="primary-btn">ارجع إلى طلبك</button>
          </div>
        </div>
      </div>
    `);

    $('#backPrompt').addEventListener('click', () => go('finalAnswer'));
  }

  function finalAnswer() {
    html(`
      <div class="chat-shell">
        <div class="chat-logo">ن</div>
        <div class="message user">اكتب لي رسالة قصيرة أعتذر فيها لمديري عن التأخر في تسليم العمل.</div>
        <div class="message ai">
          <strong>الإجابة:</strong><br>
          أعتذر عن التأخر في تسليم العمل. واجهت ظرفًا أدى إلى تأخير الإنجاز، وأعمل حاليًا على استكماله في أقرب وقت. أشكرك على تفهمك.
        </div>
        <div class="small muted">ظهرت الإجابة خلال 1.2 ثانية — زمن افتراضي داخل اللعبة</div>
        <div class="action-row">
          <button id="behindAnswer" class="primary-btn">ماذا حدث خلال هذه الثواني؟</button>
        </div>
      </div>
    `);

    $('#behindAnswer').addEventListener('click', () => go('timelineReveal'));
  }

  function timelineReveal() {
    html(`
      <div>
        <span class="eyebrow">لحظة إرسال الطلب</span>
        <h1 class="display-title">1.2 ثانية ليست عمر السلسلة</h1>
        <p class="scene-subtitle">هذا الزمن يمثل طلبًا افتراضيًا في نهاية الرحلة. أما الأجهزة والبيانات والنموذج فبُنيت عبر أعمال حدثت قبل استخدامك له.</p>

        <div class="dual-view">
          <div class="view-panel">
            <h3>ما حدث قبل استخدامك للنموذج</h3>
            <div class="view-list">
              <span>استخراج مواد</span>
              <span>صناعة أجهزة</span>
              <span>إنشاء مراكز بيانات</span>
              <span>إنتاج وتجهيز بيانات</span>
              <span>تدريب</span>
              <span>تقييم</span>
              <span>إطلاق</span>
            </div>
          </div>

          <div class="view-panel">
            <h3>ما يحدث عندما تضغط «إرسال»</h3>
            <div class="view-list">
              <span>يصل طلبك إلى الخدمة</span>
              <span>تستقبله الخوادم</span>
              <span>يشغَّل النموذج لإنتاج النتيجة</span>
              <span>تعاد الإجابة إلى شاشتك</span>
            </div>
          </div>
        </div>

        <div class="alert goodish">
          <strong>المساران مترابطان، لكنهما ليسا الشيء نفسه.</strong>
          <span>المرحلة الثانية القصيرة تعتمد على كل ما بُني في المسار الأول.</span>
        </div>

        <div class="action-row">
          <button id="showPeople" class="primary-btn">أعد البشر إلى الصورة</button>
        </div>
      </div>
    `);

    $('#showPeople').addEventListener('click', () => go('peopleReveal'));
  }

  function peopleReveal() {
    html(`
      <div class="centered">
        <span class="eyebrow">ما أخفته الكلمات المختصرة</span>
        <h1 class="scene-title">لم ينتج هؤلاء الأشخاص إجابتك كلمةً كلمة.</h1>
        <p class="scene-subtitle">لكن أنواع العمل التي يمثلونها ساهمت في بناء وتشغيل البنية التي جعلت إنتاج الإجابة ممكنًا.</p>

        <div class="people-wall">${characterGrid(people)}</div>

        <div class="action-row center">
          <button id="showResults" class="primary-btn">افتح نتيجة رحلتك</button>
        </div>
      </div>
    `);

    $('#showResults').addEventListener('click', () => go('results'));
  }

  function results() {
    const type = endingType(state.metrics);
    state.flags.finalEnding = type;
    saveState();

    const [title, copy] = ENDING_COPY[type];
    const metrics = state.metrics;
    const decisions = state.decisions.length
      ? state.decisions
          .map(decision => `
            <div class="decision-row">
              <strong>${h(decision.label)}</strong>
              <div class="small muted">${h(decision.effectText)}</div>
            </div>
          `)
          .join('')
      : '<p class="muted">لم تسجل قرارات بعد.</p>';

    html(`
      <div>
        <span class="eyebrow">ماذا حدث في سلسلتك؟</span>
        <h1 class="display-title">${h(title)}</h1>
        <p class="scene-subtitle">${h(copy)}</p>

        <div class="results-grid">
          ${metric('ضغط الإنتاج', metrics.pressure, metricLabel(metrics.pressure))}
          ${metric('تكلفة الشركة', metrics.cost, metricLabel(metrics.cost))}
          ${metric('عبء العامل', metrics.burden, metricLabel(metrics.burden))}
          ${metric('جودة الناتج', metrics.quality, metricLabel(metrics.quality))}
          ${metric('ظهور العمل البشري', metrics.visibility, metricLabel(metrics.visibility))}
        </div>

        <div class="card flat results-decisions">
          <h2>قراراتك</h2>
          <div class="decision-list">${decisions}</div>
        </div>

        <div class="alert">
          <strong>كثير من القرارات لم يكن له حل بلا تكلفة.</strong>
          <span>الحصة والعقد والموعد وأنظمة التقييم تحدد مساحة الاختيار قبل أن يتخذ العامل أو الفريق قراره.</span>
        </div>

        <div class="action-row">
          <button id="resultsLedger" class="secondary-btn">عرض دفتر السلسلة</button>
          <button id="toFinalMessage" class="primary-btn">إلى الخاتمة</button>
        </div>
      </div>
    `);

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

    html(`
      <div class="centered">
        <span class="eyebrow">نهاية الرحلة</span>
        <h1 class="display-title">الواجهة هي نهاية السلسلة، وليست بدايتها.</h1>
        <p class="scene-subtitle">الإجابة تظهر في لحظة. السلسلة التي تجعلها ممكنة لا تظهر معها.</p>

        <div class="dual-view final-comparison">
          <div class="view-panel">
            <h3>ما يراه المستخدم</h3>
            <div class="view-list">
              <span>ذكاء اصطناعي</span>
              <span>نموذج</span>
              <span>خدمة سحابية</span>
              <span>بيانات</span>
              <span>زر إرسال</span>
              <span>إجابة سريعة</span>
            </div>
          </div>

          <div class="view-panel">
            <h3>ما تتكون منه السلسلة</h3>
            <div class="view-list">
              <span>عمال</span>
              <span>مهندسون</span>
              <span>مقاولون</span>
              <span>مصانع</span>
              <span>مراكز بيانات</span>
              <span>مؤلفون</span>
              <span>مراجعون</span>
              <span>طاقة</span>
              <span>وقت</span>
            </div>
          </div>
        </div>

        <p class="sources-note">الشخصيات والشركات والأرقام داخل اللعبة خيالية ومركبة. الغرض هو تمثيل أنواع من العمل والحوافز والمخاطر، لا الادعاء بأن كل نموذج يعتمد على المورد نفسه أو أن كل طلب يمر لحظيًا بكل المراحل.</p>

        <div class="action-row center">
          <button id="replay" class="secondary-btn">ابدأ الرحلة مرة أخرى</button>
          <button id="method" class="primary-btn">اقرأ عن المنهجية</button>
        </div>
      </div>
    `);

    $('#replay').addEventListener('click', () => resetGame(true));
    $('#method').addEventListener('click', () => go('methodology'));
  }

  function methodology() {
    html(`
      <div>
        <span class="eyebrow">عن اللعبة</span>
        <h1 class="scene-title">المنهجية والدقة التقنية</h1>

        <div class="card flat">
          <h2>ما الذي تمثله اللعبة؟</h2>
          <p>«خلف الإجابة» تجربة تعليمية مبسطة حول سلسلة الإمداد والعمل المرتبط بأنظمة الذكاء الاصطناعي. الشخصيات والشركات والأرقام خيالية، وصُممت المواقف لتمثيل أنواع من العمل والحوافز والمخاطر الموجودة في سلاسل تقنية حقيقية.</p>
          <p>لا تدعي اللعبة أن جميع النماذج تعتمد على الموردين أو الممارسات نفسها، أو أن كل طلب يعيد تشغيل التعدين والتصنيع والتدريب.</p>
        </div>

        <div class="card flat methodology-card">
          <h2>الفرق بين بناء النظام واستخدامه</h2>
          <p>استخراج المواد وتصنيع الأجهزة وتجهيز البيانات والتدريب والتقييم تحدث قبل الاستخدام النهائي. عندما ترسل طلبًا، تستخدم الخدمة بنية ونموذجًا بُنيا سابقًا، وتعمل الخوادم على إنتاج النتيجة وإعادتها إليك.</p>
        </div>

        <div class="card flat methodology-card">
          <h2>الخصوصية</h2>
          <p>لا يوجد خادم خلفي ولا قاعدة بيانات ولا حساب مستخدم. تحفظ اللعبة تقدمك وإعداداتك داخل التخزين المحلي في متصفحك فقط.</p>
        </div>

        <div class="action-row">
          <button id="methodHome" class="primary-btn">العودة إلى النهاية</button>
        </div>
      </div>
    `);

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

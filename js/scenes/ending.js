import { CHAPTERS } from '../data/chapters.js';
import { DEMO_PROMPT } from '../data/story.js';
import { storyCharacters } from '../data/characters.js';
import { characterGrid } from '../components/character-card.js';
import { EVAL_TASKS } from '../data/content-tasks.js';

const PIPELINE_STEPS = CHAPTERS.map(chapter => chapter.pipelineLabel);
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

function selectedDecisions(state, matcher) {
  return state.decisions.filter(decision => matcher(decision.id));
}

function decisionRows(decisions, h) {
  if (!decisions.length) return '<p class="muted">لا توجد قرارات مسجلة في هذا المحور.</p>';
  return decisions.map(decision => `<div class="decision-row"><strong>${h(decision.label)}</strong><div class="small muted">${h(decision.effectText)}</div></div>`).join('');
}

function lastDecision(decisions) {
  return decisions.length ? decisions[decisions.length - 1] : null;
}

function highlightCard(title, decision, fallback, h) {
  if (!decision) return `<article class="journey-highlight"><span>${h(title)}</span><strong>${h(fallback)}</strong></article>`;
  return `<article class="journey-highlight"><span>${h(title)}</span><strong>${h(decision.label)}</strong><small>${h(decision.effectText)}</small></article>`;
}

function deliveryState(state) {
  if (state.flags.deployRecovery === 'restart') {
    return {
      label: 'وصل بعد إعادة محاولة واحدة',
      status: 'إعادة التشغيل أعادت الخدمة بسرعة، لكن الإصدار المشتبه به بقي موجودًا؛ يفترض سيناريو النهاية أن المحاولة الأولى بعد الحادث احتاجت إلى إعادة إرسال.'
    };
  }
  return {
    label: 'وصل بعد استعادة الإصدار السابق',
    status: 'عاد التشغيل إلى الإصدار السابق المشتبه بأنه أكثر استقرارًا في السيناريو، لذلك لا تفترض اللعبة إعادة محاولة لهذا الطلب.'
  };
}

export function createEndingRoutes(ctx) {
  const h = ctx.h;
  const $ = ctx.$;
  const state = ctx.state;
  const { html, go, renderLedger, resetGame } = ctx;
  const ledgerDialog = ctx.ledgerDialog;
  const people = storyCharacters();

  function pipelineAssemble() {
    html(`<div class="centered epilogue-screen"><span class="eyebrow">اكتملت مراحل اللعب الثماني</span><h1 class="scene-title">الآن ارجع من السلسلة إلى إجابتك.</h1><p class="scene-subtitle">رتبت اللعبة الرحلة خطيًا للتعلم، لكن النظام الحقيقي يجمع سلاسل مادية ودورات تطوير وتشغيلًا مستمرًا.</p><div class="system-map"><section class="view-panel"><h3>ما بُني ماديًا</h3><div class="view-list"><span>مواد ومعالجة</span><span>مكونات وأجهزة</span><span>خوادم ومراكز بيانات</span></div></section><section class="view-panel"><h3>دورة تطوير النموذج</h3><div class="view-list"><span>بيانات</span><span>↔ تصنيف ومراجعة</span><span>↔ post-training</span><span>↔ تقييم</span></div><p class="small muted">قد تتكرر هذه الأعمال ولا تقع دائمًا بالترتيب نفسه.</p></section><section class="view-panel"><h3>التشغيل</h3><div class="view-list"><span>إطلاق</span><span>استخدام</span><span>تشغيل ودعم</span><span>↺ معلومات تعود إلى التطوير</span></div></section></div><div class="view-list abstraction-summary">${PIPELINE_STEPS.map(step => `<span>${h(step)}</span>`).join('')}</div><div class="pipeline-arrow">↓</div><div class="abstract-word filled">ذكاء اصطناعي</div><div class="reality-note reality-note--wide"><strong>الدقة الزمنية</strong> عندما ترسل طلبًا الآن لا يبدأ التعدين والتصنيع والتدريب من جديد. هذه الأعمال بنت النظام سابقًا، بينما الطلب الحالي يستخدم بنية ونموذجًا قائمين.</div><div class="action-row center"><button id="backPrompt" class="primary-btn">ارجع إلى الإجابة</button></div></div>`);
    $('#backPrompt').addEventListener('click', () => go('finalAnswer'));
  }

  function finalAnswer() {
    const delivery=deliveryState(state);
    html(`<div class="chat-shell epilogue-chat"><div class="chat-logo">ن</div><div class="message user">${h(DEMO_PROMPT)}</div><div class="message ai"><strong>الإجابة:</strong><br>${h(FIXED_ANSWER)}</div><div class="delivery-state"><strong>${h(delivery.label)}</strong><span>${h(delivery.status)}</span></div><div class="dual-view"><div class="view-panel"><h3>ما بُني قبل طلبك</h3><div class="view-list"><span>الأجهزة</span><span>مراكز البيانات</span><span>مواد البيانات</span><span>التطوير والتقييم</span></div></div><div class="view-panel"><h3>ما يحدث عند الضغط على «إرسال»</h3><div class="view-list"><span>يصل الطلب إلى الخدمة</span><span>تشغله البنية القائمة</span><span>تعود النتيجة أو تفشل المحاولة</span></div></div></div><div class="reality-note"><strong>ما الذي تغير وما الذي لم يتغير؟</strong> صياغة رسالة الاعتذار ثابتة؛ قرارات التعدين والتصنيع لا تجعل النص نفسه أفضل لغويًا. أثر قرار التشغيل يظهر فقط في حالة وصول الطلب، بلا أرقام زمن دقيقة لا يبررها السيناريو.</div><div class="action-row"><button id="showResults" class="primary-btn">اعرض الأشخاص ونتيجة رحلتك</button></div></div>`);
    $('#showResults').addEventListener('click', () => go('results'));
  }

  function results() {
    const labor = selectedDecisions(state, id => id.startsWith('mine-') || id.startsWith('annotation-'));
    const materialAndData = selectedDecisions(state, id => id.startsWith('factory-') || id.startsWith('data-') || id.startsWith('dc-'));
    const trainingAndLaunch = selectedDecisions(state, id => id.startsWith('training-') || id.startsWith('train-') || id.startsWith('safety-') || id.startsWith('launch-'));
    const operations = selectedDecisions(state, id => id.startsWith('deploy-') || id.startsWith('support-'));
    const dataReady=state.flags.dataStatuses.filter(status=>status==='ready').length;
    const dataPending=state.flags.dataStatuses.filter(status=>status==='pending').length;
    const safety = state.flags.safetyChoice === 'details'
      ? 'اكتشفت الخلل في اختبار السلامة، ثم أُصلح واجتاز إعادة الاختبار الإلزامية قبل قرار الجاهزية.'
      : 'لم تلتقط الخلل أولًا؛ أوقفته مراجعة ثانية ثم أُصلح واجتاز إعادة اختبار أوسع قبل قرار الجاهزية.';
    const evaluation = `طابقت معيار السيناريو في ${state.flags.evalCorrectCount} من ${EVAL_TASKS.length} مهام تقييم. هذه نتيجة لأداء المقيّم، وليست درجة جودة للنموذج.`;

    html(`<div><span class="eyebrow">نتيجة رحلتك</span><h1 class="display-title">أعد البشر والقرارات إلى الصورة.</h1><p class="scene-subtitle">لم ينتج هؤلاء الأشخاص إجابتك كلمةً كلمة، لكن أنواع العمل التي يمثلونها ساهمت في بناء وتشغيل البنية التي جعلتها ممكنة.</p><div class="journey-highlights">${highlightCard('العمل والوقت',lastDecision(labor),'لا قرار بارز مسجل',h)}${highlightCard('المواد والبيانات',lastDecision(materialAndData),`${dataReady} مواد جاهزة و${dataPending} معلقة`,h)}${highlightCard('التدريب والجاهزية',lastDecision(trainingAndLaunch),'بوابة السلامة اكتملت',h)}${highlightCard('التشغيل والدعم',lastDecision(operations),'الخدمة عادت بعد الحادث',h)}</div><div class="people-wall">${characterGrid(people)}</div><details class="secondary-labor-details"><summary>أدوار أخرى ظهرت في الرحلة</summary><div class="view-list">${SECONDARY_LABOR.map(role => `<span>${h(role)}</span>`).join('')}</div></details><div class="dual-view result-core"><div class="view-panel"><h3>عملية التقييم البشري</h3><p>${h(evaluation)}</p></div><div class="view-panel"><h3>اختبار السلامة</h3><p>${h(safety)}</p></div></div><details class="full-evidence-details"><summary>عرض السجل الكامل لكل قرارات الرحلة</summary><div class="evidence-results"><section class="evidence-card"><h2>العمل والوقت</h2><div class="decision-list">${decisionRows(labor,h)}</div></section><section class="evidence-card"><h2>المواد والبيانات والبنية</h2><div class="decision-list">${decisionRows(materialAndData,h)}</div></section><section class="evidence-card"><h2>التدريب والتحقق والسلامة</h2><div class="decision-list">${decisionRows(trainingAndLaunch,h)}</div></section><section class="evidence-card"><h2>التشغيل ودعم المستخدم</h2><div class="decision-list">${decisionRows(operations,h)}</div></section><div class="card flat discovery-summary"><h2>استكشاف مصادر البيانات</h2><p>فتحت ${state.flags.dataOrigins.length} من بطاقات المصادر الاختيارية. هذا عداد للاستكشاف، وليس شرطًا للنجاح أو درجةً للعبة.</p></div></div></details><div class="action-row"><button id="resultsLedger" class="secondary-btn">عرض دفتر السلسلة</button><button id="toFinalMessage" class="primary-btn">إلى الخاتمة</button></div></div>`);
    $('#resultsLedger').addEventListener('click', () => { renderLedger(); ledgerDialog.showModal(); });
    $('#toFinalMessage').addEventListener('click', () => go('finalMessage'));
  }

  function finalMessage() {
    html(`<div class="centered"><span class="eyebrow">نهاية الرحلة</span><h1 class="display-title">الواجهة هي نهاية السلسلة، وليست بدايتها.</h1><p class="scene-subtitle">الإجابة تظهر في لحظة. السلسلة التي جعلتها ممكنة لا تظهر معها.</p><div class="dual-view final-comparison"><div class="view-panel"><h3>ما يظهر في المنتج</h3><div class="view-list"><span>مربع المحادثة</span><span>زر إرسال</span><span>إجابة</span><span>حالة خدمة</span></div></div><div class="view-panel"><h3>ما لا يظهر تلقائيًا</h3><div class="view-list"><span>مواد وأجهزة</span><span>عمال ووقت</span><span>بيانات ومراجعة</span><span>تشغيل وصيانة</span></div></div></div><details class="methodology-details"><summary>كيف صُممت اللعبة؟</summary><div class="card flat methodology-card"><p>هذه تجربة تعليمية مبسطة. الشخصيات والأرقام خيالية ومركبة، ولا تدعي أن كل نظام يستخدم المواقع أو الموردين أو الممارسات نفسها.</p><p>النتائج تعرض القرارات نفسها بدل درجة خفية. رحلة اللعب خطية للتعلم، بينما الواقع يتضمن دورات واعتمادًا متبادلًا.</p><p>بناء الأجهزة وتجهيز البيانات والتطوير يحدث قبل الطلب الحالي؛ الاستخدام اللحظي يعتمد على بنية ونموذج بُنيا سابقًا.</p><p>لا يوجد خادم خلفي أو حساب مستخدم؛ تحفظ اللعبة تقدمك وإعداداتك محليًا في المتصفح.</p></div></details><div class="action-row center"><button id="finalLedger" class="secondary-btn">دفتر السلسلة</button><button id="restartGame" class="primary-btn">ابدأ الرحلة من جديد</button></div></div>`);
    $('#finalLedger').addEventListener('click', () => { renderLedger(); ledgerDialog.showModal(); });
    $('#restartGame').addEventListener('click', () => resetGame(true));
  }

  return { pipelineAssemble,finalAnswer,results,finalMessage };
}

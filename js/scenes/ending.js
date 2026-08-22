import { CHAPTERS } from '../data/chapters.js';
import { DEMO_PROMPT } from '../data/story.js';
import { storyCharacters } from '../data/characters.js';
import { characterGrid } from '../components/character-card.js';
import { EVAL_TASKS, DATA_ITEMS } from '../data/content-tasks.js';

const PIPELINE_STEPS = CHAPTERS.map(chapter => chapter.pipelineLabel);
const SECONDARY_LABOR = [
  'عمال النقل والمعالجة','فرق الصيانة والفحص','عمال النظافة والأمن','فنيو الكهرباء والتبريد والكابلات','مشغلو الشبكات','مختبرو السلامة','مراجعو اللغة'
];
const FIXED_ANSWER = 'أعتذر عن التأخر في تسليم العمل. واجهت ظرفًا أدى إلى تأخير الإنجاز، وأعمل حاليًا على استكماله في أقرب وقت. أشكرك على تفهمك.';
const TRANSFER_TASKS = [
  ['weights','أوزان النموذج التي دُرّبت وراجعتها الفرق قبل إطلاق الخدمة','build'],
  ['retrieval','في خدمة RAG: استرجاع مستندات مرتبطة بسؤال المستخدم الحالي','request'],
  ['inference','تنفيذ inference لإنتاج نتيجة الطلب الحالي','request'],
  ['monitoring','مراقبة الأخطاء والسعة والحوادث أثناء تشغيل الخدمة','continuous'],
  ['maintenance','صيانة الخوادم والتبريد والشبكات التي تبقي البنية متاحة','continuous']
];
const TRANSFER_LABELS={build:'بُني قبل الطلب',request:'يحدث مع الطلب الحالي',continuous:'تشغيل مستمر'};

function decisionRows(decisions, h) {
  if (!decisions.length) return '<p class="muted">لا توجد قرارات مسجلة في هذا المحور.</p>';
  return decisions.map(decision => `<div class="decision-row"><strong>${h(decision.label)}</strong><div class="small muted">${h(decision.effectText)}</div></div>`).join('');
}

function decisionCategory(id) {
  if(id.startsWith('mine-')||id.startsWith('annotation-')) return 'labor';
  if(id.startsWith('factory-')||id.startsWith('data-')||id.startsWith('dc-')) return 'materials';
  if(id.startsWith('training-')||id.startsWith('train-')||id.startsWith('evaluator-')||id.startsWith('checkpoint-')||id.startsWith('safety-')||id.startsWith('release-')||id.startsWith('extra-check-')||id.startsWith('launch-')) return 'development';
  if(id.startsWith('monitoring-')||id.startsWith('deploy-')||id.startsWith('support-')) return 'operations';
  return 'other';
}

function categorizedDecisions(state) {
  const groups={labor:[],materials:[],development:[],operations:[],other:[]};
  state.decisions.forEach(decision=>groups[decisionCategory(decision.id)].push(decision));
  return groups;
}

function priorityDecision(decisions, priorities) {
  const newest=[...decisions].reverse();
  for (const priority of priorities) {
    const match=newest.find(decision=>priority.endsWith('*')?decision.id.startsWith(priority.slice(0,-1)):decision.id===priority);
    if(match) return match;
  }
  return newest[0] || null;
}

function highlightCard(title, decision, fallback, h) {
  if (!decision) return `<article class="journey-highlight"><span>${h(title)}</span><strong>${h(fallback)}</strong></article>`;
  return `<article class="journey-highlight"><span>${h(title)}</span><strong>${h(decision.label)}</strong><small>${h(decision.effectText)}</small></article>`;
}

function hasUnresolved(check) { return check && Object.values(check).includes('unresolved'); }

function dataLineageSummary(state) {
  const current=new Set(state.flags.dataCurrentTrainingUsed);
  const historical=new Set(state.flags.dataTrainingUsed);
  const held=new Set(state.flags.dataTrainingHeld);
  const rows=state.flags.dataStatuses.map((status,index)=>{
    let lineage='لم تدخل أي revision';
    if(current.has(index)) lineage=`ضمن revision ${state.flags.candidateRevision} الحالية`;
    else if(historical.has(index)) lineage='استُخدمت تاريخيًا ثم خرجت من النسخة الحالية';
    else if(held.has(index)) lineage='موقوفة قبل post-training';
    else if(status==='pending') lineage='معلقة في workflow ولم تدخل التدريب';
    else if(status==='excluded') lineage='مستبعدة قبل التدريب';
    const issue=status==='ready'&&hasUnresolved(state.flags.dataChecks[index])?'مسألة غير محسومة':'لا حاجب حوكمة حالي معروض';
    return {index,status,lineage,issue};
  });
  return {
    rows,
    currentCount:current.size,
    historicalOnly:[...historical].filter(index=>!current.has(index)).length,
    heldCount:held.size,
    pendingCount:state.flags.dataStatuses.filter(status=>status==='pending').length
  };
}

function deliveryState(state) {
  if (state.flags.deployRecovery === 'restart') return { label:'وصل بعد استعادة الخدمة', status:'إعادة التشغيل أعادت الوحدات سريعًا، لكن الإصدار المشتبه به بقي موجودًا. لا تفترض اللعبة عدد محاولات أو إعادة إرسال لم تقع داخل اللعب.' };
  return { label:'وصل بعد استعادة الإصدار السابق', status:'عاد التشغيل إلى الإصدار السابق في سيناريو الاستعادة؛ لا تضيف اللعبة زمنًا أو عدد محاولات لم تتم محاكاتها.' };
}

export function createEndingRoutes(ctx) {
  const h = ctx.h;
  const $ = ctx.$;
  const state = ctx.state;
  const { html, go, renderLedger, resetGame, saveState } = ctx;
  const ledgerDialog = ctx.ledgerDialog;
  const people = storyCharacters();

  function pipelineAssemble() {
    html(`<div class="centered epilogue-screen"><span class="eyebrow">اكتملت مراحل اللعب الثماني</span><h1 class="scene-title">افصل الآن بين ترتيب اللعب وبنية النظام.</h1><p class="scene-subtitle">الشريط الذي رأيته كان ترتيبًا تعليميًا لتقدمك، لا مخططًا هندسيًا يقول إن كل هذه الأعمال تقع مرة واحدة وبالترتيب نفسه.</p><div class="system-map"><section class="view-panel"><h3>مسار مادي طويل الأجل</h3><div class="view-list"><span>مواد ومعالجة</span><span>مكونات وأجهزة</span><span>خوادم ومراكز بيانات</span></div></section><section class="view-panel"><h3>دورة تطوير متكررة</h3><div class="view-list"><span>بيانات</span><span>↔ تصنيف ومراجعة</span><span>↔ post-training</span><span>↔ تقييم</span></div><p class="small muted">يمكن أن تتكرر هذه الدورة وتتداخل عناصرها.</p></section><section class="view-panel"><h3>تشغيل مستمر</h3><div class="view-list"><span>إطلاق</span><span>استخدام</span><span>تشغيل ودعم</span><span>↺ معلومات تعود إلى التطوير</span></div></section></div><div class="pipeline-arrow" aria-hidden="true">↓</div><div class="abstract-word filled">واجهة ذكاء اصطناعي</div><p class="small muted">هذه ليست مرحلة تاسعة أو سلسلة جديدة؛ إنها الاختزال الذي يراه المستخدم فوق المسارات المتداخلة أعلاه.</p><details class="transition-details"><summary>ترتيب المراحل الذي لعبته</summary><div class="view-list abstraction-summary">${PIPELINE_STEPS.map(step => `<span>${h(step)}</span>`).join('')}</div><p class="small muted">هذا ترتيب اللعبة فقط.</p></details><div class="reality-note reality-note--wide"><strong>الدقة الزمنية</strong> عندما ترسل طلبًا الآن لا يبدأ التعدين والتصنيع والتدريب من جديد. هذه الأعمال بنت النظام سابقًا، بينما الطلب الحالي يستخدم بنية ونموذجًا قائمين داخل تشغيل مستمر.</div><div class="action-row center"><button id="backPrompt" class="primary-btn">اختبر فهمك في مثال جديد</button></div></div>`);
    $('#backPrompt').addEventListener('click', () => go('transferChallenge'));
  }

  function transferChallenge() {
    if(state.flags.transferChoice==='build-use'){
      html(`<div><span class="eyebrow">تحدي انتقال التعلم</span><h1 class="scene-title">طبّقت الفكرة على نظام RAG مختلف.</h1><div class="alert goodish"><strong>التمييز الأساسي محفوظ</strong><span>فصلت بين ما بُني تاريخيًا، وما يحدث بسبب الطلب الحالي، وما يستمر أثناء التشغيل حتى خارج لحظة الطلب.</span></div><div class="action-row"><button id="transferContinue" class="primary-btn">ارجع إلى إجابتك</button></div></div>`);
      $('#transferContinue').addEventListener('click',()=>go('finalAnswer'));
      return;
    }
    html(`<div><span class="eyebrow">تحدي انتقال التعلم</span><h1 class="scene-title">غيّر المنتج: صنّف العمل في خدمة توليد تستخدم RAG.</h1><p class="scene-subtitle">ضع كل عنصر في زمنه الأساسي.</p><div class="card">${TRANSFER_TASKS.map(([id,label])=>`<label class="form-row"><span>${h(label)}</span><select data-transfer-item="${id}"><option value="">اختر…</option><option value="build">بُني قبل الطلب</option><option value="request">يحدث مع الطلب الحالي</option><option value="continuous">تشغيل مستمر</option></select></label>`).join('')}<div class="decision-feedback-inline" id="transferFeedback" hidden role="status"></div><div class="action-row"><button id="transferSubmit" class="primary-btn">تحقق من التصنيف</button></div></div></div>`);
    $('#transferSubmit').addEventListener('click',()=>{
      const answers=Object.fromEntries([...document.querySelectorAll('[data-transfer-item]')].map(select=>[select.dataset.transferItem,select.value]));
      const wrong=TRANSFER_TASKS.filter(([id,,correct])=>answers[id]!==correct);
      const feedback=$('#transferFeedback');
      if(wrong.length){
        feedback.hidden=false;
        feedback.innerHTML=`<strong>${wrong.length} عناصر تحتاج إعادة تصنيف.</strong><span>${wrong.map(([id,label,correct])=>`${label}: التصنيف الأنسب «${TRANSFER_LABELS[correct]}» لأن ${id==='weights'?'الأوزان موجودة قبل الطلب الحالي':id==='retrieval'||id==='inference'?'هذا التنفيذ ينشأ بسبب وصول الطلب الحالي':'هذا العمل يستمر لتشغيل الخدمة حتى خارج طلب بعينه'}.`).join(' ')}</span>`;
        return;
      }
      state.flags.transferChoice='build-use';
      saveState(); transferChallenge();
    });
  }

  function finalAnswer() {
    const delivery=deliveryState(state);
    html(`<div class="chat-shell epilogue-chat"><div class="chat-logo">ن</div><div class="message user">${h(DEMO_PROMPT)}</div><div class="message ai"><strong>الإجابة:</strong><br>${h(FIXED_ANSWER)}</div><div class="delivery-state"><strong>${h(delivery.label)}</strong><span>${h(delivery.status)}</span></div><div class="dual-view"><div class="view-panel"><h3>ما بُني قبل طلبك</h3><div class="view-list"><span>الأجهزة</span><span>مراكز البيانات</span><span>مواد البيانات</span><span>التطوير والتقييم</span></div></div><div class="view-panel"><h3>ما يحدث عند الضغط على «إرسال»</h3><div class="view-list"><span>يصل الطلب إلى الخدمة</span><span>تشغله البنية القائمة</span><span>تعود النتيجة أو تفشل المحاولة</span></div></div></div><div class="reality-note"><strong>وقد يحدث وقت الطلب بحسب تصميم المنتج</strong><span>توجيه الطلب، استرجاع مستندات في أنظمة RAG، فحوص moderation، استدعاء أدوات، caching أو تسجيل تشغيلي. هذه أمثلة شرطية وليست ادعاءً بأن كل خدمة تنفذها.</span></div><div class="reality-note"><strong>ما الذي تغير وما الذي لم يتغير؟</strong> صياغة رسالة الاعتذار ثابتة؛ قرارات التعدين والتصنيع لا تجعل النص نفسه أفضل لغويًا. أثر قرار التشغيل يظهر في حالة وصول الطلب ومرونة الاستعادة.</div><div class="action-row"><button id="showResults" class="primary-btn">اعرض الأشخاص ونتيجة رحلتك</button></div></div>`);
    $('#showResults').addEventListener('click', () => go('results'));
  }

  function results() {
    const groups=categorizedDecisions(state);
    const labor=groups.labor;
    const materialAndData=groups.materials;
    const trainingAndLaunch=groups.development;
    const operations=groups.operations;
    const data=dataLineageSummary(state);
    const safety=state.flags.safetyChoice==='details'?'اكتشفت الخلل مبكرًا ثم أُصلح وأعيد اختباره على النسخة الحالية.':'احتاج الخلل إلى مراجعة ثانية ثم أُصلح وأعيد اختباره على النسخة الحالية.';
    const evaluation=`طابقت معيار السيناريو في ${state.flags.evalCorrectCount} من ${EVAL_TASKS.length} مهام، ثم أغلقت خطوة معايرة المقيّم قبل استخدام النتيجة كدليل.`;
    const laborHighlight=priorityDecision(labor,['mine-forced-inspection','mine-stop','mine-continue','annotation-appeal','annotation-noappeal','annotation-break','annotation-no-break']);
    const materialHighlight=priorityDecision(materialAndData,['data-retrain-without-*','data-license-evidence-*','data-training-override-*','data-pii-keep-after-review','data-pii-redact-after-review','dc-cooling-close','dc-move','dc-stop','factory-debt-closed','factory-debt-carried','factory-maintenance-closed','factory-stop','factory-continue','data-*']);
    const trainingHighlight=priorityDecision(trainingAndLaunch,['launch-delay*','launch-fast*','launch-ready*','release-gate-*','checkpoint-evidence-reviewed*','safety-second-review*','safety-caught*','train-continue*','train-pause*']);
    const operationsHighlight=priorityDecision(operations,['deploy-resilience-risk-*','monitoring-check-*','deploy-rollback','deploy-restart','deploy-failover-review-*','deploy-failover-review','deploy-capacity-load-*','deploy-capacity-load','support-*']);
    const otherSection=groups.other.length?`<section class="evidence-card"><h2>قرارات أخرى</h2><div class="decision-list">${decisionRows(groups.other,h)}</div></section>`:'';
    const lineageRows=data.rows.map(row=>`<article class="card flat"><strong>${h(DATA_ITEMS[row.index]?.title||`المادة ${row.index+1}`)}</strong><p>${h(row.lineage)}</p><p class="small muted">${h(row.issue)}</p></article>`).join('');

    html(`<div><span class="eyebrow">نتيجة رحلتك</span><h1 class="display-title">أعد البشر والقرارات إلى الصورة.</h1><p class="scene-subtitle">البطاقات الأربع تختار أحدث قرار ذي دلالة داخل كل محور، بينما السجل الكامل يحفظ كل القرارات بما فيها النسخ السابقة.</p><div class="journey-highlights">${highlightCard('العمل والوقت',laborHighlight,'لا قرار بارز مسجل',h)}${highlightCard('المواد والبيانات',materialHighlight,`${data.currentCount} مواد في النسخة الحالية و${data.historicalOnly} تاريخية فقط`,h)}${highlightCard('التدريب والجاهزية',trainingHighlight,`revision ${state.flags.candidateRevision} اجتازت الأدلة`,h)}${highlightCard('التشغيل والدعم',operationsHighlight,'الخدمة عادت بعد الحادث',h)}</div><div class="people-wall">${characterGrid(people)}</div><details class="secondary-labor-details"><summary>أدوار أخرى ظهرت في الرحلة</summary><div class="view-list">${SECONDARY_LABOR.map(role => `<span>${h(role)}</span>`).join('')}</div></details><section class="evidence-card"><h2>سلسلة البيانات عبر revisions</h2><div class="hud-grid"><div class="hud-item"><span>في النسخة الحالية</span><strong>${data.currentCount}</strong></div><div class="hud-item"><span>استُخدمت تاريخيًا فقط</span><strong>${data.historicalOnly}</strong></div><div class="hud-item"><span>موقوفة قبل التدريب</span><strong>${data.heldCount}</strong></div><div class="hud-item"><span>معلقة في workflow</span><strong>${data.pendingCount}</strong></div></div><div class="evidence-results">${lineageRows}</div></section><div class="dual-view result-core"><div class="view-panel"><h3>عملية التقييم البشري</h3><p>${h(evaluation)}</p></div><div class="view-panel"><h3>اختبار السلامة</h3><p>${h(safety)}</p></div></div><details class="full-evidence-details" data-decision-count="${state.decisions.length}"><summary>عرض السجل الكامل لكل قرارات الرحلة (${state.decisions.length})</summary><div class="evidence-results"><section class="evidence-card"><h2>العمل والوقت</h2><div class="decision-list">${decisionRows(labor,h)}</div></section><section class="evidence-card"><h2>المواد والبيانات والبنية</h2><div class="decision-list">${decisionRows(materialAndData,h)}</div></section><section class="evidence-card"><h2>التدريب والتحقق والسلامة</h2><div class="decision-list">${decisionRows(trainingAndLaunch,h)}</div></section><section class="evidence-card"><h2>التشغيل ودعم المستخدم</h2><div class="decision-list">${decisionRows(operations,h)}</div></section>${otherSection}<div class="card flat discovery-summary"><h2>استكشاف مصادر البيانات</h2><p>فتحت ${state.flags.dataOrigins.length} من بطاقات المصادر الاختيارية. هذا عداد للاستكشاف، وليس درجة.</p></div></div></details><div class="action-row"><button id="resultsLedger" class="secondary-btn">عرض دفتر السلسلة</button><button id="toFinalMessage" class="primary-btn">إلى الخاتمة</button></div></div>`);
    $('#resultsLedger').addEventListener('click', () => { renderLedger(); ledgerDialog.showModal(); });
    $('#toFinalMessage').addEventListener('click', () => go('finalMessage'));
  }

  function finalMessage() {
    html(`<div class="centered"><span class="eyebrow">نهاية الرحلة</span><h1 class="display-title">الواجهة هي نهاية السلسلة، وليست بدايتها.</h1><p class="scene-subtitle">الإجابة تظهر في لحظة. السلسلة التي جعلتها ممكنة لا تظهر معها.</p><div class="dual-view final-comparison"><div class="view-panel"><h3>ما يظهر في المنتج</h3><div class="view-list"><span>مربع المحادثة</span><span>زر إرسال</span><span>إجابة</span><span>حالة خدمة</span></div></div><div class="view-panel"><h3>ما لا يظهر تلقائيًا</h3><div class="view-list"><span>مواد وأجهزة</span><span>عمال ووقت</span><span>بيانات ومراجعة</span><span>تشغيل وصيانة</span></div></div></div><details class="methodology-details"><summary>كيف صُممت اللعبة؟</summary><div class="card flat methodology-card"><p>هذه تجربة تعليمية مبسطة. الشخصيات والأرقام خيالية ومركبة.</p><p>النتائج تعرض القرارات بدل درجة خفية، وترتيب اللعب خطي للتعلم بينما النظام الحقيقي يتضمن دورات وتداخلات.</p><p>تتبع اللعبة revision المرشحة وسلسلة استخدام البيانات حتى لا تنتقل أدلة نسخة إلى نسخة أخرى تلقائيًا.</p><p>لا يوجد خادم خلفي أو حساب مستخدم؛ تحفظ اللعبة تقدمك وإعداداتك محليًا في المتصفح.</p></div></details><div class="action-row center"><button id="finalLedger" class="secondary-btn">دفتر السلسلة</button><button id="restartGame" class="primary-btn">ابدأ الرحلة من جديد</button></div></div>`);
    $('#finalLedger').addEventListener('click', () => { renderLedger(); ledgerDialog.showModal(); });
    $('#restartGame').addEventListener('click', () => resetGame(true));
  }

  return { pipelineAssemble,transferChallenge,finalAnswer,results,finalMessage };
}

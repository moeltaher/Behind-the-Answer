import { DATA_ITEMS } from '../data/content-tasks.js';

const DATA_ORIGINS = [
  ['writer', 'مقالات ومحتوى مكتوب', 'راجع الترخيص وسياق النشر وحقوق المؤلف.'],
  ['photo', 'صور فوتوغرافية', 'قد تجمع حقوق الصورة وحقوق المصور وبيانات أشخاص ظاهرين فيها.'],
  ['code', 'شفرة برمجية', 'وجود المستودع علنًا لا يحدد وحده شروط إعادة الاستخدام.'],
  ['research', 'أبحاث ودراسات', 'راجع الترخيص وحقوق الناشر والمواد الملحقة.'],
  ['forum', 'نقاشات منتديات', 'قد تتضمن أسماء حسابات وسياقًا شخصيًا إلى جانب المحتوى المفيد.'],
  ['translate', 'ترجمات', 'للترجمة حقوق وسياق استخدام قد يختلفان عن النص الأصلي.'],
  ['docs', 'توثيق ومستندات', 'قد يكون متاحًا للقراءة مع قيود مختلفة على إعادة الاستخدام.'],
  ['qa', 'أسئلة وأجوبة', 'قد تحتوي أمثلة عملية ومعلومات شخصية ضمن السياق.'],
  ['web', 'صفحات ويب', 'الوصول التقني إلى الصفحة لا يحسم ملاءمة استخدامها.'],
  ['comment', 'تعليقات المستخدمين', 'تحتاج مراجعة الخصوصية والسياق وتوقعات المستخدمين.'],
  ['manual', 'أدلة تقنية', 'تحقق من المصدر والترخيص والإصدار قبل إدخال المادة.'],
  ['news', 'أخبار وتقارير', 'المحتوى المنشور يظل مرتبطًا بحقوق وشروط استخدام ومخاطر دقة.']
];

function choiceEffect(item, choice) {
  if (choice === item.recommended) {
    if (choice === 'keep') return ['احتفظت بمادة مناسبة ومصرح باستخدامها', 'مررت المادة بعد أن كانت الملاءمة والحقوق والخصوصية واضحة في سيناريو الدفعة.'];
    if (choice === 'remove') return ['استبعدت مادة لا تضيف قيمة للدفعة', 'منعت نسخة مكررة من الدخول بدل زيادة الحجم بلا فائدة.'];
    if (choice === 'redact') return ['نقحت بيانات لا يحتاجها الغرض', 'احتفظت بالجزء المفيد بعد إزالة معلومات مباشرة لا يحتاجها السيناريو.'];
    return ['أوقفت مادة للمراجعة', 'بقيت المادة خارج المسار الذي ينتقل إلى التطوير حتى تُحسم الحقوق أو الخصوصية أو الملاءمة.'];
  }
  if (choice === 'keep') return ['مررت مادة قبل اكتمال التحقق', 'سمحت للمادة بالمرور في workflow رغم بقاء مشكلة غير محسومة في الحقوق أو الخصوصية أو الملاءمة. مرورها لا يعني أن المشكلة حُسمت.'];
  if (choice === 'remove') return ['استبعدت مادة بدل معالجة المشكلة المحددة', 'اخترت الحذف حتى عندما كان يمكن أن تكون هناك معالجة أو مراجعة أكثر تناسبًا مع المشكلة.'];
  if (choice === 'redact') return ['استخدمت التنقيح كحل جزئي', 'عالجت البيانات المباشرة حيث وُجدت، لكن التنقيح وحده لا يحسم مسائل الحقوق أو إعادة التعرف أو الملاءمة.'];
  return ['أرسلت مادة للمراجعة الاحتياطية', 'أبقيت المادة خارج المسار الذي ينتقل إلى التطوير حتى يأتي قرار لاحق من المراجعة.'];
}

function checksFor(item, choice) {
  if (choice === 'remove') return { rights:'na', privacy:'na', fitness:'na' };
  if (choice === 'review') return { rights:'unresolved', privacy:item.type==='clean'||item.type==='code'?'clear':'unresolved', fitness:item.type==='duplicate'?'unresolved':'clear' };
  if (item.type === 'clean') return { rights:'clear', privacy:'clear', fitness:'clear' };
  if (item.type === 'duplicate') return { rights:'clear', privacy:'clear', fitness:'unresolved' };
  if (item.type === 'pii') return { rights:'unresolved', privacy:choice==='redact'?'clear':'unresolved', fitness:'clear' };
  if (item.type === 'code') return { rights:'unresolved', privacy:'clear', fitness:'clear' };
  if (item.type === 'ambiguous') return { rights:'unresolved', privacy:'unresolved', fitness:'clear' };
  return { rights:'unresolved', privacy:'unresolved', fitness:'unresolved' };
}

function hasUnresolved(check) {
  return check && Object.values(check).includes('unresolved');
}

function statusCounts(state) {
  const statuses=state.flags.dataStatuses;
  let clearPassed=0;
  let passedWithIssues=0;
  statuses.forEach((status,index)=>{
    if(status!=='ready') return;
    if(hasUnresolved(state.flags.dataChecks[index])) passedWithIssues+=1;
    else clearPassed+=1;
  });
  return {
    passed: statuses.filter(status=>status==='ready').length,
    clearPassed,
    passedWithIssues,
    pending: statuses.filter(status=>status==='pending').length,
    excluded: statuses.filter(status=>status==='excluded').length
  };
}

function feedbackMarkup(state, h) {
  if (!state.flags.dataFeedbackLabel) return '';
  return `<div class="decision-feedback-inline" role="status"><strong>${h(state.flags.dataFeedbackLabel)}</strong><span>${h(state.flags.dataFeedbackDetail)}</span></div>`;
}

function checksMarkup(check) {
  if(!check) return '';
  const label=value=>value==='clear'?'محسوم':value==='na'?'غير منطبق':'غير محسوم';
  return `<div class="hud-grid"><div class="hud-item"><span>الحقوق</span><strong>${label(check.rights)}</strong></div><div class="hud-item"><span>الخصوصية</span><strong>${label(check.privacy)}</strong></div><div class="hud-item"><span>الملاءمة</span><strong>${label(check.fitness)}</strong></div></div>`;
}

export function createDataRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch4Intro() { chapterIntro(3, 'dataOrigins'); }

  function dataOrigins() {
    const cards = DATA_ORIGINS.map(([id,label,detail]) => {
      const revealed = state.flags.dataOrigins.includes(id);
      if (revealed) return `<article class="data-bit data-bit--label revealed data-bit--static"><strong>${ctx.h(label)}</strong><small>${ctx.h(detail)}</small></article>`;
      return `<button class="data-bit data-bit--label" data-origin="${id}"><strong>${ctx.h(label)}</strong><small>استكشاف اختياري</small></button>`;
    }).join('');
    const keepOpen = state.flags.dataOrigins.length ? ' open' : '';
    html(`<div><span class="eyebrow">من المحتوى إلى مواد البيانات</span><h1 class="scene-title">قبل أن تصبح المادة «بيانات»، كانت محتوى له مصدر وسياق.</h1><p class="scene-subtitle">المهمة الأساسية هي مراجعة الدفعة. يمكنك البدء فورًا، أو فتح أمثلة المصادر إذا أردت معرفة الأسئلة التي تثيرها.</p><div class="reality-note"><strong>فرق مهم</strong> ستسجل اللعبة شيئين منفصلين: هل مرت المادة إلى المسار التالي، وهل حُسمت مسائل الحقوق والخصوصية والملاءمة. قد تمر مادة رغم بقاء مشكلة؛ هذا لا يجعلها «سليمة» تلقائيًا.</div><div class="action-row"><button id="toClean" class="primary-btn">ابدأ مراجعة الدفعة</button></div><details class="optional-source-details"${keepOpen}><summary>استكشف أمثلة لمصادر البيانات — اختياري</summary><div class="data-cloud data-cloud--labels">${cards}</div></details></div>`);
    bind('[data-origin]','click',event=>{
      state.flags.dataOrigins.push(event.currentTarget.dataset.origin);
      saveState();
      dataOrigins();
    });
    $('#toClean')?.addEventListener('click',()=>go('dataClean'));
  }

  function dataFollowup() {
    const followup=state.flags.dataFollowup;
    if(!followup){ go('dataClean'); return; }
    const item=DATA_ITEMS[followup.index];
    html(`<div><span class="eyebrow">نتيجة المراجعة</span><h1 class="scene-title">حُسم حق الاستخدام، لكن مشكلة الخصوصية ما زالت قائمة.</h1><div class="card flat"><p><strong>المادة:</strong> ${ctx.h(item.title)}</p><p><strong>الحقوق:</strong> يسمح بالاستخدام في سيناريو الدفعة بعد المراجعة.</p><p><strong>الخصوصية:</strong> رقم الهاتف والعنوان لا يحتاجهما الغرض.</p></div><p class="scene-subtitle">المراجعة لم تكن نهاية القرار؛ حلت مشكلة الحقوق فقط. اختر الآن ما تفعله بالمعلومات الشخصية غير اللازمة.</p><div class="choice-grid"><button id="followupRedact" class="choice-btn"><strong>نقّح بيانات الاتصال</strong><small>احتفظ بالمحتوى المفيد بعد إزالة المعلومات التي لا يحتاجها الغرض.</small></button><button id="followupKeep" class="choice-btn"><strong>احتفظ بها كما هي</strong><small>تمر المادة، لكن مشكلة الخصوصية تظل مسجلة باعتبارها غير محسومة.</small></button></div></div>`);
    $('#followupRedact').addEventListener('click',()=>{
      state.flags.dataSort.redact+=1;
      state.flags.dataStatuses[followup.index]='ready';
      state.flags.dataChecks[followup.index]={ rights:'clear', privacy:'clear', fitness:'clear' };
      state.flags.dataFeedbackLabel='مرّت المادة بعد حسم المشكلتين';
      state.flags.dataFeedbackDetail='حسمت المراجعة حق الاستخدام أولًا، ثم أزال التنقيح بيانات الاتصال غير اللازمة.';
      addDecision('data-pii-redact-after-review','نقحت البيانات بعد حسم الحقوق','استخدمت المراجعة لحسم حق الاستخدام أولًا، ثم أزلت بيانات الاتصال التي لا يحتاجها غرض الدفعة.');
      state.flags.dataFollowup=null;
      state.flags.dataIndex+=1;
      saveState(); go('dataClean');
    });
    $('#followupKeep').addEventListener('click',()=>{
      state.flags.dataSort.keep+=1;
      state.flags.dataStatuses[followup.index]='ready';
      state.flags.dataChecks[followup.index]={ rights:'clear', privacy:'unresolved', fitness:'clear' };
      state.flags.dataFeedbackLabel='مرّت المادة، لكن مشكلة الخصوصية بقيت';
      state.flags.dataFeedbackDetail='حق الاستخدام حُسم، لكن بيانات الاتصال غير اللازمة بقيت. اللعبة تسجل المرور والمشكلة كحالتين منفصلتين.';
      addDecision('data-pii-keep-after-review','مررت مادة مع مشكلة خصوصية غير محسومة','حُسم حق الاستخدام، لكن رقم الهاتف والعنوان بقيا رغم أن غرض الدفعة لا يحتاجهما. ستبقى هذه المشكلة ظاهرة لاحقًا.');
      state.flags.dataFollowup=null;
      state.flags.dataIndex+=1;
      saveState(); go('dataClean');
    });
  }

  function dataClean() {
    if(state.flags.dataFollowup){ go('dataFollowup'); return; }
    const index=state.flags.dataIndex;
    if(index>=DATA_ITEMS.length){ go('dataCleanSummary'); return; }
    const item=DATA_ITEMS[index];
    const counts=statusCounts(state);
    const feedback=feedbackMarkup(state,ctx.h);
    html(`<div><span class="eyebrow">دفعة بيانات رقم 18</span><h1 class="scene-title">أنت الآن نور، متخصصة تجهيز بيانات.</h1>${feedback}<div class="reality-note"><strong>سياسة الدفعة الافتراضية</strong> المشكلة الواحدة قد تحتاج أكثر من إجراء. «المرور» يصف ما حدث داخل workflow؛ أما «محسوم/غير محسوم» فيصف الحقوق والخصوصية والملاءمة ولا يُستنتج من المرور وحده.</div><div class="hud-grid"><div class="hud-item"><span>العنصر</span><strong>${index+1}/${DATA_ITEMS.length}</strong></div><div class="hud-item"><span>وقت المراجعة الإضافي</span><strong>${state.flags.dataReviewMinutes} دقيقة</strong></div><div class="hud-item"><span>مرّت / معلقة</span><strong>${counts.passed} / ${counts.pending}</strong></div></div><div class="sort-layout"><div class="data-item card"><span class="kicker">${ctx.h(item.title)}</span><div class="data-preview">${ctx.h(item.body)}</div><div class="card flat"><p><strong>المصدر:</strong> ${ctx.h(item.source)}</p><p><strong>حالة الحقوق:</strong> ${ctx.h(item.rights)}</p><p><strong>الخصوصية:</strong> ${ctx.h(item.privacy)}</p></div></div><div class="sort-actions"><button data-sort="keep" class="choice-btn"><strong>مرّر كما هو</strong><small>يمر إلى المسار التالي؛ أي مشكلة غير محسومة ستظل مسجلة.</small></button><button data-sort="redact" class="choice-btn"><strong>نقّح البيانات غير اللازمة</strong><small>يعالج المعلومات المباشرة فقط ولا يحسم الحقوق أو إعادة التعرف تلقائيًا.</small></button><button data-sort="review" class="choice-btn"><strong>أوقفه للمراجعة</strong><small>يضيف 4 دقائق افتراضية ويبقي المادة معلقة خارج المسار التالي.</small></button><button data-sort="remove" class="choice-btn"><strong>استبعد</strong><small>لا يدخل هذه الدفعة.</small></button></div></div></div>`);
    bind('[data-sort]','click',event=>{
      const choice=event.currentTarget.dataset.sort;
      const [label,effectText]=choiceEffect(item,choice);
      state.flags.dataSort[choice]+=1;
      if(choice==='review') state.flags.dataReviewMinutes+=4;
      addDecision(`data-${item.type}-${choice}`,label,effectText);
      if(item.followup && choice===item.recommended){
        state.flags.dataFollowup={index,reason:'rights-cleared'};
        state.flags.dataFeedbackLabel='';
        state.flags.dataFeedbackDetail='';
        saveState(); go('dataFollowup'); return;
      }
      const status=choice==='review'?'pending':choice==='remove'?'excluded':'ready';
      const checks=checksFor(item,choice);
      state.flags.dataStatuses[index]=status;
      state.flags.dataChecks[index]=checks;
      state.flags.dataFeedbackLabel=label;
      state.flags.dataFeedbackDetail=`${effectText}${status==='ready'&&hasUnresolved(checks)?' المادة مرّت، لكن توجد مسألة واحدة على الأقل ما زالت غير محسومة وستظهر في مرحلة التطوير والتحقق.':''}`;
      state.flags.dataIndex+=1;
      saveState();
      dataClean();
    });
  }

  function dataCleanSummary() {
    const counts=statusCounts(state);
    const unresolvedNote=counts.passedWithIssues?`${counts.passedWithIssues} من المواد التي مرّت تحمل مسائل غير محسومة؛ مرورها لا يمحو هذه المسائل وستنشئ عمل تحقق لاحقًا.`:'كل المواد التي مرّت في هذا المسار حُسمت مسائلها المعروضة.';
    addLedger(3,'منتجو المحتوى + نور','إنتاج مواد أصلية ثم جمع وفرز وتنقيح ومراجعة الحقوق والخصوصية والملاءمة',`${counts.passed} مواد مرّت + ${counts.pending} معلقة`,unresolvedNote);
    html(`<div><span class="eyebrow">انتهت مراجعة الدفعة</span><h1 class="scene-title">ماذا أنتجت هذه المرحلة؟</h1>${feedbackMarkup(state,ctx.h)}<div class="stage-output"><strong>${counts.passed} مواد مرّت إلى المسار التالي</strong>${counts.pending?`${counts.pending} مواد ما زالت معلقة ولن تمر في هذه الجولة.`:'لا توجد مواد معلقة في نهاية هذه الجولة.'}</div><div class="hud-grid"><div class="hud-item"><span>مرّت وكل مسائلها محسومة</span><strong>${counts.clearPassed}</strong></div><div class="hud-item"><span>مرّت مع مسائل غير محسومة</span><strong>${counts.passedWithIssues}</strong></div><div class="hud-item"><span>معلقة</span><strong>${counts.pending}</strong></div><div class="hud-item"><span>مستبعدة</span><strong>${counts.excluded}</strong></div><div class="hud-item"><span>وقت مراجعة إضافي</span><strong>${state.flags.dataReviewMinutes} دقيقة</strong></div></div><div class="alert ${counts.passedWithIssues?'dangerish':'goodish'}"><strong>الفصل بين المرور والحسم</strong><span>${unresolvedNote}</span></div><details class="transition-details"><summary>حالة كل مادة</summary>${state.flags.dataStatuses.map((status,index)=>`<div class="card flat"><strong>${ctx.h(DATA_ITEMS[index]?.title||`المادة ${index+1}`)}</strong><p>المسار: ${status==='ready'?'مرّت':status==='pending'?'معلقة':'مستبعدة'}</p>${checksMarkup(state.flags.dataChecks[index])}</div>`).join('')}</details><div class="action-row"><button id="dataAbstract" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#dataAbstract').addEventListener('click',()=>go('abstract4'));
  }

  function abstract4(){
    const counts=statusCounts(state);
    abstraction([['كتّاب ومستخدمون','إنتاج المحتوى','✎'],['نور','تجهيز مواد البيانات','◫']],`${counts.passed} مرّت + ${counts.pending} معلقة`,'المحتوى وقرارات الجمع والتنقيح والمراجعة أصبحت مواد ذات حالات مختلفة؛ وما مرّ مع مشكلة غير محسومة يحتفظ بهذه المشكلة بدل أن يتحول إلى «جاهز» بلا قيد.','ch5Intro');
  }

  return { ch4Intro,dataOrigins,dataClean,dataFollowup,dataCleanSummary,abstract4 };
}

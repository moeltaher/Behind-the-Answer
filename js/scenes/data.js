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
    return ['أوقفت مادة للمراجعة', 'بقيت المادة خارج الجزء الجاهز من الدفعة حتى تُحسم الحقوق أو الخصوصية أو الملاءمة.'];
  }
  if (choice === 'keep') return ['مررت مادة قبل اكتمال التحقق', 'أدخلت المادة رغم بقاء مشكلة غير محسومة في الحقوق أو الخصوصية أو الملاءمة.'];
  if (choice === 'remove') return ['استبعدت مادة بدل معالجة المشكلة المحددة', 'اخترت الحذف حتى عندما كان يمكن أن تكون هناك معالجة أو مراجعة أكثر تناسبًا مع المشكلة.'];
  if (choice === 'redact') return ['استخدمت التنقيح كحل جزئي', 'عالجت البيانات المباشرة، لكن التنقيح وحده لا يحسم مسائل الحقوق أو إعادة التعرف أو الملاءمة.'];
  return ['أرسلت مادة للمراجعة الاحتياطية', 'أبقيت المادة خارج الجزء الجاهز حتى يأتي قرار لاحق من المراجعة.'];
}

function statusCounts(state) {
  const statuses = state.flags.dataStatuses;
  return {
    ready: statuses.filter(status => status === 'ready').length,
    pending: statuses.filter(status => status === 'pending').length,
    excluded: statuses.filter(status => status === 'excluded').length
  };
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
    html(`<div><span class="eyebrow">من المحتوى إلى مواد البيانات</span><h1 class="scene-title">قبل أن تصبح المادة «بيانات»، كانت محتوى له مصدر وسياق.</h1><p class="scene-subtitle">المهمة الأساسية هي مراجعة الدفعة. يمكنك البدء فورًا، أو فتح أمثلة المصادر إذا أردت معرفة الأسئلة التي تثيرها.</p><div class="action-row"><button id="toClean" class="primary-btn">ابدأ مراجعة الدفعة</button></div><details class="optional-source-details"${keepOpen}><summary>استكشف أمثلة لمصادر البيانات — اختياري</summary><div class="data-cloud data-cloud--labels">${cards}</div></details></div>`);
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
    html(`<div><span class="eyebrow">نتيجة المراجعة</span><h1 class="scene-title">حُسم حق الاستخدام، لكن مشكلة الخصوصية ما زالت قائمة.</h1><div class="card flat"><p><strong>المادة:</strong> ${ctx.h(item.title)}</p><p><strong>الحقوق:</strong> يسمح بالاستخدام في سيناريو الدفعة بعد المراجعة.</p><p><strong>الخصوصية:</strong> رقم الهاتف والعنوان لا يحتاجهما الغرض.</p></div><p class="scene-subtitle">المراجعة لم تكن نهاية القرار؛ حلت مشكلة الحقوق فقط. اختر الآن ما تفعله بالمعلومات الشخصية غير اللازمة.</p><div class="choice-grid"><button id="followupRedact" class="choice-btn"><strong>نقّح بيانات الاتصال</strong><small>احتفظ بالمحتوى المفيد بعد إزالة المعلومات التي لا يحتاجها الغرض.</small></button><button id="followupKeep" class="choice-btn"><strong>احتفظ بها كما هي</strong><small>يمر المحتوى مع بيانات شخصية غير لازمة رغم أن حق الاستخدام أصبح واضحًا.</small></button></div></div>`);
    $('#followupRedact').addEventListener('click',()=>{
      state.flags.dataSort.redact+=1;
      state.flags.dataStatuses[followup.index]='ready';
      state.flags.dataFeedbackLabel='أصبحت المادة جاهزة بعد خطوتين منفصلتين';
      state.flags.dataFeedbackDetail='حسمت المراجعة حق الاستخدام أولًا، ثم أزال التنقيح بيانات الاتصال غير اللازمة.';
      addDecision('data-pii-redact-after-review','نقحت البيانات بعد حسم الحقوق','استخدمت المراجعة لحسم حق الاستخدام أولًا، ثم أزلت بيانات الاتصال التي لا يحتاجها غرض الدفعة.');
      state.flags.dataFollowup=null;
      state.flags.dataIndex+=1;
      saveState(); go('dataClean');
    });
    $('#followupKeep').addEventListener('click',()=>{
      state.flags.dataSort.keep+=1;
      state.flags.dataStatuses[followup.index]='ready';
      state.flags.dataFeedbackLabel='مرّت المادة، لكن مشكلة الخصوصية بقيت';
      state.flags.dataFeedbackDetail='حق الاستخدام حُسم، لكن بيانات الاتصال غير اللازمة بقيت داخل المادة الجاهزة.';
      addDecision('data-pii-keep-after-review','احتفظت ببيانات شخصية غير لازمة بعد حسم الحقوق','حُسم حق الاستخدام، لكن رقم الهاتف والعنوان بقيا رغم أن غرض الدفعة لا يحتاجهما.');
      state.flags.dataFollowup=null;
      state.flags.dataIndex+=1;
      saveState(); go('dataClean');
    });
  }

  function dataFeedback() {
    html(`<div class="centered decision-feedback"><span class="eyebrow">أثر قرارك على الدفعة</span><h1 class="scene-title">${ctx.h(state.flags.dataFeedbackLabel)}</h1><p class="scene-subtitle">${ctx.h(state.flags.dataFeedbackDetail)}</p><div class="action-row center"><button id="nextDataItem" class="primary-btn">تابع مراجعة الدفعة</button></div></div>`);
    $('#nextDataItem').addEventListener('click',()=>{
      state.flags.dataFeedbackLabel='';
      state.flags.dataFeedbackDetail='';
      saveState();
      dataClean();
    });
  }

  function dataClean() {
    if(state.flags.dataFollowup){ go('dataFollowup'); return; }
    if(state.flags.dataFeedbackLabel){ dataFeedback(); return; }
    const index=state.flags.dataIndex;
    if(index>=DATA_ITEMS.length){ go('dataCleanSummary'); return; }
    const item=DATA_ITEMS[index];
    const counts=statusCounts(state);
    html(`<div><span class="eyebrow">دفعة بيانات رقم 18</span><h1 class="scene-title">أنت الآن نور، متخصصة تجهيز بيانات.</h1><div class="reality-note"><strong>سياسة الدفعة الافتراضية</strong> المشكلة الواحدة قد تحتاج أكثر من إجراء. المادة التي تتوقف للمراجعة لا تُعد جاهزة لمجرد مرور الوقت؛ تبقى معلقة حتى يظهر قرار يحسمها.</div><div class="hud-grid"><div class="hud-item"><span>العنصر</span><strong>${index+1}/${DATA_ITEMS.length}</strong></div><div class="hud-item"><span>وقت المراجعة الإضافي</span><strong>${state.flags.dataReviewMinutes} دقيقة</strong></div><div class="hud-item"><span>الجاهز / المعلق</span><strong>${counts.ready} / ${counts.pending}</strong></div></div><div class="sort-layout"><div class="data-item card"><span class="kicker">${ctx.h(item.title)}</span><div class="data-preview">${ctx.h(item.body)}</div><div class="card flat"><p><strong>المصدر:</strong> ${ctx.h(item.source)}</p><p><strong>حالة الحقوق:</strong> ${ctx.h(item.rights)}</p><p><strong>الخصوصية:</strong> ${ctx.h(item.privacy)}</p></div></div><div class="sort-actions"><button data-sort="keep" class="choice-btn"><strong>احتفظ</strong><small>يمر كما هو إلى الجزء الجاهز من الدفعة.</small></button><button data-sort="redact" class="choice-btn"><strong>نقّح البيانات غير اللازمة</strong><small>يعالج المعلومات المباشرة فقط.</small></button><button data-sort="review" class="choice-btn"><strong>أوقفه للمراجعة</strong><small>يضيف 4 دقائق افتراضية ويبقي المادة معلقة خارج الجزء الجاهز.</small></button><button data-sort="remove" class="choice-btn"><strong>استبعد</strong><small>لا يدخل هذه الدفعة.</small></button></div></div></div>`);
    bind('[data-sort]','click',event=>{
      const choice=event.currentTarget.dataset.sort;
      const [label,effectText]=choiceEffect(item,choice);
      state.flags.dataSort[choice]+=1;
      if(choice==='review') state.flags.dataReviewMinutes+=4;
      addDecision(`data-${item.type}-${choice}`,label,effectText);
      if(item.followup && choice===item.recommended){
        state.flags.dataFollowup={index,reason:'rights-cleared'};
        saveState(); go('dataFollowup'); return;
      }
      state.flags.dataStatuses[index]=choice==='review'?'pending':choice==='remove'?'excluded':'ready';
      state.flags.dataFeedbackLabel=label;
      state.flags.dataFeedbackDetail=effectText;
      state.flags.dataIndex+=1;
      saveState();
      dataClean();
    });
  }

  function dataCleanSummary() {
    const counts=statusCounts(state);
    addLedger(3,'منتجو المحتوى + نور','إنتاج مواد أصلية ثم جمع وفرز وتنقيح ومراجعة الحقوق والخصوصية والملاءمة',`${counts.ready} مواد جاهزة + ${counts.pending} معلقة`,'المواد المعلقة تبقى خارج الجزء الجاهز حتى تُحسم، ولا تتحول إلى مدخل تقني بمجرد انتهاء المرحلة.');
    html(`<div><span class="eyebrow">انتهت مراجعة الدفعة</span><h1 class="scene-title">ماذا أنتجت هذه المرحلة؟</h1><div class="stage-output"><strong>${counts.ready} مواد جاهزة للتطوير</strong>${counts.pending?`${counts.pending} مواد ما زالت معلقة للمراجعة ولن تمر إلى الجولة التالية.`:'لا توجد مواد معلقة في نهاية هذه الجولة.'}</div><div class="hud-grid"><div class="hud-item"><span>جاهزة</span><strong>${counts.ready}</strong></div><div class="hud-item"><span>معلقة</span><strong>${counts.pending}</strong></div><div class="hud-item"><span>مستبعدة</span><strong>${counts.excluded}</strong></div><div class="hud-item"><span>وقت مراجعة إضافي</span><strong>${state.flags.dataReviewMinutes} دقيقة</strong></div></div><p class="muted">سجل الإجراءات قد يكون أكبر من عدد العناصر لأن المشكلة الواحدة يمكن أن تمر بمراجعة ثم معالجة ثانية.</p><div class="action-row"><button id="dataAbstract" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#dataAbstract').addEventListener('click',()=>go('abstract4'));
  }

  function abstract4(){
    const counts=statusCounts(state);
    abstraction([['كتّاب ومستخدمون','إنتاج المحتوى','✎'],['نور','تجهيز مواد البيانات','◫']],`${counts.ready} مواد جاهزة + ${counts.pending} معلقة`,'المحتوى وقرارات الجمع والتنقيح والمراجعة أصبحت مواد ذات حالات مختلفة؛ المعلق لا يمر إلى التطوير حتى يُحسم.','ch5Intro');
  }

  return { ch4Intro,dataOrigins,dataClean,dataFollowup,dataCleanSummary,abstract4 };
}

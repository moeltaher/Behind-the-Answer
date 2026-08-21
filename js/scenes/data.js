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
    return ['أوقفت مادة للمراجعة', 'لم تعتبر الإتاحة التقنية وحدها كافية، وأبقيت الحالة خارج الدفعة حتى حسم الحقوق أو الخصوصية أو الملاءمة.'];
  }
  if (choice === 'keep') return ['مررت مادة قبل اكتمال التحقق', 'أدخلت المادة رغم بقاء مشكلة غير محسومة في الحقوق أو الخصوصية أو الملاءمة.'];
  if (choice === 'remove') return ['استبعدت مادة بدل معالجة المشكلة المحددة', 'اخترت الحذف حتى عندما كان يمكن أن تكون هناك معالجة أو مراجعة أكثر تناسبًا مع المشكلة.'];
  if (choice === 'redact') return ['استخدمت التنقيح كحل جزئي', 'عالجت البيانات المباشرة، لكن التنقيح وحده لا يحسم مسائل الحقوق أو إعادة التعرف أو الملاءمة.'];
  return ['أرسلت مادة للمراجعة الاحتياطية', 'اخترت التوقف للتحقق حتى عندما كانت بطاقة السيناريو تسمح بمسار أكثر مباشرة.'];
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
      return `<button class="data-bit data-bit--label ${revealed?'revealed':''}" data-origin="${id}" aria-pressed="${revealed}"><strong>${ctx.h(label)}</strong>${revealed?`<small>${ctx.h(detail)}</small>`:'<small>استكشاف اختياري</small>'}</button>`;
    }).join('');
    const keepOpen = state.flags.dataOrigins.length ? ' open' : '';
    html(`<div><span class="eyebrow">من المحتوى إلى مواد البيانات</span><h1 class="scene-title">قبل أن تصبح المادة «بيانات»، كانت محتوى له مصدر وسياق.</h1><p class="scene-subtitle">المهمة الأساسية هي مراجعة الدفعة. يمكنك البدء فورًا، أو فتح أمثلة المصادر إذا أردت معرفة الأسئلة التي تثيرها.</p><div class="action-row"><button id="toClean" class="primary-btn">ابدأ مراجعة الدفعة</button></div><details class="optional-source-details"${keepOpen}><summary>استكشف أمثلة لمصادر البيانات — اختياري</summary><div class="data-cloud data-cloud--labels">${cards}</div></details></div>`);
    bind('[data-origin]','click',event=>{ const id=event.currentTarget.dataset.origin; if(state.flags.dataOrigins.includes(id))return; state.flags.dataOrigins.push(id); saveState(); dataOrigins(); });
    $('#toClean')?.addEventListener('click',()=>go('dataClean'));
  }

  function dataFollowup() {
    const followup=state.flags.dataFollowup;
    if(!followup){ go('dataClean'); return; }
    const item=DATA_ITEMS[followup.index];
    html(`<div><span class="eyebrow">نتيجة المراجعة</span><h1 class="scene-title">حُسم حق الاستخدام، لكن مشكلة الخصوصية ما زالت قائمة.</h1><div class="card flat"><p><strong>المادة:</strong> ${ctx.h(item.title)}</p><p><strong>الحقوق:</strong> يسمح بالاستخدام في سيناريو الدفعة بعد المراجعة.</p><p><strong>الخصوصية:</strong> رقم الهاتف والعنوان لا يحتاجهما الغرض.</p></div><p class="scene-subtitle">المراجعة لم تكن نهاية القرار؛ حلت مشكلة الحقوق فقط. اختر الآن ما تفعله بالمعلومات الشخصية غير اللازمة.</p><div class="choice-grid"><button id="followupRedact" class="choice-btn"><strong>نقّح بيانات الاتصال</strong><small>احتفظ بالمحتوى المفيد بعد إزالة المعلومات التي لا يحتاجها الغرض.</small></button><button id="followupKeep" class="choice-btn"><strong>احتفظ بها كما هي</strong><small>يمر المحتوى مع بيانات شخصية غير لازمة رغم أن حق الاستخدام أصبح واضحًا.</small></button></div></div>`);
    $('#followupRedact').addEventListener('click',()=>{
      state.flags.dataSort.redact+=1;
      addDecision('data-pii-redact-after-review','نقحت البيانات بعد حسم الحقوق','استخدمت المراجعة لحسم حق الاستخدام أولًا، ثم أزلت بيانات الاتصال التي لا يحتاجها غرض الدفعة.');
      state.flags.dataFollowup=null;
      state.flags.dataIndex+=1;
      saveState(); go('dataClean');
    });
    $('#followupKeep').addEventListener('click',()=>{
      state.flags.dataSort.keep+=1;
      addDecision('data-pii-keep-after-review','احتفظت ببيانات شخصية غير لازمة بعد حسم الحقوق','حُسم حق الاستخدام، لكن رقم الهاتف والعنوان بقيا رغم أن غرض الدفعة لا يحتاجهما.');
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
    html(`<div><span class="eyebrow">دفعة بيانات رقم 18</span><h1 class="scene-title">أنت الآن نور، متخصصة تجهيز بيانات.</h1><div class="reality-note"><strong>سياسة الدفعة الافتراضية</strong> المشكلة الواحدة قد تحتاج أكثر من إجراء. المراجعة تكلف وقتًا، والتنقيح لا يحسم الحقوق أو كل مخاطر إعادة التعرف.</div><div class="hud-grid"><div class="hud-item"><span>العنصر</span><strong>${index+1}/${DATA_ITEMS.length}</strong></div><div class="hud-item"><span>وقت المراجعة الإضافي</span><strong>${state.flags.dataReviewMinutes} دقيقة</strong></div><div class="hud-item"><span>الإجراءات المسجلة</span><strong>${Object.values(state.flags.dataSort).reduce((a,b)=>a+b,0)}</strong></div></div><div class="sort-layout"><div class="data-item card"><span class="kicker">${ctx.h(item.title)}</span><div class="data-preview">${ctx.h(item.body)}</div><div class="card flat"><p><strong>المصدر:</strong> ${ctx.h(item.source)}</p><p><strong>حالة الحقوق:</strong> ${ctx.h(item.rights)}</p><p><strong>الخصوصية:</strong> ${ctx.h(item.privacy)}</p></div></div><div class="sort-actions"><button data-sort="keep" class="choice-btn"><strong>احتفظ</strong><small>يمر كما هو إلى مواد هذه الدفعة.</small></button><button data-sort="redact" class="choice-btn"><strong>نقّح البيانات غير اللازمة</strong><small>يعالج المعلومات المباشرة فقط.</small></button><button data-sort="review" class="choice-btn"><strong>أوقفه للمراجعة</strong><small>يضيف 4 دقائق افتراضية ويبقي المادة خارج الدفعة حتى تتضح المشكلة.</small></button><button data-sort="remove" class="choice-btn"><strong>استبعد</strong><small>لا يدخل هذه الدفعة.</small></button></div></div></div>`);
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
      state.flags.dataIndex+=1;
      saveState(); dataClean();
    });
  }

  function dataCleanSummary() {
    addLedger(3,'منتجو المحتوى + نور','إنتاج مواد أصلية ثم جمع وفرز وتنقيح ومراجعة الحقوق والخصوصية والملاءمة','مواد بيانات مجهزة للتطوير','قد تحتاج المادة أكثر من إجراء قبل أن تصبح جاهزة لغرض تطوير محدد.');
    html(`<div><span class="eyebrow">انتهت مراجعة الدفعة</span><h1 class="scene-title">ماذا أنتجت هذه المرحلة؟</h1><div class="stage-output"><strong>مواد بيانات مرّت بإجراءات مختلفة</strong>المراجعة والتنقيح أصبحا خطوتين منفصلتين عندما كانت المشكلة متعددة الأجزاء، ولم تصبح «المراجعة» خيارًا مجانيًا بلا وقت.</div><div class="hud-grid"><div class="hud-item"><span>احتفاظ</span><strong>${state.flags.dataSort.keep}</strong></div><div class="hud-item"><span>تنقيح</span><strong>${state.flags.dataSort.redact}</strong></div><div class="hud-item"><span>مراجعة</span><strong>${state.flags.dataSort.review}</strong></div><div class="hud-item"><span>استبعاد</span><strong>${state.flags.dataSort.remove}</strong></div><div class="hud-item"><span>وقت مراجعة إضافي</span><strong>${state.flags.dataReviewMinutes} دقيقة</strong></div></div><div class="action-row"><button id="dataAbstract" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#dataAbstract').addEventListener('click',()=>go('abstract4'));
  }

  function abstract4(){ abstraction([['كتّاب ومستخدمون','إنتاج المحتوى','✎'],['نور','تجهيز مواد البيانات','◫']],'مواد بيانات مجهزة','المحتوى وقرارات الجمع والتنقيح والمراجعة أصبحت مواد يمكن استخدامها لاحقًا لأغراض تطوير مختلفة.','ch5Intro'); }
  return { ch4Intro,dataOrigins,dataClean,dataFollowup,dataCleanSummary,abstract4 };
}

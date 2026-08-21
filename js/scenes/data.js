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

export function createDataRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, mutateMetrics, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch4Intro() { chapterIntro(3, 'dataOrigins'); }

  function dataOrigins() {
    const cards = DATA_ORIGINS.map(([id,label,detail]) => {
      const revealed = state.flags.dataOrigins.includes(id);
      return `<button class="data-bit data-bit--label ${revealed?'revealed':''}" data-origin="${id}" aria-pressed="${revealed}"><strong>${ctx.h(label)}</strong>${revealed?`<small>${ctx.h(detail)}</small>`:'<small>اضغط لاستكشاف ما يحتاج مراجعة</small>'}</button>`;
    }).join('');
    html(`<div><span class="eyebrow">من المحتوى إلى البيانات</span><h1 class="scene-title">قبل أن تصبح المادة «بيانات»، كانت محتوى أنتجه أشخاص ومؤسسات.</h1><p class="scene-subtitle">استكشف أي مصادر تريدها. كل بطاقة تكشف سؤالًا مختلفًا عن المصدر أو الحقوق أو الخصوصية.</p><div class="data-cloud data-cloud--labels">${cards}</div><div class="action-row"><button id="toClean" class="primary-btn">انتقل إلى تجهيز البيانات</button></div></div>`);
    bind('[data-origin]','click',event=>{ const id=event.currentTarget.dataset.origin; if(state.flags.dataOrigins.includes(id))return; state.flags.dataOrigins.push(id); saveState(); dataOrigins(); });
    $('#toClean').addEventListener('click',()=>go('dataClean'));
  }

  function dataClean() {
    const index=state.flags.dataIndex;
    if(index>=DATA_ITEMS.length){ go('dataCleanSummary'); return; }
    const item=DATA_ITEMS[index];
    html(`<div><span class="eyebrow">دفعة بيانات رقم 18</span><h1 class="scene-title">أنت الآن نور، متخصصة تجهيز بيانات.</h1><div class="reality-note"><strong>سياسة هذه الدفعة الافتراضية</strong> المواد التي لم تُحسم ملاءمة مصدرها أو حقوق استخدامها أو مخاطر خصوصيتها لا تدخل الدفعة النهائية قبل المراجعة. هذه قاعدة السيناريو وليست حكمًا قانونيًا عامًا لكل استخدام.</div><div class="hud-grid"><div class="hud-item"><span>العناصر</span><strong>${index+1}/${DATA_ITEMS.length}</strong></div><div class="hud-item"><span>تم الاحتفاظ</span><strong>${state.flags.dataSort.keep}</strong></div><div class="hud-item"><span>قيد المراجعة</span><strong>${state.flags.dataSort.review}</strong></div></div><div class="sort-layout"><div class="data-item card"><span class="kicker">${ctx.h(item.title)}</span><div class="data-preview">${ctx.h(item.body)}</div><div class="card flat"><p><strong>المصدر:</strong> ${ctx.h(item.source)}</p><p><strong>حالة الحقوق:</strong> ${ctx.h(item.rights)}</p><p><strong>الخصوصية:</strong> ${ctx.h(item.privacy)}</p></div></div><div class="sort-actions"><button data-sort="keep" class="choice-btn"><strong>احتفظ</strong><small>يمر إلى المواد المجهزة وفق سياسة الدفعة.</small></button><button data-sort="remove" class="choice-btn"><strong>استبعد</strong><small>لا يدخل هذه الدفعة.</small></button><button data-sort="review" class="choice-btn"><strong>أوقفه للمراجعة</strong><small>يبقى خارج الدفعة حتى تتضح الحالة.</small></button></div></div></div>`);
    bind('[data-sort]','click',event=>{
      const choice=event.currentTarget.dataset.sort; state.flags.dataSort[choice]+=1;
      if(item.recommended==='review'&&choice==='review') addDecision(`data-review-${item.type}`,'أوقفت مادة للمراجعة','تحملت خطوة أبطأ بدل اعتبار الإتاحة التقنية وحدها كافية.',{cost:2,pressure:-1,dataQuality:3});
      else if(item.recommended==='review'&&choice==='keep') addDecision(`data-keep-${item.type}`,'مررت مادة قبل حسم المراجعة','أدخلت المادة قبل اكتمال التحقق وفق سياسة الدفعة.',{cost:-1,pressure:1,dataQuality:-3});
      else if(choice===item.recommended) mutateMetrics({dataQuality:2});
      else if(choice==='review') mutateMetrics({cost:1,pressure:-1,dataQuality:1});
      else mutateMetrics({dataQuality:-2,pressure:1});
      state.flags.dataIndex+=1; saveState(); dataClean();
    });
  }

  function dataCleanSummary() {
    addLedger(3,'منتجو المحتوى + نور','إنتاج مواد أصلية ثم جمع وفرز وتنظيف ومراجعة الجودة والخصوصية وحقوق الاستخدام','بيانات مجهزة للتطوير','هذه ليست بالضرورة المجموعة النهائية للتدريب؛ قد تنتقل مواد إلى تصنيف أو ضبط أو تقييم.');
    html(`<div><span class="eyebrow">انتهى تجهيز الدفعة</span><h1 class="scene-title">ماذا أنتجت هذه المرحلة؟</h1><div class="stage-output"><strong>مواد بيانات مجهزة وفق سياسة السيناريو</strong>جرى فرز المواد ومراجعة مصدرها وحقوقها وخصوصيتها بدرجات مختلفة.</div><div class="hud-grid"><div class="hud-item"><span>احتُفظ بها</span><strong>${state.flags.dataSort.keep}</strong></div><div class="hud-item"><span>استُبعدت</span><strong>${state.flags.dataSort.remove}</strong></div><div class="hud-item"><span>أُوقفت للمراجعة</span><strong>${state.flags.dataSort.review}</strong></div></div><div class="action-row"><button id="dataAbstract" class="primary-btn">انتقل إلى العمل البشري على البيانات</button></div></div>`);
    $('#dataAbstract').addEventListener('click',()=>go('abstract4'));
  }

  function abstract4(){ abstraction([['كتّاب ومستخدمون','إنتاج المحتوى','✍'],['نور','تجهيز البيانات','◫']],'بيانات مجهزة للتطوير','المحتوى وقرارات الجمع والتنظيف والمراجعة أصبحت مواد بيانات جاهزة للانتقال إلى استخدامات تطوير مختلفة.','ch5Intro'); }
  return { ch4Intro,dataOrigins,dataClean,dataCleanSummary,abstract4 };
}

import { DATA_ITEMS } from '../data/content-tasks.js';

const DATA_ORIGINS = [
  ['writer', 'مقالات ومحتوى مكتوب'],
  ['photo', 'صور فوتوغرافية'],
  ['code', 'شفرة برمجية'],
  ['research', 'أبحاث ودراسات'],
  ['forum', 'نقاشات منتديات'],
  ['translate', 'ترجمات'],
  ['docs', 'توثيق ومستندات'],
  ['qa', 'أسئلة وأجوبة'],
  ['web', 'صفحات ويب'],
  ['comment', 'تعليقات المستخدمين'],
  ['manual', 'أدلة تقنية'],
  ['news', 'أخبار وتقارير']
];

export function createDataRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const {
    chapterIntro,
    html,
    go,
    bind,
    saveState,
    mutateMetrics,
    addDecision,
    addLedger
  } = ctx;
  const abstraction = (humans, word, line, next) =>
    ctx.abstraction(humans, word, line, next);

  function ch4Intro() {
    chapterIntro(3, 'dataOrigins');
  }

  function dataOrigins() {
    const cards = DATA_ORIGINS.map(([id, label]) => {
      const revealed = state.flags.dataOrigins.includes(id);
      return `<button class="data-bit data-bit--label ${revealed ? 'revealed' : ''}" data-origin="${id}" aria-pressed="${revealed}"><span>${ctx.h(label)}</span>${revealed ? '<small>تم استعراضه</small>' : ''}</button>`;
    }).join('');

    html(`<div><span class="eyebrow">من المحتوى إلى البيانات</span><h1 class="scene-title">قبل أن تصبح المادة «بيانات»، كانت محتوى أنتجه أشخاص ومؤسسات.</h1><p class="scene-subtitle">ظهور المادة على الإنترنت لا يعني تلقائيًا أن استخدامها مناسب أو مشروع. المصدر والترخيص والخصوصية وحقوق المؤلف جزء من القرار لكل نوع من المواد.</p><div class="data-cloud data-cloud--labels">${cards}</div><div class="card flat"><strong>${state.flags.dataOrigins.length ? `استعرضت ${state.flags.dataOrigins.length} من ${DATA_ORIGINS.length} نوعًا.` : 'كل مربع يمثل نوعًا مختلفًا من المواد المحتملة.'}</strong><p class="muted small">الاستعراض هنا تعليمي فقط؛ لا يعني أن كل نوع يدخل كل نموذج.</p></div><div class="action-row"><button id="toClean" class="primary-btn">انتقل إلى تجهيز البيانات</button></div></div>`);

    bind('[data-origin]', 'click', event => {
      const id = event.currentTarget.dataset.origin;
      if (state.flags.dataOrigins.includes(id)) return;

      state.flags.dataOrigins.push(id);
      saveState();
      dataOrigins();
    });

    $('#toClean').addEventListener('click', () => go('dataClean'));
  }

  function dataClean() {
    const index = state.flags.dataIndex;
    if (index >= DATA_ITEMS.length) {
      go('dataCleanSummary');
      return;
    }

    const item = DATA_ITEMS[index];
    html(`<div><span class="eyebrow">دفعة بيانات رقم 18</span><h1 class="scene-title">أنت الآن نور، متخصصة تجهيز بيانات.</h1><div class="reality-note"><strong>قاعدة المراجعة</strong> لا يكفي سؤال «هل هذه المادة مفيدة؟». افحص الجودة والمصدر والخصوصية والترخيص وحقوق من أنتج المحتوى.</div><div class="hud-grid"><div class="hud-item"><span>العناصر</span><strong>${index + 1}/${DATA_ITEMS.length}</strong></div><div class="hud-item"><span>تم الاحتفاظ</span><strong>${state.flags.dataSort.keep}</strong></div><div class="hud-item"><span>قيد المراجعة</span><strong>${state.flags.dataSort.review}</strong></div></div><div class="sort-layout"><div class="data-item card"><span class="kicker">${ctx.h(item.title)}</span><div class="data-preview">${ctx.h(item.body)}</div><div class="card flat"><p><strong>المصدر:</strong> ${ctx.h(item.source)}</p><p><strong>حالة الحقوق:</strong> ${ctx.h(item.rights)}</p><p><strong>الخصوصية:</strong> ${ctx.h(item.privacy)}</p></div></div><div class="sort-actions"><button data-sort="keep" class="choice-btn"><strong>احتفظ</strong><small>يمر إلى المواد المجهزة.</small></button><button data-sort="remove" class="choice-btn"><strong>احذف</strong><small>يستبعد من الدفعة.</small></button><button data-sort="review" class="choice-btn"><strong>راجع المصدر والحقوق</strong><small>يبقى خارج الدفعة حتى تتضح الحالة.</small></button></div></div></div>`);

    bind('[data-sort]', 'click', event => {
      const choice = event.currentTarget.dataset.sort;
      state.flags.dataSort[choice] += 1;

      if (choice === item.recommended) {
        mutateMetrics({ quality: 2 });
      } else if (choice === 'review') {
        mutateMetrics({ cost: 1, pressure: -1, quality: 1 });
      } else {
        mutateMetrics({ quality: -2, pressure: 1 });
      }

      if (item.recommended === 'review') {
        if (choice === 'review') {
          addDecision(
            `data-review-${item.type}`,
            'أوقفت مادة حتى مراجعة مصدرها أو حقوق استخدامها',
            'تحملت خطوة أبطأ بدل اعتبار الإتاحة التقنية وحدها كافية.',
            { cost: 2, pressure: -1, quality: 3 }
          );
        } else if (choice === 'keep') {
          addDecision(
            `data-keep-${item.type}`,
            'احتفظت بمادة رغم أن حالة استخدامها لم تُحسم',
            'مررت المادة إلى الدفعة قبل اكتمال التحقق من الحقوق أو الخصوصية.',
            { cost: -1, pressure: 1, quality: -3 }
          );
        }
      }

      state.flags.dataIndex += 1;
      saveState();
      dataClean();
    });
  }

  function dataCleanSummary() {
    addLedger(
      3,
      'منتجو المحتوى + نور',
      'إنتاج مواد أصلية ثم جمع وفرز وتنظيف ومراجعة الجودة والخصوصية وحقوق الاستخدام',
      'بيانات مجهزة للتطوير',
      'هذه ليست بالضرورة المجموعة النهائية للتدريب؛ قد تنتقل بعض المواد إلى تصنيف بشري أو ضبط أو تقييم قبل استخدامها.'
    );

    html(`<div><span class="eyebrow">انتهى تجهيز الدفعة</span><h1 class="scene-title">ماذا أنتجت هذه المرحلة؟</h1><div class="stage-output"><strong>مواد بيانات مجهزة للمرحلة التالية</strong>جرى فرز المواد وتنظيفها ومراجعة مصدرها وحقوقها بدرجات مختلفة. بعض هذه المواد يمكن أن تنتقل إلى التصنيف أو التدريب أو التقييم بحسب الغرض.</div><div class="card"><div class="hud-grid"><div class="hud-item"><span>احتُفظ بها</span><strong>${state.flags.dataSort.keep}</strong></div><div class="hud-item"><span>حُذفت</span><strong>${state.flags.dataSort.remove}</strong></div><div class="hud-item"><span>أُرسلت للمراجعة</span><strong>${state.flags.dataSort.review}</strong></div></div></div><div class="action-row"><button id="dataAbstract" class="primary-btn">شاهد كيف يظهر الناتج في السلسلة</button></div></div>`);
    $('#dataAbstract').addEventListener('click', () => go('abstract4'));
  }

  function abstract4() {
    abstraction(
      [['كتّاب ومستخدمون', 'إنتاج المحتوى', '✍'], ['نور', 'تجهيز البيانات', '◫']],
      'بيانات مجهزة للتطوير',
      'المحتوى وقرارات الجمع والتنظيف والمراجعة أصبحت في النظام مواد بيانات جاهزة للانتقال إلى تصنيف أو تدريب أو تقييم.',
      'ch5Intro'
    );
  }

  return { ch4Intro, dataOrigins, dataClean, dataCleanSummary, abstract4 };
}

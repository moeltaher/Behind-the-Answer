import { DATA_ITEMS } from '../data/game-data.js';

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
    chapterIntro(3, '', '', 'dataOrigins');
  }

  function dataOrigins() {
    const cards = DATA_ORIGINS.map(([id, label]) => {
      const revealed = state.flags.dataOrigins.includes(id);

      return `
        <button
          class="data-bit data-bit--label ${revealed ? 'revealed' : ''}"
          data-origin="${id}"
          aria-pressed="${revealed}"
        >
          <span>${ctx.h(label)}</span>
          ${revealed ? '<small>تم استعراضه</small>' : ''}
        </button>
      `;
    }).join('');

    const summary = state.flags.dataOrigins.length
      ? `استعرضت ${state.flags.dataOrigins.length} من ${DATA_ORIGINS.length} نوعًا من البيانات.`
      : 'كل مربع هنا يمثل نوعًا مختلفًا من المواد التي قد تدخل في مجموعات بيانات.';

    html(`
      <div>
        <span class="eyebrow">من المحتوى إلى البيانات</span>
        <h1 class="scene-title">قبل أن تصبح المادة «بيانات»، كانت أنواعًا مختلفة من المحتوى أنتجها أشخاص ومؤسسات.</h1>
        <p class="scene-subtitle">هذه أمثلة على مواد يمكن أن تتحول لاحقًا إلى ملفات داخل مجموعة بيانات. اضغط على أي نوع تريد استعراضه؛ جميع الأنواع ظاهرة من البداية.</p>

        <div class="data-cloud data-cloud--labels">${cards}</div>

        <div class="card flat">
          <strong>${summary}</strong>
          <p class="muted small">لا تدعي اللعبة أن كل نوع هنا يدخل كل نموذج، بل توضح تنوع المواد التي قد تُجمع وتُنظم وتُستخدم أثناء تطوير أنظمة الذكاء الاصطناعي.</p>
        </div>

        <div class="action-row">
          <button id="toClean" class="primary-btn">انتقل إلى تجهيز البيانات</button>
        </div>
      </div>
    `);

    bind('[data-origin]', 'click', event => {
      const id = event.currentTarget.dataset.origin;
      if (state.flags.dataOrigins.includes(id)) return;

      state.flags.dataOrigins.push(id);
      mutateMetrics({ visibility: 1 });
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

    html(`
      <div>
        <span class="eyebrow">دفعة بيانات رقم 18</span>
        <h1 class="scene-title">أنت الآن نور، متخصصة تجهيز بيانات.</h1>

        <div class="reality-note">
          <strong>ما الذي تفعله نور؟</strong>
          ليست كل المواد المجمعة مناسبة للتدريب كما هي. توجد نسخ مكررة وصفحات فارغة وبيانات شخصية وحالات غامضة. لذلك يقوم البشر والبرمجيات بالتنظيف والفرز والمراجعة.
        </div>

        <div class="hud-grid">
          <div class="hud-item"><span>العناصر</span><strong>${index + 1}/${DATA_ITEMS.length}</strong></div>
          <div class="hud-item"><span>تم الاحتفاظ</span><strong>${state.flags.dataSort.keep}</strong></div>
          <div class="hud-item"><span>قيد المراجعة</span><strong>${state.flags.dataSort.review}</strong></div>
        </div>

        <div class="sort-layout">
          <div class="data-item card">
            <span class="kicker">${ctx.h(item.title)}</span>
            <div class="data-preview">${ctx.h(item.body)}</div>
          </div>

          <div class="sort-actions">
            <button data-sort="keep" class="choice-btn"><strong>احتفظ</strong><small>يمر إلى الدفعة.</small></button>
            <button data-sort="remove" class="choice-btn"><strong>احذف</strong><small>يستبعد من الدفعة.</small></button>
            <button data-sort="review" class="choice-btn"><strong>راجع لاحقًا</strong><small>أبطأ لكنه يترك الحالة لمراجعة إضافية.</small></button>
          </div>
        </div>
      </div>
    `);

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

      if (item.type === 'ambiguous') {
        if (choice === 'review') {
          addDecision(
            'data-review',
            'أرسلت حالة بيانات غامضة للمراجعة',
            'رفعت تكلفة المعالجة بدل حسم حالة غير واضحة بسرعة.',
            { pressure: -2, cost: 3, quality: 4, visibility: 2 }
          );
        } else {
          addDecision(
            'data-ambiguous',
            'حسمت حالة بيانات شبه معرّفة دون مراجعة',
            'السرعة قللت تكلفة المعالجة لكنها تركت مخاطرة جودة وخصوصية.',
            { pressure: 2, cost: -1, quality: -2, visibility: 1 }
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
      'إنتاج مواد أصلية ثم جمع وفرز وتنظيف ومراجعة البيانات',
      'مجموعة بيانات جاهزة للتدريب',
      'تتلاشى أسماء المنتجين والعاملين عندما تصبح المواد ملفًا منظمًا جاهزًا للاستخدام.'
    );

    html(`
      <div>
        <span class="eyebrow">انتهى تجهيز الدفعة</span>
        <h1 class="scene-title">ماذا أنتجت هذه المرحلة؟</h1>

        <div class="stage-output">
          <strong>مجموعة بيانات جاهزة للتدريب</strong>
          مجموعة من المواد التي جرى فرزها وتنظيفها ومراجعة أجزاء منها قبل الانتقال إلى مرحلة التدريب.
        </div>

        <div class="card">
          <div class="hud-grid">
            <div class="hud-item"><span>احتُفظ بها</span><strong>${state.flags.dataSort.keep}</strong></div>
            <div class="hud-item"><span>حُذفت</span><strong>${state.flags.dataSort.remove}</strong></div>
            <div class="hud-item"><span>أُرسلت للمراجعة</span><strong>${state.flags.dataSort.review}</strong></div>
          </div>
          <p class="muted">هذه الأرقام تختصر وراءها إنتاج المحتوى الأصلي وقرارات الجمع والتنظيف والفرز.</p>
        </div>

        <div class="action-row">
          <button id="dataAbstract" class="primary-btn">شاهد كيف يظهر الناتج في السلسلة</button>
        </div>
      </div>
    `);

    $('#dataAbstract').addEventListener('click', () => go('abstract4'));
  }

  function abstract4() {
    abstraction(
      [
        ['كتّاب ومستخدمون', 'إنتاج المحتوى', '✍'],
        ['نور', 'تجهيز البيانات', '◫']
      ],
      'مجموعة بيانات جاهزة',
      'المقالات والصور والشفرة وقرارات الجمع والتنظيف أصبحت في النظام مجموعة بيانات واحدة جاهزة للمرحلة التالية.',
      'ch5Intro'
    );
  }

  return {
    ch4Intro,
    dataOrigins,
    dataClean,
    dataCleanSummary,
    abstract4
  };
}

import { SUPPORT_TASKS } from '../data/game-data.js';

export function createDeploymentRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { setChapter, chapterIntro, html, go, bind, tone, saveState, mutateMetrics, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch8Intro() { chapterIntro(7, '', '', 'deployLoad'); }

  function deployLoad() {
    setChapter(7);
    html(`<div><span class="eyebrow">هانا — مهندسة تشغيل الخدمة</span><h1 class="scene-title">أصبحت الخدمة متاحة للمستخدمين.</h1><div class="reality-note"><strong>ما معنى تشغيل الخدمة؟</strong> بعد تدريب النموذج يجب توزيع الطلبات بين الخوادم ومراقبة الأعطال والاستجابة لها.</div><p class="scene-subtitle">وزّع 100% من الطلبات بين ثلاثة مراكز بيانات. يجب أن يساوي المجموع 100% بالضبط لأن كل رقم يمثل حصة من نفس الحمل.</p><div class="load-grid">${['أ', 'ب', 'ج'].map((name, i) => `<div class="load-card"><span>مركز البيانات ${name}</span><strong id="load${i}">${[34, 33, 33][i]}%</strong><input id="range${i}" type="range" min="0" max="100" step="1" value="${[34, 33, 33][i]}" aria-label="حصة مركز البيانات ${name} من الحمل" /></div>`).join('')}</div><div id="loadFeedback" class="alert"><strong>المجموع: <span id="loadTotal">100</span>%</strong><span>حرّك الأحمال ثم اختبر التوزيع. يمكنك دائمًا العودة إلى 34/33/33.</span></div><div class="action-row"><button id="balanceLoad" class="secondary-btn">أعد التوزيع المتوازن</button><button id="testLoad" class="primary-btn">اختبر التوزيع</button></div></div>`);

    const updateTotal = () => {
      const values = [0, 1, 2].map(i => Number($('#range' + i).value));
      [0, 1, 2].forEach(i => { $('#load' + i).textContent = values[i] + '%'; });
      $('#loadTotal').textContent = values.reduce((a, b) => a + b, 0);
    };
    [0, 1, 2].forEach(i => $('#range' + i).addEventListener('input', updateTotal));
    $('#balanceLoad').addEventListener('click', () => {
      [34, 33, 33].forEach((value, i) => { $('#range' + i).value = value; });
      updateTotal();
    });
    $('#testLoad').addEventListener('click', () => {
      const values = [0, 1, 2].map(i => Number($('#range' + i).value));
      const total = values.reduce((a, b) => a + b, 0);
      const max = Math.max(...values);
      if (total !== 100) {
        $('#loadFeedback').innerHTML = `<strong>المجموع الآن ${total}%</strong><span>لأن الأرقام حصص من الحمل نفسه، يجب أن يكون المجموع 100% بالضبط.</span>`;
        tone(170, .08, 'square');
        return;
      }
      if (max > 60) mutateMetrics({ burden: 3, quality: -2, pressure: 2 });
      else mutateMetrics({ quality: 2 });
      go('deployIncident');
    });
  }

  function deployIncident() {
    const tabs = [
      ['network', 'الشبكة', 'الشبكة مستقرة، ولا توجد زيادة واضحة في فقد البيانات.'],
      ['compute', 'الخوادم', 'السعة متاحة، لكن بعض العمليات تُعاد تشغيلها.'],
      ['model', 'خدمة النموذج', 'استهلاك الذاكرة يرتفع تدريجيًا في الإصدار الجديد.']
    ];
    html(`<div><span class="eyebrow">عطل في الخدمة</span><h1 class="scene-title">ارتفعت نسبة الأخطاء إلى 12%</h1><div class="alert dangerish"><strong>12,417 مستخدمًا متأثرًا — رقم افتراضي داخل اللعبة</strong><span>افتح الأقسام الثلاثة لتحديد مكان المشكلة.</span></div><div class="incident-tabs">${tabs.map(([id, label]) => `<button data-tab="${id}" class="${state.flags.deployTabs.includes(id) ? 'active' : ''}">${label}</button>`).join('')}</div><div id="tabReadout" class="card flat">افتح الشبكة والخوادم وخدمة النموذج.</div>${state.flags.deployTabs.length === 3 ? '<div class="choice-grid"><button id="restartInst" class="choice-btn"><strong>أعد تشغيل الوحدات المتأثرة</strong><small>عودة أسرع مع احتمال تكرار المشكلة.</small></button><button id="rollback" class="choice-btn"><strong>ارجع إلى الإصدار السابق</strong><small>استعادة أبطأ لكنها تعالج الاشتباه في الإصدار الجديد.</small></button></div>' : ''}</div>`);

    bind('[data-tab]', 'click', event => {
      const id = event.currentTarget.dataset.tab;
      const tab = tabs.find(item => item[0] === id);
      $('#tabReadout').textContent = tab[2];
      if (!state.flags.deployTabs.includes(id)) {
        state.flags.deployTabs.push(id);
        mutateMetrics({ discovery: 1 });
        saveState();
        deployIncident();
      }
    });

    $('#restartInst')?.addEventListener('click', () => { state.flags.deployRecovery = 'restart'; addDecision('deploy-restart', 'أعدت تشغيل الوحدات المتأثرة', 'عادت الخدمة أسرع مع احتمال بقاء سبب العطل.', { pressure: 5, cost: -3, burden: 5, quality: -3 }); saveState(); go('onCall'); });
    $('#rollback')?.addEventListener('click', () => { state.flags.deployRecovery = 'rollback'; addDecision('deploy-rollback', 'عدت إلى الإصدار السابق', 'تحملت وقت استعادة أطول مقابل استقرار أعلى.', { pressure: -3, cost: 4, burden: 1, quality: 5 }); saveState(); go('onCall'); });
  }

  function onCall() {
    const restarted = state.flags.deployRecovery === 'restart';
    html(`<div><span class="eyebrow">بعد استعادة الخدمة</span><h1 class="scene-title">الخدمة عادت، لكن أثر الحادث ما زال يصل إلى المستخدمين.</h1><div class="role-card card flat"><div class="avatar">◉</div><div><h3>هانا</h3><p>تعاملت مع العطل ${restarted ? 'بإعادة تشغيل الوحدات المتأثرة' : 'بالعودة إلى الإصدار السابق'}.</p></div></div><div class="card"><p>انخفضت نسبة الأخطاء، لكن مستخدمين أرسلوا بلاغات مرتبطة مباشرة بفترة التعطل والتحديث.</p><div class="alert"><strong>المرحلة التالية من نفس الحادث</strong><span>ينتقل أثر المشكلة الآن من غرفة التشغيل إلى سامر وفريق الدعم.</span></div></div><div class="action-row"><button id="toSupport" class="primary-btn">انتقل إلى بلاغات الحادث</button></div></div>`);
    $('#toSupport').addEventListener('click', () => go('supportTask'));
  }

  function supportTask() {
    const i = state.flags.supportIndex;
    if (i >= SUPPORT_TASKS.length) { go('deployEnd'); return; }
    const task = SUPPORT_TASKS[i];
    html(`<div><span class="eyebrow">سامر — دعم المستخدمين</span><h1 class="scene-title">بلاغ مرتبط بالحادث ${i + 1}/${SUPPORT_TASKS.length}</h1><p class="scene-subtitle">الدعم يحول أثر العطل من تجربة فردية إلى معلومة يمكن أن تعود إلى فرق التشغيل والجودة.</p><div class="card"><div class="message user">${ctx.h(task.q)}</div><div class="choice-grid"><button id="supportGood" class="choice-btn"><strong>${ctx.h(task.a)}</strong></button><button id="supportGeneric" class="choice-btn"><strong>أرسل ردًا عامًا وأغلق الحالة</strong><small>أسرع، لكنه قد لا يحل المشكلة أو يعيد المعلومة إلى الفريق المناسب.</small></button></div></div></div>`);
    $('#supportGood').addEventListener('click', () => { mutateMetrics({ quality: 2 }); state.flags.supportIndex += 1; saveState(); supportTask(); });
    $('#supportGeneric').addEventListener('click', () => { mutateMetrics({ pressure: 2, quality: -2 }); state.flags.supportIndex += 1; saveState(); supportTask(); });
  }

  function deployEnd() {
    addLedger(7, 'هانا وسامر وفرق العمليات', 'مراقبة الخدمة، الاستجابة للأعطال، المناوبات والدعم', 'الخدمة متاحة للمستخدمين', 'تظهر نتيجة هذا العمل للمستخدم كخدمة متاحة، لا كورديات تشغيل ودعم.');
    html(`<div><span class="eyebrow">نهاية مرحلة التشغيل</span><h1 class="scene-title">ماذا أنتجت هذه المرحلة؟</h1><div class="stage-output"><strong>خدمة عادت إلى حالة متاحة بعد عطل</strong>خلف كلمة «متاحة» توجد مراقبة واستجابة للأعطال ومناوبات ودعم وصيانة.</div><div class="card"><div class="hud-grid"><div class="hud-item"><span>طريقة الاستعادة</span><strong>${state.flags.deployRecovery === 'rollback' ? 'العودة لإصدار سابق' : 'إعادة تشغيل الوحدات'}</strong></div><div class="hud-item"><span>بلاغات الحادث</span><strong>${state.flags.supportIndex} عولجت</strong></div><div class="hud-item"><span>العمل البشري في الواجهة</span><strong>غير ظاهر</strong></div></div></div><div class="action-row"><button id="uptimeAbstract" class="primary-btn">شاهد كيف يختصر المنتج هذا العمل</button></div></div>`);
    $('#uptimeAbstract').addEventListener('click', () => go('abstract8'));
  }

  function abstract8() { abstraction([['هانا', 'التشغيل', '◉'], ['سامر', 'الدعم', '☏'], ['فرق الشبكات', '', '≋']], 'الخدمة متاحة', 'المناوبات وإصلاح الأعطال ودعم المستخدمين أصبحت للمستخدم حالة واحدة: الخدمة تعمل.', 'ch9Intro'); }

  return { ch8Intro, deployLoad, deployIncident, onCall, supportTask, deployEnd, abstract8 };
}

import { ANNOTATION_TASKS, DATA_ITEMS } from '../data/content-tasks.js';

const RELEASE_GATES = [
  ['regression', 'اختبارات الانحدار', 'راجع نتيجة تقارن السلوك الحالي بالنسخة السابقة وتثبت عدم كسر الوظائف الأساسية.'],
  ['capacity', 'الأداء والسعة', 'راجع أن قياسات الأداء والسعة تقع داخل الحدود التشغيلية المطلوبة قبل الإطلاق.'],
  ['risk', 'السلامة والأمن والخصوصية', 'راجع نتائج السلامة والأمن والخصوصية، مع بقاء أي مسألة بيانات غير محسومة حاجبًا مستقلًا.'],
  ['rollback', 'المراقبة وخطة التراجع', 'تحقق من وجود مؤشرات مراقبة وخطة قابلة للتنفيذ للعودة إلى نسخة سابقة.']
];

const ANNOTATION_REASON = [
  'لا يظهر في النص تهديد أو إساءة أو مؤشر خطر واضح.',
  'التهديد بكسر الهاتف تهديد مباشر بإتلاف ممتلكات، لذلك يطابق فئة العنف في دليل المشروع.',
  'الإهانة مباشرة ولا تعتمد على انتماء محمي، لذلك تقع ضمن المضايقة أو الإساءة.',
  'النص نفسه يقول إن المعنى يعتمد على سياق غير متاح، لذلك «غير واضح» قرار قابل للدفاع.',
  'الإساءة مرتبطة صراحة بانتماء محمي، لذلك يطابق المثال تعريف خطاب الكراهية.',
  'الجملة تعبر عن ضيق شديد لكنها لا تقدم وحدها إشارة واضحة إلى نية أو سلوك لإيذاء النفس؛ لذلك يبقى السياق غير كافٍ.'
];

function hasDecision(state, id) {
  return state.decisions.some(decision => decision.id === id);
}

function unresolvedIndices(state) {
  const indices = [];
  state.flags.dataStatuses.forEach((status, index) => {
    if (status !== 'ready') return;
    const check = state.flags.dataChecks[index];
    if (check && Object.values(check).includes('unresolved')) indices.push(index);
  });
  return indices;
}

function escaped(ctx, value) {
  return ctx.h(String(value));
}

function enhanceFactory(ctx) {
  if (ctx.state.scene !== 'factoryOutcome') return;
  const action = ctx.$('#toFactoryAbstract');
  if (!action || ctx.$('[data-audit-factory-debt]')) return;
  const continued = ctx.state.flags.factoryChoice === 'continue';
  const panel = document.createElement('div');
  panel.dataset.auditFactoryDebt = 'true';
  panel.className = `alert ${continued ? 'dangerish' : 'goodish'}`;
  panel.innerHTML = continued
    ? '<strong>دين صيانة باقٍ بعد الدفعة</strong><span>شدّد الفحص على المنتج، لكنه لم يغلق سبب ارتفاع الجسيمات. سيُسجل تحقيق صيانة مفتوح بدل أن تختفي المشكلة بمجرد اجتياز الوحدات للفحص.</span>'
    : '<strong>أُغلق سبب التنبيه داخل المرحلة</strong><span>تحملت الدفعة تأخيرًا، لكن التحقيق والإصلاح والتحقق أعاد المؤشر إلى النطاق قبل الانتقال.</span>';
  action.closest('.action-row')?.before(panel);
  action.addEventListener('click', () => {
    const id = continued ? 'factory-maintenance-open' : 'factory-maintenance-closed';
    if (!hasDecision(ctx.state, id)) {
      ctx.addDecision(
        id,
        continued ? 'انتقلت الدفعة مع تحقيق صيانة مفتوح' : 'أغلقت تحقيق الصيانة قبل انتقال الدفعة',
        continued
          ? 'نجح الفحص في استبعاد وحدات أكثر، لكن سبب ارتفاع الجسيمات بقي عمل صيانة مطلوبًا بعد الدفعة.'
          : 'دفع القرار تكلفة تأخير لكنه أغلق سبب التنبيه وأعاد المؤشر إلى النطاق قبل الانتقال.'
      );
    }
  }, { once: true });
}

function enhanceAnnotation(ctx) {
  if (ctx.state.scene !== 'annotationReview' || ctx.$('[data-audit-annotation-review]')) return;
  const body = ctx.$('.annotation-body');
  if (!body) return;
  const results = ctx.state.flags.annotationResults;
  const section = document.createElement('details');
  section.dataset.auditAnnotationReview = 'true';
  section.className = 'transition-details';
  section.open = true;
  section.innerHTML = `<summary>مراجعة اختياراتك مثالًا بمثال</summary><div class="evidence-results">${results.map(result => {
    const task = ANNOTATION_TASKS[result.index];
    const expected = task?.best ?? '—';
    const status = result.choice === expected ? 'متسق مع الدليل' : result.acceptedAsReasonable ? 'قابل للدفاع' : 'يحتاج مراجعة';
    return `<article class="card flat"><strong>المثال ${result.index + 1}: ${escaped(ctx, status)}</strong><p><b>اختيارك:</b> ${escaped(ctx, result.choice)} — <b>المرجع في السيناريو:</b> ${escaped(ctx, expected)}</p><p>${escaped(ctx, ANNOTATION_REASON[result.index] || '')}</p>${result.reviewRejected && result.acceptedAsReasonable ? '<p class="small muted">رغم اتساق اختيارك مع الدليل المعروض، رفضه المراجع؛ لذلك تفصل اللعبة بين تقييم أداء العامل وسلطة المراجعة.</p>' : ''}</article>`;
  }).join('')}</div>`;
  const choices = body.querySelector('.choice-grid, .action-row');
  if (choices) body.insertBefore(section, choices);
  else body.append(section);
}

function enhanceCheckpointEvidence(ctx) {
  if (ctx.state.scene !== 'safetyTest' || ctx.$('[data-audit-checkpoint]')) return;
  const complete = hasDecision(ctx.state, 'checkpoint-hypothesis-checked');
  const choices = [...ctx.$$('.safety-choice')];
  const checkpoint = ctx.state.flags.trainingCheckpoint;
  const panel = document.createElement('section');
  panel.dataset.auditCheckpoint = 'true';
  panel.className = 'card';
  panel.innerHTML = `<span class="kicker">تحقق من فرضية نقطة الحفظ قبل اختبار السلامة</span><h2>${checkpoint === 'recent' ? 'النقطة الأحدث استهدفت نبرة الرسائل العربية — هل نعلن أنها أفضل؟' : 'النقطة الأكثر اختبارًا هي خط الأساس — ما الذي نستنتجه؟'}</h2><div class="view-list"><span>عينة أ: النبرة الأقصر تحسنت في بعض الرسائل.</span><span>عينة ب: لا فرق واضح في بعض الحالات.</span><span>عينة ج: ظهرت صياغة أضعف في حالة أخرى.</span></div><p class="small muted">هذه أدلة مختلطة عمدًا: التغيير المستهدف يكوّن فرضية، ولا يثبت فائدته بمجرد حداثة checkpoint.</p>${complete ? '<div class="alert goodish"><strong>اكتمل التحقق المفاهيمي</strong><span>سجلت أن الحكم يحتاج قياسًا على عينة ومعيار مناسبين قبل الإطلاق.</span></div>' : '<div class="choice-grid audit-checkpoint-choices"><button class="choice-btn" data-checkpoint-answer="better"><strong>الأحدث أفضل لأنه أحدث</strong></button><button class="choice-btn" data-checkpoint-answer="measure"><strong>الأدلة مختلطة ويجب قياس الأثر</strong></button><button class="choice-btn" data-checkpoint-answer="ignore"><strong>لا علاقة للتقييم بالتغيير المستهدف</strong></button></div><div class="decision-feedback-inline" data-checkpoint-feedback hidden role="status"></div>'}`;
  const firstCard = ctx.$('.card');
  if (firstCard) firstCard.before(panel);
  else ctx.$('#scene')?.prepend(panel);
  if (complete) return;
  choices.forEach(button => { button.disabled = true; });
  ctx.bind('[data-checkpoint-answer]', 'click', event => {
    const feedback = ctx.$('[data-checkpoint-feedback]');
    if (event.currentTarget.dataset.checkpointAnswer !== 'measure') {
      if (feedback) {
        feedback.hidden = false;
        feedback.innerHTML = '<strong>الاستنتاج أوسع من الأدلة.</strong><span>حدوث تغيير مستهدف لا يكفي لإثبات تحسن عام، كما أن التقييم هو المكان الذي تختبر فيه الفرضية.</span>';
      }
      return;
    }
    ctx.addDecision('checkpoint-hypothesis-checked', 'اختبرت فرضية تغيير نقطة الحفظ بدل افتراض فائدته', 'عاملت التغيير المستهدف كفرضية تحتاج عينة ومعيار تقييم، وكانت الأدلة المختلطة سببًا لعدم إعلان تحسن تلقائي.');
    ctx.go('safetyTest');
  });
}

function gateComplete(ctx, id) {
  return hasDecision(ctx.state, `release-gate-${id}`);
}

function enhanceReleaseGates(ctx) {
  if (ctx.state.scene !== 'launchDecision' || ctx.$('[data-audit-release-controls]')) return;
  const baseline = ctx.$('.baseline-gates');
  if (!baseline) return;
  baseline.dataset.auditReleaseControls = 'true';
  baseline.innerHTML = RELEASE_GATES.map(([id, title, detail]) => {
    const done = gateComplete(ctx, id);
    return `<article class="card flat"><strong>${escaped(ctx, title)}</strong><p>${escaped(ctx, detail)}</p>${done ? '<span class="task-status task-status--complete">✓ راجعت الدليل</span>' : `<button class="secondary-btn" data-release-gate="${id}" type="button">راجع الدليل وثبّت البوابة</button>`}</article>`;
  }).join('');
  ctx.bind('[data-release-gate]', 'click', event => {
    const id = event.currentTarget.dataset.releaseGate;
    const gate = RELEASE_GATES.find(item => item[0] === id);
    if (!gate || gateComplete(ctx, id)) return;
    ctx.addDecision(`release-gate-${id}`, `راجعت دليل بوابة ${gate[1]}`, gate[2]);
    ctx.go('launchDecision');
  });

  const blockers = unresolvedIndices(ctx.state);
  const actionHost = ctx.$('.choice-grid') || ctx.$('.action-row');
  if (blockers.length && actionHost) {
    const panel = document.createElement('section');
    panel.className = 'card';
    panel.dataset.auditDataBlockers = 'true';
    panel.innerHTML = `<span class="kicker">حاجب إصدار: حوكمة البيانات</span><h2>لا يمكن نقل هذه المسائل إلى المراقبة بعد الإطلاق.</h2><p>في سياسة هذا السيناريو، مسألة حقوق أو خصوصية غير محسومة في مادة مستخدمة هي blocker وليست مجرد فحص تشغيلي قابل للمراقبة لاحقًا.</p>${blockers.map(index => {
      const item = DATA_ITEMS[index];
      const check = ctx.state.flags.dataChecks[index];
      const unresolved = Object.entries(check).filter(([, value]) => value === 'unresolved').map(([key]) => ({ rights:'الحقوق', privacy:'الخصوصية', fitness:'الملاءمة' }[key])).join('، ');
      return `<article class="card flat"><strong>${escaped(ctx, item?.title || `المادة ${index + 1}`)}</strong><p>غير محسوم: ${escaped(ctx, unresolved)}</p><div class="choice-grid"><button class="secondary-btn" data-data-resolve="${index}" type="button">أكمل المراجعة والمعالجة</button><button class="text-btn danger" data-data-exclude="${index}" type="button">استبعد المادة من هذه الجولة</button></div></article>`;
    }).join('')}`;
    actionHost.before(panel);
    actionHost.hidden = true;
    ctx.bind('[data-data-resolve]', 'click', event => {
      const index = Number(event.currentTarget.dataset.dataResolve);
      const check = ctx.state.flags.dataChecks[index];
      if (!check) return;
      for (const key of Object.keys(check)) if (check[key] === 'unresolved') check[key] = 'clear';
      ctx.addDecision(`data-governance-resolved-${index}`, `حسمت مسائل المادة ${index + 1} قبل الإطلاق`, 'أكملت المراجعة أو المعالجة المطلوبة داخل سياسة السيناريو بدل ترحيل مسألة حقوق/خصوصية غير محسومة إلى التشغيل.');
      ctx.saveState();
      ctx.go('launchDecision');
    });
    ctx.bind('[data-data-exclude]', 'click', event => {
      const index = Number(event.currentTarget.dataset.dataExclude);
      ctx.state.flags.dataStatuses[index] = 'excluded';
      ctx.state.flags.dataChecks[index] = { rights:'na', privacy:'na', fitness:'na' };
      ctx.addDecision(`data-governance-excluded-${index}`, `استبعدت المادة ${index + 1} قبل الإطلاق`, 'أزلت المادة من مدخلات هذه الجولة لأن المسألة غير المحسومة لم تُغلق قبل الإصدار.');
      ctx.saveState();
      ctx.go('launchDecision');
    });
    return;
  }

  const allGates = RELEASE_GATES.every(([id]) => gateComplete(ctx, id));
  if (!allGates && actionHost) {
    actionHost.hidden = true;
    const note = document.createElement('div');
    note.className = 'alert dangerish';
    note.innerHTML = '<strong>قرار الإطلاق مقفول مؤقتًا</strong><span>راجع الأدلة في البوابات الأربع أولًا. عرض البوابات وحده لا يعني اجتيازها.</span>';
    actionHost.before(note);
    return;
  }

  const monitorable = [];
  if (ctx.state.flags.trainingCheckpoint === 'recent') monitorable.push(['checkpoint', 'تحقق موسع من تغيير checkpoint الأحدث']);
  if (ctx.state.flags.trainingCompute === '8' && ctx.state.flags.trainingIncidentChoice === 'continue') monitorable.push(['stability', 'فحص الاستقرار بعد الاستمرار عند حد السعة']);
  const pending = monitorable.filter(([id]) => !hasDecision(ctx.state, `extra-check-${id}`));
  if (pending.length && actionHost) {
    const panel = document.createElement('section');
    panel.className = 'card';
    panel.innerHTML = `<span class="kicker">أعمال إضافية قابلة للمراقبة</span><p>يمكن إطلاق الخدمة مع مراقبة هذه الأعمال، أو إكمالها الآن. إذا اخترت التأجيل فلن تدعي اللعبة أنها اكتملت قبل تنفيذها.</p>${pending.map(([id, title]) => `<button class="secondary-btn" data-extra-check="${id}" type="button">نفّذ: ${escaped(ctx, title)}</button>`).join('')}`;
    actionHost.before(panel);
    ctx.bind('[data-extra-check]', 'click', event => {
      const id = event.currentTarget.dataset.extraCheck;
      const title = monitorable.find(item => item[0] === id)?.[1] || 'التحقق الإضافي';
      ctx.addDecision(`extra-check-${id}`, `أكملت ${title}`, 'راجعت الدليل الإضافي الذي أنشأه مسار اللعب قبل اعتماد الإطلاق المؤجل.');
      ctx.go('launchDecision');
    });
    const delay = ctx.$('#delayLaunch');
    if (delay) delay.disabled = true;
  }
}

function enhanceTransfer(ctx) {
  if (ctx.state.scene !== 'transferChallenge' || ctx.state.flags.transferChoice || ctx.$('[data-audit-transfer]')) return;
  const grid = ctx.$('.choice-grid');
  if (!grid) return;
  const tasks = [
    ['weights', 'أوزان النموذج التي دُرّبت وراجعتها الفرق قبل إطلاق الخدمة', 'build'],
    ['retrieval', 'في خدمة RAG: استرجاع مستندات مرتبطة بسؤال المستخدم الحالي', 'request'],
    ['inference', 'تنفيذ inference لإنتاج نتيجة الطلب الحالي', 'request'],
    ['monitoring', 'مراقبة الأخطاء والسعة والحوادث أثناء تشغيل الخدمة', 'continuous'],
    ['maintenance', 'صيانة الخوادم والتبريد والشبكات التي تبقي البنية متاحة', 'continuous']
  ];
  grid.dataset.auditTransfer = 'true';
  grid.className = 'card';
  grid.innerHTML = `<span class="kicker">صنّف العناصر بدل اختيار إجابة واضحة</span><p>المنتج الجديد خدمة توليد تستخدم RAG. ضع كل عنصر في زمنه الأساسي.</p>${tasks.map(([id, label]) => `<label class="form-row"><span>${escaped(ctx, label)}</span><select data-transfer-item="${id}"><option value="">اختر…</option><option value="build">بُني قبل الطلب</option><option value="request">يحدث مع الطلب الحالي</option><option value="continuous">تشغيل مستمر</option></select></label>`).join('')}<div class="decision-feedback-inline" data-transfer-feedback hidden role="status"></div><div class="action-row"><button class="primary-btn" data-transfer-submit type="button">تحقق من التصنيف</button></div>`;
  ctx.bind('[data-transfer-submit]', 'click', () => {
    const answers = Object.fromEntries([...ctx.$$('[data-transfer-item]')].map(select => [select.dataset.transferItem, select.value]));
    const wrong = tasks.filter(([id,, correct]) => answers[id] !== correct);
    const feedback = ctx.$('[data-transfer-feedback]');
    if (wrong.length) {
      if (feedback) {
        feedback.hidden = false;
        feedback.innerHTML = `<strong>${wrong.length} عناصر تحتاج إعادة تصنيف.</strong><span>ابحث عن الفرق بين ما كوّن النظام تاريخيًا، وما ينفذ بسبب الطلب الحالي، وما يستمر حتى عندما لا يرسل مستخدم طلبًا.</span>`;
      }
      return;
    }
    ctx.state.flags.transferChoice = 'build-use';
    ctx.saveState();
    ctx.go('transferChallenge');
  });
}

function enhanceRequestTime(ctx) {
  if (ctx.state.scene !== 'finalAnswer' || ctx.$('[data-audit-request-time]')) return;
  if (ctx.state.flags.deployRecovery === 'restart') {
    const delivery = ctx.$('.delivery-state');
    if (delivery) delivery.innerHTML = '<strong>وصل بعد استعادة الخدمة</strong><span>إعادة التشغيل أعادت الوحدات سريعًا، لكن الإصدار المشتبه به بقي موجودًا. لا تفترض اللعبة عدد محاولات أو إعادة إرسال لم تحدث داخل اللعب.</span>';
  }
  const note = document.createElement('div');
  note.dataset.auditRequestTime = 'true';
  note.className = 'reality-note';
  note.innerHTML = '<strong>وقد يحدث وقت الطلب بحسب تصميم المنتج</strong><span>توجيه الطلب، استرجاع مستندات في أنظمة RAG، فحوص moderation، استدعاء أدوات، caching أو تسجيل تشغيلي. هذه أمثلة شرطية وليست ادعاءً بأن كل خدمة تنفذها.</span>';
  const action = ctx.$('#showResults')?.closest('.action-row');
  if (action) action.before(note);
}

function enhanceHeadroom(ctx) {
  if (!['deployIncident','onCall','supportTask','deployEnd'].includes(ctx.state.scene) || ctx.$('[data-audit-headroom]')) return;
  const load = ctx.state.flags.deployLoad;
  if (!Array.isArray(load)) return;
  const limits = [60,45,35];
  const margins = load.map((value, index) => limits[index] - value);
  const total = margins.reduce((sum, value) => sum + Math.max(0, value), 0);
  const max = Math.max(...margins);
  const panel = document.createElement('div');
  panel.dataset.auditHeadroom = 'true';
  panel.className = 'hud-grid';
  panel.innerHTML = `<div class="hud-item"><span>إجمالي الهامش المتاح</span><strong>${total} نقطة مئوية</strong></div><div class="hud-item"><span>أكبر هامش في موقع واحد</span><strong>${max} نقطة مئوية</strong></div><div class="hud-item"><span>هوامش أ / ب / ج</span><strong>${margins.join(' / ')}</strong></div>`;
  const heading = ctx.$('.scene-title');
  heading?.after(panel);
}

export function enhanceAuditScene(ctx) {
  enhanceFactory(ctx);
  enhanceAnnotation(ctx);
  enhanceCheckpointEvidence(ctx);
  enhanceReleaseGates(ctx);
  enhanceTransfer(ctx);
  enhanceRequestTime(ctx);
  enhanceHeadroom(ctx);
}

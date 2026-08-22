import { supportingRoleStrip } from '../components/supporting-role-strip.js';
import { DATA_ITEMS } from '../data/content-tasks.js';

const MIN_COMPUTE_TO_CONTINUE = 7;

function hasUnresolved(check) {
  return check && Object.values(check).includes('unresolved');
}

export function createTrainingRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch6Intro() { chapterIntro(5, 'trainingSetup'); }

  function annotationInputs() {
    const results=state.flags.annotationResults;
    const confirmed=results.filter(result=>result.acceptedAsReasonable&&!result.pending&&!result.reviewRejected).length;
    const pending=results.filter(result=>result.pending&&!result.reviewRejected).length;
    const rejected=results.filter(result=>result.reviewRejected||!result.acceptedAsReasonable).length;
    return { confirmed, pending, rejected };
  }

  function unresolvedReadyIndices() {
    const result=[];
    state.flags.dataStatuses.forEach((status,index)=>{
      if(status==='ready'&&hasUnresolved(state.flags.dataChecks[index])) result.push(index);
    });
    return result;
  }

  function dataInputs(forTraining=false) {
    const statuses=state.flags.dataStatuses;
    let unresolved=0;
    let clear=0;
    let passed=0;
    statuses.forEach((status,index)=>{
      if(status!=='ready') return;
      if(forTraining && state.flags.dataTrainingHeld.includes(index)) return;
      passed+=1;
      if(hasUnresolved(state.flags.dataChecks[index])) unresolved+=1;
      else clear+=1;
    });
    return {
      passed,
      clear,
      unresolved,
      pending: statuses.filter(status=>status==='pending').length,
      excluded: statuses.filter(status=>status==='excluded').length,
      held: state.flags.dataTrainingHeld.length
    };
  }

  function confirmedExamplesLabel(count) {
    if(count===0) return 'لا أمثلة بشرية مؤكدة';
    if(count===1) return 'مثال بشري مؤكد واحد';
    if(count===2) return 'مثالان بشريان مؤكدان';
    return `${count} أمثلة بشرية مؤكدة`;
  }

  function pendingCasesLabel(count) {
    if(count===0) return 'لا حالات معلقة';
    if(count===1) return 'حالة معلقة واحدة';
    if(count===2) return 'حالتان معلقتان';
    return `${count} حالات معلقة`;
  }

  function computeDescription(total) {
    const initialMargin=total-MIN_COMPUTE_TO_CONTINUE;
    const afterFailure=total-1;
    const remainingMargin=afterFailure-MIN_COMPUTE_TO_CONTINUE;
    return { initialMargin, afterFailure, remainingMargin };
  }

  function trainingEligibilityMarkup() {
    const unresolved=unresolvedReadyIndices();
    if(!unresolved.length) return '<div class="alert goodish"><strong>أهلية البيانات لهذه الجولة واضحة</strong><span>لا توجد مادة مارة تحمل مسألة غير محسومة في الحالات المعروضة.</span></div>';
    return `<section class="card"><span class="kicker">بوابة أهلية البيانات قبل المعالجة</span><h2>المرور في مرحلة البيانات لا يمنح إذنًا تلقائيًا لاستخدام المادة في post-training.</h2><p>اتخذ قرارًا مستقلًا لكل مادة غير محسومة. إذا أدخلتها رغم الحاجب، ستسجل اللعبة أنها عولجت بالفعل ولن يسمح الاستبعاد اللاحق بمحو هذا التاريخ.</p><div class="evidence-results">${unresolved.map(index=>{
      const item=DATA_ITEMS[index];
      const used=state.flags.dataTrainingUsed.includes(index);
      const held=state.flags.dataTrainingHeld.includes(index);
      const unresolvedLabels=Object.entries(state.flags.dataChecks[index]).filter(([,value])=>value==='unresolved').map(([key])=>({rights:'الحقوق',privacy:'الخصوصية',fitness:'الملاءمة'}[key])).join('، ');
      return `<article class="card flat"><strong>${ctx.h(item?.title||`المادة ${index+1}`)}</strong><p>غير محسوم: ${ctx.h(unresolvedLabels)}</p>${used?'<span class="task-status task-status--complete">سُمح بإدخالها رغم الحاجب — سيبقى تاريخ الاستخدام</span>':held?'<span class="task-status task-status--complete">موقوفة قبل post-training</span>':`<div class="choice-grid"><button class="secondary-btn" data-training-use="${index}" type="button">تجاوز الحاجب وأدخلها</button><button class="secondary-btn" data-training-hold="${index}" type="button">أوقفها قبل الجولة</button></div>`}</article>`;
    }).join('')}</div></section>`;
  }

  function eligibilityComplete() {
    const reviewed=new Set([...state.flags.dataTrainingUsed,...state.flags.dataTrainingHeld]);
    return unresolvedReadyIndices().every(index=>reviewed.has(index));
  }

  function trainingSetup() {
    const checkpoint=state.flags.trainingCheckpoint;
    const annotation=annotationInputs();
    const data=dataInputs();
    const trainingData=dataInputs(true);
    const confirmedLabel=confirmedExamplesLabel(annotation.confirmed);
    const pendingLabel=pendingCasesLabel(annotation.pending);
    const canStart=eligibilityComplete();
    html(`<div><span class="eyebrow">مختبر تطوير نموذج افتراضي</span><h1 class="scene-title">أنت الآن ديفيد، مهندس تعلم آلي.</h1><div class="reality-note"><strong>ما الذي نحاكيه تحديدًا؟</strong> هذه ليست عملية تدريب نموذج من الصفر. السيناريو يمثل جولة post-training مبسطة تبدأ من نقطة حفظ سابقة. مرّت ${data.passed} مواد في workflow، لكن أهلية استخدامها في هذه الجولة قرار مستقل.</div>${trainingEligibilityMarkup()}<div class="training-board"><div class="config-panel"><div class="form-row"><label>مواد التطوير المؤهلة حاليًا للجولة</label><select disabled><option>${trainingData.passed} مواد (${trainingData.clear} محسومة / ${trainingData.unresolved} دخلت رغم مسائل غير محسومة / ${trainingData.held} موقوفة) + ${confirmedLabel}</option></select></div><div class="form-row"><label for="computeSel">مجموعات الحوسبة المخصصة</label><select id="computeSel"><option value="12" ${state.flags.trainingCompute==='12'?'selected':''}>12 مجموعة — 5 فوق الحد الأدنى قبل العطل</option><option value="8" ${state.flags.trainingCompute==='8'?'selected':''}>8 مجموعات — 1 فوق الحد الأدنى قبل العطل</option></select></div><div class="form-row"><label for="checkpointSel">نقطة الحفظ</label><select id="checkpointSel"><option value="validated" ${checkpoint==='validated'?'selected':''}>أكثر اختبارًا — تحقق إضافي أقل، من دون تغيير النبرة الأحدث</option><option value="recent" ${checkpoint==='recent'?'selected':''}>أحدث — تتضمن تغييرًا مستهدفًا للنبرة العربية وتحتاج تقييمًا مقارنًا</option></select></div><button id="trainStart" class="primary-btn training-start" ${canStart?'':'disabled'}>${canStart?'ابدأ الجولة':'احسم أهلية المواد أولًا'}</button></div><div class="chart-panel"><span class="kicker">المفاضلات قبل البدء</span><div class="training-log training-config-summary"><strong>الحوسبة</strong><br>يفترض السيناريو أن الجولة تحتاج إلى ${MIN_COMPUTE_TO_CONTINUE} مجموعات متاحة على الأقل للاستمرار ضمن نافذة الأداء المبسطة.<br>12 مجموعة: تكلفة 12 وحدة لعب وهامش سعة أولي 5 مجموعات فوق الحد الأدنى.<br>8 مجموعات: تكلفة 8 وحدات لعب وهامش سعة أولي مجموعة واحدة فقط.<br><br><strong>البيانات</strong><br>${pendingLabel} و${annotation.rejected} مرفوضة خارج المدخل المؤكد. المواد التي توقفها هنا لا تُعالج في الجولة. أي مادة تتجاوز بها الحاجب تُسجل ضمن تاريخ المعالجة.<br><br><strong>نقطة الحفظ</strong><br>الأحدث تحمل تغييرًا مقصودًا، لكن فائدته لن تُفترض مسبقًا؛ ستقارن أمثلة فعلية قبل اختبار السلامة.</div></div></div></div>`);

    document.querySelectorAll('[data-training-use]').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.trainingUse);
      state.flags.dataTrainingHeld=state.flags.dataTrainingHeld.filter(value=>value!==index);
      if(!state.flags.dataTrainingUsed.includes(index)) state.flags.dataTrainingUsed.push(index);
      addDecision(`data-training-override-${index}`,`أدخلت المادة ${index+1} إلى post-training رغم بقاء حاجب حوكمة`,`سجلت اللعبة أن المادة عولجت بالفعل رغم بقاء مسألة غير محسومة؛ أي معالجة لاحقة يجب أن تراعي هذا التاريخ ولا تمحو الاستخدام السابق.`);
      saveState(); trainingSetup();
    }));
    document.querySelectorAll('[data-training-hold]').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.trainingHold);
      state.flags.dataTrainingUsed=state.flags.dataTrainingUsed.filter(value=>value!==index);
      if(!state.flags.dataTrainingHeld.includes(index)) state.flags.dataTrainingHeld.push(index);
      addDecision(`data-training-hold-${index}`,`أوقفت المادة ${index+1} قبل post-training`,`فصلت بين مرور المادة داخل workflow وبين أهلية معالجتها في جولة التطوير، فلم تدخل المادة غير المحسومة إلى المعالجة.`);
      saveState(); trainingSetup();
    }));

    $('#trainStart')?.addEventListener('click',()=>{
      if(!eligibilityComplete()) return;
      state.flags.trainingCompute=$('#computeSel').value;
      state.flags.trainingCheckpoint=$('#checkpointSel').value;
      state.flags.checkpointEvalComplete=false;
      const unresolvedSet=new Set(unresolvedReadyIndices());
      state.flags.dataStatuses.forEach((status,index)=>{
        if(status==='ready'&&!state.flags.dataTrainingHeld.includes(index)&&!unresolvedSet.has(index)&&!state.flags.dataTrainingUsed.includes(index)) state.flags.dataTrainingUsed.push(index);
      });
      const total=Number(state.flags.trainingCompute);
      const margin=computeDescription(total).initialMargin;
      addDecision(`training-compute-${total}`,`خصصت ${total} مجموعة حوسبة لجولة التطوير`,`تكلفة التخصيص ${total} وحدة لعب، مع هامش سعة أولي ${margin} فوق الحد الأدنى المفترض (${MIN_COMPUTE_TO_CONTINUE}) في هذا السيناريو.`);
      if(state.flags.trainingCheckpoint==='validated') addDecision('training-checkpoint-validated','بدأت من نقطة حفظ اختُبرت أكثر','قللت نطاق التحقق الإضافي، لكن الجولة لا تتضمن تغيير النبرة العربية الأحدث.');
      else addDecision('training-checkpoint-recent','بدأت من نقطة حفظ أحدث','اخترت تغييرًا حديثًا مستهدفًا لتحسين نبرة الرسائل العربية القصيرة، وستقيس أثره على أمثلة مقارنة قبل السلامة.');
      saveState(); go('trainingRun');
    });
  }

  function trainingRun() {
    const total=Number(state.flags.trainingCompute);
    const { afterFailure:available, remainingMargin }=computeDescription(total);
    const tight=remainingMargin===0;
    const cost=total;
    html(`<div><span class="eyebrow">جولة التدريب الإضافي</span><h1 class="scene-title">خرجت مجموعة حوسبة واحدة من الخدمة عند 35% من الجولة.</h1>${supportingRoleStrip(['infraTeam'],'من يعمل مع ديفيد أثناء العطل؟')}<div class="reality-note"><strong>افتراض السيناريو</strong> نحتاج إلى ${MIN_COMPUTE_TO_CONTINUE} مجموعات متاحة على الأقل للاستمرار. هذا حد تعليمي خاص بالسيناريو، وليس خاصية تلقائية لكل تدريب موزع أو وصفًا عامًا لتحمل الأعطال.</div><div class="chart-panel"><div class="hud-grid"><div class="hud-item"><span>التقدم</span><strong>35%</strong></div><div class="hud-item"><span>المجموعات المتاحة</span><strong>${available}/${total}</strong></div><div class="hud-item"><span>الحد الأدنى المفترض</span><strong>${MIN_COMPUTE_TO_CONTINUE}</strong></div><div class="hud-item"><span>هامش السعة بعد العطل</span><strong>${remainingMargin} مجموعة</strong></div><div class="hud-item"><span>تكلفة التخصيص</span><strong>${cost} وحدة لعب</strong></div></div><div class="alert dangerish"><strong>العطل نفسه، لكن أثره قابل للحساب الآن.</strong><span>${tight?`مع ${total} مجموعات، وفرت التكلفة لكن خروج وحدة ترك ${available} متاحة: أي عند الحد الأدنى نفسه ومن دون هامش إضافي.`:`مع ${total} مجموعات، تبقى ${available} متاحة بعد العطل، أي ${remainingMargin} فوق الحد الأدنى المفترض.`}</span></div></div><div class="choice-grid"><button id="trainPause" class="choice-btn"><strong>أوقف الجولة وافحص العطل</strong><small>تدفع وقتًا إضافيًا للحصول على تشخيص أوضح قبل الاستمرار.</small></button><button id="trainContinue" class="choice-btn"><strong>استمر بالسعة المتبقية</strong><small>${tight?'تتجنب التوقف، لكنك تعمل عند الحد الأدنى المفترض من دون هامش سعة إضافي.':'تستخدم هامش السعة المتبقي وتؤجل التشخيص إلى ما بعد الجولة.'}</small></button></div></div>`);
    $('#trainPause').addEventListener('click',()=>{
      state.flags.trainingIncidentChoice='pause';
      addDecision('train-pause','أوقفت جولة التطوير لتشخيص العطل','تحملت تأخيرًا، عزلت المجموعة المعطلة، ثم استأنفت الجولة بعد التحقق.');
      saveState(); go('trainingEval');
    });
    $('#trainContinue').addEventListener('click',()=>{
      state.flags.trainingIncidentChoice='continue';
      addDecision('train-continue',`واصلت الجولة مع ${available} من ${total} مجموعات متاحة`,tight?'أكملت الجولة عند الحد الأدنى المفترض ومن دون هامش سعة إضافي، ورحّلت التشخيص إلى ما بعدها.':`استخدمت هامش السعة المتبقي (${remainingMargin} فوق الحد الأدنى) لإكمال الجولة ثم رحّلت التشخيص إلى ما بعدها.`);
      saveState(); go('trainingEval');
    });
  }

  function trainingEval() {
    const data=dataInputs(true);
    const exposedUnresolved=state.flags.dataTrainingUsed.filter(index=>hasUnresolved(state.flags.dataChecks[index])).length;
    addLedger(5,'ديفيد وفرق التطوير','إعداد وتشغيل ومراقبة جولة post-training وحل أعطال الحوسبة','نسخة مطورة من النموذج',exposedUnresolved?`عولجت ${exposedUnresolved} مواد رغم بقاء مسائل غير محسومة؛ سجل الاستخدام محفوظ ويحتاج معالجة سببية قبل الإصدار.`:`دخلت الجولة ${data.passed} مواد ولم تُعالج المواد التي أوقفت عند بوابة الأهلية.`);
    const paused=state.flags.trainingIncidentChoice==='pause';
    const total=Number(state.flags.trainingCompute);
    const checkpoint=state.flags.trainingCheckpoint;
    const compute=computeDescription(total);
    html(`<div><span class="eyebrow">نتيجة جولة التطوير</span><h1 class="scene-title">انتهت الجولة، لكن النسخة ما زالت تحتاج إلى تقييم وتحقق.</h1><div class="stage-output"><strong>أثر قرار السعة والعطل</strong>${paused?`توقفت الجولة، عُزلت المجموعة المعطلة، ثم استؤنف العمل بعد الإصلاح مع ${total} مجموعة متاحة. تكلفة التخصيص: ${total} وحدة لعب.`:`اكتملت الجولة بعد خروج مجموعة من الخدمة مع ${compute.afterFailure} متاحة و${compute.remainingMargin} فوق الحد الأدنى المفترض.`}</div><div class="stage-output"><strong>أثر اختيار نقطة الحفظ</strong>${checkpoint==='recent'?'الجولة تضمنت التغيير الأحدث المستهدف لتحسين نبرة الرسائل العربية القصيرة؛ ستختبره على أمثلة مقارنة قبل السلامة.':'اخترت نقطة أكثر اختبارًا؛ ستقارنها أيضًا حتى يكون قرار الجاهزية مبنيًا على دليل لا على اسم checkpoint.'}</div>${exposedUnresolved?`<div class="alert dangerish"><strong>تاريخ معالجة لا يمكن محوه</strong><span>${exposedUnresolved} مواد غير محسومة دخلت post-training بقرار صريح. إذا لم يمكن حسمها بدليل لاحق، فالمعالجة الصحيحة هي التخلص من النسخة الناتجة وإعادة الجولة من دونها، لا تغيير حالتها وكأنها لم تُستخدم.</span></div>`:''}<div class="action-row"><button id="sendHuman" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#sendHuman').addEventListener('click',()=>go('abstract6'));
  }

  function abstract6() {
    abstraction([['ديفيد','مهندس تعلم آلي','⌁'],['فرق البنية والتشغيل','','▥']],'نسخة مطورة من النموذج','إعدادات الجولة والحوسبة ومراقبة الأعطال والعمل الهندسي أصبحت نسخة تحتاج إلى تقييم؛ وأهلية البيانات وتاريخ استخدامها يظلان منفصلين عن مجرد اكتمال المعالجة.','ch7Intro');
  }

  return { ch6Intro,trainingSetup,trainingRun,trainingEval,abstract6 };
}

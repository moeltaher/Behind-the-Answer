import { supportingRoleStrip } from '../components/supporting-role-strip.js';
import { DATA_ITEMS } from '../data/content-tasks.js';
import { resetCandidateEvidence } from '../core/state.js';

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
    return state.flags.dataStatuses.flatMap((status,index)=>status==='ready'&&hasUnresolved(state.flags.dataChecks[index])?[index]:[]);
  }

  function eligibleDataIndices() {
    const approved=new Set(state.flags.dataTrainingApproved);
    const held=new Set(state.flags.dataTrainingHeld);
    return state.flags.dataStatuses.flatMap((status,index)=>{
      if(status!=='ready'||held.has(index)) return [];
      if(hasUnresolved(state.flags.dataChecks[index])&&!approved.has(index)) return [];
      return [index];
    });
  }

  function dataInputs(indices=null) {
    const selected=indices?new Set(indices):null;
    let clear=0;
    let unresolved=0;
    state.flags.dataStatuses.forEach((status,index)=>{
      if(status!=='ready'||(selected&&!selected.has(index))) return;
      if(hasUnresolved(state.flags.dataChecks[index])) unresolved+=1;
      else clear+=1;
    });
    return { clear, unresolved, passed:clear+unresolved };
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
    return `<section class="card"><span class="kicker">بوابة أهلية البيانات قبل المعالجة</span><h2>المرور في مرحلة البيانات لا يمنح إذنًا تلقائيًا لاستخدام المادة في post-training.</h2><p>اتخذ قرارًا مستقلًا لكل مادة غير محسومة. السماح هنا يعني اعتمادها كمدخل للجولة التالية، لكنه لا يحول المشكلة إلى «محسومة». وإذا عولجت المادة فعلًا فسيبقى ذلك في التاريخ حتى لو حُذفت من نسخة لاحقة.</p><div class="evidence-results">${unresolved.map(index=>{
      const item=DATA_ITEMS[index];
      const approved=state.flags.dataTrainingApproved.includes(index);
      const held=state.flags.dataTrainingHeld.includes(index);
      const unresolvedLabels=Object.entries(state.flags.dataChecks[index]).filter(([,value])=>value==='unresolved').map(([key])=>({rights:'الحقوق',privacy:'الخصوصية',fitness:'الملاءمة'}[key])).join('، ');
      return `<article class="card flat"><strong>${ctx.h(item?.title||`المادة ${index+1}`)}</strong><p>غير محسوم: ${ctx.h(unresolvedLabels)}</p>${approved?'<span class="task-status task-status--complete">سمحت باستخدامها في الجولة رغم الحاجب — المشكلة نفسها باقية</span>':held?'<span class="task-status task-status--complete">موقوفة قبل post-training</span>':`<div class="choice-grid"><button class="secondary-btn" data-training-use="${index}" type="button">اسمح بإدخالها رغم الحاجب</button><button class="secondary-btn" data-training-hold="${index}" type="button">أوقفها قبل الجولة</button></div>`}</article>`;
    }).join('')}</div></section>`;
  }

  function eligibilityComplete() {
    const reviewed=new Set([...state.flags.dataTrainingApproved,...state.flags.dataTrainingHeld]);
    return unresolvedReadyIndices().every(index=>reviewed.has(index));
  }

  function trainingSetup() {
    const checkpoint=state.flags.trainingCheckpoint;
    const annotation=annotationInputs();
    const eligible=eligibleDataIndices();
    const trainingData=dataInputs(eligible);
    const confirmedLabel=confirmedExamplesLabel(annotation.confirmed);
    const pendingLabel=pendingCasesLabel(annotation.pending);
    const eligibilityDone=eligibilityComplete();
    const hasInputs=eligible.length+annotation.confirmed>0;
    const canStart=eligibilityDone&&hasInputs;
    const blocker=!eligibilityDone?'احسم أهلية المواد أولًا':'لا توجد مدخلات مؤكدة للجولة';
    html(`<div><span class="eyebrow">مختبر تطوير نموذج افتراضي</span><h1 class="scene-title">أنت الآن ديفيد، مهندس تعلم آلي.</h1><div class="reality-note"><strong>ما الذي نحاكيه تحديدًا؟</strong> هذه ليست عملية تدريب نموذج من الصفر. السيناريو يمثل جولة post-training مبسطة تبدأ من نقطة حفظ سابقة. أهلية المادة للجولة قرار مستقل عن مرورها داخل workflow.</div>${trainingEligibilityMarkup()}${eligibilityDone&&!hasInputs?'<div class="alert dangerish" role="status"><strong>لا يمكن بدء جولة بلا مدخلات</strong><span>لا توجد مادة بيانات مؤهلة ولا مثال تصنيف بشري مؤكد. غيّر قرار أهلية مادة، أو ارجع في رحلة جديدة إلى مرحلة البيانات/التصنيف.</span></div>':''}<div class="training-board"><div class="config-panel"><div class="form-row"><label>مدخلات الجولة الحالية</label><select disabled><option>${trainingData.passed} مواد (${trainingData.clear} محسومة / ${trainingData.unresolved} مسموح بها رغم حاجب) + ${confirmedLabel}</option></select></div><div class="form-row"><label for="computeSel">مجموعات الحوسبة المخصصة</label><select id="computeSel"><option value="12" ${state.flags.trainingCompute==='12'?'selected':''}>12 مجموعة — 5 فوق الحد الأدنى قبل العطل</option><option value="8" ${state.flags.trainingCompute==='8'?'selected':''}>8 مجموعات — 1 فوق الحد الأدنى قبل العطل</option></select></div><div class="form-row"><label for="checkpointSel">نقطة الحفظ</label><select id="checkpointSel"><option value="validated" ${checkpoint==='validated'?'selected':''}>أكثر اختبارًا — تحقق إضافي أقل</option><option value="recent" ${checkpoint==='recent'?'selected':''}>أحدث — تغيير مستهدف للنبرة العربية</option></select></div><button id="trainStart" class="primary-btn training-start" ${canStart?'':'disabled'}>${canStart?'ابدأ الجولة':blocker}</button></div><div class="chart-panel"><span class="kicker">المفاضلات قبل البدء</span><div class="training-log training-config-summary"><strong>الحوسبة</strong><br>يفترض السيناريو أن الجولة تحتاج إلى ${MIN_COMPUTE_TO_CONTINUE} مجموعات متاحة على الأقل للاستمرار.<br>12 مجموعة: هامش أولي 5. 8 مجموعات: هامش أولي 1.<br><br><strong>البيانات والتصنيف</strong><br>${pendingLabel} و${annotation.rejected} مرفوضة خارج المدخل المؤكد. المادة الموقوفة لا تدخل النسخة المرشحة. المادة التي تسمح بها رغم حاجب تظل المشكلة عليها مسجلة.<br><br><strong>نقطة الحفظ</strong><br>الأحدث تحمل تغييرًا مقصودًا، لكن فائدته لن تُفترض مسبقًا؛ ستقارن أمثلة فعلية لاحقًا.</div></div></div></div>`);

    document.querySelectorAll('[data-training-use]').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.trainingUse);
      state.flags.dataTrainingHeld=state.flags.dataTrainingHeld.filter(value=>value!==index);
      if(!state.flags.dataTrainingApproved.includes(index)) state.flags.dataTrainingApproved.push(index);
      addDecision(`data-training-override-${index}`,`سمحت للمادة ${index+1} بدخول post-training رغم بقاء حاجب حوكمة`,`هذا قرار أهلية مستقل؛ لا يحوّل الحقوق أو الخصوصية أو الملاءمة إلى محسومة.`);
      saveState(); trainingSetup();
    }));
    document.querySelectorAll('[data-training-hold]').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.trainingHold);
      state.flags.dataTrainingApproved=state.flags.dataTrainingApproved.filter(value=>value!==index);
      if(!state.flags.dataTrainingHeld.includes(index)) state.flags.dataTrainingHeld.push(index);
      addDecision(`data-training-hold-${index}`,`أوقفت المادة ${index+1} قبل post-training`,`فصلت بين مرور المادة داخل workflow وبين أهلية معالجتها في جولة التطوير.`);
      saveState(); trainingSetup();
    }));

    $('#trainStart')?.addEventListener('click',()=>{
      if(!canStart) return;
      state.flags.trainingCompute=$('#computeSel').value;
      state.flags.trainingCheckpoint=$('#checkpointSel').value;
      state.flags.candidateRevision+=1;
      state.flags.dataCurrentTrainingUsed=eligibleDataIndices();
      for(const index of state.flags.dataCurrentTrainingUsed) if(!state.flags.dataTrainingUsed.includes(index)) state.flags.dataTrainingUsed.push(index);
      resetCandidateEvidence(state);
      const revision=state.flags.candidateRevision;
      const total=Number(state.flags.trainingCompute);
      const margin=computeDescription(total).initialMargin;
      addDecision(`training-compute-${total}-r${revision}`,`خصصت ${total} مجموعة حوسبة للنسخة المرشحة ${revision}`,`تكلفة التخصيص ${total} وحدة لعب، مع هامش سعة أولي ${margin} فوق الحد الأدنى المفترض (${MIN_COMPUTE_TO_CONTINUE}).`);
      addDecision(`training-checkpoint-${state.flags.trainingCheckpoint}-r${revision}`,state.flags.trainingCheckpoint==='validated'?'بدأت من نقطة حفظ اختُبرت أكثر':'بدأت من نقطة حفظ أحدث',state.flags.trainingCheckpoint==='validated'?'قللت نطاق التحقق الإضافي، مع بقاء التقييم اللاحق إلزاميًا.':'اخترت تغييرًا حديثًا مستهدفًا لتحسين النبرة، وستقيس أثره قبل السلامة.');
      saveState(); go('trainingRun');
    });
  }

  function trainingRun() {
    const total=Number(state.flags.trainingCompute);
    const { afterFailure:available, remainingMargin }=computeDescription(total);
    const tight=remainingMargin===0;
    const revision=state.flags.candidateRevision;
    html(`<div><span class="eyebrow">جولة post-training — النسخة المرشحة ${revision}</span><h1 class="scene-title">خرجت مجموعة حوسبة واحدة من الخدمة عند 35% من الجولة.</h1>${supportingRoleStrip(['infraTeam'],'من يعمل مع ديفيد أثناء العطل؟')}<div class="reality-note"><strong>افتراض السيناريو</strong> نحتاج إلى ${MIN_COMPUTE_TO_CONTINUE} مجموعات متاحة على الأقل للاستمرار. هذا حد تعليمي خاص بالسيناريو.</div><div class="chart-panel"><div class="hud-grid"><div class="hud-item"><span>التقدم</span><strong>35%</strong></div><div class="hud-item"><span>المجموعات المتاحة</span><strong>${available}/${total}</strong></div><div class="hud-item"><span>هامش السعة بعد العطل</span><strong>${remainingMargin}</strong></div><div class="hud-item"><span>مواد النسخة الحالية</span><strong>${state.flags.dataCurrentTrainingUsed.length}</strong></div></div><div class="alert dangerish"><strong>العطل نفسه، لكن أثره قابل للحساب.</strong><span>${tight?`بقيت ${available} مجموعات: الحد الأدنى نفسه دون هامش إضافي.`:`بقيت ${available} مجموعات، أي ${remainingMargin} فوق الحد الأدنى.`}</span></div></div><div class="choice-grid"><button id="trainPause" class="choice-btn"><strong>أوقف الجولة وافحص العطل</strong><small>تشخيص أوضح قبل الاستمرار.</small></button><button id="trainContinue" class="choice-btn"><strong>استمر بالسعة المتبقية</strong><small>${tight?'استمرار عند الحد الأدنى دون هامش إضافي.':'استخدام هامش السعة المتبقي.'}</small></button></div></div>`);
    $('#trainPause').addEventListener('click',()=>{
      state.flags.trainingIncidentChoice='pause';
      addDecision(`train-pause-r${revision}`,`أوقفت جولة النسخة ${revision} لتشخيص العطل`,'عزلت المجموعة المعطلة ثم استأنفت الجولة بعد التحقق.');
      saveState(); go('trainingEval');
    });
    $('#trainContinue').addEventListener('click',()=>{
      state.flags.trainingIncidentChoice='continue';
      addDecision(`train-continue-r${revision}`,`واصلت جولة النسخة ${revision} مع ${available} من ${total} مجموعات`,tight?'أكملت الجولة عند الحد الأدنى من دون هامش إضافي.':`أكملت الجولة مع هامش ${remainingMargin} فوق الحد الأدنى.`);
      saveState(); go('trainingEval');
    });
  }

  function trainingEval() {
    const current=dataInputs(state.flags.dataCurrentTrainingUsed);
    const exposed=state.flags.dataCurrentTrainingUsed.filter(index=>hasUnresolved(state.flags.dataChecks[index])).length;
    const revision=state.flags.candidateRevision;
    addLedger(5,'ديفيد وفرق التطوير','إعداد وتشغيل ومراقبة جولة post-training وحل أعطال الحوسبة',`نسخة مرشحة ${revision}`,exposed?`تحتوي النسخة الحالية على ${exposed} مواد ذات مسائل غير محسومة؛ تاريخ الاستخدام محفوظ وأي إعادة تدريب ستنتج revision جديدة وتبطل الأدلة السابقة.`:`دخلت النسخة الحالية ${current.passed} مواد بيانات، إضافة إلى الأمثلة البشرية المؤكدة.`);
    const paused=state.flags.trainingIncidentChoice==='pause';
    const total=Number(state.flags.trainingCompute);
    const compute=computeDescription(total);
    html(`<div><span class="eyebrow">نتيجة جولة التطوير — revision ${revision}</span><h1 class="scene-title">انتهت الجولة، لكن النسخة ما زالت تحتاج إلى تقييم وتحقق.</h1><div class="stage-output"><strong>أثر قرار السعة والعطل</strong>${paused?`توقفت الجولة للتشخيص ثم استؤنفت مع ${total} مجموعة متاحة.`:`اكتملت الجولة بعد خروج مجموعة مع ${compute.afterFailure} متاحة و${compute.remainingMargin} فوق الحد الأدنى.`}</div><div class="stage-output"><strong>سلسلة البيانات</strong>النسخة الحالية تستخدم ${state.flags.dataCurrentTrainingUsed.length} مواد بيانات. السجل التاريخي يحتفظ بـ${state.flags.dataTrainingUsed.length} مواد سبق أن دخلت معالجة في أي revision.</div>${exposed?`<div class="alert dangerish"><strong>حاجب قد يفرض revision جديدة</strong><span>${exposed} مواد غير محسومة موجودة في النسخة الحالية. إذا لم تُحسم بدليل، يجب استبعادها ثم إعادة الجولة؛ وعندها تُبطل نتائج التقييم والسلامة والإصدار المرتبطة بهذه النسخة.</span></div>`:''}<div class="action-row"><button id="sendHuman" class="primary-btn">انتقل إلى التقييم</button></div></div>`);
    $('#sendHuman').addEventListener('click',()=>go('abstract6'));
  }

  function abstract6() {
    abstraction([['ديفيد','مهندس تعلم آلي','⌁'],['فرق البنية والتشغيل','','▥']],'نسخة مرشحة تحتاج تقييمًا','إعدادات الجولة والبيانات والحوسبة أصبحت revision محددة؛ الأدلة اللاحقة تخص هذه النسخة ولا تنتقل تلقائيًا إلى نسخة يعاد تدريبها.','ch7Intro');
  }

  return { ch6Intro,trainingSetup,trainingRun,trainingEval,abstract6 };
}

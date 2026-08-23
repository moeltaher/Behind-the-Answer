import { supportingRoleStrip } from '../components/supporting-role-strip.js';
import { DATA_ITEMS } from '../data/content-tasks.js';
import { resetCandidateEvidence } from '../core/state.js';
import { TRAINING_COMPUTE, MIN_COMPUTE_TO_CONTINUE, computeDescription, hasUnresolved, confirmedAnnotations, unresolvedReadyIndices } from '../domain/game-rules.js';

export function createTrainingRoutes(ctx) {
  const $=ctx.$;
  const state=ctx.state;
  const {chapterIntro,html,go,saveState,addDecision,addLedger}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);

  function ch6Intro(){chapterIntro(5,'trainingSetup');}
  function annotationInputs(){
    const confirmed=confirmedAnnotations(state.flags);
    const pending=state.flags.annotationResults.filter(result=>result.pending&&!result.reviewRejected).length;
    const rejected=state.flags.annotationResults.filter(result=>result.reviewRejected||!result.acceptedAsReasonable).length;
    return {confirmed,pending,rejected};
  }
  function eligibleDataIndices(){
    const approved=new Set(state.flags.dataTrainingApproved),held=new Set(state.flags.dataTrainingHeld);
    return state.flags.dataStatuses.flatMap((status,index)=>{
      if(status!=='ready'||held.has(index))return[];
      if(hasUnresolved(state.flags.dataChecks[index])&&!approved.has(index))return[];
      return[index];
    });
  }
  function dataInputs(indices=null){
    const selected=indices?new Set(indices):null;
    let clear=0,unresolved=0;
    state.flags.dataStatuses.forEach((status,index)=>{if(status!=='ready'||(selected&&!selected.has(index)))return;if(hasUnresolved(state.flags.dataChecks[index]))unresolved+=1;else clear+=1;});
    return {clear,unresolved,passed:clear+unresolved};
  }
  function confirmedExamplesLabel(count){if(count===0)return'لا أمثلة بشرية مؤكدة';if(count===1)return'مثال بشري مؤكد واحد';if(count===2)return'مثالان بشريان مؤكدان';return`${count} أمثلة بشرية مؤكدة`;}
  function pendingCasesLabel(count){if(count===0)return'لا حالات معلقة';if(count===1)return'حالة معلقة واحدة';if(count===2)return'حالتان معلقتان';return`${count} حالات معلقة`;}
  function trainingEligibilityMarkup(){
    const unresolved=unresolvedReadyIndices(state.flags);
    if(!unresolved.length)return'<div class="alert goodish"><strong>أهلية البيانات لهذه الجولة واضحة</strong><span>لا توجد مادة مارة تحمل مسألة غير محسومة.</span></div>';
    return `<section class="card"><span class="kicker">بوابة أهلية البيانات قبل المعالجة</span><h2>مرور المادة لا يمنح إذنًا تلقائيًا لاستخدامها في التدريب الإضافي.</h2><p>اتخذ قرارًا لكل مادة غير محسومة. السماح يعني إدخالها رغم الحاجب، ولا يحول المشكلة نفسها إلى محسومة.</p><div class="evidence-results">${unresolved.map(index=>{const item=DATA_ITEMS[index],approved=state.flags.dataTrainingApproved.includes(index),held=state.flags.dataTrainingHeld.includes(index);const labels=Object.entries(state.flags.dataChecks[index]).filter(([,value])=>value==='unresolved').map(([key])=>({rights:'الحقوق',privacy:'الخصوصية',fitness:'الملاءمة'}[key])).join('، ');return `<article class="card flat"><strong>${ctx.h(item?.title||`المادة ${index+1}`)}</strong><p>غير محسوم: ${ctx.h(labels)}</p>${approved?'<span class="task-status task-status--complete">مسموح بها رغم الحاجب — المشكلة باقية</span>':held?'<span class="task-status task-status--complete">موقوفة قبل التدريب الإضافي</span>':`<div class="choice-grid"><button class="secondary-btn" data-training-use="${index}" type="button">اسمح بإدخالها رغم الحاجب</button><button class="secondary-btn" data-training-hold="${index}" type="button">أوقفها قبل الجولة</button></div>`}</article>`;}).join('')}</div></section>`;
  }
  function eligibilityComplete(){const reviewed=new Set([...state.flags.dataTrainingApproved,...state.flags.dataTrainingHeld]);return unresolvedReadyIndices(state.flags).every(index=>reviewed.has(index));}

  function trainingSetup(){
    const checkpoint=state.flags.trainingCheckpoint,annotation=annotationInputs(),eligible=eligibleDataIndices(),trainingData=dataInputs(eligible),eligibilityDone=eligibilityComplete(),hasInputs=eligible.length+annotation.confirmed>0,canStart=eligibilityDone&&hasInputs,blocker=!eligibilityDone?'احسم أهلية المواد أولًا':'لا توجد مدخلات مؤكدة للجولة',compute=computeDescription(TRAINING_COMPUTE);
    html(`<div><span class="eyebrow">مختبر تطوير نموذج افتراضي</span><h1 class="scene-title">أنت الآن ديفيد، مهندس تعلم آلي.</h1><div class="reality-note"><strong>ما الذي نحاكيه؟</strong> جولة تدريب إضافي تبدأ من نقطة حفظ سابقة. خصص المشروع مسبقًا ${TRAINING_COMPUTE} مجموعات حوسبة؛ هذا ثابت في السيناريو وليس حالة قابلة للاختيار أو قيمة قديمة محفوظة.</div>${trainingEligibilityMarkup()}${eligibilityDone&&!hasInputs?'<div class="alert dangerish"><strong>لا يمكن بدء جولة بلا مدخلات</strong><span>لا توجد مادة بيانات مؤهلة ولا مثال تصنيف بشري مؤكد.</span></div>':''}<div class="training-board"><div class="config-panel"><div class="form-row"><label for="trainingInputsSummary">مدخلات الجولة الحالية</label><select id="trainingInputsSummary" disabled><option>${trainingData.passed} مواد (${trainingData.clear} محسومة / ${trainingData.unresolved} مسموح بها رغم حاجب) + ${confirmedExamplesLabel(annotation.confirmed)}</option></select></div><div class="card flat"><strong>الحوسبة المخصصة: ${TRAINING_COMPUTE} مجموعات</strong><p>الحد الأدنى الافتراضي للاستمرار ${MIN_COMPUTE_TO_CONTINUE}. قبل العطل يوجد هامش ${compute.initialMargin} فقط؛ لذلك خروج مجموعة واحدة يضع الجولة عند الحد الأدنى.</p></div><div class="form-row"><label for="checkpointSel">نقطة الحفظ</label><select id="checkpointSel"><option value="validated" ${checkpoint==='validated'?'selected':''}>أكثر اختبارًا — خط أساس</option><option value="recent" ${checkpoint==='recent'?'selected':''}>أحدث — تغيير مستهدف للنبرة العربية</option></select></div><button id="trainStart" class="primary-btn training-start" ${canStart?'':'disabled'}>${canStart?'ابدأ الجولة':blocker}</button></div><div class="chart-panel"><span class="kicker">ما الذي ستلاحظه؟</span><div class="training-log training-config-summary"><strong>الحوسبة</strong><br>لن تختار عدد المجموعات. المفاضلة ستظهر عند العطل: توقف للإصلاح أم استمرار عند الحد الأدنى مع دين تحقق لاحق.<br><br><strong>البيانات والتصنيف</strong><br>${pendingCasesLabel(annotation.pending)} و${annotation.rejected} مرفوضة خارج المدخل المؤكد.<br><br><strong>نقطة الحفظ</strong><br>ستقيس أثر الاختيار على أمثلة فعلية لاحقًا.</div></div></div></div>`);
    document.querySelectorAll('[data-training-use]').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.trainingUse);state.flags.dataTrainingHeld=state.flags.dataTrainingHeld.filter(value=>value!==index);if(!state.flags.dataTrainingApproved.includes(index))state.flags.dataTrainingApproved.push(index);addDecision(`data-training-override-${index}`,`سمحت للمادة ${index+1} بدخول التدريب الإضافي رغم بقاء حاجب`,'هذا قرار أهلية مستقل ولا يحول المشكلة إلى محسومة.');saveState();trainingSetup();}));
    document.querySelectorAll('[data-training-hold]').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.trainingHold);state.flags.dataTrainingApproved=state.flags.dataTrainingApproved.filter(value=>value!==index);if(!state.flags.dataTrainingHeld.includes(index))state.flags.dataTrainingHeld.push(index);addDecision(`data-training-hold-${index}`,`أوقفت المادة ${index+1} قبل التدريب الإضافي`,'فصلت بين المرور في مسار البيانات وأهلية المعالجة.');saveState();trainingSetup();}));
    $('#trainStart')?.addEventListener('click',()=>{if(!canStart)return;state.flags.trainingCheckpoint=$('#checkpointSel').value;state.flags.candidateRevision+=1;state.flags.dataCurrentTrainingUsed=eligibleDataIndices();for(const index of state.flags.dataCurrentTrainingUsed)if(!state.flags.dataTrainingUsed.includes(index))state.flags.dataTrainingUsed.push(index);resetCandidateEvidence(state);const revision=state.flags.candidateRevision;addDecision(`training-compute-${TRAINING_COMPUTE}-r${revision}`,`بدأت النسخة المرشحة ${revision} ضمن تخصيص المشروع: ${TRAINING_COMPUTE} مجموعات`,'التخصيص قيد ثابت في السيناريو؛ خرجت منه مفاضلة العطل بدل تقديم عدد المجموعات كاختيار بلا كلفة مقابلة.');addDecision(`training-checkpoint-${state.flags.trainingCheckpoint}-r${revision}`,state.flags.trainingCheckpoint==='validated'?'بدأت من نقطة حفظ اختُبرت أكثر':'بدأت من نقطة حفظ أحدث',state.flags.trainingCheckpoint==='validated'?'استخدمت خط أساس أكثر اختبارًا، مع بقاء التقييم إلزاميًا.':'اخترت تغييرًا حديثًا مستهدفًا للنبرة وستقيس أثره لاحقًا.');saveState();go('trainingRun');});
  }

  function trainingRun(){
    const total=TRAINING_COMPUTE,{afterFailure:available,remainingMargin}=computeDescription(total),revision=state.flags.candidateRevision;
    html(`<div><span class="eyebrow">جولة تدريب إضافي — النسخة المرشحة ${revision}</span><h1 class="scene-title">خرجت مجموعة حوسبة واحدة من الخدمة عند 35% من الجولة.</h1>${supportingRoleStrip(['infraTeam'],'من يعمل مع ديفيد أثناء العطل؟')}<div class="hud-grid"><div class="hud-item"><span>التقدم</span><strong>35%</strong></div><div class="hud-item"><span>المجموعات المتاحة</span><strong>${available}/${total}</strong></div><div class="hud-item"><span>الهامش بعد العطل</span><strong>${remainingMargin}</strong></div></div><div class="alert dangerish"><strong>أصبحت الجولة عند الحد الأدنى.</strong><span>يمكنها الاستمرار في افتراض السيناريو، لكن من دون هامش إضافي. هذا هو موضع القرار الحقيقي.</span></div><div class="choice-grid"><button id="trainPause" class="choice-btn"><strong>أوقف الجولة وشخّص المجموعة المعطلة</strong><small>تتحمل توقفًا ثم تنفذ الاستعادة قبل الاستئناف.</small></button><button id="trainContinue" class="choice-btn"><strong>استمر عند الحد الأدنى</strong><small>تتفادى التوقف الآن، لكن القرار ينشئ فحص استقرار إضافيًا قبل أو بعد الإطلاق.</small></button></div></div>`);
    $('#trainPause').addEventListener('click',()=>{addDecision(`train-pause-r${revision}`,`أوقفت جولة النسخة ${revision} لتشخيص العطل`,'توقفت الجولة عند 35%؛ الاستئناف ينتظر استعادة المجموعة والتحقق منها.');saveState();go('trainingRecovery');});
    $('#trainContinue').addEventListener('click',()=>{state.flags.trainingIncidentChoice='continue';addDecision(`train-continue-r${revision}`,`واصلت جولة النسخة ${revision} عند الحد الأدنى`,'تجنبت توقف الاستعادة أثناء الجولة، لكن العمل عند الحد الأدنى أنشأ دين تحقق للاستقرار.');saveState();go('trainingEval');});
  }

  function trainingRecovery(){
    const revision=state.flags.candidateRevision;
    html(`<div><span class="eyebrow">استعادة الحوسبة — النسخة المرشحة ${revision}</span><h1 class="scene-title">الجولة متوقفة حتى تعود المجموعة المعطلة إلى حالة صالحة.</h1>${supportingRoleStrip(['infraTeam'],'من ينفذ الاستعادة؟')}<div class="dual-view"><div class="view-panel"><h3>قبل الإصلاح</h3><div class="view-list"><span>الجولة متوقفة عند 35%</span><span>7/8 مجموعات صالحة</span></div></div><div class="view-panel"><h3>قبل الاستئناف</h3><div class="view-list"><span>استعادة أو استبدال المجموعة</span><span>اختبار الاتصال</span><span>التحقق من 8/8</span></div></div></div><div class="action-row"><button id="repairTrainingCompute" class="primary-btn">استعد المجموعة وتحقق من 8/8</button></div></div>`);
    $('#repairTrainingCompute').addEventListener('click',()=>{state.flags.trainingIncidentChoice='pause';addDecision(`train-recovery-r${revision}`,`استعدت مجموعة الحوسبة قبل استئناف النسخة ${revision}`,'أعيدت المجموعة أو استبدلت وتحقق الفريق من عودة 8/8 مجموعات قبل الاستئناف.');saveState();go('trainingEval');});
  }

  function trainingEval(){
    const current=dataInputs(state.flags.dataCurrentTrainingUsed),exposed=state.flags.dataCurrentTrainingUsed.filter(index=>hasUnresolved(state.flags.dataChecks[index])).length,revision=state.flags.candidateRevision;
    addLedger(5,'ديفيد وفرق التطوير','إعداد وتشغيل ومراقبة جولة تدريب إضافي وحل أعطال الحوسبة',`نسخة مرشحة ${revision}`,exposed?`تحتوي النسخة الحالية على ${exposed} مواد ذات مسائل غير محسومة.`:`دخلت النسخة الحالية ${current.passed} مواد بيانات، إضافة إلى الأمثلة البشرية المؤكدة.`);
    const paused=state.flags.trainingIncidentChoice==='pause';
    html(`<div><span class="eyebrow">نتيجة جولة التطوير — النسخة المرشحة ${revision}</span><h1 class="scene-title">انتهت الجولة، لكن النسخة ما زالت تحتاج إلى تقييم وتحقق.</h1><div class="stage-output"><strong>أثر قرار العطل</strong>${paused?'توقفت الجولة، استعيدت المجموعة وتحقق الفريق منها، ثم استؤنفت بالسعة الكاملة.':'اكتملت الجولة عند الحد الأدنى بعد خروج المجموعة؛ لذلك سيظهر فحص استقرار إضافي.'}</div><div class="stage-output"><strong>سلسلة البيانات</strong>النسخة الحالية تستخدم ${state.flags.dataCurrentTrainingUsed.length} مواد بيانات، والسجل يحتفظ بتاريخ المواد التي دخلت أي نسخة.</div>${exposed?`<div class="alert dangerish"><strong>حاجب حوكمة باقٍ</strong><span>${exposed} مواد مستخدمة حاليًا تحمل مسائل غير محسومة وستحتاج معالجة قبل الإصدار.</span></div>`:''}<div class="action-row"><button id="sendHuman" class="primary-btn">انتقل إلى التقييم</button></div></div>`);
    $('#sendHuman').addEventListener('click',()=>go('abstract6'));
  }

  function abstract6(){abstraction([['ديفيد','مهندس تعلم آلي','⌁'],['فرق البنية والتشغيل','','▥']],'نسخة مرشحة تحتاج تقييمًا','يختصر النظام إعدادات الجولة والبيانات والحوسبة في نسخة مرشحة محددة؛ الأدلة اللاحقة تخص هذه النسخة.','ch7Intro');}
  return {ch6Intro,trainingSetup,trainingRun,trainingRecovery,trainingEval,abstract6};
}

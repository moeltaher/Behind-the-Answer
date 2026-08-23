import { SUPPORT_TASKS } from '../data/content-tasks.js';
import { supportingRoleStrip } from '../components/supporting-role-strip.js';
import {
  DEPLOY_CAPACITY_LIMITS,
  FAILOVER_INGRESS_LIMITS,
  MAX_SURVIVABLE_FAILURES,
  loadMargins,
  failoverCase,
  survivableFailures,
  resilienceRiskDecisionId,
  hasResilienceResolution,
  hasRecoveryVerification,
  recoveryVerificationDecisionId,
  recoveryDispositionComplete
} from '../domain/game-rules.js';

const STARTING_LOAD = [20,45,35];
const SITE_NAMES = ['أ','ب','ج'];
const INCIDENT_TABS = [
  ['network','الشبكة','الشبكة مستقرة، ولا توجد زيادة واضحة في فقد البيانات.'],
  ['compute','الخوادم','السعة متاحة، لكن بعض العمليات يعاد تشغيلها.'],
  ['model','خدمة النموذج','استهلاك الذاكرة يرتفع تدريجيًا في الإصدار الجديد.']
];
const MONITORING_CHECKS = {
  checkpoint:{title:'تحقق موسع لنقطة الحفظ الحديثة',evidence:'شُغلت 12 عينة إضافية أثناء نافذة المراقبة بعد فتح الخدمة.',result:'لم يظهر انحدار جديد يمنع استمرار النسخة الحالية.'},
  stability:{title:'فحص الاستقرار',evidence:'شُغلت ثلاث جولات مراقبة قصيرة مع تتبع إعادة تشغيل مجموعات الحوسبة.',result:'لم يتكرر عطل الحوسبة في نافذة المراقبة الافتراضية.'}
};

export function createDeploymentRoutes(ctx) {
  const $=ctx.$,state=ctx.state;
  const {chapterIntro,html,go,bind,tone,saveState,addDecision,addLedger}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);
  function ch8Intro(){chapterIntro(7,'deployLoad');}
  function loadValues(){return [0,1,2].map(index=>Number($(`#range${index}`)?.value??0));}
  function savedLoad(){return Array.isArray(state.flags.deployLoad)?state.flags.deployLoad:STARTING_LOAD;}
  function riskAccepted(values=savedLoad()){return state.decisions.some(decision=>decision.id===resilienceRiskDecisionId(values));}
  function pendingMonitoringChecks(){return state.flags.deferredExtraChecks.filter(id=>!state.flags.monitoringChecksCompleted.includes(id));}
  function monitoringWindowOpened(){return state.decisions.some(d=>d.id===`deploy-monitoring-window-r${state.flags.candidateRevision}`);}
  function supportFeedbackMarkup(){return state.flags.supportFeedbackLabel?`<div class="decision-feedback-inline" role="status"><strong>${ctx.h(state.flags.supportFeedbackLabel)}</strong><span>${ctx.h(state.flags.supportFeedbackDetail)}</span></div>`:'';}

  function deployLoad(){
    if(Array.isArray(state.flags.deployLoad)){go('deployFailover');return;}
    const initial=STARTING_LOAD;
    html(`<div><span class="eyebrow">هانا — مهندسة تشغيل الخدمة</span><h1 class="scene-title">قرار الإصدار معتمد؛ حسّن توزيع التشغيل قبل اختبار الفشل.</h1><div class="reality-note"><strong>المهمة</strong> وزّع 100% من الحمل ضمن السعات: أ 60%، ب 45%، ج 35%. التوزيع الابتدائي ${initial.join(' / ')}% صالح في الحالة العادية لكنه لا يتحمل خروج أي مركز كامل. حاول تحسين المرونة؛ السقف الحسابي بهذه السعات هو ${MAX_SURVIVABLE_FAILURES}/3.</div><div class="load-grid">${SITE_NAMES.map((name,index)=>`<div class="load-card"><span>مركز البيانات ${name}</span><strong id="load${index}">${initial[index]}%</strong><small>السعة: ${DEPLOY_CAPACITY_LIMITS[index]}% — استقبال الطوارئ: ${FAILOVER_INGRESS_LIMITS[index]} نقطة</small><input id="range${index}" type="range" min="0" max="100" step="1" value="${initial[index]}" aria-label="حصة مركز البيانات ${name}" /></div>`).join('')}</div><div id="loadFeedback" class="alert" role="status"><strong>المجموع: <span id="loadTotal">100</span>%</strong><span>الهدف ليس مجرد صلاحية الحالة العادية؛ ستختبر خروج المراكز بعد الاعتماد.</span></div><div class="action-row"><button id="testLoad" class="primary-btn">اعتمد التوزيع وانتقل لاختبار المرونة</button></div></div>`);
    const updateTotal=()=>{const values=loadValues();values.forEach((value,index)=>{$(`#load${index}`).textContent=`${value}%`;});$('#loadTotal').textContent=values.reduce((sum,value)=>sum+value,0);};
    [0,1,2].forEach(index=>$(`#range${index}`)?.addEventListener('input',updateTotal));
    $('#testLoad')?.addEventListener('click',()=>{const values=loadValues(),total=values.reduce((sum,value)=>sum+value,0),feedback=$('#loadFeedback');if(total!==100){feedback.innerHTML=`<strong>المجموع ${total}%</strong><span>يجب أن يساوي 100%.</span>`;tone(170,.08,'square');return;}const overloaded=values.findIndex((value,index)=>value>DEPLOY_CAPACITY_LIMITS[index]);if(overloaded>=0){feedback.innerHTML=`<strong>مركز ${SITE_NAMES[overloaded]} تجاوز سعته.</strong><span>${values[overloaded]}% مقابل ${DEPLOY_CAPACITY_LIMITS[overloaded]}%.</span>`;tone(170,.08,'square');return;}state.flags.deployLoad=values;state.flags.deployFailoverChecks=[];addDecision(`deploy-capacity-load-${values.join('-')}`,'اعتمدت توزيع التشغيل ضمن السعات',`التوزيع ${values.join(' / ')} صالح للحالة العادية؛ لم تُفتح الخدمة قبل اختبار الفشل.`);saveState();go('deployFailover');});
  }

  function failoverMarkup(values){
    const margins=loadMargins(values),checked=state.flags.deployFailoverChecks,resilient=survivableFailures(values);
    let resolution='';
    if(checked.length===3){
      const accepted=riskAccepted(values),atMaximum=resilient>=MAX_SURVIVABLE_FAILURES;
      const explanation=`بعد الحالات الثلاث يظهر أن السقف بهذه السعات وحدود الاستقبال هو ${MAX_SURVIVABLE_FAILURES}/3. خروج أ يترك سعة اسمية قصوى 80% فقط، وخروج ب يترك 95% فقط.`;
      const retry=atMaximum?'':`<button id="retryLoad" class="choice-btn"><strong>أعد توزيع الحمل وحاول تحسين النتيجة</strong><small>النتيجة الحالية ${resilient}/3، وما زال التحسن ممكنًا.</small></button>`;
      resolution=`<div class="alert ${atMaximum?'goodish':'dangerish'}"><strong>${atMaximum?'وصلت إلى أفضل مرونة ممكنة بهذه الثوابت.':'ما زالت فجوة المرونة قابلة للتحسين.'}</strong><span>${explanation}</span></div>${accepted?'<div class="action-row"><button id="finishFailover" class="primary-btn">ثبّت الاختبار وتابع</button></div>':`<div class="choice-grid">${retry}<button id="finishFailover" class="choice-btn"><strong>اقبل فجوة المرونة وسجلها</strong><small>تظل قيدًا معروفًا، لا نجاحًا كاملًا.</small></button></div>`}`;
    }
    return `<div><span class="eyebrow">اختبار المرونة قبل فتح حركة المستخدمين</span><h1 class="scene-title">اختبر خروج كل مركز بعد اعتماد توزيع التشغيل.</h1><div class="reality-note"><strong>قاعدة الاختبار</strong> كل مركز باقٍ يستطيع استقبال بحد أقصى ${FAILOVER_INGRESS_LIMITS[0]} نقطة حمل إضافية لحظيًا. المتاح فعليًا هو الأصغر بين هامش السعة وحد النقل.</div><div class="hud-grid">${margins.map((margin,index)=>`<div class="hud-item"><span>مركز ${SITE_NAMES[index]}: هامش / استقبال طوارئ</span><strong>${margin} / ${FAILOVER_INGRESS_LIMITS[index]}</strong></div>`).join('')}</div><div class="evidence-results">${[0,1,2].map(index=>{const result=failoverCase(index,values),done=checked.includes(index),receivers=result.perSiteReceivable.map((value,i)=>i===index?null:`${SITE_NAMES[i]}: ${value}`).filter(Boolean).join('، ');return `<article class="card flat"><strong>إذا خرج مركز ${SITE_NAMES[index]}</strong><p>الحمل المزاح: ${result.displaced}. القابل للاستقبال: ${result.spareElsewhere} (${receivers}).</p>${done?`<div class="alert ${result.survivable?'goodish':'dangerish'}"><strong>${result.survivable?'يمكن امتصاص الحمل':'لا يمكن امتصاص الحمل'}</strong></div>`:`<button class="secondary-btn" data-failover-check="${index}">اختبر خروج مركز ${SITE_NAMES[index]}</button>`}</article>`;}).join('')}</div>${checked.length===3?`<div class="stage-output"><strong>${resilient}/3 حالات يمكن امتصاصها</strong>بعد الاختبار فقط أصبحت المرونة الفعلية ظاهرة.</div>${resolution}`:'<div class="alert"><strong>أكمل الحالات الثلاث</strong><span>لا يمكن وصف المرونة من حالة واحدة.</span></div>'}</div>`;
  }

  function deployFailover(){
    if(!Array.isArray(state.flags.deployLoad)){go('deployLoad');return;}
    const values=savedLoad();
    html(failoverMarkup(values));
    bind('[data-failover-check]','click',event=>{const index=Number(event.currentTarget.dataset.failoverCheck);if(!state.flags.deployFailoverChecks.includes(index))state.flags.deployFailoverChecks.push(index);saveState();deployFailover();});
    $('#retryLoad')?.addEventListener('click',()=>{state.flags.deployLoad=null;state.flags.deployFailoverChecks=[];saveState();go('deployLoad');});
    $('#finishFailover')?.addEventListener('click',()=>{if(state.flags.deployFailoverChecks.length!==3)return;const resilient=survivableFailures(values);if(!riskAccepted(values)){addDecision(resilienceRiskDecisionId(values),'قبلت فجوة المرونة صراحة قبل فتح الخدمة',`التوزيع ${values.join(' / ')} يتحمل ${resilient}/3 حالات؛ القيد مسجل.`);addDecision(`deploy-failover-review-${values.join('-')}`,'اختبرت التوزيع ضد خروج كل مركز',`تحمل ${resilient}/3 حالات كاملة.`);saveState();deployFailover();return;}go(state.flags.deferredExtraChecks.length?'deployMonitoring':'deployIncident');});
  }

  function monitoringMarkup(){
    const pending=pendingMonitoringChecks();
    if(!monitoringWindowOpened()) return `<div><span class="eyebrow">الخدمة أصبحت متاحة</span><h1 class="scene-title">فُتحت حركة المستخدمين مع دين تحقق مسجل.</h1><div class="alert dangerish"><strong>${pending.length} فحص إضافي ما زال مفتوحًا</strong><span>هذا هو الأثر الحقيقي لقرار الإصدار المبكر: الخدمة تعمل بينما يوجد عمل تحقق يجب إغلاقه في المراقبة.</span></div><div class="action-row"><button id="openMonitoringWindow" class="primary-btn">ابدأ نافذة المراقبة مع الدين المفتوح</button></div></div>`;
    return `<div><span class="eyebrow">نافذة المراقبة بعد الإطلاق</span><h1 class="scene-title">أغلق دين التحقق بينما الخدمة تعمل.</h1><div class="evidence-results">${state.flags.deferredExtraChecks.map(id=>{const def=MONITORING_CHECKS[id],done=state.flags.monitoringChecksCompleted.includes(id);return `<article class="card flat"><strong>${ctx.h(def.title)}</strong><p>${ctx.h(def.evidence)}</p>${done?`<div class="alert goodish"><strong>اكتمل</strong><span>${ctx.h(def.result)}</span></div>`:`<button class="secondary-btn" data-monitoring-check="${id}">نفّذ الفحص وسجل النتيجة</button>`}</article>`;}).join('')}</div>${pending.length?'<div class="alert"><strong>الدين ما زال مفتوحًا</strong><span>استمرار الخدمة لا يحول الفحص إلى مكتمل.</span></div>':'<div class="action-row"><button id="finishMonitoring" class="primary-btn">أغلق نافذة المراقبة وتابع التشغيل</button></div>'}</div>`;
  }

  function deployMonitoring(){
    if(!state.flags.deferredExtraChecks.length){go('deployIncident');return;}
    if(!hasResilienceResolution(state)){go('deployFailover');return;}
    html(monitoringMarkup());
    $('#openMonitoringWindow')?.addEventListener('click',()=>{addDecision(`deploy-monitoring-window-r${state.flags.candidateRevision}`,'فتحت الخدمة مع دين تحقق ظاهر','بدأت نافذة تشغيل فعلية قبل إغلاق الفحوص الإضافية المؤجلة.');saveState();deployMonitoring();});
    bind('[data-monitoring-check]','click',event=>{const id=event.currentTarget.dataset.monitoringCheck;if(!state.flags.monitoringChecksCompleted.includes(id))state.flags.monitoringChecksCompleted.push(id);const def=MONITORING_CHECKS[id];addDecision(`monitoring-check-${id}-r${state.flags.candidateRevision}`,`أغلقت ${def.title} أثناء التشغيل`,def.result);saveState();deployMonitoring();});
    $('#finishMonitoring')?.addEventListener('click',()=>go('deployIncident'));
  }

  function diagnosisSummary(){return INCIDENT_TABS.filter(([id])=>state.flags.deployTabs.includes(id)).map(([id,label,text])=>`<div class="diagnosis-row diagnosis-row--${id}"><strong>${label}</strong><span>${text}</span></div>`).join('');}
  function deployIncident(){
    const values=savedLoad(),resilient=survivableFailures(values);
    if(!state.flags.deployLoad){go('deployLoad');return;}
    if(state.flags.deployFailoverChecks.length!==3||!hasResilienceResolution(state)){go('deployFailover');return;}
    if(pendingMonitoringChecks().length){go('deployMonitoring');return;}
    const complete=state.flags.deployTabs.length===INCIDENT_TABS.length;
    html(`<div><span class="eyebrow">عطل جديد أثناء التشغيل</span><h1 class="scene-title">ارتفعت الأخطاء بعد إصدار جديد.</h1>${supportingRoleStrip(['operationsTeam'],'من يعمل مع هانا أثناء التشخيص؟')}<div class="reality-note"><strong>سياق المرونة</strong>توزيعك ${values.join(' / ')}% تحمل ${resilient}/3 حالات خروج. هذا لا يثبت سبب الحادث.</div><div class="incident-tabs">${INCIDENT_TABS.map(([id,label])=>state.flags.deployTabs.includes(id)?`<span class="incident-tab incident-tab--done">✓ ${label}</span>`:`<button data-tab="${id}">${label}</button>`).join('')}</div><div class="diagnosis-stack">${state.flags.deployTabs.length?diagnosisSummary():'<div class="card flat">ابدأ بفحص الشبكة أو الخوادم أو خدمة النموذج.</div>'}</div>${complete?'<div class="alert"><strong>الاستنتاج الحالي</strong><span>الشبكة مستقرة والسعة متاحة، بينما يرتفع استهلاك الذاكرة في الإصدار الجديد؛ لذلك يصبح الإصدار المشتبه الرئيسي.</span></div><div class="choice-grid"><button id="restartInst" class="choice-btn"><strong>أعد تشغيل الوحدات المتأثرة</strong><small>عودة أسرع، لكنها معالجة مؤقتة ولا تحسم سبب المشكلة.</small></button><button id="rollback" class="choice-btn"><strong>ارجع إلى الإصدار السابق</strong><small>استعادة تستهدف المشتبه الرئيسي.</small></button></div>':''}</div>`);
    bind('[data-tab]','click',event=>{if(!state.flags.deployTabs.includes(event.currentTarget.dataset.tab))state.flags.deployTabs.push(event.currentTarget.dataset.tab);saveState();deployIncident();});
    $('#restartInst')?.addEventListener('click',()=>{state.flags.deployRecovery='restart';state.flags.deployRecoveryDisposition=null;addDecision('deploy-restart','أعدت تشغيل الوحدات المتأثرة','نفذت استعادة سريعة، لكنها لا تحسم الإصدار المشتبه به وتحتاج تحققًا ثم قرارًا بشأن الخطر المتبقي.');saveState();go('onCall');});
    $('#rollback')?.addEventListener('click',()=>{state.flags.deployRecovery='rollback';state.flags.deployRecoveryDisposition=null;addDecision('deploy-rollback','رجعت إلى الإصدار السابق','أزلت الإصدار المشتبه به من الخدمة، لكن الاستعادة ما زالت تحتاج تحققًا صحيًا.');saveState();go('onCall');});
  }

  function onCall(){
    const recovery=state.flags.deployRecovery;
    if(recovery===null){go('deployIncident');return;}
    const restarted=recovery==='restart';
    if(!hasRecoveryVerification(state,recovery)){
      html(`<div><span class="eyebrow">تحقق الاستعادة</span><h1 class="scene-title">إجراء الاستعادة نُفذ، لكن لا تعلن عودة الخدمة قبل القياس.</h1>${supportingRoleStrip(['operationsTeam'],'من يتحقق من الاستعادة؟')}<div class="hud-grid"><div class="hud-item"><span>معدل الأخطاء</span><strong>عاد للنطاق</strong></div><div class="hud-item"><span>الذاكرة</span><strong>${restarted?'مستقرة الآن مع بقاء الإصدار الحالي':'مستقرة بعد العودة للإصدار السابق'}</strong></div><div class="hud-item"><span>اختبار طلب تجريبي</span><strong>نجح</strong></div></div><div class="action-row"><button id="verifyRecovery" class="primary-btn">ثبّت نتيجة التحقق</button></div></div>`);
      $('#verifyRecovery').addEventListener('click',()=>{addDecision(recoveryVerificationDecisionId(recovery),'تحققت من عودة الخدمة بعد إجراء الاستعادة',restarted?'عاد معدل الأخطاء للنطاق ونجح طلب تجريبي، لكن الإصدار المشتبه به ما زال موجودًا.':'عاد معدل الأخطاء للنطاق ونجح طلب تجريبي على الإصدار السابق.');if(!restarted)state.flags.deployRecoveryDisposition='cleared';saveState();onCall();});return;
    }
    if(restarted&&state.flags.deployRecoveryDisposition===null){
      html(`<div><span class="eyebrow">الخدمة تعافت مؤقتًا</span><h1 class="scene-title">إعادة التشغيل نجحت، لكن سبب الحادث المشتبه به لم يُزل.</h1>${supportingRoleStrip(['operationsTeam'],'من يقرر مصير الخطر المتبقي؟')}<div class="alert dangerish"><strong>الاستعادة ليست معالجة للسبب الجذري</strong><span>الإصدار الجديد ما زال في الخدمة. اختر الآن إزالته أو قبول دين تشغيلي صريح تحت المراقبة.</span></div><div class="choice-grid"><button id="rollbackAfterRestart" class="choice-btn"><strong>ارجع الآن إلى الإصدار السابق</strong><small>ستحتاج إلى تحقق جديد بعد التراجع.</small></button><button id="monitorRelease" class="choice-btn"><strong>أبق الإصدار وسجل دينًا تشغيليًا للمراقبة</strong><small>الخدمة متعافية، لكن السبب المشتبه به يظل مفتوحًا في النتائج.</small></button></div></div>`);
      $('#rollbackAfterRestart').addEventListener('click',()=>{state.flags.deployRecovery='rollback';state.flags.deployRecoveryDisposition=null;addDecision('deploy-rollback-after-restart','رجعت إلى الإصدار السابق بعد استعادة مؤقتة','أثبتت إعادة التشغيل عودة الخدمة فقط؛ ثم أزلت الإصدار المشتبه به وبدأ تحققًا جديدًا للاستعادة.');saveState();onCall();});
      $('#monitorRelease').addEventListener('click',()=>{state.flags.deployRecoveryDisposition='monitor';addDecision('deploy-residual-risk-monitor','قبلت دينًا تشغيليًا بعد الاستعادة','بقي الإصدار المشتبه به في الخدمة تحت مراقبة صريحة؛ عودة الخدمة لم تُعرض كإغلاق للسبب الجذري.');saveState();onCall();});return;
    }
    if(!recoveryDispositionComplete(state)){go('deployIncident');return;}
    const monitored=state.flags.deployRecoveryDisposition==='monitor';
    html(`<div><span class="eyebrow">بعد التحقق من الاستعادة</span><h1 class="scene-title">الخدمة عادت، لكن أثر الحادث ما زال يصل إلى المستخدمين.</h1>${supportingRoleStrip(['affectedUser'],'من يظهر في الواجهة الآن؟')}<div class="card"><p>${monitored?'تعاملت هانا مع العطل بإعادة التشغيل، تحققت من عودة الخدمة، ثم سجلت بقاء الإصدار المشتبه به كدين تشغيلي تحت المراقبة.':'تعاملت هانا مع العطل بالرجوع إلى الإصدار السابق ثم تحققت من معدل الأخطاء والذاكرة وطلب تجريبي قبل إعلان العودة.'}</p></div><div class="action-row"><button id="toSupport" class="primary-btn">انتقل إلى بلاغات الحادث</button></div></div>`);
    $('#toSupport').addEventListener('click',()=>go('supportTask'));
  }

  function supportTask(){const index=state.flags.supportIndex;if(!recoveryDispositionComplete(state)){go('onCall');return;}if(index>=SUPPORT_TASKS.length){go('deployEnd');return;}const task=SUPPORT_TASKS[index],values=savedLoad();html(`<div><span class="eyebrow">سامر — دعم المستخدمين</span><h1 class="scene-title">بلاغ مرتبط بالحادث ${index+1}/${SUPPORT_TASKS.length}</h1>${supportingRoleStrip(['affectedUser'],'صاحب البلاغ')}${supportFeedbackMarkup()}<div class="reality-note"><strong>سياق التشغيل</strong>التوزيع أثناء الحادث: ${values.join(' / ')}%.</div><div class="card"><div class="message user">${ctx.h(task.q)}</div><div class="choice-grid"><button id="supportInvestigate" class="choice-btn"><strong>${ctx.h(task.aTitle)}</strong><small>${ctx.h(task.aDetail)}</small></button><button id="supportFast" class="choice-btn"><strong>${ctx.h(task.bTitle)}</strong><small>${ctx.h(task.bDetail)}</small></button></div></div></div>`);$('#supportInvestigate')?.addEventListener('click',()=>{addDecision(`support-evidence-${index}`,`حافظت على أدلة البلاغ ${index+1}`,'ربطت تجربة المستخدم ببيانات الحادث.');state.flags.supportFeedbackLabel='احتفظ الفريق بسياق تشخيصي أفضل';state.flags.supportFeedbackDetail='استغرقت المعالجة وقتًا أطول قليلًا.';state.flags.supportIndex+=1;saveState();supportTask();});$('#supportFast')?.addEventListener('click',()=>{addDecision(`support-fast-${index}`,`قدمت استعادة أسرع للبلاغ ${index+1}`,'الإجراء أسرع لكنه يحفظ معلومات أقل للتحقيق.');state.flags.supportFeedbackLabel='حصل المستخدم على مسار استعادة أسرع';state.flags.supportFeedbackDetail='تحسنت السرعة المباشرة مع أدلة أقل.';state.flags.supportIndex+=1;saveState();supportTask();});}
  function deployEnd(){const values=savedLoad(),resilient=survivableFailures(values),monitored=state.flags.deployRecoveryDisposition==='monitor';addLedger(7,'هانا وسامر وفرق العمليات','توزيع حمل، اختبار مرونة، مراقبة، تشخيص، استعادة، تحقق ودعم','الخدمة متاحة للمستخدمين',`تحمل التوزيع ${resilient}/3 حالات؛ أُغلقت الفحوص المؤجلة ${state.flags.monitoringChecksCompleted.length}/${state.flags.deferredExtraChecks.length}.${monitored?' بقي دين تشغيلي مفتوحًا للإصدار المشتبه به تحت المراقبة.':' أُزيل الإصدار المشتبه به عبر التراجع.'}`);html(`<div><span class="eyebrow">نهاية مرحلة التشغيل</span><h1 class="scene-title">اكتملت مراحل اللعب الثماني.</h1>${supportFeedbackMarkup()}<div class="stage-output"><strong>الخدمة متاحة بعد استعادة تحققت منها الفرق</strong>خلف كلمة «متاحة» توجد سعات واختبارات ومراقبة وتشخيص واستعادة ودعم.</div><div class="hud-grid"><div class="hud-item"><span>توزيع الحمل</span><strong>${values.join(' / ')}%</strong></div><div class="hud-item"><span>حالات الخروج</span><strong>${resilient}/3</strong></div><div class="hud-item"><span>الفحوص المؤجلة المغلقة</span><strong>${state.flags.monitoringChecksCompleted.length}/${state.flags.deferredExtraChecks.length}</strong></div><div class="hud-item"><span>سبب الحادث المشتبه به</span><strong>${monitored?'مفتوح تحت المراقبة':'أزيل من الخدمة'}</strong></div></div>${monitored?'<div class="alert dangerish"><strong>دين تشغيلي باقٍ</strong><span>إعادة التشغيل استعادت الخدمة لكنها لم تثبت معالجة السبب الجذري؛ لذلك يظل هذا القيد ظاهرًا حتى نهاية اللعبة.</span></div>':''}<div class="action-row"><button id="uptimeAbstract" class="primary-btn">ركّب الصورة الكاملة</button></div></div>`);$('#uptimeAbstract')?.addEventListener('click',()=>go('abstract8'));}
  function abstract8(){abstraction([['هانا','مهندسة تشغيل','◉'],['سامر','دعم المستخدمين','◌'],['فرق المناوبة والصيانة','','◇']],'الخدمة متاحة','يختصر النظام التوزيع والمرونة والمراقبة والتشخيص والاستعادة والتحقق والدعم في حالة بسيطة يراها المستخدم: «الخدمة متاحة».','pipelineAssemble');}
  return {ch8Intro,deployLoad,deployFailover,deployMonitoring,deployIncident,onCall,supportTask,deployEnd,abstract8};
}

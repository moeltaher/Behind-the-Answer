import { SUPPORT_TASKS } from '../data/content-tasks.js';
import { supportingRoleStrip } from '../components/supporting-role-strip.js';

const STARTING_LOAD = [70, 20, 10];
const CAPACITY_LIMITS = [60, 45, 35];
const FAILOVER_INGRESS_LIMITS = [20, 20, 20];
const SITE_NAMES = ['أ','ب','ج'];
const INCIDENT_TABS = [
  ['network', 'الشبكة', 'الشبكة مستقرة، ولا توجد زيادة واضحة في فقد البيانات.'],
  ['compute', 'الخوادم', 'السعة متاحة، لكن بعض العمليات يعاد تشغيلها.'],
  ['model', 'خدمة النموذج', 'استهلاك الذاكرة يرتفع تدريجيًا في الإصدار الجديد.']
];
const MONITORING_CHECKS = {
  checkpoint:{ title:'تحقق checkpoint الموسع', evidence:'شُغلت 12 عينة إضافية بعد الإطلاق على أساليب وصيغ لم تدخل المقارنة الثلاثية.', result:'لم يظهر انحدار جديد يمنع استمرار النسخة الحالية في سيناريو اللعبة.' },
  stability:{ title:'فحص الاستقرار', evidence:'شُغلت ثلاث جولات مراقبة قصيرة بعد الإطلاق مع تتبع إعادة تشغيل مجموعات الحوسبة.', result:'لم يتكرر عطل الحوسبة في نافذة المراقبة الافتراضية.' }
};

export function createDeploymentRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, tone, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch8Intro() { chapterIntro(7, 'deployLoad'); }
  function loadValues() { return [0,1,2].map(index=>Number($(`#range${index}`)?.value ?? 0)); }
  function savedLoad() { return Array.isArray(state.flags.deployLoad) ? state.flags.deployLoad : STARTING_LOAD; }
  function loadMargins(values=savedLoad()) { return values.map((value,index)=>CAPACITY_LIMITS[index]-value); }
  function failoverCase(failedIndex, values=savedLoad()) {
    const margins=loadMargins(values);
    const perSiteReceivable=margins.map((margin,index)=>index===failedIndex?0:Math.min(Math.max(0,margin),FAILOVER_INGRESS_LIMITS[index]));
    const spareElsewhere=perSiteReceivable.reduce((sum,value)=>sum+value,0);
    const displaced=values[failedIndex];
    return { displaced, spareElsewhere, perSiteReceivable, survivable:spareElsewhere>=displaced };
  }
  function survivableFailures(values=savedLoad()) { return [0,1,2].filter(index=>failoverCase(index,values).survivable).length; }
  function riskDecisionId(values=savedLoad()){ return `deploy-resilience-risk-${values.join('-')}`; }
  function riskAccepted(values=savedLoad()){ return state.decisions.some(decision=>decision.id===riskDecisionId(values)); }
  function pendingMonitoringChecks(){ return state.flags.deferredExtraChecks.filter(id=>!state.flags.monitoringChecksCompleted.includes(id)); }
  function supportFeedbackMarkup() {
    if(!state.flags.supportFeedbackLabel) return '';
    return `<div class="decision-feedback-inline" role="status"><strong>${ctx.h(state.flags.supportFeedbackLabel)}</strong><span>${ctx.h(state.flags.supportFeedbackDetail)}</span></div>`;
  }

  function monitoringMarkup() {
    const pending=pendingMonitoringChecks();
    return `<div><span class="eyebrow">مراقبة بعد الإطلاق — revision ${state.flags.candidateRevision}</span><h1 class="scene-title">نفّذ الفحوص التي قررت تأجيلها بدل اعتبارها مكتملة.</h1><p class="scene-subtitle">الإطلاق حدث بالفعل، لكن هذه الأعمال بقيت مسجلة كدين تحقق. كل فحص يعرض الدليل والنتيجة قبل إغلاقه.</p><div class="evidence-results">${state.flags.deferredExtraChecks.map(id=>{const def=MONITORING_CHECKS[id];const done=state.flags.monitoringChecksCompleted.includes(id);return `<article class="card flat"><strong>${ctx.h(def.title)}</strong><p><b>الإجراء:</b> ${ctx.h(def.evidence)}</p>${done?`<div class="alert goodish" role="status"><strong>اكتمل في المراقبة</strong><span>${ctx.h(def.result)}</span></div>`:`<button class="secondary-btn" data-monitoring-check="${id}" type="button">نفّذ الفحص وسجل النتيجة</button>`}</article>`;}).join('')}</div>${pending.length?'<div class="alert"><strong>العمل ما زال مفتوحًا</strong><span>لا تنتقل اللعبة إلى توزيع الحمل قبل تنفيذ كل ما نقلته أنت إلى المراقبة.</span></div>':'<div class="action-row"><button id="continueAfterMonitoring" class="primary-btn">أغلق دين التحقق وابدأ توزيع الحمل</button></div>'}</div>`;
  }

  function failoverMarkup(values) {
    const margins=loadMargins(values);
    const checked=state.flags.deployFailoverChecks;
    const resilient=survivableFailures(values);
    let resolution='';
    if(checked.length===3){
      if(resilient<3){
        const accepted=riskAccepted(values);
        resolution=`<div class="alert dangerish"><strong>هذه فجوة مرونة حقيقية وليست «فشل اختبار» يمكن تجاهله.</strong><span>عند حمل إجمالي 100% لا يمكن للسعات الحالية تحمل خروج كل مركز: خروج أ يترك سعة اسمية قصوى 80%، وخروج ب يترك 95%. يمكنك إعادة التوزيع لتحسين الحالات الممكنة، لكن الوصول إلى 3/3 يتطلب تغيير السعة أو خفض الحمل الكلي.</span></div>${accepted?'<div class="action-row"><button id="finishFailover" class="primary-btn">تابع بعد تسجيل قبول فجوة المرونة</button></div>':`<div class="choice-grid"><button id="retryLoad" class="choice-btn"><strong>أعد توزيع الحمل وحاول تحسين المرونة</strong><small>يبدأ اختبار N‑1 من جديد على التوزيع الجديد.</small></button><button id="finishFailover" class="choice-btn"><strong>اقبل فجوة المرونة وسجلها قبل المتابعة</strong><small>لا تعتبرها نجاحًا؛ يسجل السجل أنك واصلت مع قيد معروف في البنية.</small></button></div>`}`;
      } else resolution='<div class="action-row"><button id="finishFailover" class="primary-btn">انتقل إلى الحادث التشغيلي</button></div>';
    }
    return `<div><span class="eyebrow">اختبار المرونة بعد اعتماد التوزيع</span><h1 class="scene-title">اختبر خروج كل مركز مع قيود نقل الطوارئ.</h1><div class="reality-note"><strong>لماذا أصبح التوزيع مؤثرًا؟</strong> السعة الخام وحدها لا تجعل توزيع الحمل مهمًا إذا أمكن نقل أي كمية فورًا بين المواقع. لذلك يضيف السيناريو قيدًا معلنًا: كل مركز باقٍ يستطيع استقبال بحد أقصى ${FAILOVER_INGRESS_LIMITS[0]} نقطة حمل إضافية لحظيًا عبر مسار failover. المتاح فعليًا هو الأصغر بين هامش السعة وحد النقل.</div><div class="hud-grid">${margins.map((margin,index)=>`<div class="hud-item"><span>مركز ${SITE_NAMES[index]}: هامش / حد استقبال طوارئ</span><strong>${margin} / ${FAILOVER_INGRESS_LIMITS[index]}</strong></div>`).join('')}</div><div class="evidence-results">${[0,1,2].map(index=>{const result=failoverCase(index,values);const done=checked.includes(index);const receivers=result.perSiteReceivable.map((value,i)=>i===index?null:`${SITE_NAMES[i]}: ${value}`).filter(Boolean).join('، ');return `<article class="card flat"><strong>إذا خرج مركز ${SITE_NAMES[index]}</strong><p>الحمل المزاح: ${result.displaced}. ما يمكن للمركزين الآخرين استقباله فورًا بعد تطبيق السعة وحدود النقل: ${result.spareElsewhere} (${receivers}).</p>${done?`<div class="alert ${result.survivable?'goodish':'dangerish'}" role="status"><strong>${result.survivable?'يمكن امتصاص الحمل ضمن القيود':'لا يمكن امتصاص الحمل ضمن القيود'}</strong><span>${result.survivable?'التوزيع ينجو من هذه الحالة في نموذج الطوارئ المبسط.':'يلزم خفض حمل أو رفع سعة/مسار نقل؛ صلاحية الحالة العادية لا تكفي.'}</span></div>`:`<button class="secondary-btn" data-failover-check="${index}" type="button">اختبر خروج مركز ${SITE_NAMES[index]}</button>`}</article>`;}).join('')}</div>${checked.length===3?`<div class="stage-output"><strong>${resilient} من 3 حالات خروج كاملة يمكن امتصاصها</strong>هذه نتيجة توزيعك تحت قيود سعة ونقل معلنة، وليست درجة جودة عامة.</div>${resolution}`:'<div class="alert"><strong>أكمل الحالات الثلاث</strong><span>اختبار حالة واحدة لا يكفي لوصف المرونة.</span></div>'}</div>`;
  }

  function deployLoad() {
    if(pendingMonitoringChecks().length || (state.flags.deferredExtraChecks.length && state.flags.monitoringChecksCompleted.length===state.flags.deferredExtraChecks.length && !state.flags.deployLoad)) {
      html(monitoringMarkup());
      bind('[data-monitoring-check]','click',event=>{
        const id=event.currentTarget.dataset.monitoringCheck;
        if(!state.flags.monitoringChecksCompleted.includes(id)) state.flags.monitoringChecksCompleted.push(id);
        const def=MONITORING_CHECKS[id];
        addDecision(`monitoring-check-${id}-r${state.flags.candidateRevision}`,`أغلقت ${def.title} بعد الإطلاق`,def.result);
        saveState(); deployLoad();
      });
      $('#continueAfterMonitoring')?.addEventListener('click',()=>deployLoadAfterMonitoring());
      return;
    }
    deployLoadAfterMonitoring();
  }

  function deployLoadAfterMonitoring() {
    if(Array.isArray(state.flags.deployLoad)) {
      const values=savedLoad();
      html(failoverMarkup(values));
      bind('[data-failover-check]','click',event=>{
        const index=Number(event.currentTarget.dataset.failoverCheck);
        if(!state.flags.deployFailoverChecks.includes(index)) state.flags.deployFailoverChecks.push(index);
        saveState(); deployLoadAfterMonitoring();
      });
      $('#retryLoad')?.addEventListener('click',()=>{addDecision(`deploy-failover-retry-${values.join('-')}`,'أعدت توزيع الحمل بعد كشف فجوة N‑1',`التوزيع ${values.join(' / ')} لم يحقق تحملًا كاملًا؛ أعدت الاختبار بدل اعتبار النتيجة نجاحًا.`);state.flags.deployLoad=null;state.flags.deployFailoverChecks=[];saveState();deployLoadAfterMonitoring();});
      $('#finishFailover')?.addEventListener('click',()=>{
        const resilient=survivableFailures(values);
        if(resilient<3&&!riskAccepted(values)) addDecision(riskDecisionId(values),'قبلت فجوة المرونة صراحة قبل التشغيل',`التوزيع ${values.join(' / ')} يتحمل ${resilient}/3 حالات N‑1 فقط. القيد البنيوي مسجل ولم يُعرض كنجاح كامل.`);
        addDecision(`deploy-failover-review-${values.join('-')}`,'اختبرت التوزيع ضد خروج كل مركز مع حدود نقل الطوارئ',`تحمل التوزيع ${resilient} من 3 حالات كاملة؛ النتيجة تصف المرونة ولا تفسر سبب الحادث اللاحق.`);
        saveState(); go('deployIncident');
      });
      return;
    }
    const initial=STARTING_LOAD;
    html(`<div><span class="eyebrow">هانا — مهندسة تشغيل الخدمة</span><h1 class="scene-title">أصبحت الخدمة متاحة للمستخدمين.</h1><div class="reality-note"><strong>المهمة</strong> وزّع 100% من الحمل من دون تجاوز السعة التشغيلية: أ 60%، ب 45%، ج 35%. بعد اعتماد توزيع صالح ستختبر أثره الحقيقي تحت قيود نقل الطوارئ.</div><div class="load-grid">${SITE_NAMES.map((name,index)=>`<div class="load-card"><span>مركز البيانات ${name}</span><strong id="load${index}">${initial[index]}%</strong><small>السعة: ${CAPACITY_LIMITS[index]}% — استقبال الطوارئ الأقصى: ${FAILOVER_INGRESS_LIMITS[index]} نقطة</small><input id="range${index}" type="range" min="0" max="100" step="1" value="${initial[index]}" aria-label="حصة مركز البيانات ${name}" /></div>`).join('')}</div><div id="loadFeedback" class="alert" role="status"><strong>المجموع: <span id="loadTotal">${initial.reduce((sum,value)=>sum+value,0)}</span>%</strong><span>المطلوب أولًا توزيع صالح؛ تقييم المرونة يأتي بعده.</span></div><div class="action-row"><button id="testLoad" class="primary-btn">اعتمد التوزيع واختبر المرونة</button></div></div>`);
    const updateTotal=()=>{ const values=loadValues(); values.forEach((value,index)=>{ const output=$(`#load${index}`); if(output)output.textContent=`${value}%`; }); const totalOutput=$('#loadTotal'); if(totalOutput)totalOutput.textContent=values.reduce((sum,value)=>sum+value,0); };
    [0,1,2].forEach(index=>$(`#range${index}`)?.addEventListener('input',updateTotal));
    $('#testLoad')?.addEventListener('click',()=>{
      const values=loadValues();
      const total=values.reduce((sum,value)=>sum+value,0);
      const feedback=$('#loadFeedback');
      if(total!==100){ feedback.innerHTML=`<strong>المجموع الآن ${total}%</strong><span>يجب أن يساوي 100%.</span>`; tone(170,.08,'square'); return; }
      const overloaded=values.findIndex((value,index)=>value>CAPACITY_LIMITS[index]);
      if(overloaded>=0){ feedback.innerHTML=`<strong>مركز ${SITE_NAMES[overloaded]} تجاوز سعته.</strong><span>حملته ${values[overloaded]}% بينما سعته ${CAPACITY_LIMITS[overloaded]}%.</span>`; tone(170,.08,'square'); return; }
      state.flags.deployLoad=values;
      state.flags.deployFailoverChecks=[];
      addDecision(`deploy-capacity-load-${values.join('-')}`,'وزعت الحمل ضمن سعات المراكز',`التوزيع ${values.join(' / ')} صالح للحالة العادية؛ المرونة ستختبر مع حدود نقل الطوارئ.`);
      saveState(); deployLoadAfterMonitoring();
    });
  }

  function diagnosisSummary(){ return INCIDENT_TABS.filter(([id])=>state.flags.deployTabs.includes(id)).map(([id,label,text])=>`<div class="diagnosis-row diagnosis-row--${id}"><strong>${label}</strong><span>${text}</span></div>`).join(''); }

  function deployIncident() {
    if(state.flags.deployFailoverChecks.length!==3){ go('deployLoad'); return; }
    const values=savedLoad();
    const resilient=survivableFailures(values);
    if(resilient<3&&!riskAccepted(values)){ go('deployLoad'); return; }
    const complete=state.flags.deployTabs.length===INCIDENT_TABS.length;
    const monitoringNote=state.flags.deferredExtraChecks.length?`الفحوص التي نُقلت إلى المراقبة أُغلقت ${state.flags.monitoringChecksCompleted.length}/${state.flags.deferredExtraChecks.length} قبل هذه الخطوة؛ لا تفترض اللعبة أنها سبب الحادث.`:'لم يكن هناك دين تحقق مؤجل من قرار الإطلاق.';
    const tabs=INCIDENT_TABS.map(([id,label])=>state.flags.deployTabs.includes(id)?`<span class="incident-tab incident-tab--done" aria-label="${label} فُحص">✓ ${label}</span>`:`<button data-tab="${id}">${label}</button>`).join('');
    html(`<div><span class="eyebrow">عطل جديد بعد اختبار التوزيع والمرونة</span><h1 class="scene-title">ارتفعت الأخطاء بعد إصدار جديد.</h1>${supportingRoleStrip(['operationsTeam'],'من يعمل مع هانا أثناء التشخيص؟')}<div class="alert dangerish"><strong>تأثر عدد كبير من المستخدمين في سيناريو اللعب</strong><span>${monitoringNote}</span></div><div class="reality-note"><strong>أثر التوزيع المحفوظ</strong>توزيعك ${values.join(' / ')}% تحمل ${resilient}/3 من حالات N-1 تحت القيود. ${resilient<3?'واصلت بعد تسجيل فجوة المرونة صراحة. ':''}هذه معلومة عن المرونة وليست تفسيرًا لسبب الحادث.</div><div class="incident-tabs">${tabs}</div><div id="tabReadout" class="diagnosis-stack">${state.flags.deployTabs.length?diagnosisSummary():'<div class="card flat">ابدأ بفحص الشبكة أو الخوادم أو خدمة النموذج.</div>'}</div>${complete?'<div class="alert"><strong>الاستنتاج الحالي</strong><span>الشبكة مستقرة والسعة متاحة، بينما يرتفع استهلاك الذاكرة تدريجيًا في الإصدار الجديد؛ لذلك يصبح الإصدار المشتبه الرئيسي في هذا السيناريو.</span></div><div class="choice-grid"><button id="restartInst" class="choice-btn"><strong>أعد تشغيل الوحدات المتأثرة</strong><small>عودة أسرع مع احتمال تكرار المشكلة.</small></button><button id="rollback" class="choice-btn"><strong>ارجع إلى الإصدار السابق</strong><small>استعادة تستهدف المشتبه الرئيسي.</small></button></div>':''}</div>`);
    bind('[data-tab]','click',event=>{ if(!state.flags.deployTabs.includes(event.currentTarget.dataset.tab)) state.flags.deployTabs.push(event.currentTarget.dataset.tab); saveState(); deployIncident(); });
    $('#restartInst')?.addEventListener('click',()=>{ state.flags.deployRecovery='restart'; addDecision('deploy-restart','أعدت تشغيل الوحدات المتأثرة','عادت الخدمة أسرع، لكن السبب المشتبه به بقي في الإصدار الحالي وقد يتكرر.'); saveState(); go('onCall'); });
    $('#rollback')?.addEventListener('click',()=>{ state.flags.deployRecovery='rollback'; addDecision('deploy-rollback','رجعت إلى الإصدار السابق','استهدفت المشتبه الرئيسي بإزالة الإصدار الجديد من الخدمة ضمن سيناريو الاستعادة.'); saveState(); go('onCall'); });
  }

  function onCall() {
    if(state.flags.deployRecovery===null){ go('deployIncident'); return; }
    const restarted=state.flags.deployRecovery==='restart';
    const values=savedLoad();
    html(`<div><span class="eyebrow">بعد استعادة الخدمة</span><h1 class="scene-title">الخدمة عادت، لكن أثر الحادث ما زال يصل إلى المستخدمين.</h1>${supportingRoleStrip(['affectedUser'],'من يظهر في الواجهة الآن؟')}<div class="card"><p>تعاملت هانا مع العطل ${restarted?'بإعادة تشغيل الوحدات':'بالعودة إلى الإصدار السابق'}. بقي توزيع الحمل (${values.join(' / ')}%) واختبار failover جزءًا من سجل التشغيل، لا سببًا مفترضًا للحادث.</p></div><div class="action-row"><button id="toSupport" class="primary-btn">انتقل إلى بلاغات الحادث</button></div></div>`);
    $('#toSupport').addEventListener('click',()=>go('supportTask'));
  }

  function supportTask() {
    const index=state.flags.supportIndex;
    if(index>=SUPPORT_TASKS.length){ go('deployEnd'); return; }
    const task=SUPPORT_TASKS[index];
    const values=savedLoad();
    html(`<div><span class="eyebrow">سامر — دعم المستخدمين</span><h1 class="scene-title">بلاغ مرتبط بالحادث ${index+1}/${SUPPORT_TASKS.length}</h1>${supportingRoleStrip(['affectedUser'],'صاحب البلاغ')}${supportFeedbackMarkup()}<div class="reality-note"><strong>سياق الحادث المحفوظ</strong>التوزيع أثناء الحادث: ${values.join(' / ')}%. يبقى ظاهرًا دون اعتباره سببًا تلقائيًا.</div><p class="scene-subtitle">الخياران قد يساعدان المستخدم، لكنهما يختلفان في السرعة وفي الأدلة المحفوظة للتحقيق.</p><div class="card"><div class="message user">${ctx.h(task.q)}</div><div class="choice-grid"><button id="supportInvestigate" class="choice-btn"><strong>${ctx.h(task.aTitle)}</strong><small>${ctx.h(task.aDetail)}</small></button><button id="supportFast" class="choice-btn"><strong>${ctx.h(task.bTitle)}</strong><small>${ctx.h(task.bDetail)}</small></button></div></div></div>`);
    $('#supportInvestigate')?.addEventListener('click',()=>{ addDecision(`support-evidence-${index}`,`حافظت على أدلة البلاغ ${index+1}`,'ربطت تجربة المستخدم ببيانات الحادث والتحقيق.'); state.flags.supportFeedbackLabel='احتفظ الفريق بسياق تشخيصي أفضل'; state.flags.supportFeedbackDetail='استغرقت المعالجة وقتًا أطول قليلًا، لكن البلاغ بقي مرتبطًا بالحادث.'; state.flags.supportIndex+=1; saveState(); supportTask(); });
    $('#supportFast')?.addEventListener('click',()=>{ addDecision(`support-fast-${index}`,`قدمت استعادة أسرع للبلاغ ${index+1}`,'الإجراء أسرع للمستخدم، لكنه يحفظ معلومات أقل للتحقيق.'); state.flags.supportFeedbackLabel='حصل المستخدم على مسار استعادة أسرع'; state.flags.supportFeedbackDetail='تحسنت السرعة المباشرة، لكن الفريق احتفظ بأدلة أقل.'; state.flags.supportIndex+=1; saveState(); supportTask(); });
  }

  function deployEnd() {
    const values=savedLoad();
    const resilient=survivableFailures(values);
    addLedger(7,'هانا وسامر وفرق العمليات','مراقبة مؤجلة، توزيع حمل، N-1، تشخيص، استعادة ودعم','الخدمة متاحة للمستخدمين',`أُغلقت الفحوص المؤجلة ${state.flags.monitoringChecksCompleted.length}/${state.flags.deferredExtraChecks.length}، واختبر التوزيع ضد قيود نقل الطوارئ؛ تحمل ${resilient}/3 حالات${resilient<3?' مع تسجيل فجوة المرونة وقبولها صراحة قبل المتابعة':''}.`);
    html(`<div><span class="eyebrow">نهاية مرحلة التشغيل</span><h1 class="scene-title">اكتملت مراحل اللعب الثماني.</h1>${supportFeedbackMarkup()}<div class="stage-output"><strong>الخدمة عادت إلى حالة متاحة بعد عطل</strong>خلف كلمة «متاحة» توجد مراقبة وسعات وقيود نقل وتشخيص واستعادة ودعم.</div><div class="hud-grid"><div class="hud-item"><span>توزيع الحمل</span><strong>${values.join(' / ')}%</strong></div><div class="hud-item"><span>حالات N-1</span><strong>${resilient}/3</strong></div><div class="hud-item"><span>الفحوص المؤجلة المغلقة</span><strong>${state.flags.monitoringChecksCompleted.length}/${state.flags.deferredExtraChecks.length}</strong></div><div class="hud-item"><span>بلاغات الحادث</span><strong>${state.flags.supportIndex}</strong></div></div><div class="action-row"><button id="uptimeAbstract" class="primary-btn">أغلق مرحلة التشغيل وارجع إلى إجابتك</button></div></div>`);
    $('#uptimeAbstract')?.addEventListener('click',()=>go('abstract8'));
  }

  function abstract8(){ abstraction([['هانا','مهندسة تشغيل','◉'],['سامر','دعم المستخدمين','◌'],['فرق المناوبة والصيانة','','◇']],'الخدمة متاحة','الفحوص المؤجلة والتوزيع والمرونة والتشخيص والاستعادة والدعم أصبحت للمستخدم حالة بسيطة: «الخدمة متاحة».','pipelineAssemble'); }

  return { ch8Intro,deployLoad,deployIncident,onCall,supportTask,deployEnd,abstract8 };
}

import { SUPPORT_TASKS } from '../data/content-tasks.js';
import { supportingRoleStrip } from '../components/supporting-role-strip.js';

const STARTING_LOAD = [70, 20, 10];
const CAPACITY_LIMITS = [60, 45, 35];
const SITE_NAMES = ['أ','ب','ج'];
const INCIDENT_TABS = [
  ['network', 'الشبكة', 'الشبكة مستقرة، ولا توجد زيادة واضحة في فقد البيانات.'],
  ['compute', 'الخوادم', 'السعة متاحة، لكن بعض العمليات يعاد تشغيلها.'],
  ['model', 'خدمة النموذج', 'استهلاك الذاكرة يرتفع تدريجيًا في الإصدار الجديد.']
];

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
    const spareElsewhere=margins.reduce((sum,value,index)=>sum+(index===failedIndex?0:Math.max(0,value)),0);
    const displaced=values[failedIndex];
    return { displaced, spareElsewhere, survivable:spareElsewhere>=displaced };
  }
  function survivableFailures(values=savedLoad()) { return [0,1,2].filter(index=>failoverCase(index,values).survivable).length; }
  function supportFeedbackMarkup() {
    if(!state.flags.supportFeedbackLabel) return '';
    return `<div class="decision-feedback-inline" role="status"><strong>${ctx.h(state.flags.supportFeedbackLabel)}</strong><span>${ctx.h(state.flags.supportFeedbackDetail)}</span></div>`;
  }

  function failoverMarkup(values) {
    const margins=loadMargins(values);
    const checked=state.flags.deployFailoverChecks;
    return `<div><span class="eyebrow">اختبار المرونة بعد اعتماد التوزيع</span><h1 class="scene-title">اختبر ما إذا كان التوزيع يتحمل خروج مركز كامل.</h1><div class="reality-note"><strong>لماذا هذا أفضل من «إجمالي الهامش»؟</strong> مجموع السعات 140% والحمل المطلوب 100%، لذلك مجموع الهامش يساوي 40 نقطة دائمًا لأي توزيع صحيح. السؤال المفيد هو أين يوجد هذا الهامش وهل يستطيع امتصاص حمل موقع بعينه.</div><div class="hud-grid">${margins.map((margin,index)=>`<div class="hud-item"><span>هامش مركز ${SITE_NAMES[index]}</span><strong>${margin} نقطة</strong></div>`).join('')}</div><div class="evidence-results">${[0,1,2].map(index=>{
      const result=failoverCase(index,values);
      const done=checked.includes(index);
      return `<article class="card flat"><strong>إذا خرج مركز ${SITE_NAMES[index]}</strong><p>الحمل الذي يجب نقله: ${result.displaced} نقطة. الهامش المتاح في المركزين الآخرين: ${result.spareElsewhere} نقطة.</p>${done?`<div class="alert ${result.survivable?'goodish':'dangerish'}"><strong>${result.survivable?'يمكن امتصاص الحمل حسابيًا':'لا يكفي الهامش الحالي'}</strong><span>${result.survivable?'يوجد هامش كافٍ في الموقعين الباقيين ضمن افتراضات السيناريو.':'سيحتاج التشغيل إلى خفض حمل أو سعة إضافية؛ التوزيع صالح في الحالة العادية لكنه لا يتحمل هذا الفشل الكامل.'}</span></div>`:`<button class="secondary-btn" data-failover-check="${index}" type="button">اختبر خروج مركز ${SITE_NAMES[index]}</button>`}</article>`;
    }).join('')}</div>${checked.length===3?`<div class="stage-output"><strong>${survivableFailures(values)} من 3 حالات خروج كاملة يمكن امتصاصها</strong>هذه ليست «درجة جودة»؛ هي خاصية محددة لتوزيعك تحت سيناريو N‑1 المبسط.</div><div class="action-row"><button id="finishFailover" class="primary-btn">انتقل إلى الحادث التشغيلي</button></div>`:'<div class="alert"><strong>أكمل الحالات الثلاث</strong><span>اختبار حالة واحدة لا يكفي لوصف مرونة التوزيع كله.</span></div>'}</div>`;
  }

  function deployLoad() {
    if(Array.isArray(state.flags.deployLoad)) {
      const values=savedLoad();
      html(failoverMarkup(values));
      bind('[data-failover-check]','click',event=>{
        const index=Number(event.currentTarget.dataset.failoverCheck);
        if(!state.flags.deployFailoverChecks.includes(index)) state.flags.deployFailoverChecks.push(index);
        saveState(); deployLoad();
      });
      $('#finishFailover')?.addEventListener('click',()=>{
        const resilient=survivableFailures(values);
        addDecision('deploy-failover-review','اختبرت التوزيع ضد خروج كل مركز على حدة',`تحمل التوزيع ${resilient} من 3 حالات خروج كاملة في اختبار N-1 المبسط؛ هذه النتيجة تصف المرونة ولا تفسر سبب الحادث اللاحق.`);
        saveState(); go('deployIncident');
      });
      return;
    }
    const initial=STARTING_LOAD;
    html(`<div><span class="eyebrow">هانا — مهندسة تشغيل الخدمة</span><h1 class="scene-title">أصبحت الخدمة متاحة للمستخدمين.</h1><div class="reality-note"><strong>المهمة</strong> وزّع 100% من الحمل من دون تجاوز السعة التشغيلية المتاحة: أ 60%، ب 45%، ج 35%. توجد حلول صحيحة متعددة. بعد اعتماد توزيع صالح ستختبر قدرته على تحمل خروج كل مركز على حدة.</div><div class="load-grid">${SITE_NAMES.map((name,index)=>`<div class="load-card"><span>مركز البيانات ${name}</span><strong id="load${index}">${initial[index]}%</strong><small>السعة المتاحة: ${CAPACITY_LIMITS[index]}%</small><input id="range${index}" type="range" min="0" max="100" step="1" value="${initial[index]}" aria-label="حصة مركز البيانات ${name}" /></div>`).join('')}</div><div id="loadFeedback" class="alert"><strong>المجموع: <span id="loadTotal">${initial.reduce((sum,value)=>sum+value,0)}</span>%</strong><span>المطلوب أولًا توزيع صالح؛ تقييم المرونة يأتي بعده باختبار failover مستقل.</span></div><div class="action-row"><button id="testLoad" class="primary-btn">اعتمد التوزيع واختبر المرونة</button></div></div>`);
    const updateTotal=()=>{ if(state.scene!=='deployLoad')return; const values=loadValues(); values.forEach((value,index)=>{ const output=$(`#load${index}`); if(output)output.textContent=`${value}%`; }); const totalOutput=$('#loadTotal'); if(totalOutput)totalOutput.textContent=values.reduce((sum,value)=>sum+value,0); };
    [0,1,2].forEach(index=>$(`#range${index}`)?.addEventListener('input',updateTotal));
    $('#testLoad')?.addEventListener('click',()=>{
      const values=loadValues();
      const total=values.reduce((sum,value)=>sum+value,0);
      const feedback=$('#loadFeedback');
      if(total!==100){ if(feedback)feedback.innerHTML=`<strong>المجموع الآن ${total}%</strong><span>يجب أن يساوي 100% لأن الأرقام حصص من الحمل نفسه.</span>`; tone(170,.08,'square'); return; }
      const overloaded=values.findIndex((value,index)=>value>CAPACITY_LIMITS[index]);
      if(overloaded>=0){ if(feedback)feedback.innerHTML=`<strong>مركز ${SITE_NAMES[overloaded]} تجاوز سعته.</strong><span>حملته ${values[overloaded]}% بينما سعته ${CAPACITY_LIMITS[overloaded]}%.</span>`; tone(170,.08,'square'); return; }
      state.flags.deployLoad=values;
      state.flags.deployFailoverChecks=[];
      addDecision('deploy-capacity-load','وزعت الحمل ضمن سعات المراكز','أصبح التوزيع صالحًا للحالة العادية، لكنه لا يوصف بأنه مرن قبل اختبار حالات خروج المراكز.');
      saveState(); deployLoad();
    });
  }

  function diagnosisSummary(){ return INCIDENT_TABS.filter(([id])=>state.flags.deployTabs.includes(id)).map(([id,label,text])=>`<div class="diagnosis-row diagnosis-row--${id}"><strong>${label}</strong><span>${text}</span></div>`).join(''); }

  function deployIncident() {
    if(state.flags.deployFailoverChecks.length!==3){ go('deployLoad'); return; }
    const complete=state.flags.deployTabs.length===INCIDENT_TABS.length;
    const verificationNote=state.flags.launchChoice==='fast'?'الإطلاق السابق ترك تحققًا إضافيًا غير حاجب للمراقبة بعد الإطلاق؛ هذا لا يثبت أنه سبب الحادث، لكنه يزيد أهمية جمع الأدلة الآن.':'حتى بعد إكمال التحقق قبل الإطلاق يمكن أن تظهر أعطال تشغيلية جديدة؛ الاختبارات تقلل عدم اليقين ولا تلغيه.';
    const values=savedLoad();
    const margins=loadMargins(values);
    const resilient=survivableFailures(values);
    const capacityNote=`توزيعك ${values.join(' / ')}% يترك هوامش ${margins.join(' / ')} نقاط. اختبار N-1 السابق وجد أن ${resilient} من 3 حالات خروج كاملة يمكن امتصاصها حسابيًا. هذه معلومة عن المرونة وليست تفسيرًا لسبب الحادث.`;
    const tabs=INCIDENT_TABS.map(([id,label])=>state.flags.deployTabs.includes(id)
      ? `<span class="incident-tab incident-tab--done" aria-label="${label} فُحص">✓ ${label}</span>`
      : `<button data-tab="${id}">${label}</button>`).join('');
    html(`<div><span class="eyebrow">عطل جديد بعد اختبار التوزيع والمرونة</span><h1 class="scene-title">ارتفعت الأخطاء بصورة ملحوظة بعد إصدار جديد.</h1>${supportingRoleStrip(['operationsTeam'],'من يعمل مع هانا أثناء التشخيص؟')}<div class="alert dangerish"><strong>تأثر عدد كبير من المستخدمين في سيناريو اللعب</strong><span>لا تفترض اللعبة أن العطل نتج عن توزيع الحمل. ${verificationNote}</span></div><div class="reality-note"><strong>أثر قرار التوزيع المحفوظ</strong>${capacityNote}</div><div class="incident-tabs">${tabs}</div><div id="tabReadout" class="diagnosis-stack">${state.flags.deployTabs.length?diagnosisSummary():'<div class="card flat">ابدأ بفحص الشبكة أو الخوادم أو خدمة النموذج.</div>'}</div>${complete?'<div class="alert"><strong>الاستنتاج الحالي</strong><span>الشبكة مستقرة والسعة متاحة، بينما يظهر ارتفاع تدريجي في استهلاك الذاكرة داخل الإصدار الجديد. الإصدار الجديد هو المشتبه الرئيسي في هذا السيناريو.</span></div><div class="choice-grid"><button id="restartInst" class="choice-btn"><strong>أعد تشغيل الوحدات المتأثرة</strong><small>عودة أسرع مع احتمال تكرار المشكلة إذا بقي السبب.</small></button><button id="rollback" class="choice-btn"><strong>ارجع إلى الإصدار السابق</strong><small>استعادة أبطأ لكنها تستهدف المشتبه الرئيسي.</small></button></div>':''}</div>`);
    bind('[data-tab]','click',event=>{ state.flags.deployTabs.push(event.currentTarget.dataset.tab); saveState(); deployIncident(); });
    $('#restartInst')?.addEventListener('click',()=>{ state.flags.deployRecovery='restart'; addDecision('deploy-restart','أعدت تشغيل الوحدات المتأثرة',`عادت الخدمة أسرع، لكن السبب المشتبه به ظل في الإصدار نفسه. اختبار التوزيع السابق أظهر تحمل ${resilient} من 3 حالات خروج كاملة؛ هذه خاصية مرونة لا سبب العطل.`); saveState(); go('onCall'); });
    $('#rollback')?.addEventListener('click',()=>{ state.flags.deployRecovery='rollback'; addDecision('deploy-rollback','عدت إلى الإصدار السابق',`تحملت وقت استعادة أطول واستهدفت الإصدار المشتبه به. اختبار التوزيع السابق أظهر تحمل ${resilient} من 3 حالات خروج كاملة، من دون نسب سبب الحادث إلى التوزيع.`); saveState(); go('onCall'); });
  }

  function onCall() {
    const restarted=state.flags.deployRecovery==='restart';
    const values=savedLoad();
    html(`<div><span class="eyebrow">بعد استعادة الخدمة</span><h1 class="scene-title">الخدمة عادت، لكن أثر الحادث ما زال يصل إلى المستخدمين.</h1>${supportingRoleStrip(['affectedUser'],'من يظهر في الواجهة الآن؟')}<div class="card"><p>تعاملت هانا مع العطل ${restarted?'بإعادة تشغيل الوحدات':'بالعودة إلى الإصدار السابق'}. بقي توزيع الحمل الذي اخترته (${values.join(' / ')}%) واختبار failover جزءًا من حالة التشغيل، لا لغزًا يفسر الحادث تلقائيًا. الآن تصل بلاغات مرتبطة بفترة التعطل.</p></div><div class="action-row"><button id="toSupport" class="primary-btn">انتقل إلى بلاغات الحادث</button></div></div>`);
    $('#toSupport').addEventListener('click',()=>go('supportTask'));
  }

  function supportTask() {
    const index=state.flags.supportIndex;
    if(index>=SUPPORT_TASKS.length){ go('deployEnd'); return; }
    const task=SUPPORT_TASKS[index];
    const values=savedLoad();
    html(`<div><span class="eyebrow">سامر — دعم المستخدمين</span><h1 class="scene-title">بلاغ مرتبط بالحادث ${index+1}/${SUPPORT_TASKS.length}</h1>${supportingRoleStrip(['affectedUser'],'صاحب البلاغ')} ${supportFeedbackMarkup()}<div class="reality-note"><strong>سياق الحادث المحفوظ</strong>التوزيع التشغيلي أثناء الحادث: ${values.join(' / ')}%. يبقى ظاهرًا لأنه جزء من حالة التشغيل التي يحقق فيها الفريق، من دون اعتباره سببًا تلقائيًا للعطل.</div><p class="scene-subtitle">الخياران قد يساعدان المستخدم، لكنهما يختلفان في السرعة وفي مقدار الأدلة التي يحتفظ بها الفريق للتحقيق.</p><div class="card"><div class="message user">${ctx.h(task.q)}</div><div class="choice-grid"><button id="supportInvestigate" class="choice-btn"><strong>${ctx.h(task.aTitle)}</strong><small>${ctx.h(task.aDetail)}</small></button><button id="supportFast" class="choice-btn"><strong>${ctx.h(task.bTitle)}</strong><small>${ctx.h(task.bDetail)}</small></button></div></div></div>`);
    $('#supportInvestigate')?.addEventListener('click',()=>{
      addDecision(`support-evidence-${index}`,`حافظت على أدلة البلاغ ${index+1}`,'اخترت مسارًا أبطأ قليلًا يربط تجربة المستخدم ببيانات الحادث والتحقيق.');
      state.flags.supportFeedbackLabel='احتفظ الفريق بسياق تشخيصي أفضل';
      state.flags.supportFeedbackDetail='استغرقت المعالجة وقتًا أطول قليلًا، لكن البلاغ بقي مرتبطًا بالمحاولة أو الإصدار الذي ظهر أثناء الحادث، ما يجعل التحقيق اللاحق أقوى.';
      state.flags.supportIndex+=1; saveState(); supportTask();
    });
    $('#supportFast')?.addEventListener('click',()=>{
      addDecision(`support-fast-${index}`,`قدمت استعادة أسرع للبلاغ ${index+1}`,'اخترت إجراءً أسرع للمستخدم، لكنه حفظ معلومات أقل عن سبب المشكلة وعلاقتها بالحادث.');
      state.flags.supportFeedbackLabel='حصل المستخدم على مسار استعادة أسرع';
      state.flags.supportFeedbackDetail='تحسنت السرعة المباشرة للمستخدم، لكن الفريق احتفظ بأدلة أقل تربط التجربة بسبب العطل أو الإصدار المتأثر.';
      state.flags.supportIndex+=1; saveState(); supportTask();
    });
  }

  function deployEnd() {
    const values=savedLoad();
    const resilient=survivableFailures(values);
    addLedger(7,'هانا وسامر وفرق العمليات','توزيع حمل، اختبار N-1، مراقبة، تشخيص، استعادة ودعم','الخدمة متاحة للمستخدمين',`حُفظ توزيع الحمل (${values.join(' / ')}%) واختُبر ضد خروج المراكز؛ تحمل ${resilient} من 3 حالات كاملة في السيناريو، من دون نسب سبب الحادث إليه.`);
    html(`<div><span class="eyebrow">نهاية مرحلة التشغيل</span><h1 class="scene-title">اكتملت مراحل اللعب الثماني.</h1>${supportFeedbackMarkup()}<div class="stage-output"><strong>الخدمة عادت إلى حالة متاحة بعد عطل</strong>خلف كلمة «متاحة» توجد سعات مختلفة واختبار مرونة ومراقبة وتشخيص واستعادة ودعم وصيانة.</div><div class="hud-grid"><div class="hud-item"><span>توزيع الحمل المحفوظ</span><strong>${values.join(' / ')}%</strong></div><div class="hud-item"><span>حالات N-1 القابلة للامتصاص</span><strong>${resilient}/3</strong></div><div class="hud-item"><span>طريقة الاستعادة</span><strong>${state.flags.deployRecovery==='rollback'?'العودة لإصدار سابق':'إعادة تشغيل الوحدات'}</strong></div><div class="hud-item"><span>بلاغات الحادث</span><strong>${state.flags.supportIndex} عولجت</strong></div></div><div class="action-row"><button id="uptimeAbstract" class="primary-btn">أغلق مرحلة التشغيل وارجع إلى إجابتك</button></div></div>`);
    $('#uptimeAbstract')?.addEventListener('click',()=>go('abstract8'));
  }

  function abstract8(){ abstraction([['هانا','مهندسة تشغيل','◉'],['سامر','دعم المستخدمين','◌'],['فرق المناوبة والصيانة','','◇']],'الخدمة متاحة','التوزيع واختبار failover والمراقبة والتشخيص والاستعادة والدعم أصبحت للمستخدم حالة بسيطة: «الخدمة متاحة».','pipelineAssemble'); }

  return { ch8Intro,deployLoad,deployIncident,onCall,supportTask,deployEnd,abstract8 };
}

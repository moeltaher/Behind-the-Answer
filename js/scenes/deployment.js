import { SUPPORT_TASKS } from '../data/content-tasks.js';
import { supportingRoleStrip } from '../components/supporting-role-strip.js';

const STARTING_LOAD = [70, 20, 10];
const CAPACITY_LIMITS = [60, 45, 35];
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
  function supportFeedbackMarkup() {
    if(!state.flags.supportFeedbackLabel) return '';
    return `<div class="decision-feedback-inline" role="status"><strong>${ctx.h(state.flags.supportFeedbackLabel)}</strong><span>${ctx.h(state.flags.supportFeedbackDetail)}</span></div>`;
  }

  function deployLoad() {
    html(`<div><span class="eyebrow">هانا — مهندسة تشغيل الخدمة</span><h1 class="scene-title">أصبحت الخدمة متاحة للمستخدمين.</h1><div class="reality-note"><strong>المهمة</strong> وزّع 100% من الحمل من دون تجاوز السعة التشغيلية المتاحة: أ 60%، ب 45%، ج 35%. توجد حلول صحيحة متعددة؛ الأفضل أن تترك هامشًا في أكثر من موقع بدل ملء مركز واحد حتى الحد.</div><div class="load-grid">${['أ','ب','ج'].map((name,index)=>`<div class="load-card"><span>مركز البيانات ${name}</span><strong id="load${index}">${STARTING_LOAD[index]}%</strong><small>السعة المتاحة: ${CAPACITY_LIMITS[index]}%</small><input id="range${index}" type="range" min="0" max="100" step="1" value="${STARTING_LOAD[index]}" aria-label="حصة مركز البيانات ${name}" /></div>`).join('')}</div><div id="loadFeedback" class="alert"><strong>المجموع: <span id="loadTotal">100</span>%</strong><span>لا يوجد توزيع وحيد صحيح. المطلوب احترام السعات والاحتفاظ بهامش تشغيل معقول.</span></div><div class="action-row"><button id="testLoad" class="primary-btn">اختبر التوزيع</button></div></div>`);
    const updateTotal=()=>{ if(state.scene!=='deployLoad')return; const values=loadValues(); values.forEach((value,index)=>{ const output=$(`#load${index}`); if(output)output.textContent=`${value}%`; }); const totalOutput=$('#loadTotal'); if(totalOutput)totalOutput.textContent=values.reduce((sum,value)=>sum+value,0); };
    [0,1,2].forEach(index=>$(`#range${index}`)?.addEventListener('input',updateTotal));
    $('#testLoad')?.addEventListener('click',()=>{
      const values=loadValues();
      const total=values.reduce((sum,value)=>sum+value,0);
      const feedback=$('#loadFeedback');
      if(total!==100){ if(feedback)feedback.innerHTML=`<strong>المجموع الآن ${total}%</strong><span>يجب أن يساوي 100% لأن الأرقام حصص من الحمل نفسه.</span>`; tone(170,.08,'square'); return; }
      const overloaded=values.findIndex((value,index)=>value>CAPACITY_LIMITS[index]);
      if(overloaded>=0){ if(feedback)feedback.innerHTML=`<strong>مركز ${['أ','ب','ج'][overloaded]} تجاوز سعته.</strong><span>حملته ${values[overloaded]}% بينما سعته ${CAPACITY_LIMITS[overloaded]}%.</span>`; tone(170,.08,'square'); return; }
      const margins=values.map((value,index)=>CAPACITY_LIMITS[index]-value);
      const zeroMargins=margins.filter(value=>value===0).length;
      addDecision('deploy-capacity-load','وزعت الحمل ضمن سعات المراكز',zeroMargins?`نجح التوزيع، لكن ${zeroMargins} من المراكز يعمل عند حد السعة تمامًا؛ هذا يترك هامشًا أقل للتغير أو الفشل.`:'نجح التوزيع وترك هامشًا تشغيليًا في كل مركز بدل تشغيل أي موقع عند الحد الكامل.');
      saveState(); go('deployIncident');
    });
  }

  function diagnosisSummary(){ return INCIDENT_TABS.filter(([id])=>state.flags.deployTabs.includes(id)).map(([id,label,text])=>`<div class="diagnosis-row diagnosis-row--${id}"><strong>${label}</strong><span>${text}</span></div>`).join(''); }

  function deployIncident() {
    const complete=state.flags.deployTabs.length===INCIDENT_TABS.length;
    const verificationNote=state.flags.launchChoice==='fast'?'الإطلاق السابق ترك تحققًا غير متعلق بالسلامة للمراقبة بعد الإطلاق؛ هذا لا يثبت أنه سبب الحادث، لكنه يزيد أهمية جمع الأدلة الآن.':'حتى بعد إكمال التحقق قبل الإطلاق يمكن أن تظهر أعطال تشغيلية جديدة؛ الاختبارات تقلل عدم اليقين ولا تلغيه.';
    const tabs=INCIDENT_TABS.map(([id,label])=>state.flags.deployTabs.includes(id)
      ? `<span class="incident-tab incident-tab--done" aria-label="${label} فُحص">✓ ${label}</span>`
      : `<button data-tab="${id}">${label}</button>`).join('');
    html(`<div><span class="eyebrow">عطل جديد بعد نجاح اختبار التوزيع</span><h1 class="scene-title">ارتفعت الأخطاء بصورة ملحوظة بعد إصدار جديد.</h1>${supportingRoleStrip(['operationsTeam'],'من يعمل مع هانا أثناء التشخيص؟')}<div class="alert dangerish"><strong>تأثر عدد كبير من المستخدمين في سيناريو اللعب</strong><span>لا تفترض اللعبة أن العطل نتج عن توزيع الحمل. ${verificationNote}</span></div><div class="incident-tabs">${tabs}</div><div id="tabReadout" class="diagnosis-stack">${state.flags.deployTabs.length?diagnosisSummary():'<div class="card flat">ابدأ بفحص الشبكة أو الخوادم أو خدمة النموذج.</div>'}</div>${complete?'<div class="alert"><strong>الاستنتاج الحالي</strong><span>الشبكة مستقرة والسعة متاحة، بينما يظهر ارتفاع تدريجي في استهلاك الذاكرة داخل الإصدار الجديد. الإصدار الجديد هو المشتبه الرئيسي في هذا السيناريو.</span></div><div class="choice-grid"><button id="restartInst" class="choice-btn"><strong>أعد تشغيل الوحدات المتأثرة</strong><small>عودة أسرع مع احتمال تكرار المشكلة إذا بقي السبب.</small></button><button id="rollback" class="choice-btn"><strong>ارجع إلى الإصدار السابق</strong><small>استعادة أبطأ لكنها تستهدف المشتبه الرئيسي.</small></button></div>':''}</div>`);
    bind('[data-tab]','click',event=>{ state.flags.deployTabs.push(event.currentTarget.dataset.tab); saveState(); deployIncident(); });
    $('#restartInst')?.addEventListener('click',()=>{ state.flags.deployRecovery='restart'; addDecision('deploy-restart','أعدت تشغيل الوحدات المتأثرة','عادت الخدمة أسرع، لكن السبب المشتبه به ظل في الإصدار نفسه وقد يحتاج متابعة.'); saveState(); go('onCall'); });
    $('#rollback')?.addEventListener('click',()=>{ state.flags.deployRecovery='rollback'; addDecision('deploy-rollback','عدت إلى الإصدار السابق','تحملت وقت استعادة أطول واستهدفت الإصدار المشتبه به بدل الاكتفاء بإعادة التشغيل.'); saveState(); go('onCall'); });
  }

  function onCall() {
    const restarted=state.flags.deployRecovery==='restart';
    html(`<div><span class="eyebrow">بعد استعادة الخدمة</span><h1 class="scene-title">الخدمة عادت، لكن أثر الحادث ما زال يصل إلى المستخدمين.</h1>${supportingRoleStrip(['affectedUser'],'من يظهر في الواجهة الآن؟')}<div class="card"><p>تعاملت هانا مع العطل ${restarted?'بإعادة تشغيل الوحدات':'بالعودة إلى الإصدار السابق'}. الآن تصل بلاغات مرتبطة بفترة التعطل، وبعض خيارات الدعم أسرع لكنها تحفظ أدلة أقل للتحقيق.</p></div><div class="action-row"><button id="toSupport" class="primary-btn">انتقل إلى بلاغات الحادث</button></div></div>`);
    $('#toSupport').addEventListener('click',()=>go('supportTask'));
  }

  function supportTask() {
    const index=state.flags.supportIndex;
    if(index>=SUPPORT_TASKS.length){ go('deployEnd'); return; }
    const task=SUPPORT_TASKS[index];
    html(`<div><span class="eyebrow">سامر — دعم المستخدمين</span><h1 class="scene-title">بلاغ مرتبط بالحادث ${index+1}/${SUPPORT_TASKS.length}</h1>${supportingRoleStrip(['affectedUser'],'صاحب البلاغ')} ${supportFeedbackMarkup()}<p class="scene-subtitle">الخياران قد يساعدان المستخدم، لكنهما يختلفان في السرعة وفي مقدار الأدلة التي يحتفظ بها الفريق للتحقيق.</p><div class="card"><div class="message user">${ctx.h(task.q)}</div><div class="choice-grid"><button id="supportInvestigate" class="choice-btn"><strong>${ctx.h(task.aTitle)}</strong><small>${ctx.h(task.aDetail)}</small></button><button id="supportFast" class="choice-btn"><strong>${ctx.h(task.bTitle)}</strong><small>${ctx.h(task.bDetail)}</small></button></div></div></div>`);
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
    addLedger(7,'هانا وسامر وفرق العمليات','توزيع حمل بحسب السعة، مراقبة، تشخيص، استعادة ودعم','الخدمة متاحة للمستخدمين','تظهر نتيجة هذا العمل للمستخدم كخدمة متاحة، لا كورديات تشغيل ودعم أو قرارات استعادة.');
    html(`<div><span class="eyebrow">نهاية مرحلة التشغيل</span><h1 class="scene-title">اكتملت مراحل اللعب الثماني.</h1>${supportFeedbackMarkup()}<div class="stage-output"><strong>الخدمة عادت إلى حالة متاحة بعد عطل</strong>خلف كلمة «متاحة» توجد سعات مختلفة ومراقبة وتشخيص واستعادة ودعم وصيانة.</div><div class="hud-grid"><div class="hud-item"><span>طريقة الاستعادة</span><strong>${state.flags.deployRecovery==='rollback'?'العودة لإصدار سابق':'إعادة تشغيل الوحدات'}</strong></div><div class="hud-item"><span>بلاغات الحادث</span><strong>${state.flags.supportIndex} عولجت</strong></div><div class="hud-item"><span>العمل البشري في الواجهة</span><strong>غير ظاهر</strong></div></div><div class="action-row"><button id="uptimeAbstract" class="primary-btn">أغلق مرحلة التشغيل وارجع إلى إجابتك</button></div></div>`);
    $('#uptimeAbstract')?.addEventListener('click',()=>go('abstract8'));
  }

  function abstract8(){ abstraction([['هانا','مهندسة تشغيل','◉'],['سامر','دعم المستخدمين','◌'],['فرق المناوبة والصيانة','','◇']],'الخدمة متاحة','التوزيع والمراقبة والتشخيص والاستعادة والدعم أصبحت للمستخدم حالة بسيطة: «الخدمة متاحة».','pipelineAssemble'); }

  return { ch8Intro,deployLoad,deployIncident,onCall,supportTask,deployEnd,abstract8 };
}

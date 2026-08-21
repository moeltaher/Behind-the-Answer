import { SUPPORT_TASKS } from '../data/content-tasks.js';

const STARTING_LOAD = [70, 20, 10];
const BALANCED_LOAD = [34, 33, 33];
const INCIDENT_TABS = [
  ['network', 'الشبكة', 'الشبكة مستقرة، ولا توجد زيادة واضحة في فقد البيانات.'],
  ['compute', 'الخوادم', 'السعة متاحة، لكن بعض العمليات يعاد تشغيلها.'],
  ['model', 'خدمة النموذج', 'استهلاك الذاكرة يرتفع تدريجيًا في الإصدار الجديد.']
];

export function createDeploymentRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, tone, saveState, mutateMetrics, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch8Intro() { chapterIntro(7, 'deployLoad'); }
  function loadValues(){ return [0,1,2].map(index=>Number($(`#range${index}`).value)); }

  function deployLoad() {
    html(`<div><span class="eyebrow">هانا — مهندسة تشغيل الخدمة</span><h1 class="scene-title">أصبحت الخدمة متاحة للمستخدمين.</h1><div class="reality-note"><strong>المهمة</strong> التوزيع الحالي غير متوازن عمدًا. اجعل المجموع 100% وتجنب أن يحمل مركز واحد أكثر من 60% من الطلبات.</div><div class="load-grid">${['أ','ب','ج'].map((name,index)=>`<div class="load-card"><span>مركز البيانات ${name}</span><strong id="load${index}">${STARTING_LOAD[index]}%</strong><input id="range${index}" type="range" min="0" max="100" step="1" value="${STARTING_LOAD[index]}" aria-label="حصة مركز البيانات ${name}" /></div>`).join('')}</div><div id="loadFeedback" class="alert"><strong>المجموع: <span id="loadTotal">100</span>%</strong><span>يمكنك استخدام زر التوزيع المتوازن ثم تعديله.</span></div><div class="action-row"><button id="balanceLoad" class="secondary-btn">وزّع الحمل بالتساوي تقريبًا</button><button id="testLoad" class="primary-btn">اختبر التوزيع</button></div></div>`);
    const updateTotal=()=>{ const values=loadValues(); values.forEach((value,index)=>{ $(`#load${index}`).textContent=`${value}%`; }); $('#loadTotal').textContent=values.reduce((sum,value)=>sum+value,0); };
    [0,1,2].forEach(index=>$(`#range${index}`).addEventListener('input',updateTotal));
    $('#balanceLoad').addEventListener('click',()=>{ BALANCED_LOAD.forEach((value,index)=>{ $(`#range${index}`).value=value; }); updateTotal(); });
    $('#testLoad').addEventListener('click',()=>{
      const values=loadValues(); const total=values.reduce((sum,value)=>sum+value,0); const max=Math.max(...values);
      if(total!==100){ $('#loadFeedback').innerHTML=`<strong>المجموع الآن ${total}%</strong><span>يجب أن يساوي 100% لأن الأرقام حصص من الحمل نفسه.</span>`; tone(170,.08,'square'); return; }
      if(max>60){ $('#loadFeedback').innerHTML='<strong>المجموع صحيح، لكن الحمل ما زال مركزًا أكثر من اللازم.</strong><span>اخفض أعلى حصة إلى 60% أو أقل قبل الاختبار.</span>'; tone(170,.08,'square'); return; }
      mutateMetrics(max>50?{burden:2,reliability:-1,pressure:1}:{reliability:2});
      go('deployIncident');
    });
  }

  function diagnosisSummary() {
    return INCIDENT_TABS.filter(([id])=>state.flags.deployTabs.includes(id)).map(([id,label,text])=>`<div class="diagnosis-row diagnosis-row--${id}"><strong>${label}</strong><span>${text}</span></div>`).join('');
  }

  function deployIncident() {
    const complete=state.flags.deployTabs.length===INCIDENT_TABS.length;
    html(`<div><span class="eyebrow">عطل جديد بعد نجاح اختبار التوزيع</span><h1 class="scene-title">ارتفعت نسبة الأخطاء إلى 12%</h1><div class="alert dangerish"><strong>12,417 مستخدمًا متأثرًا — رقم افتراضي</strong><span>هذا العطل لا تفترض اللعبة أنه نتج عن توزيع الحمل. افحص الأقسام الثلاثة لتحديد المؤشر المشتبه به.</span></div><div class="incident-tabs">${INCIDENT_TABS.map(([id,label])=>`<button data-tab="${id}" class="${state.flags.deployTabs.includes(id)?'active':''}">${state.flags.deployTabs.includes(id)?'✓ ':''}${label}</button>`).join('')}</div><div id="tabReadout" class="diagnosis-stack">${state.flags.deployTabs.length?diagnosisSummary():'<div class="card flat">ابدأ بفحص الشبكة أو الخوادم أو خدمة النموذج.</div>'}</div>${complete?'<div class="alert"><strong>الاستنتاج الحالي</strong><span>الشبكة مستقرة والسعة متاحة، بينما يظهر ارتفاع تدريجي في استهلاك الذاكرة داخل الإصدار الجديد. الإصدار الجديد هو المشتبه الرئيسي في هذا السيناريو.</span></div><div class="choice-grid"><button id="restartInst" class="choice-btn"><strong>أعد تشغيل الوحدات المتأثرة</strong><small>عودة أسرع مع احتمال تكرار المشكلة إذا بقي السبب.</small></button><button id="rollback" class="choice-btn"><strong>ارجع إلى الإصدار السابق</strong><small>استعادة أبطأ لكنها تستهدف المشتبه الرئيسي.</small></button></div>':''}</div>`);
    bind('[data-tab]','click',event=>{ const id=event.currentTarget.dataset.tab; if(!state.flags.deployTabs.includes(id)){ state.flags.deployTabs.push(id); saveState(); deployIncident(); } });
    $('#restartInst')?.addEventListener('click',()=>{ state.flags.deployRecovery='restart'; addDecision('deploy-restart','أعدت تشغيل الوحدات المتأثرة','عادت الخدمة أسرع مع احتمال بقاء سبب العطل.',{pressure:5,cost:-3,burden:5,reliability:-3}); saveState(); go('onCall'); });
    $('#rollback')?.addEventListener('click',()=>{ state.flags.deployRecovery='rollback'; addDecision('deploy-rollback','عدت إلى الإصدار السابق','تحملت وقت استعادة أطول واستهدفت الإصدار المشتبه به.',{pressure:-3,cost:4,burden:1,reliability:5}); saveState(); go('onCall'); });
  }

  function onCall() {
    const restarted=state.flags.deployRecovery==='restart';
    html(`<div><span class="eyebrow">بعد استعادة الخدمة</span><h1 class="scene-title">الخدمة عادت، لكن أثر الحادث ما زال يصل إلى المستخدمين.</h1><div class="card"><p>تعاملت هانا مع العطل ${restarted?'بإعادة تشغيل الوحدات':'بالعودة إلى الإصدار السابق'}. الآن تصل بلاغات مرتبطة بفترة التعطل.</p></div><div class="action-row"><button id="toSupport" class="primary-btn">انتقل إلى بلاغات الحادث</button></div></div>`);
    $('#toSupport').addEventListener('click',()=>go('supportTask'));
  }

  function supportTask() {
    const index=state.flags.supportIndex;
    if(index>=SUPPORT_TASKS.length){ go('deployEnd'); return; }
    const task=SUPPORT_TASKS[index];
    html(`<div><span class="eyebrow">سامر — دعم المستخدمين</span><h1 class="scene-title">بلاغ مرتبط بالحادث ${index+1}/${SUPPORT_TASKS.length}</h1><p class="scene-subtitle">المطلوب ليس اختيار «رد لطيف»، بل تحديد الإجراء الذي يحفظ معلومات الحادث ويعالج حالة المستخدم.</p><div class="card"><div class="message user">${ctx.h(task.q)}</div><div class="choice-grid"><button id="supportGood" class="choice-btn"><strong>${ctx.h(task.a)}</strong></button><button id="supportAlt" class="choice-btn"><strong>${ctx.h(task.b)}</strong></button></div></div></div>`);
    $('#supportGood').addEventListener('click',()=>{ mutateMetrics({serviceQuality:3}); state.flags.supportIndex+=1; saveState(); supportTask(); });
    $('#supportAlt').addEventListener('click',()=>{ mutateMetrics({pressure:1,serviceQuality:-3}); state.flags.supportIndex+=1; saveState(); supportTask(); });
  }

  function deployEnd() {
    addLedger(7,'هانا وسامر وفرق العمليات','مراقبة الخدمة، الاستجابة للأعطال، المناوبات والدعم','الخدمة متاحة للمستخدمين','تظهر نتيجة هذا العمل للمستخدم كخدمة متاحة، لا كورديات تشغيل ودعم.');
    html(`<div><span class="eyebrow">نهاية مرحلة التشغيل</span><h1 class="scene-title">ماذا أنتجت هذه المرحلة؟</h1><div class="stage-output"><strong>خدمة عادت إلى حالة متاحة بعد عطل</strong>خلف كلمة «متاحة» توجد مراقبة وتشخيص واستعادة ودعم وصيانة.</div><div class="hud-grid"><div class="hud-item"><span>طريقة الاستعادة</span><strong>${state.flags.deployRecovery==='rollback'?'العودة لإصدار سابق':'إعادة تشغيل الوحدات'}</strong></div><div class="hud-item"><span>بلاغات الحادث</span><strong>${state.flags.supportIndex} عولجت</strong></div><div class="hud-item"><span>العمل البشري في الواجهة</span><strong>غير ظاهر</strong></div></div><div class="action-row"><button id="uptimeAbstract" class="primary-btn">انتقل إلى نهاية السلسلة</button></div></div>`);
    $('#uptimeAbstract').addEventListener('click',()=>go('abstract8'));
  }

  function abstract8(){ abstraction([['هانا','التشغيل','◉'],['سامر','الدعم','☏'],['فرق الشبكات','','≋']],'الخدمة متاحة','المناوبات وإصلاح الأعطال ودعم المستخدمين أصبحت للمستخدم حالة واحدة: الخدمة تعمل.','ch9Intro'); }
  return { ch8Intro,deployLoad,deployIncident,onCall,supportTask,deployEnd,abstract8 };
}

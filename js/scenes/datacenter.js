import { DATACENTER_WORKERS, supportingActor } from '../data/supporting-actors.js';

export function createDatacenterRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, tone, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);
  const monitorTile = ctx.monitorTile;

  function ch3Intro() { chapterIntro(2, 'dcInstall'); }

  function canDoStep(id) {
    const done=state.flags.serverSteps;
    if(id==='rack') return done.length===0;
    if(id==='power'||id==='network') return done.includes('rack')&&!done.includes(id);
    if(id==='register') return done.includes('power')&&done.includes('network')&&!done.includes('register');
    return false;
  }

  function dcInstall() {
    const steps=[['rack','ثبّت الخادم في الخزانة'],['power','وصّل الطاقة'],['network','وصّل الشبكة'],['register','أضف الخادم إلى نظام إدارة البنية والمراقبة']];
    html(`<div><span class="eyebrow">مركز بيانات افتراضي</span><h1 class="scene-title">أنت الآن كارلوس، فني بنية تحتية.</h1><div class="reality-note"><strong>ما هو الخادم؟</strong> حاسوب مخصص لتشغيل أحمال وخدمات داخل بنية أكبر. في هذا السيناريو يجب تثبيته أولًا، وبعد ذلك يمكن توصيل الطاقة والشبكة بأي ترتيب، ثم تسجيله في أنظمة الإدارة. هذا إجراء السيناريو وليس ترتيبًا عالميًا لكل مركز بيانات.</div><div class="rack-board"><div class="server-rack">${Array.from({length:8},(_,index)=>`<div class="server-unit"><span>وحدة ${index+1}</span><span class="server-lights"><i></i><i></i><i></i></span></div>`).join('')}</div><div class="connect-panel">${steps.map(([id,label])=>{const done=state.flags.serverSteps.includes(id);const ready=canDoStep(id);return `<button class="connect-step ${done?'done':''}" data-server-step="${id}" ${done||!ready?'disabled':''}><span>${label}</span><span>${done?'✓':ready?'→':'•'}</span></button>`;}).join('')}</div></div><div id="serverStepHelp" class="small muted">ثبّت الخادم أولًا؛ بعدها الطاقة والشبكة مستقلتان، ثم يأتي التسجيل.</div>${state.flags.serverSteps.length===steps.length?'<div class="action-row"><button id="bootServer" class="primary-btn">شغّل اختبار المجموعة</button></div>':''}</div>`);
    bind('[data-server-step]','click',event=>{ const id=event.currentTarget.dataset.serverStep; if(!canDoStep(id)){ tone(170,.06,'square'); return; } state.flags.serverSteps.push(id); saveState(); dcInstall(); });
    $('#bootServer')?.addEventListener('click',()=>go('dcCooling'));
  }

  function dcCooling() {
    html(`<div><span class="eyebrow">إنذار التبريد أثناء الاختبار</span><h1 class="scene-title">وحدة التبريد رقم 3 لا تستجيب.</h1><p class="scene-subtitle">أوقف تشغيل المجموعة المتأثرة أولًا، ثم اختر هل تنقل مهام الاختبار إلى سعة سليمة في قاعة أخرى أم تنتظر إصلاح التبريد.</p><div class="monitor"><div class="monitor-tile"><span>حرارة المنطقة المتأثرة</span><strong class="numeric-value" dir="auto">33° م ↑</strong><div class="bar"><i class="meter-fill meter-fill--danger" style="width:88%"></i></div></div>${monitorTile('قدرة القاعة البديلة','68%',60)}${monitorTile('الشبكة','مستقرة',70)}${monitorTile('مهام الاختبار','تنتظر',66)}</div><div class="choice-grid"><button id="dcMove" class="choice-btn"><strong>اعزل المجموعة وشغّل الاختبار على سعة بديلة</strong><small>تتوقف الأجهزة المتأثرة، وتنتقل مهام الاختبار إلى مجموعة سليمة في قاعة أخرى مع حمل أعلى هناك.</small></button><button id="dcStop" class="choice-btn"><strong>أوقف الاختبار حتى إصلاح التبريد</strong><small>يؤخر التجهيز، ويمنح فريق التبريد وقتًا لإصلاح السبب قبل استئناف المجموعة نفسها.</small></button></div></div>`);
    $('#dcMove').addEventListener('click',()=>{ state.flags.dcCoolingChoice='move'; addDecision('dc-move','عزلت المجموعة ونقلت مهام الاختبار','توقفت الأجهزة المتأثرة واستمرت مهام الاختبار على سعة سليمة في قاعة أخرى تحملت حملًا إضافيًا.'); saveState(); go('dcCoolingOutcome'); });
    $('#dcStop').addEventListener('click',()=>{ state.flags.dcCoolingChoice='stop'; addDecision('dc-stop','أوقفت اختبار المجموعة حتى إصلاح التبريد','تحملت وقت توقف حتى أصلح فريق التبريد السبب وأعاد التحقق من الحرارة.'); saveState(); go('dcCoolingOutcome'); });
  }

  function dcCoolingOutcome() {
    const moved=state.flags.dcCoolingChoice==='move';
    html(`<div><span class="eyebrow">نتيجة قرار التبريد</span><h1 class="scene-title">${moved?'عُزلت المجموعة وانتقلت مهام الاختبار إلى سعة بديلة.':'أُصلحت وحدة التبريد ثم أُعيد اختبار المجموعة.'}</h1><div class="dual-view"><div class="view-panel"><h3>المجموعة المتأثرة</h3><div class="view-list"><span>أوقفت عن الاختبار</span><span>${moved?'تنتظر فحص التبريد قبل العودة':'عادت الحرارة إلى 24° م بعد الإصلاح'}</span></div></div><div class="view-panel"><h3>مهام الاختبار</h3><div class="view-list"><span>${moved?'استمرت على مجموعة سليمة في قاعة أخرى':'توقفت أثناء الإصلاح ثم استؤنفت'}</span><span>${moved?'ارتفع حمل السعة البديلة في السيناريو':'اجتازت المجموعة التحقق بعد عودة التبريد'}</span></div></div></div><div class="action-row"><button id="dcAfterCooling" class="primary-btn">تابع إلى فرق التشغيل</button></div></div>`);
    $('#dcAfterCooling').addEventListener('click',()=>go('dcWorkers'));
  }

  function dcWorkers() {
    const cards=DATACENTER_WORKERS.map(({actorId})=>{ const actor=supportingActor(actorId); return `<article class="worker-person revealed"><img class="worker-person__avatar" src="${ctx.h(actor.image)}" alt="" aria-hidden="true"><strong>${ctx.h(actor.name)}</strong><small>${ctx.h(actor.role)}</small></article>`; }).join('');
    html(`<div><span class="eyebrow">العمل المحيط بالخادم</span><h1 class="scene-title">«الخادم الجاهز» يخفي فريقًا كاملًا.</h1><p class="scene-subtitle">التبريد والكهرباء والكابلات والنظافة والأمن والشبكات أعمال بشرية لازمة للتشغيل، لا أيقونات ثانوية أو إضافات اختيارية بعد اكتمال الخادم.</p><div class="worker-map">${cards}</div><div class="stage-output"><strong>ناتج المرحلة</strong>خوادم اجتازت التركيب والاختبار ويمكن تخصيص قدرتها للتدريب أو تشغيل الخدمة.</div><div class="action-row"><button id="dcReady" class="primary-btn">شاهد ما يختفي في المرحلة التالية</button></div></div>`);
    $('#dcReady').addEventListener('click',()=>{ addLedger(2,'كارلوس وفرق المرافق','تركيب وطاقة وتبريد وشبكات وصيانة واختبار','خوادم متاحة للتشغيل','عرضت المرحلة الأدوار الداعمة كأشخاص داخل شروط تشغيل الخادم.'); go('abstract3'); });
  }

  function abstract3(){ abstraction([['كارلوس','فني بنية تحتية','▥'],['التبريد','','◫'],['الكهرباء','','ϟ'],['الشبكات','','≋']],'الخوادم جاهزة للعمل','التركيب والاختبار والكهرباء والتبريد والشبكات أصبحت في لوحة التشغيل «قدرة حاسوبية متاحة».','ch4Intro'); }
  return { ch3Intro,dcInstall,dcCooling,dcCoolingOutcome,dcWorkers,abstract3 };
}

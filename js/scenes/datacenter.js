import { DATACENTER_WORKERS, supportingActor } from '../data/supporting-actors.js';
import { supportingRoleStrip } from '../components/supporting-role-strip.js';

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
    html(`<div><span class="eyebrow">مركز بيانات افتراضي</span><h1 class="scene-title">أنت الآن كارلوس، فني بنية تحتية.</h1><div class="reality-note"><strong>ما هو الخادم؟</strong> حاسوب مخصص لتشغيل أحمال وخدمات داخل بنية أكبر. في هذا السيناريو يجب تثبيته أولًا، وبعد ذلك يمكن توصيل الطاقة والشبكة بأي ترتيب، ثم تسجيله في أنظمة الإدارة.</div><div class="rack-board"><div class="server-rack">${Array.from({length:8},(_,index)=>`<div class="server-unit"><span>وحدة ${index+1}</span><span class="server-lights"><i></i><i></i><i></i></span></div>`).join('')}</div><div class="connect-panel">${steps.map(([id,label])=>{const done=state.flags.serverSteps.includes(id);const ready=canDoStep(id);return `<button class="connect-step ${done?'done':''}" data-server-step="${id}" ${done||!ready?'disabled':''}><span>${label}</span><span>${done?'✓':ready?'→':'•'}</span></button>`;}).join('')}</div></div><div id="serverStepHelp" class="small muted">ثبّت الخادم أولًا؛ بعدها الطاقة والشبكة مستقلتان، ثم يأتي التسجيل.</div>${state.flags.serverSteps.length===steps.length?'<div class="action-row"><button id="bootServer" class="primary-btn">شغّل اختبار المجموعة</button></div>':''}</div>`);
    bind('[data-server-step]','click',event=>{const id=event.currentTarget.dataset.serverStep;if(!canDoStep(id)){tone(170,.06,'square');return;}state.flags.serverSteps.push(id);saveState();dcInstall();});
    $('#bootServer')?.addEventListener('click',()=>go('dcCooling'));
  }

  function dcCooling() {
    html(`<div><span class="eyebrow">إنذار التبريد أثناء الاختبار</span><h1 class="scene-title">وحدة التبريد رقم 3 لا تستجيب.</h1>${supportingRoleStrip(['coolingTech'],'من يدخل مع كارلوس الآن؟')}<p class="scene-subtitle">أوقف تشغيل المجموعة المتأثرة أولًا، ثم اختر هل تنقل مهام الاختبار إلى سعة سليمة أم توقف الاختبار حتى يعمل فريق التبريد. في الحالتين لن تعتبر المجموعة الأصلية جاهزة قبل الإصلاح والتحقق وإعادة الاختبار.</p><div class="reality-note"><strong>أرقام حمل السيناريو</strong> القاعة البديلة تعمل عند 68%. إذا نقلت إليها الاختبار سيرتفع الحمل إلى 82% ويبقى هامش 18%.</div><div class="monitor"><div class="monitor-tile"><span>حرارة المنطقة المتأثرة</span><strong class="numeric-value" dir="auto">33° م ↑</strong><div class="bar"><i class="meter-fill meter-fill--danger" style="width:88%"></i></div></div>${monitorTile('الحمل الحالي في القاعة البديلة','68%',68)}${monitorTile('هامش القاعة البديلة الآن','32%',32)}${monitorTile('الشبكة','مستقرة',70)}</div><div class="choice-grid"><button id="dcMove" class="choice-btn"><strong>اعزل المجموعة وانقل مهام الاختبار</strong><small>يحافظ على سير الاختبار على سعة سليمة، لكن إصلاح الأصل يبقى مطلوبًا.</small></button><button id="dcStop" class="choice-btn"><strong>أوقف الاختبار وانتظر فريق التبريد</strong><small>يؤخر التجهيز؛ بعد القرار ستنفذ الإصلاح والتحقق وإعادة الاختبار صراحة.</small></button></div></div>`);
    $('#dcMove').addEventListener('click',()=>{state.flags.dcCoolingChoice='move';state.flags.dcCoolingRestored=false;addDecision('dc-move','عزلت المجموعة ونقلت مهام الاختبار','توقفت الأجهزة المتأثرة واستمرت مهام الاختبار في القاعة البديلة؛ بقي إصلاح المجموعة الأصلية مطلوبًا.');saveState();go('dcCoolingOutcome');});
    $('#dcStop').addEventListener('click',()=>{state.flags.dcCoolingChoice='stop';state.flags.dcCoolingRestored=false;addDecision('dc-stop','أوقفت الاختبار حتى إصلاح التبريد','توقف الاختبار؛ القرار لم يصلح العطل، وبقي تنفيذ الإصلاح والتحقق وإعادة الاختبار مطلوبًا.');saveState();go('dcCoolingOutcome');});
  }

  function dcCoolingOutcome() {
    const moved=state.flags.dcCoolingChoice==='move';
    if(!state.flags.dcCoolingRestored){
      html(`<div><span class="eyebrow">القرار لا يساوي الإصلاح</span><h1 class="scene-title">${moved?'انتقلت مهام الاختبار، لكن المجموعة المتأثرة ما زالت معزولة.':'توقف الاختبار، لكن وحدة التبريد ما زالت تحتاج إلى إصلاح.'}</h1>${supportingRoleStrip(['coolingTech'],'من ينفذ الإصلاح؟')}<div class="dual-view"><div class="view-panel"><h3>المجموعة المتأثرة</h3><div class="view-list"><span>متوقفة ومعزولة</span><span>وحدة التبريد لم تُصلح بعد</span><span>لا تُحسب قدرة جاهزة</span></div></div><div class="view-panel"><h3>${moved?'القاعة البديلة':'الاختبار'}</h3><div class="view-list"><span>${moved?'الحمل بعد النقل: 82%':'متوقف أثناء الإصلاح'}</span><span>${moved?'الهامش المتبقي: 18%':'سيستأنف بعد التحقق'}</span></div></div></div><div class="reality-note"><strong>العمل المطلوب الآن</strong> إصلاح وحدة التبريد، التحقق من عودة الحرارة إلى النطاق، ثم إعادة اختبار المجموعة نفسها.</div><div class="action-row"><button id="repairCooling" class="primary-btn">أصلح التبريد وتحقق ثم أعد الاختبار</button></div></div>`);
      $('#repairCooling').addEventListener('click',()=>{state.flags.dcCoolingRestored=true;addDecision('dc-cooling-close','أغلقت عطل التبريد بعد إصلاح واختبار صريح','أصلح فريق التبريد السبب، تحقق من الحرارة، ثم أعاد اختبار المجموعة قبل إعادتها للخدمة.');saveState();dcCoolingOutcome();});
      return;
    }
    html(`<div><span class="eyebrow">إغلاق عطل التبريد</span><h1 class="scene-title">أُصلحت وحدة التبريد ثم اجتازت المجموعة إعادة الاختبار.</h1>${supportingRoleStrip(['coolingTech'],'من أغلق العطل؟')}<div class="dual-view"><div class="view-panel"><h3>المجموعة المتأثرة</h3><div class="view-list"><span>عادت الحرارة إلى 24° م</span><span>اجتازت إعادة الاختبار</span><span>يمكن إعادتها إلى الخدمة</span></div></div><div class="view-panel"><h3>${moved?'مسار الاختبار البديل':'مهام الاختبار'}</h3><div class="view-list"><span>${moved?'حافظ على استمرار العمل أثناء الإصلاح':'توقفت أثناء الإصلاح ثم استؤنفت'}</span><span>لم يُستخدم بديلًا عن إصلاح الأصل</span></div></div></div><div class="action-row"><button id="dcAfterCooling" class="primary-btn">تابع إلى فرق التشغيل</button></div></div>`);
    $('#dcAfterCooling').addEventListener('click',()=>go('dcWorkers'));
  }

  function dcWorkers() {
    if(!state.flags.dcCoolingRestored){go('dcCoolingOutcome');return;}
    const cards=DATACENTER_WORKERS.map(({id,actorId,icon})=>{const actor=supportingActor(actorId);return `<article class="worker-person revealed worker-person--${ctx.h(id)}"><div class="worker-person__visual"><img class="worker-person__avatar person-icon" src="${ctx.h(actor.image)}" alt="" aria-hidden="true"><span class="worker-role-badge" aria-hidden="true">${ctx.h(icon)}</span></div><strong>${ctx.h(actor.name)}</strong><small>${ctx.h(actor.role)}</small></article>`;}).join('');
    html(`<div><span class="eyebrow">العمل المحيط بالخادم</span><h1 class="scene-title">«الخادم الجاهز» يخفي فريقًا كاملًا.</h1><p class="scene-subtitle">التبريد والكهرباء والكابلات والنظافة والأمن والشبكات أعمال بشرية لازمة للتشغيل.</p><div class="worker-map">${cards}</div><div class="stage-output"><strong>ناتج المرحلة</strong>خوادم اجتازت التركيب والاختبار، وأُغلق عطل التبريد قبل احتساب المجموعة المتأثرة قدرة متاحة.</div><div class="action-row"><button id="dcReady" class="primary-btn">شاهد كيف يختصر النظام هذا العمل</button></div></div>`);
    $('#dcReady').addEventListener('click',()=>{addLedger(2,'كارلوس وفرق المرافق','تركيب وطاقة وتبريد وشبكات وصيانة واختبار','خوادم متاحة للتشغيل','لم تُحسب المجموعة المتأثرة جاهزة حتى أُصلح التبريد واجتازت إعادة الاختبار.');go('abstract3');});
  }

  function abstract3(){abstraction([['كارلوس','فني بنية تحتية','▥'],['التبريد','','◫'],['الكهرباء','','ϟ'],['الشبكات','','≋']],'الخوادم جاهزة للعمل','يختصر النظام التركيب والاختبار والكهرباء والتبريد والشبكات في حالة «قدرة حاسوبية متاحة» بعد إغلاق العطل.','ch4Intro');}
  return {ch3Intro,dcInstall,dcCooling,dcCoolingOutcome,dcWorkers,abstract3};
}
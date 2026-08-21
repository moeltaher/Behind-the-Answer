import { EVAL_TASKS } from '../data/game-data.js';
export function createEvaluationRoutes(ctx){
  const $=ctx.$, $$=ctx.$$, state=ctx.state, settings=ctx.settings;
  const {setChapter,chapterIntro,html,go,bind,tone,saveState,mutateMetrics,addDecision,addLedger,renderLedger,resetGame}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);
  const monitorTile=ctx.monitorTile, metric=ctx.metric;
  const ledgerDialog=ctx.ledgerDialog;
  function ch7Intro(){ chapterIntro(6,'التقييم والسلامة','البشر لا يظهرون فقط قبل التدريب. بعده أيضًا يقارنون المخرجات ويقيّمون اللغة والسلوك ويختبرون الحدود.','evalTask'); }

  function evalTask(){
    setChapter(6);
    const i=state.flags.evalIndex;
    if(i>=EVAL_TASKS.length){go('safetyTest');return;}
    const t=EVAL_TASKS[i];
    html(`
      <div><span class="eyebrow">ريم — AI Evaluator</span><h1 class="scene-title">قارن الإجابتين.</h1><div class="card flat"><strong>الطلب</strong><p>${t.prompt}</p></div>
      <div class="compare-card"><div class="response-card"><h4>الإجابة A</h4><p>${t.a}</p></div><div class="response-card"><h4>الإجابة B</h4><p>${t.b}</p></div></div>
      <div class="choice-grid"><button class="choice-btn" data-eval="a"><strong>A أفضل</strong></button><button class="choice-btn" data-eval="b"><strong>B أفضل</strong></button><button class="choice-btn" data-eval="tie"><strong>متقاربتان</strong></button><button class="choice-btn" data-eval="bad"><strong>كلتاهما سيئة</strong></button></div></div>`);
    bind('[data-eval]','click',(e)=>{const c=e.currentTarget.dataset.eval;if(c===t.good) mutateMetrics({quality:2,visibility:1}); else mutateMetrics({quality:-1}); state.flags.evalIndex++;saveState();evalTask();});
  }

  function safetyTest(){
    html(`
      <div><span class="eyebrow">Safety evaluator</span><h1 class="scene-title">اختبر حدود النموذج.</h1><div class="alert"><strong>تنبيه</strong><span>لا تتضمن اللعبة تعليمات فعلية لإحداث ضرر. الطلب والرد مختصران عمدًا.</span></div>
      <div class="card"><span class="kicker">طلب افتراضي خطر</span><p>«[طلب محجوب يتضمن محاولة الحصول على إرشادات ضارة]»</p><div class="message ai">«لا أستطيع المساعدة في تنفيذ الضرر، لكن إليك تفاصيل تشغيلية أكثر مما ينبغي...»</div></div>
      <p class="kicker" style="margin-top:20px">حدد المشكلة</p><div class="choice-grid"><button class="choice-btn safety-choice"><strong>أعطى تفاصيل أكثر من اللازم</strong></button><button class="choice-btn safety-choice"><strong>كان الرفض شديدًا فقط</strong></button><button class="choice-btn safety-choice"><strong>لا توجد مشكلة</strong></button></div></div>`);
    $$('.safety-choice').forEach((b,i)=>b.addEventListener('click',()=>{if(i===0) mutateMetrics({quality:4,visibility:2});else mutateMetrics({quality:-2});go('launchDecision');}));
  }

  function launchDecision(){
    html(`
      <div><span class="eyebrow">موعد الإصدار</span><h1 class="scene-title">الإطلاق غدًا. بقي 14 اختبارًا.</h1><p class="scene-subtitle">الوقت التجاري أصبح قيدًا مباشرًا على عمل السلامة.</p>
      <div class="choice-grid"><button id="criticalOnly" class="choice-btn"><strong>أكمل الاختبارات الحرجة فقط</strong><small>يحافظ على الموعد مع بقاء جزء من الاختبارات دون إكمال.</small></button><button id="delayLaunch" class="choice-btn"><strong>أجّل الإطلاق</strong><small>يكلف وقتًا ومالًا إضافيين لإكمال المجموعة.</small></button></div></div>`);
    $('#criticalOnly').addEventListener('click',()=>{addDecision('launch-fast','أطلقت النموذج بعد الاختبارات الحرجة فقط','حافظت على الموعد بينما بقيت مساحة اختبار غير مكتملة.',{pressure:7,cost:-5,burden:5,quality:-6,visibility:1});finishEval();});
    $('#delayLaunch').addEventListener('click',()=>{addDecision('launch-delay','أجلت الإطلاق لإكمال الاختبارات','انتقلت تكلفة الاختبارات إلى الشركة والجدول بدل تركها كمخاطرة غير مختبرة.',{pressure:-6,cost:8,burden:-2,quality:8,visibility:3});finishEval();});
  }

  function finishEval(){ addLedger(6,'ريم ومقيّمون ومختبرو سلامة','مقارنة مخرجات، تقييم لغوي، اختبار حدود النموذج وقرارات إطلاق','HUMAN FEEDBACK','تتحول اختيارات بشرية متعددة إلى مؤشرات مثل preference وsafety وalignment.'); go('abstract7'); }

  function abstract7(){ abstraction([['ريم','مقيّمة بشرية','◎'],['مختبرو السلامة','','🛡'],['مراجعو اللغة','','文']], 'HUMAN FEEDBACK','الاختيارات والتقييمات تدخل النظام؛ أسماء العاملين لا تظهر للمستخدم النهائي.','ch8Intro'); }

  return {ch7Intro,evalTask,safetyTest,launchDecision,abstract7};
}

import { EVAL_TASKS } from '../data/content-tasks.js';

export function createEvaluationRoutes(ctx) {
  const $ = ctx.$;
  const $$ = ctx.$$;
  const state = ctx.state;
  const { chapterIntro, html, go, bind, saveState, mutateMetrics, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) => ctx.abstraction(humans, word, line, next);

  function ch7Intro() { chapterIntro(6, 'evalTask'); }

  function evalTask() {
    const index=state.flags.evalIndex;
    if(index>=EVAL_TASKS.length){ go('safetyTest'); return; }
    const task=EVAL_TASKS[index];
    const sourceContext=index===2?'<div class="card flat"><strong>النص الأصلي الافتراضي</strong><p>«يجوز تقديم الطلب خلال ثلاثين يومًا من تاريخ الإخطار، ويُستثنى من ذلك من يثبت تعذر وصول الإخطار إليه خلال هذه المدة.»</p></div>':'';
    if(state.flags.evalFeedback){ const feedback=state.flags.evalFeedback; html(`<div><span class="eyebrow">ريم — مقيّمة لإجابات النموذج</span><h1 class="scene-title">راجع سبب التقييم.</h1>${sourceContext}<div class="alert ${feedback.correct?'goodish':'dangerish'}"><strong>${feedback.correct?'اختيارك يطابق معيار المهمة':'اختيارك لا يطابق معيار المهمة'}</strong><span>${ctx.h(task.explanation)}</span></div><div class="action-row"><button id="nextEval" class="primary-btn">المهمة التالية</button></div></div>`); $('#nextEval').addEventListener('click',()=>{ state.flags.evalFeedback=null; state.flags.evalIndex+=1; saveState(); evalTask(); }); return; }
    html(`<div><span class="eyebrow">ريم — مقيّمة لإجابات النموذج</span><h1 class="scene-title">قارن الإجابتين وفق الطلب.</h1><div class="reality-note"><strong>ما الذي نقيسه هنا؟</strong> ملاءمة الإجابة للطلب واللغة والسياق، لا السلامة أو موثوقية البنية.</div>${sourceContext}<div class="card flat"><strong>الطلب</strong><p>${ctx.h(task.prompt)}</p></div><div class="compare-card"><div class="response-card"><h4>الإجابة أ</h4><p>${ctx.h(task.a)}</p></div><div class="response-card"><h4>الإجابة ب</h4><p>${ctx.h(task.b)}</p></div></div><div class="choice-grid"><button class="choice-btn" data-eval="a"><strong>الإجابة أ أفضل</strong></button><button class="choice-btn" data-eval="b"><strong>الإجابة ب أفضل</strong></button><button class="choice-btn" data-eval="tie"><strong>متقاربتان</strong></button><button class="choice-btn" data-eval="bad"><strong>كلتاهما سيئة</strong></button></div></div>`);
    bind('[data-eval]','click',event=>{ const choice=event.currentTarget.dataset.eval; const correct=choice===task.good; mutateMetrics(correct?{modelQuality:2}:{modelQuality:-2}); state.flags.evalFeedback={choice,correct}; saveState(); evalTask(); });
  }

  function safetyTest() {
    html(`<div><span class="eyebrow">اختبار السلامة</span><h1 class="scene-title">اختبر حدود النموذج.</h1><p class="scene-subtitle">هذا اختبار مستقل عن جودة اللغة. المطلوب اكتشاف ما إذا كان الرد يكشف مادة خطرة رغم صيغة الرفض.</p><div class="alert"><strong>تنبيه</strong><span>لا تتضمن اللعبة تعليمات فعلية لإحداث ضرر.</span></div><div class="card"><span class="kicker">طلب افتراضي خطر</span><p>«[طلب محجوب يتضمن محاولة الحصول على إرشادات ضارة]»</p><div class="message ai">«لا أستطيع المساعدة في تنفيذ الضرر، لكن إليك تفاصيل تشغيلية أكثر مما ينبغي...»</div></div><div class="choice-grid"><button class="choice-btn safety-choice" data-safety="details"><strong>أعطى تفاصيل أكثر من اللازم</strong></button><button class="choice-btn safety-choice" data-safety="strict"><strong>كان الرفض شديدًا فقط</strong></button><button class="choice-btn safety-choice" data-safety="none"><strong>لا توجد مشكلة</strong></button></div></div>`);
    $$('.safety-choice').forEach(button=>button.addEventListener('click',()=>{ state.flags.safetyChoice=button.dataset.safety; saveState(); go('safetyOutcome'); }));
  }

  function safetyOutcome() {
    const correct=state.flags.safetyChoice==='details';
    html(`<div><span class="eyebrow">نتيجة اختبار السلامة</span><h1 class="scene-title">${correct?'التقطت مشكلة السلامة الأساسية.':'فاتتك مشكلة السلامة الأساسية.'}</h1><div class="alert ${correct?'goodish':'dangerish'}"><strong>سبب التقييم</strong><span>الرد بدأ بالرفض، لكنه أعطى تفاصيل تشغيلية أكثر مما ينبغي. تسجل اللعبة هذه النتيجة كتغطية سلامة مستقلة، ولا تجعلها تحسن جودة اللغة.</span></div><div class="action-row"><button id="toLaunch" class="primary-btn">انتقل إلى قرار الإطلاق</button></div></div>`);
    $('#toLaunch').addEventListener('click',()=>go('launchDecision'));
  }

  function launchDecision() {
    html(`<div><span class="eyebrow">موعد الإصدار</span><h1 class="scene-title">الإطلاق غدًا. بقي 14 اختبارًا.</h1><p class="scene-subtitle">هذا قرار جاهزية وموثوقية، لا قرارًا يحسن لغة النموذج بمجرد التأجيل.</p><div class="choice-grid"><button id="criticalOnly" class="choice-btn"><strong>أكمل الاختبارات الحرجة فقط</strong><small>يحافظ على الموعد مع بقاء جزء من التحقق غير مكتمل.</small></button><button id="delayLaunch" class="choice-btn"><strong>أجّل الإطلاق</strong><small>يكلف وقتًا ومالًا إضافيين لإكمال المجموعة.</small></button></div></div>`);
    $('#criticalOnly').addEventListener('click',()=>{ state.flags.launchChoice='fast'; addDecision('launch-fast','أطلقت بعد الاختبارات الحرجة فقط','حافظت على الموعد بينما بقي جزء من التحقق غير مكتمل.',{pressure:7,cost:-5,burden:5,reliability:-6}); saveState(); go('launchOutcome'); });
    $('#delayLaunch').addEventListener('click',()=>{ state.flags.launchChoice='delay'; addDecision('launch-delay','أجلت الإطلاق لإكمال الاختبارات','انتقلت تكلفة الاختبارات إلى الشركة والجدول بدل تركها كمخاطرة غير مختبرة.',{pressure:-6,cost:8,burden:-2,reliability:8}); saveState(); go('launchOutcome'); });
  }

  function launchOutcome() {
    const delayed=state.flags.launchChoice==='delay';
    html(`<div><span class="eyebrow">نتيجة قرار الإطلاق</span><h1 class="scene-title">${delayed?'تأجل الإطلاق حتى اكتملت مجموعة الاختبارات.':'تم الإطلاق في الموعد بعد الاختبارات الحرجة.'}</h1><div class="stage-output"><strong>${delayed?'تكلفة القرار':'المخاطرة المتبقية'}</strong>${delayed?'دفعت الشركة تكلفة وقت وحوسبة وعمل إضافي، وازدادت تغطية التحقق.':'دخل المنتج التشغيل مع تحقق أقل اكتمالًا، فزادت أهمية المراقبة بعد الإطلاق.'}</div><div class="action-row"><button id="finishEval" class="primary-btn">انتقل إلى تشغيل الخدمة</button></div></div>`);
    $('#finishEval').addEventListener('click',finishEval);
  }

  function finishEval(){ addLedger(6,'ريم ومقيّمون ومختبرو سلامة','مقارنة مخرجات، تقييم ملاءمة، اختبار سلامة وقرار إطلاق','تقييمات وملاحظات بشرية','تفصل اللعبة بين ملاءمة المخرجات والسلامة وجاهزية الإطلاق بدل دمجها في درجة واحدة.'); go('abstract7'); }
  function abstract7(){ abstraction([['ريم','مقيّمة بشرية','◎'],['مختبرو السلامة','','🛡'],['مراجعو اللغة','','文']],'تقييمات بشرية للنموذج','قراءة ومقارنة واختبار وحكم بشري أصبحت ملاحظات تستخدم في التطوير وقرار الإطلاق.','ch8Intro'); }
  return { ch7Intro,evalTask,safetyTest,safetyOutcome,launchDecision,launchOutcome,abstract7 };
}

import { PEOPLE } from '../data/game-data.js';
export function createEndingRoutes(ctx){
  const h=ctx.h;
  const $=ctx.$, $$=ctx.$$, state=ctx.state, settings=ctx.settings;
  const {setChapter,chapterIntro,html,go,bind,tone,saveState,mutateMetrics,addDecision,addLedger,renderLedger,resetGame}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);
  const monitorTile=ctx.monitorTile, metric=ctx.metric;
  const ledgerDialog=ctx.ledgerDialog;
  function ch9Intro(){ chapterIntro(8,'الاستخدام','الآن فقط نعود إلى اللحظة التي بدأ منها المستخدم: كتابة Prompt والحصول على إجابة.','pipelineAssemble'); }

  function pipelineAssemble(){
    setChapter(8);
    html(`
      <div class="centered"><span class="eyebrow">تجميع السلسلة</span><h1 class="scene-title">ما بنيناه حتى الآن</h1><div class="pipeline">
        ${['MINERALS','HARDWARE','COMPUTE','DATA','LABELS','MODEL','HUMAN FEEDBACK','DEPLOYMENT'].map((x,i)=>`<div class="pipeline-step">${x}</div>${i<7?'<div class="pipeline-arrow">↓</div>':''}`).join('')}
      </div><p class="scene-subtitle">عندما تضغط Generate، لا يعاد التعدين والتصنيع والتدريب من جديد. أنت تستخدم بنية ونموذجًا بُنيا سابقًا، بينما تحدث الحوسبة والتشغيل عند الطلب.</p><div class="action-row center"><button id="compressAI" class="primary-btn">اضغط السلسلة إلى ما يراه المستخدم</button></div></div>`);
    $('#compressAI').addEventListener('click',()=>go('aiAbstraction'));
  }

  function aiAbstraction(){
    html(`
      <div class="abstraction-stage"><div><div class="people-wall fade-humans" id="allPeople">${PEOPLE.map(p=>`<div class="person-card"><span class="big-icon">${p[2]}</span><strong>${p[0]}</strong><small>${p[1]}</small></div>`).join('')}</div><div class="abstract-word filled">AI</div><p class="muted">تتجمع كلمات كثيرة وعلاقات عمل مختلفة داخل اسم منتج واحد.</p><div class="action-row center"><button id="backPrompt" class="primary-btn">ارجع إلى طلبك</button></div></div></div>`);
    setTimeout(()=>$('#allPeople')?.classList.add('faded'),settings.reduceMotion?20:900);
    $('#backPrompt').addEventListener('click',()=>go('finalAnswer'));
  }

  function finalAnswer(){
    html(`
      <div class="chat-shell"><div class="chat-logo">L</div><div class="message user">اكتب لي رسالة قصيرة أعتذر فيها لمديري عن التأخر في تسليم العمل.</div><div class="message ai"><strong>الإجابة:</strong><br>أعتذر عن التأخر في تسليم العمل. واجهت ظرفًا أدى إلى تأخير الإنجاز، وأعمل حاليًا على استكماله في أقرب وقت. أشكرك على تفهمك.</div><div class="small muted" style="direction:ltr;text-align:left">Generated in 1.2 seconds <span style="direction:rtl">— زمن افتراضي داخل اللعبة</span></div><div class="action-row"><button id="behindAnswer" class="primary-btn">ما الذي استغرق 1.2 ثانية فعلًا؟</button></div></div>`);
    $('#behindAnswer').addEventListener('click',()=>go('timelineReveal'));
  }

  function timelineReveal(){
    html(`
      <div><span class="eyebrow">افتح الإجابة</span><h1 class="display-title">1.2 ثانية ≠ بداية الرحلة</h1><p class="scene-subtitle">هذا الزمن يمثل طلبًا افتراضيًا في نهاية السلسلة. قبله توجد أعمال وبنى جرى بناؤها خلال فترات مختلفة.</p>
      <div class="dual-view"><div class="view-panel"><h3>قبل استخدامك للنموذج</h3><div class="view-list"><span>معادن</span><span>تصنيع</span><span>مراكز بيانات</span><span>بيانات</span><span>تدريب</span><span>تقييم</span><span>إطلاق</span></div></div><div class="view-panel"><h3>عندما ضغطت Generate</h3><div class="view-list"><span>طلبك</span><span>خدمة النموذج</span><span>حوسبة</span><span>شبكات</span><span>إجابة</span></div></div></div>
      <div class="alert goodish"><strong>الرحلتان مترابطتان، لكنهما ليستا الشيء نفسه.</strong><span>هذا الفصل ضروري حتى لا توحي اللعبة بأن كل Prompt يعيد تشغيل كامل سلسلة الإمداد من البداية.</span></div>
      <div class="action-row"><button id="showPeople" class="primary-btn">أعد البشر إلى الصورة</button></div></div>`);
    $('#showPeople').addEventListener('click',()=>go('peopleReveal'));
  }

  function peopleReveal(){
    html(`
      <div class="centered"><span class="eyebrow">ما أخفته الكلمات التقنية</span><h1 class="scene-title">هذه الشخصيات لم تنتج إجابتك كلمةً كلمة.</h1><p class="scene-subtitle">لكن العمل الذي تمثله ساهم في بناء وتشغيل البنية التي جعلت إنتاج الإجابة ممكنًا.</p><div class="people-wall">${PEOPLE.map(p=>`<div class="person-card"><span class="big-icon">${p[2]}</span><strong>${p[0]}</strong><small>${p[1]}</small></div>`).join('')}</div><div class="action-row center"><button id="showResults" class="primary-btn">افتح دفتر سلسلتك</button></div></div>`);
    $('#showResults').addEventListener('click',()=>go('results'));
  }

  function metricLabel(v, inverse=false){
    const val=inverse?100-v:v;
    if(val>=68)return 'مرتفع'; if(val>=38)return 'متوسط'; return 'منخفض';
  }

  function endingType(){
    const m=state.metrics;
    if(m.pressure>=64 && m.cost<=48) return 'fast';
    if(m.quality>=72 && m.cost>=56) return 'careful';
    if(m.visibility<=30) return 'invisible';
    return 'mixed';
  }

  function endingCopy(type){
    return {
      fast:['سلسلة سريعة','وصلت إلى المنتج بسرعة نسبيًا، بينما انتقل جزء أكبر من تكلفة السرعة إلى العمال والجودة والاختبارات.'],
      careful:['سلسلة حذرة','دفعت تكلفة أعلى وتأخيرًا أكبر في بعض المراحل، بينما عولجت مخاطر أكثر قبل انتقالها إلى المرحلة التالية.'],
      invisible:['سلسلة قليلة الظهور','وصلت إلى النهاية بينما ظل جزء كبير من العمل خارج الشاشة أو خارج دفتر السلسلة.'],
      mixed:['سلسلة مختلطة','لم يتحرك الضغط في اتجاه واحد. في مراحل تحملته الشركة، وفي مراحل أخرى انتقل إلى العامل أو إلى جودة المنتج.']
    }[type];
  }

  function results(){
    const type=endingType(); state.flags.finalEnding=type; saveState();
    const [title,copy]=endingCopy(type); const m=state.metrics;
    html(`
      <div><span class="eyebrow">ماذا حدث في سلسلتك؟</span><h1 class="display-title">${title}</h1><p class="scene-subtitle">${copy}</p>
      <div class="results-grid">
        ${metric('ضغط الإنتاج',m.pressure,metricLabel(m.pressure))}
        ${metric('تكلفة الشركة',m.cost,metricLabel(m.cost))}
        ${metric('عبء العامل',m.burden,metricLabel(m.burden))}
        ${metric('جودة الناتج',m.quality,metricLabel(m.quality))}
        ${metric('ظهور العمل البشري',m.visibility,metricLabel(m.visibility))}
      </div>
      <div class="card flat" style="margin-top:18px"><h2>قراراتك</h2><div class="decision-list">${state.decisions.map(d=>`<div class="decision-row"><strong>${h(d.label)}</strong><div class="small muted">${h(d.effectText)}</div></div>`).join('')||'<p class="muted">لم تسجل قرارات بعد.</p>'}</div></div>
      <div class="alert"><strong>العديد من القرارات لم يكن لها حل بلا تكلفة.</strong><span>الحصة والعقد والوقت التجاري وأنظمة التقييم تحدد مساحة الاختيار قبل أن يتخذ الفرد قراره.</span></div>
      <div class="action-row"><button id="resultsLedger" class="secondary-btn">عرض دفتر السلسلة</button><button id="toFinalMessage" class="primary-btn">إلى الخاتمة</button></div></div>`);
    $('#resultsLedger').addEventListener('click',()=>{renderLedger();ledgerDialog.showModal();});
    $('#toFinalMessage').addEventListener('click',()=>go('finalMessage'));
  }

  function finalMessage(){
    addLedger(8,'المستخدم','كتابة الطلب وقراءة النتيجة','AI OUTPUT','الواجهة هي نهاية السلسلة، وليست بدايتها.');
    html(`
      <div class="centered"><span class="eyebrow">نهاية الرحلة</span><h1 class="display-title">الواجهة هي نهاية السلسلة، وليست بدايتها.</h1><p class="scene-subtitle">الإجابة تظهر في لحظة. السلسلة التي تجعلها ممكنة لا تظهر معها.</p>
      <div class="dual-view" style="width:100%;max-width:900px"><div class="view-panel"><h3>ما يراه المستخدم</h3><div class="view-list"><span>AI</span><span>Model</span><span>Cloud</span><span>Data</span><span>Generate</span><span>Instant</span></div></div><div class="view-panel"><h3>ما تتكون منه السلسلة</h3><div class="view-list"><span>عمال</span><span>مهندسون</span><span>مقاولون</span><span>مصانع</span><span>مراكز بيانات</span><span>مؤلفون</span><span>مراجعون</span><span>طاقة</span><span>وقت</span></div></div></div>
      <p class="sources-note">الشخصيات والشركات والأرقام داخل اللعبة خيالية ومركبة. الغرض هو تمثيل أنواع من العمل والحوافز والمخاطر، لا الادعاء بأن كل نموذج يعتمد على المورد نفسه أو أن كل طلب يمر لحظيًا بكل المراحل.</p>
      <div class="action-row center"><button id="replay" class="secondary-btn">ابدأ الرحلة مرة أخرى</button><button id="method" class="primary-btn">المنهجية وكيف تعمل اللعبة</button></div></div>`);
    $('#replay').addEventListener('click',()=>resetGame(true));
    $('#method').addEventListener('click',()=>go('methodology'));
  }

  function methodology(){
    html(`
      <div><span class="eyebrow">عن اللعبة</span><h1 class="scene-title">المنهجية والدقة التقنية</h1>
      <div class="card flat"><h2>ما الذي تمثله اللعبة؟</h2><p>«خلف الإجابة» تجربة تعليمية مبسطة حول سلسلة الإمداد والعمل المرتبط بأنظمة الذكاء الاصطناعي. الشخصيات والشركات والأرقام خيالية، وصُممت المواقف لتمثيل أنواع من العمل والحوافز الموجودة في سلاسل تقنية حقيقية.</p><p>لا تدعي اللعبة أن جميع النماذج تعتمد على الموردين أو الممارسات نفسها، أو أن كل طلب يعيد تشغيل التعدين والتصنيع والتدريب. تفصل اللعبة بين بناء النظام سابقًا وبين الاستدلال والتشغيل عند استخدامه.</p></div>
      <div class="card flat" style="margin-top:14px"><h2>كيف تحفظ اللعبة بياناتك؟</h2><p>لا يوجد Backend ولا قاعدة بيانات ولا حساب مستخدم. تحفظ اللعبة التقدم والإعدادات داخل <strong>localStorage</strong> في متصفحك فقط، ويمكن مسحه من إعدادات اللعبة أو من المتصفح.</p></div>
      <div class="card flat" style="margin-top:14px"><h2>ما الذي لا ينبغي استنتاجه؟</h2><p>لا يعني وجود مرحلة في اللعبة أن كل شركة أو نموذج يستخدم الموقع أو المعدن أو نمط العمل نفسه. كما لا تقول اللعبة إن الذكاء الاصطناعي «مجرد عمل بشري»؛ بل تبرز أن الأنظمة التقنية تعتمد على بنية مادية وعمل بشري موزع إلى جانب البرمجيات والنماذج.</p></div>
      <div class="action-row"><button id="methodHome" class="primary-btn">العودة إلى النهاية</button></div></div>`);
    $('#methodHome').addEventListener('click',()=>go('finalMessage'));
  }

  return {ch9Intro,pipelineAssemble,aiAbstraction,finalAnswer,timelineReveal,peopleReveal,results,finalMessage,methodology};
}

export function createTrainingRoutes(ctx){
  const $=ctx.$, $$=ctx.$$, state=ctx.state, settings=ctx.settings;
  const {setChapter,chapterIntro,html,go,bind,tone,saveState,mutateMetrics,addDecision,addLedger,renderLedger,resetGame}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);
  const monitorTile=ctx.monitorTile, metric=ctx.metric;
  const ledgerDialog=ctx.ledgerDialog;
  function ch6Intro(){ chapterIntro(5,'التدريب','الآن فقط نصل إلى الجزء الذي يتخيله كثيرون عندما يسمعون «ذكاء اصطناعي»: بيانات وحوسبة وكود وتجارب هندسية.','trainingSetup'); }

  function trainingSetup(){
    setChapter(5);
    html(`
      <div><span class="eyebrow">Lumina AI — Training Lab</span><h1 class="scene-title">أنت الآن ديفيد، مهندس تعلم آلي.</h1>
      <div class="training-board"><div class="config-panel"><div class="form-row"><label>Dataset</label><select id="datasetSel"><option>v18 — prepared</option></select></div><div class="form-row"><label>Compute allocation</label><select id="computeSel"><option>12 clusters</option><option>8 clusters</option></select></div><div class="form-row"><label>Checkpoint</label><select id="checkpointSel"><option>Base-04</option><option>Base-03</option></select></div><button id="trainStart" class="primary-btn" style="width:100%">START TRAINING</button></div>
      <div class="chart-panel"><span class="kicker">Training preview</span><div class="training-graph"><div class="training-line"><svg viewBox="0 0 400 200" preserveAspectRatio="none"><polyline fill="none" stroke="rgba(104,225,193,.9)" stroke-width="4" points="0,30 40,55 80,70 120,92 160,110 200,126 240,138 280,149 320,158 360,166 400,172"/></svg></div></div><div class="training-log">ready&gt; dataset v18
ready&gt; compute available
ready&gt; checkpoint Base-04</div></div></div></div>`);
    $('#trainStart').addEventListener('click',()=>{state.flags.trainingConfigured=true;saveState();go('trainingRun');});
  }

  function trainingRun(){
    html(`
      <div><span class="eyebrow">Training run</span><h1 class="scene-title">التدريب بدأ.</h1>
      <div class="chart-panel"><div class="hud-grid"><div class="hud-item"><span>Progress</span><strong>35%</strong></div><div class="hud-item"><span>Loss</span><strong>↓</strong></div><div class="hud-item"><span>Compute</span><strong>11/12</strong></div></div>
      <div class="training-graph"><div class="training-line"><svg viewBox="0 0 400 200" preserveAspectRatio="none"><polyline fill="none" stroke="rgba(124,164,255,.95)" stroke-width="4" points="0,25 50,60 100,83 150,112 200,125 245,138 270,100 295,145 350,157 400,166"/></svg></div></div>
      <div class="alert dangerish"><strong>Compute node unavailable</strong><span>يمكن إيقاف الجولة وتشخيص المشكلة أو الاستمرار بقدرة أقل.</span></div></div>
      <div class="choice-grid"><button id="trainPause" class="choice-btn"><strong>Pause and investigate</strong><small>تأخير أعلى مع تشخيص أوضح.</small></button><button id="trainContinue" class="choice-btn"><strong>Continue reduced</strong><small>استمرار أبطأ مع ضغط أعلى على الموارد المتبقية.</small></button></div></div>`);
    $('#trainPause').addEventListener('click',()=>{addDecision('train-pause','أوقفت جولة التدريب لتشخيص عطل','تحملت تكلفة تأخير بدل الاستمرار بحالة غير مستقرة.',{pressure:-3,cost:5,burden:-2,quality:5,visibility:2});go('trainingEval');});
    $('#trainContinue').addEventListener('click',()=>{addDecision('train-continue','واصلت التدريب بقدرة أقل','حافظت على الجولة لكنها أصبحت أبطأ وارتفع الضغط على البنية.',{pressure:4,cost:-1,burden:3,quality:-2,visibility:1});go('trainingEval');});
  }

  function trainingEval(){
    addLedger(5,'ديفيد وفرق التدريب','إعداد وتشغيل ومراقبة جولات التدريب وحل أعطال الحوسبة','MODEL','التدريب لا يلغي الحاجة إلى تقييم بشري لاحق لجودة وسلوك النموذج.');
    html(`
      <div><span class="eyebrow">Evaluation</span><h1 class="scene-title">انتهى التدريب. النموذج ليس جاهزًا بعد.</h1>
      <div class="card"><div class="message ai">س: ما عاصمة فرنسا؟<br><strong>باريس.</strong></div><div class="message ai">س: اكتب رسالة رسمية.<br><strong>إجابة مقبولة.</strong></div><div class="message ai">س: رد بالمصرية على طلب بسيط.<br><strong>«أتشرف بإحاطة سيادتكم علمًا...»</strong></div><div class="alert"><strong>المشكلة</strong> بعض الاختبارات ناجحة، وبعضها يكشف ضعفًا في اللغة والسياق والسلوك.</div></div>
      <div class="action-row"><button id="sendHuman" class="primary-btn">أرسل للتقييم البشري</button></div></div>`);
    $('#sendHuman').addEventListener('click',()=>go('ch7Intro'));
  }

  return {ch6Intro,trainingSetup,trainingRun,trainingEval};
}

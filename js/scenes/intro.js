export function createIntroRoutes(ctx){
  const $=ctx.$, $$=ctx.$$, state=ctx.state, settings=ctx.settings;
  const h=ctx.h;
  const {setChapter,chapterIntro,html,go,bind,tone,saveState,mutateMetrics,addDecision,addLedger,renderLedger,resetGame}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);
  const monitorTile=ctx.monitorTile, metric=ctx.metric;
  const ledgerDialog=ctx.ledgerDialog;
  function intro(){
    setChapter(-1);
    html(`
      <div class="chat-shell">
        <div class="chat-logo">L</div>
        <h1 class="chat-title">كيف يمكنني مساعدتك؟</h1>
        <div class="chat-input-wrap">
          <label class="kicker" for="introPrompt">اكتب طلبك</label>
          <textarea id="introPrompt" class="prompt-input">اكتب لي رسالة قصيرة أعتذر فيها لمديري عن التأخر في تسليم العمل.</textarea>
          <div class="chat-send"><button id="introSend" class="primary-btn" type="button">إرسال ←</button></div>
        </div>
        <p class="small muted centered" style="margin:18px 0 0">هذه لعبة تعليمية. لا يتم إرسال ما تكتبه إلى أي خادم.</p>
      </div>`);
    $('#introSend').addEventListener('click', ()=>go('introLoading'));
  }

  function introLoading(){
    setChapter(-1);
    html(`
      <div class="chat-shell">
        <div class="chat-logo">L</div>
        <div class="message user">${h('اكتب لي رسالة قصيرة أعتذر فيها لمديري عن التأخر في تسليم العمل.')}</div>
        <div class="message ai"><div class="typing" aria-label="جارٍ إنشاء الإجابة"><i></i><i></i><i></i><span>جارٍ إنشاء الإجابة...</span></div></div>
      </div>`);
    setTimeout(()=>{ if(state.scene==='introLoading') go('introError'); }, settings.reduceMotion ? 250 : 1600);
  }

  function introError(){
    html(`
      <div class="chat-shell">
        <div class="chat-logo">L</div>
        <div class="message user">اكتب لي رسالة قصيرة أعتذر فيها لمديري عن التأخر في تسليم العمل.</div>
        <div class="alert dangerish">
          <strong>تعذر إنشاء الإجابة.</strong>
          <span>هناك أشياء لم تُبنَ بعد.</span>
        </div>
        <div class="action-row stretch">
          <button id="retry" class="secondary-btn" type="button">إعادة المحاولة</button>
          <button id="why" class="primary-btn" type="button">اعرف لماذا</button>
        </div>
      </div>`);
    $('#retry').addEventListener('click',()=>{
      $('#retry').disabled=true;
      $('#retry').textContent='ما زالت البنية غير موجودة';
      tone(180,.1,'square');
    });
    $('#why').addEventListener('click',()=>go('zoomOut'));
  }

  function zoomOut(){
    html(`
      <div class="centered">
        <span class="eyebrow">لنبدأ من المكان الذي لا يظهر في مربع المحادثة</span>
        <h1 class="scene-title">الإجابة هي آخر نقطة في سلسلة أطول.</h1>
        <div class="transition-map" aria-label="انتقال بصري من واجهة الذكاء الاصطناعي إلى موقع التعدين">
          <div class="map-layer"><span class="glyph">💬</span></div>
          <div class="map-caption"><span>واجهة المحادثة</span><span>↓ البنية التي تقف خلفها</span></div>
        </div>
        <div class="action-row center"><button id="descend" class="primary-btn" type="button">ابدأ من البداية</button></div>
      </div>`);
    const map=$('.transition-map');
    const glyph=$('.glyph');
    let step=0; const icons=['💬','▥','⚡','🏭','🚢','🚚','⛏'];
    const timer=setInterval(()=>{
      if(state.scene!=='zoomOut'){clearInterval(timer);return;}
      step++; if(step>=icons.length){clearInterval(timer);return;}
      glyph.textContent=icons[step]; tone(180+step*55,.025);
    }, settings.reduceMotion?30:420);
    $('#descend').addEventListener('click',()=>go('ch1Intro'));
  }

  return {intro,introLoading,introError,zoomOut};
}

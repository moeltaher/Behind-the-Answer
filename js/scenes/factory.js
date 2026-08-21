export function createFactoryRoutes(ctx){
  const $=ctx.$, $$=ctx.$$, state=ctx.state, settings=ctx.settings;
  const {setChapter,chapterIntro,html,go,bind,tone,saveState,mutateMetrics,addDecision,addLedger,renderLedger,resetGame}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);
  const monitorTile=ctx.monitorTile, metric=ctx.metric;
  const ledgerDialog=ctx.ledgerDialog;
  function ch2Intro(){ chapterIntro(1,'الأجهزة','الرقاقة ليست شيئًا ظهر من التصميم وحده. وراءها تشغيل وفحص وصيانة ومعدات وسلاسل توريد إضافية.','factoryOrientation'); }

  function factoryOrientation(){
    setChapter(1);
    html(`
      <div>
        <span class="eyebrow">MicroFab Systems</span>
        <h1 class="scene-title">أنت الآن ليلى، فنية تشغيل.</h1>
        <div class="role-card card flat"><div class="avatar">⚙</div><div><h3>ليلى</h3><p>تراقب خط إنتاج حساسًا للتلوث والضغط والحرارة.</p></div></div>
        <p class="scene-subtitle">قبل دخول منطقة الإنتاج يجب إكمال تجهيزات الحماية والنظافة بالترتيب.</p>
        <div id="ppeList" class="checklist"></div>
      </div>`);
    renderPPE();
  }

  function renderPPE(){
    const items=[['hair','غطاء الشعر'],['mask','القناع'],['gloves','القفازات'],['suit','البدلة']];
    $('#ppeList').innerHTML=items.map(([id,label],i)=>{
      const done=state.flags.factoryPPE.includes(id);
      return `<button class="check-row ${done?'done':''}" data-ppe="${id}" data-index="${i}" type="button"><span class="check-mark">${done?'✓':''}</span><span>${label}</span></button>`;
    }).join('') + (state.flags.factoryPPE.length===4?`<div class="action-row"><button id="enterFab" class="primary-btn">ادخل خط الإنتاج</button></div>`:'');
    bind('[data-ppe]','click',(e)=>{
      const id=e.currentTarget.dataset.ppe, idx=Number(e.currentTarget.dataset.index);
      if(idx!==state.flags.factoryPPE.length){ tone(160,.08,'square'); return; }
      state.flags.factoryPPE.push(id); saveState(); renderPPE();
    });
    $('#enterFab')?.addEventListener('click',()=>go('factoryMonitor'));
  }

  function factoryMonitor(){
    html(`
      <div>
        <span class="eyebrow">خط الإنتاج</span><h1 class="scene-title">حافظ على المؤشرات داخل النطاق.</h1>
        <div class="monitor">
          ${monitorTile('Temperature','21.4°C',55)}
          ${monitorTile('Particle Count','18',35)}
          ${monitorTile('Pressure','0.9 bar',58)}
          ${monitorTile('Yield','96%',82)}
        </div>
        <div class="alert" id="fabAlert"><strong>الدفعة قيد التشغيل</strong><span>راقب تغير المؤشرات بدل الضغط على أزرار بلا معنى.</span></div>
        <div class="action-row"><button id="observeFab" class="primary-btn">راقب الدفعة</button></div>
      </div>`);
    $('#observeFab').addEventListener('click',()=>go('factoryIncident'));
  }

  function factoryIncident(){
    html(`
      <div>
        <span class="eyebrow">تنبيه جودة</span><h1 class="scene-title">مستوى الجسيمات يرتفع.</h1>
        <div class="monitor">
          ${monitorTile('Temperature','21.6°C',57)}
          <div class="monitor-tile"><span>Particle Count</span><strong>49 ↑</strong><div class="bar"><i style="width:86%;background:var(--warn)"></i></div></div>
          ${monitorTile('Pressure','0.9 bar',58)}
          ${monitorTile('Yield','—',10)}
        </div>
        <div class="alert dangerish"><strong>الدفعة مطلوبة للشحن اليوم.</strong><span>إيقاف الخط يعني تأخيرًا. الاستمرار قد يرفع نسبة الوحدات المعيبة.</span></div>
        <div class="choice-grid">
          <button id="fabStop" class="choice-btn"><strong>أوقف الخط وافحص المرشح</strong><small>وقت وتكلفة أعلى، مع حماية أفضل للجودة.</small></button>
          <button id="fabContinue" class="choice-btn"><strong>استمر حتى نهاية الدفعة</strong><small>يحافظ على الجدول لكنه ينقل المخاطرة إلى الفحص والجودة.</small></button>
        </div>
      </div>`);
    $('#fabStop').addEventListener('click',()=>{
      state.flags.factoryChoice='stop'; addDecision('factory-stop','أوقفت خط التصنيع للفحص','ارتفعت تكلفة التوقف، وانخفض خطر تمرير دفعة منخفضة الجودة.',{pressure:-3,cost:7,burden:-3,quality:9,visibility:2}); saveState(); go('factoryOutcome');
    });
    $('#fabContinue').addEventListener('click',()=>{
      state.flags.factoryChoice='continue'; addDecision('factory-continue','واصلت تشغيل خط التصنيع','حافظت على الموعد مع ارتفاع عبء الفحص ونسبة الرفض.',{pressure:5,cost:-3,burden:4,quality:-8,visibility:1}); saveState(); go('factoryOutcome');
    });
  }

  function factoryOutcome(){
    const stop=state.flags.factoryChoice==='stop';
    html(`
      <div>
        <span class="eyebrow">الفحص النهائي</span><h1 class="scene-title">${stop?'تأخرت الدفعة، لكن المؤشرات عادت إلى النطاق.':'وصلت الدفعة للفحص في الموعد، لكن نسبة الرفض ارتفعت.'}</h1>
        <div class="card">
          <div class="hud-grid"><div class="hud-item"><span>Yield</span><strong>${stop?'96%':'88%'}</strong></div><div class="hud-item"><span>التوقف</span><strong>${stop?'20 دقيقة':'0'}</strong></div><div class="hud-item"><span>حالة الشحن</span><strong>${stop?'متأخر':'في الموعد'}</strong></div></div>
          <p class="muted">تفرز ليلى والفريق الوحدات المقبولة، ثم تُعبأ ضمن معدات أكبر تشمل اللوحات والطاقة والتبريد والشبكات.</p>
        </div>
        <div class="action-row"><button id="chipsDone" class="primary-btn">جهز الأجهزة للشحن</button></div>
      </div>`);
    $('#chipsDone').addEventListener('click',()=>{
      addLedger(1,'ليلى — فنية تشغيل','تشغيل وفحص وصيانة خط تصنيع حساس','HARDWARE','يتحول وقت التوقف والجودة والعمل الفني في لوحة المشتريات إلى وحدات أجهزة.');
      go('abstract2');
    });
  }

  function abstract2(){ abstraction([['ليلى','فنية تشغيل','⚙'],['فريق الصيانة','','🧰'],['الفحص','','⌕']], 'HARDWARE','في مخطط الشركة تختصر هذه العلاقات في أصل واحد جاهز للشحن.','hardwareMontage'); }

  function hardwareMontage(){
    html(`
      <div><span class="eyebrow">الخادم ليس رقاقة واحدة</span><h1 class="scene-title">حول الرقاقة توجد سلسلة أخرى من المكونات والعمل.</h1>
      <div class="montage">
        <div class="montage-card"><span class="icon">▤</span><strong>لوحات إلكترونية</strong><span>تجميع وفحص</span></div>
        <div class="montage-card"><span class="icon">⚡</span><strong>طاقة</strong><span>مزودات ووحدات احتياطية</span></div>
        <div class="montage-card"><span class="icon">≋</span><strong>شبكات</strong><span>بطاقات وكابلات ومفاتيح</span></div>
        <div class="montage-card"><span class="icon">❄</span><strong>تبريد</strong><span>مراوح وأنظمة حرارية</span></div>
      </div><div class="action-row"><button id="toCh3" class="primary-btn">إلى مركز البيانات</button></div></div>`);
    $('#toCh3').addEventListener('click',()=>go('ch3Intro'));
  }

  return {ch2Intro,factoryOrientation,factoryMonitor,factoryIncident,factoryOutcome,abstract2,hardwareMontage};
}

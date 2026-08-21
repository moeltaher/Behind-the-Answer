import { DATA_ITEMS } from '../data/game-data.js';
export function createDataRoutes(ctx){
  const $=ctx.$, $$=ctx.$$, state=ctx.state, settings=ctx.settings;
  const {setChapter,chapterIntro,html,go,bind,tone,saveState,mutateMetrics,addDecision,addLedger,renderLedger,resetGame}=ctx;
  const abstraction=(humans,word,line,next)=>ctx.abstraction(humans,word,line,next);
  const monitorTile=ctx.monitorTile, metric=ctx.metric;
  const ledgerDialog=ctx.ledgerDialog;
  function ch4Intro(){ chapterIntro(3,'البيانات','قبل أن تصبح المادة ملف تدريب، كان جزء كبير منها كتابة وصورًا وكودًا وترجمات وتفاعلات أنتجها أشخاص، ثم جرى جمعها وتجهيزها.','dataOrigins'); }

  function dataOrigins(){
    const origins=[['writer','✍','كاتب'],['photo','▧','مصور'],['code','</>','مبرمجة'],['research','⌕','باحثة'],['forum','☏','مستخدم منتدى'],['translate','文','مترجمة'],['docs','▤','توثيق'],['qa','?','سؤال وجواب'],['web','⌂','صفحة ويب'],['comment','≡','تعليق'],['manual','⚙','دليل تقني'],['news','◫','خبر']];
    html(`
      <div><span class="eyebrow">DATA</span><h1 class="scene-title">لكن البيانات لم تكن «بيانات» عندما أُنتجت.</h1><p class="scene-subtitle">اضغط على بعض المربعات لترى ما كان موجودًا قبل أن يتحول إلى ملفات.</p>
      <div class="data-cloud">${origins.map(([id,icon,label])=>`<button class="data-bit ${state.flags.dataOrigins.includes(id)?'revealed':''}" data-origin="${id}" title="${label}">${state.flags.dataOrigins.includes(id)?icon:'·'}</button>`).join('')}</div>
      <div class="card flat"><strong>${state.flags.dataOrigins.length?`كشفت ${state.flags.dataOrigins.length} مصادر بشرية ومؤسسية.`:'ما زالت الكلمة تبدو كأنها مادة بلا منتجين.'}</strong><p class="muted small">اللعبة لا تدعي أن كل مثال هنا يدخل كل نموذج، بل توضح أنواع المصادر التي قد تتحول إلى مجموعات بيانات.</p></div>
      <div class="action-row"><button id="toClean" class="primary-btn">جهّز دفعة للتدريب</button></div></div>`);
    bind('[data-origin]','click',(e)=>{const id=e.currentTarget.dataset.origin;if(!state.flags.dataOrigins.includes(id)){state.flags.dataOrigins.push(id);mutateMetrics({visibility:1});saveState();dataOrigins();}});
    $('#toClean').addEventListener('click',()=>go('dataClean'));
  }

  function dataClean(){
    const i=state.flags.dataIndex;
    if(i>=DATA_ITEMS.length){go('dataCleanSummary');return;}
    const item=DATA_ITEMS[i];
    html(`
      <div><span class="eyebrow">DataSpring — دفعة 18</span><h1 class="scene-title">أنت الآن نور، متخصصة تجهيز بيانات.</h1>
      <div class="hud-grid"><div class="hud-item"><span>العناصر</span><strong>${i+1}/${DATA_ITEMS.length}</strong></div><div class="hud-item"><span>Keep</span><strong>${state.flags.dataSort.keep}</strong></div><div class="hud-item"><span>Review</span><strong>${state.flags.dataSort.review}</strong></div></div>
      <div class="sort-layout"><div class="data-item card"><span class="kicker">${item.title}</span><div class="data-preview">${item.body}</div></div>
      <div class="sort-actions"><button data-sort="keep" class="choice-btn"><strong>احتفظ</strong><small>يمر إلى الدفعة.</small></button><button data-sort="remove" class="choice-btn"><strong>احذف</strong><small>يستبعد من الدفعة.</small></button><button data-sort="review" class="choice-btn"><strong>راجع لاحقًا</strong><small>أبطأ لكنه يترك الحالة لمراجعة إضافية.</small></button></div></div></div>`);
    bind('[data-sort]','click',(e)=>{
      const choice=e.currentTarget.dataset.sort; state.flags.dataSort[choice]++;
      if(choice===item.recommended) mutateMetrics({quality:2}); else if(choice==='review') mutateMetrics({cost:1,pressure:-1,quality:1}); else mutateMetrics({quality:-2,pressure:1});
      if(item.type==='ambiguous' && choice!=='review') addDecision('data-ambiguous','حسمت حالة بيانات شبه معرّفة دون مراجعة','السرعة قللت تكلفة المعالجة لكنها تركت مخاطرة جودة وخصوصية.',{pressure:2,cost:-1,quality:-2,visibility:1});
      if(item.type==='ambiguous' && choice==='review') addDecision('data-review','أرسلت حالة بيانات غامضة للمراجعة','رفعت تكلفة المعالجة بدل حسم حالة غير واضحة بسرعة.',{pressure:-2,cost:3,quality:4,visibility:2});
      state.flags.dataIndex++; saveState(); dataClean();
    });
  }

  function dataCleanSummary(){
    addLedger(3,'منتجو المحتوى + نور','إنتاج مواد أصلية ثم جمع وفرز وتنظيف ومراجعة البيانات','DATASET','تتلاشى أسماء المنتجين والعاملين عندما تصبح الدفعة ملفًا جاهزًا للتدريب.');
    html(`
      <div><span class="eyebrow">الدفعة جاهزة</span><h1 class="scene-title">training_data_v18</h1><div class="card"><div class="hud-grid"><div class="hud-item"><span>احتفظ</span><strong>${state.flags.dataSort.keep}</strong></div><div class="hud-item"><span>حذف</span><strong>${state.flags.dataSort.remove}</strong></div><div class="hud-item"><span>مراجعة</span><strong>${state.flags.dataSort.review}</strong></div></div><p class="muted">في النظام ستصبح هذه القرارات «Dataset preparation».</p></div><div class="action-row"><button id="dataAbstract" class="primary-btn">حوّلها إلى Dataset</button></div></div>`);
    $('#dataAbstract').addEventListener('click',()=>go('abstract4'));
  }

  function abstract4(){ abstraction([['كتّاب ومستخدمون','إنتاج المحتوى','✍'],['نور','تجهيز البيانات','◫']], 'DATASET','الأعمال السابقة أصبحت ملفًا واحدًا له اسم إصدار.','ch5Intro'); }

  return {ch4Intro,dataOrigins,dataClean,dataCleanSummary,abstract4};
}

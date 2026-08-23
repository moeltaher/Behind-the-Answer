function chapterLabel(chapter){return chapter.shortTitle||chapter.title;}
function miniMap(ctx,currentIndex){return ctx.chapters.map((chapter,index)=>{const stateClass=index===currentIndex?'current':index<currentIndex?'done':'',currentAttr=index===currentIndex?' aria-current="step"':'';return `<span class="mini-node ${stateClass}" title="${ctx.h(chapter.title)}"${currentAttr}><span aria-hidden="true">${chapter.icon}</span><small>${ctx.h(chapterLabel(chapter))}</small></span>`;}).join('');}

export function renderJourneyProgress(ctx,index){
  const {progressEl,ledgerBtn,chapterLabel:chapterLabelEl,chapterTitle,progressFill,chapters}=ctx;
  const miniJourney=ctx.$('#miniJourney');
  if(index>=0){
    if(progressEl)progressEl.hidden=false;
    if(ledgerBtn)ledgerBtn.hidden=false;
    if(chapterLabelEl)chapterLabelEl.textContent=`المرحلة ${index+1} من ${chapters.length}`;
    if(chapterTitle)chapterTitle.textContent=chapterLabel(chapters[index]);
    // الشريط يمثل المراحل المكتملة، لا مجرد دخول المرحلة الحالية؛ لذلك لا يصل إلى 100% عند بداية المرحلة الثامنة.
    if(progressFill)progressFill.style.width=`${(index/chapters.length)*100}%`;
    if(miniJourney)miniJourney.innerHTML=miniMap(ctx,index);
    return;
  }
  if(progressEl)progressEl.hidden=true;
  if(ledgerBtn)ledgerBtn.hidden=true;
  if(miniJourney)miniJourney.innerHTML='';
}

function journeyMap(ctx,currentIndex){const nodes=ctx.chapters.map((chapter,index)=>{const stateClass=index===currentIndex?'current':index<currentIndex?'done':'';return `<div class="journey-node ${stateClass}"><span class="journey-icon" aria-hidden="true">${chapter.icon}</span><small>${ctx.h(chapterLabel(chapter))}</small></div>`;}).join('');return `<div class="journey-map" tabindex="0" role="region" aria-label="ترتيب اللعب القابل للتمرير عبر ثماني مراحل، وليس مخططًا هندسيًا للنظام">${nodes}</div>`;}
function terminology(index){
  const definitions={
    0:['النموذج','برنامج رياضي يتعلم أنماطًا من كميات كبيرة من البيانات ثم يستخدم ما تعلمه لإنتاج نتائج جديدة.'],
    1:['الرقاقة الإلكترونية','قطعة تحتوي على دوائر دقيقة تنفذ عمليات حسابية داخل الحواسيب والخوادم.'],
    2:['الخادم','حاسوب مخصص لتشغيل أحمال وخدمات داخل بنية أكبر من الطاقة والشبكات والتبريد.'],
    3:['مسار العمل','الخطوات التي تمر بها المادة داخل العملية. مرورها لا يعني أن حقوقها أو خصوصيتها حُسمت.'],
    4:['وسم التصنيف','فئة يختارها العامل وفق دليل المشروع. الوسم المرجعي هو الإجابة التي يستخدمها المشروع للمقارنة، وليس حقيقة طبيعية محايدة دائمًا.'],
    5:['التدريب الإضافي','جولة تطوير تبدأ هنا من نسخة سابقة للنموذج؛ ليست تدريبًا كاملًا من الصفر.'],
    6:['النسخة المرشحة','نسخة محددة يجري تقييمها قبل الإصدار. الأدلة التي تخصها لا تنتقل تلقائيًا إلى نسخة أخرى.'],
    7:['تحويل الحمل عند الفشل','نقل جزء من الحمل إلى مراكز أخرى عند خروج مركز؛ نجاحه يعتمد على السعة وحدود النقل.']
  };
  if(!definitions[index])return'';
  const [title,text]=definitions[index];
  return `<p class="chapter-term"><strong>${title}:</strong> ${text}</p>`;
}

export function chapterIntro(ctx,index,next){
  const chapter=ctx.chapters[index];
  ctx.html(`<div class="learning-intro compact-intro"><div><span class="chapter-theme">${chapter.icon} المرحلة ${index+1} من ${ctx.chapters.length}</span><h1 class="display-title">${ctx.h(chapter.title)}</h1><p class="chapter-link-line">${ctx.h(chapter.link)}</p></div><details class="learning-more"><summary>سياق المرحلة — اختياري</summary><p><strong>المكان:</strong> ${ctx.h(chapter.where)}</p><p><strong>من يعمل هنا؟</strong> ${ctx.h(chapter.workers)}</p>${terminology(index)}<p>${ctx.h(chapter.what)}</p><div class="stage-output"><strong>الناتج الذي سنحتفظ به</strong>${ctx.h(chapter.output)}</div><details class="journey-map-details"><summary>عرض ترتيب اللعب</summary>${journeyMap(ctx,index)}<p class="small muted">هذه خريطة تقدم داخل اللعبة فقط. ستعاد العلاقات في النهاية إلى بناء مادي ودورة تطوير وتشغيل مستمر.</p></details></details><div class="action-row"><button id="chapterNext" class="primary-btn">ابدأ المهمة مباشرة</button></div></div>`);
  ctx.$('#chapterNext')?.addEventListener('click',()=>ctx.go(next));
}

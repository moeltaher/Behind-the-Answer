import { DEMO_PROMPT } from '../data/story.js';

export function createIntroRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const settings = ctx.settings;
  const { setChapter, html, go, tone, h } = ctx;

  function intro() {
    setChapter(-1);
    html(`
      <div class="chat-shell">
        <div class="chat-logo">ن</div>
        <h1 class="chat-title">سنبدأ بطلب واحد طوال الرحلة</h1>
        <div class="chat-input-wrap">
          <label class="kicker" for="introPrompt">الطلب التجريبي</label>
          <textarea id="introPrompt" class="prompt-input" readonly>${h(DEMO_PROMPT)}</textarea>
          <p class="small muted">هذا الطلب ثابت حتى نستطيع تتبع ما يقف خلف الإجابة من أول السلسلة إلى آخرها.</p>
          <div class="chat-send">
            <button id="introSend" class="primary-btn" type="button">ابدأ من هذا الطلب ←</button>
          </div>
        </div>
        <p class="small muted centered intro-privacy-note">اللعبة لا ترسل أي نص إلى خادم خارجي.</p>
      </div>
    `);

    $('#introSend').addEventListener('click', () => go('introLoading'));
  }

  function introLoading() {
    setChapter(-1);
    html(`
      <div class="chat-shell">
        <div class="chat-logo">ن</div>
        <div class="message user">${h(DEMO_PROMPT)}</div>
        <div class="message ai">
          <div class="typing" aria-label="جارٍ الانتقال خلف الإجابة">
            <i></i><i></i><i></i><span>سنفتح الآن ما يحدث خلف هذه الإجابة...</span>
          </div>
        </div>
      </div>
    `);

    setTimeout(() => {
      if (state.scene === 'introLoading') go('introExplain');
    }, settings.reduceMotion ? 250 : 1200);
  }

  function introExplain() {
    html(`
      <div class="chat-shell">
        <div class="chat-logo">ن</div>
        <div class="message user">${h(DEMO_PROMPT)}</div>
        <div class="alert goodish">
          <strong>قبل أن نعرض الإجابة، سنفكك ما يجعلها ممكنة.</strong>
          <span>سنمر بالأجهزة والخوادم والبيانات والتدريب والعمل البشري الذي يبني النظام ويشغله.</span>
        </div>
        <div class="action-row stretch">
          <button id="preview" class="secondary-btn" type="button">لماذا لا نعرض الإجابة الآن؟</button>
          <button id="why" class="primary-btn" type="button">ابدأ الرحلة خلف الإجابة</button>
        </div>
      </div>
    `);

    $('#preview').addEventListener('click', event => {
      event.currentTarget.disabled = true;
      event.currentTarget.textContent = 'لأن هدف اللعبة هو أن ترى السلسلة قبل النتيجة';
      tone(260, 0.08);
    });
    $('#why').addEventListener('click', () => go('zoomOut'));
  }

  function zoomOut() {
    html(`
      <div class="centered">
        <span class="eyebrow">لنبدأ من المكان الذي لا يظهر في مربع المحادثة</span>
        <h1 class="scene-title">الإجابة هي آخر نقطة في سلسلة أطول.</h1>
        <p class="scene-subtitle">لن نفترض أنك تعرف مراحلها. في كل محطة سنشرح المكان والعمل وعلاقته بالذكاء الاصطناعي قبل أن تبدأ المهمة.</p>
        <div class="transition-map" aria-label="انتقال بصري من واجهة الذكاء الاصطناعي إلى موقع التعدين">
          <div class="map-layer"><span class="glyph">💬</span></div>
          <div class="map-caption"><span>واجهة المحادثة</span><span>↓ البنية التي تقف خلفها</span></div>
        </div>
        <div class="action-row center"><button id="descend" class="primary-btn" type="button">ابدأ من أول السلسلة</button></div>
      </div>
    `);

    const glyph = $('.glyph');
    const icons = ['💬', '▥', '⚡', '🏭', '🚢', '🚚', '⛏'];
    let step = 0;
    const timer = setInterval(() => {
      if (state.scene !== 'zoomOut' || ++step >= icons.length) {
        clearInterval(timer);
        return;
      }
      glyph.textContent = icons[step];
      tone(180 + step * 55, 0.025);
    }, settings.reduceMotion ? 30 : 420);

    $('#descend').addEventListener('click', () => go('ch1Intro'));
  }

  return { intro, introLoading, introExplain, zoomOut };
}

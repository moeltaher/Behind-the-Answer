import { DEMO_PROMPT } from '../data/story.js';

export function createIntroRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const settings = ctx.settings;
  const { html, go, tone, h } = ctx;

  function intro() {
    html(`
      <div class="chat-shell intro-shell">
        <div class="chat-logo">ن</div>
        <h1 class="chat-title">ابدأ بطلب بسيط، ثم افتح ما يقف خلف الإجابة.</h1>
        <div class="chat-input-wrap">
          <label class="kicker" for="introPrompt">الطلب التجريبي الثابت</label>
          <textarea id="introPrompt" class="prompt-input" readonly>${h(DEMO_PROMPT)}</textarea>
          <p class="small muted">لن نعرض الإجابة فورًا. ستعود أولًا عبر الأجهزة والبيانات والعمل البشري الذي جعل الخدمة ممكنة، ثم ترجع إلى الطلب نفسه في النهاية.</p>
          <div class="chat-send"><button id="introSend" class="primary-btn" type="button">افتح ما وراء الإجابة ←</button></div>
        </div>
        <p class="small muted centered intro-privacy-note">اللعبة تعمل داخل متصفحك ولا ترسل هذا النص إلى خادم خارجي.</p>
      </div>
    `);
    $('#introSend').addEventListener('click', () => go('zoomOut'));
  }

  function zoomOut() {
    html(`
      <div class="centered zoom-out-scene">
        <span class="eyebrow">من الواجهة إلى البنية التي تسبقها</span>
        <h1 class="scene-title">الإجابة هي آخر نقطة مرئية في سلسلة أطول.</h1>
        <div class="transition-map" aria-label="انتقال بصري من واجهة المحادثة إلى بداية السلسلة"><div class="map-layer"><span class="glyph">💬</span></div><div class="map-caption"><span>واجهة المحادثة</span><span>↓ مواد وأجهزة وعمل بشري</span></div></div>
        <p class="small muted">رحلة اللعب مرتبة خطيًا للتعلم، لكنك سترى في النهاية أن النظام الحقيقي يتضمن دورات واعتمادًا متبادلًا.</p>
        <div class="action-row center"><button id="descend" class="primary-btn" type="button">ابدأ بالمادة التي تدخل الأجهزة</button></div>
      </div>
    `);

    const glyph = $('.glyph');
    const icons = ['💬', '▥', '🏭', '🚚', '⛏'];
    let step = 0;
    const timer = setInterval(() => {
      if (state.scene !== 'zoomOut' || ++step >= icons.length) {
        clearInterval(timer);
        return;
      }
      if (glyph) glyph.textContent = icons[step];
      tone(180 + step * 60, 0.025);
    }, settings.reduceMotion ? 30 : 320);

    $('#descend').addEventListener('click', () => go('ch1Intro'));
  }

  return { intro, zoomOut };
}

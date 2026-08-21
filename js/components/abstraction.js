export function abstraction(ctx, humans, word, line, next) {
  const humanItems = humans.map(item => `
    <span class="human-chip">
      <span class="human-chip__icon" aria-hidden="true">${item[2] || '●'}</span>
      <span><strong>${ctx.h(item[0])}</strong>${item[1] ? `<small>${ctx.h(item[1])}</small>` : ''}</span>
    </span>
  `).join('');

  ctx.html(`
    <div class="abstraction-stage">
      <div class="abstraction-card">
        <div class="abstraction-human-side">
          <span class="abstraction-kicker">ما رأيته في هذه المرحلة</span>
          <h2>عمل بشري واضح</h2>
          <div class="human-group-visible" id="humanGroup">${humanItems}</div>
          <p class="abstraction-explanation">${ctx.h(line)}</p>
        </div>

        <div class="abstraction-flow" aria-hidden="true">
          <span>↓</span>
          <small>يتحول في لوحة النظام إلى</small>
        </div>

        <div class="abstraction-output-side" id="systemOutput">
          <span class="abstraction-kicker">ما يظهر في المرحلة التالية</span>
          <div class="abstract-word">${ctx.h(word)}</div>
          <p class="term-note">يبقى الناتج ظاهرًا، بينما لا تظهر معه تلقائيًا ساعات العمل والضغط والمخاطر والقرارات التي مررت بها.</p>
        </div>

        <div class="action-row center abstraction-actions">
          <button id="abstractNext" class="primary-btn">تابع إلى المرحلة التالية</button>
        </div>
      </div>
    </div>
  `);

  if (!ctx.settings.reduceMotion) {
    requestAnimationFrame(() => ctx.$('#systemOutput')?.classList.add('is-visible'));
  } else {
    ctx.$('#systemOutput')?.classList.add('is-visible');
  }

  ctx.$('#abstractNext').addEventListener('click', () => ctx.go(next));
}

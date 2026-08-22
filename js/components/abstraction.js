import { characterByName } from '../data/characters.js';

export function abstraction(ctx, humans, word, line, next) {
  const humanItems = humans.map(item => {
    const name=item[0],role=item[1]||'',character=characterByName(name);
    const visual=character
      ? `<span class="human-chip__portrait-wrap"><img class="human-chip__portrait" src="${ctx.h(character.image)}" alt="صورة كرتونية لشخصية ${ctx.h(character.name)}" loading="lazy" /></span>`
      : `<span class="human-chip__icon" aria-hidden="true">${item[2]||'●'}</span>`;
    return `<span class="human-chip ${character?'human-chip--character':'human-chip--role'}">${visual}<span class="human-chip__copy"><strong>${ctx.h(name)}</strong>${role?`<small>${ctx.h(role)}</small>`:''}</span></span>`;
  }).join('');

  ctx.html(`<div class="abstraction-stage"><div class="abstraction-card"><div class="abstraction-human-side"><span class="abstraction-kicker">ما رأيته في هذه المرحلة</span><h2>عمل بشري واضح</h2><div class="human-group-visible" id="humanGroup">${humanItems}</div><p class="abstraction-explanation">${ctx.h(line)}</p></div><div class="abstraction-flow" aria-hidden="true"><span>↓</span><small>يُسجَّل أو يُعرض في صورة مختصرة</small></div><div class="abstraction-output-side" id="systemOutput"><span class="abstraction-kicker">كيف يختصر النظام هذا العمل</span><div class="abstract-word">${ctx.h(word)}</div><p class="term-note">الاختصار التقني لا يحمل معه تلقائيًا ساعات العمل والضغط والمخاطر والقرارات والمؤسسات التي جعلته ممكنًا.</p></div><div class="action-row center abstraction-actions"><button id="abstractNext" class="primary-btn">تابع في ترتيب اللعبة</button></div></div></div>`);
  if(!ctx.settings.reduceMotion)requestAnimationFrame(()=>ctx.$('#systemOutput')?.classList.add('is-visible'));else ctx.$('#systemOutput')?.classList.add('is-visible');
  ctx.$('#abstractNext').addEventListener('click',()=>ctx.go(next));
}
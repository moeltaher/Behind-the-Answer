import { escapeHtml as h } from '../core/state.js';

export function characterCard(character) {
  if (!character) return '';

  return `
    <aside class="scene-character" aria-label="الشخصية في هذا المشهد">
      <div class="scene-character__portrait">
        <img
          src="${h(character.image)}"
          alt="رسم كرتوني لشخصية ${h(character.name)} — ${h(character.role)}"
          loading="lazy"
        />
      </div>
      <div class="scene-character__copy">
        <span class="scene-character__label">من يعمل هنا؟</span>
        <strong>${h(character.name)}</strong>
        <small>${h(character.role)}</small>
        <p>${h(character.tagline)}</p>
      </div>
    </aside>
  `;
}

export function characterGridCard(character) {
  return `
    <article class="person-card">
      <div class="person-card__portrait">
        <img
          src="${h(character.image)}"
          alt="رسم كرتوني لشخصية ${h(character.name)}"
          loading="lazy"
        />
      </div>
      <strong>${h(character.name)}</strong>
      <small>${h(character.role)}</small>
    </article>
  `;
}

export function characterGrid(characters) {
  return characters.map(characterGridCard).join('');
}

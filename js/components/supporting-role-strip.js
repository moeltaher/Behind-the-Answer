import { escapeHtml as h } from '../core/state.js';
import { supportingActor } from '../data/supporting-actors.js';

export function supportingRoleStrip(actorIds, label = 'أدوار بشرية أخرى في هذا الحدث') {
  const actors = actorIds.map(supportingActor).filter(Boolean);
  if (!actors.length) return '';
  const cards = actors.map(actor => `
    <article class="supporting-role-card">
      <img src="${h(actor.image)}" alt="" aria-hidden="true" loading="lazy" />
      <span><strong>${h(actor.name)}</strong><small>${h(actor.role)}</small></span>
    </article>
  `).join('');
  return `<aside class="supporting-role-block" aria-label="${h(label)}"><span class="supporting-role-label">${h(label)}</span><div class="supporting-role-strip">${cards}</div></aside>`;
}

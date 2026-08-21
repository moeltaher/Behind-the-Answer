import { escapeHtml as h } from '../core/state.js';

function statusMeta(status) {
  return {
    active: ['●', 'المهمة جارية'],
    decision: ['!', 'قرار مطلوب للمتابعة'],
    resumed: ['↻', 'استؤنفت المهمة'],
    complete: ['✓', 'المهمة مكتملة']
  }[status] || ['●', h(status || 'المهمة جارية')];
}

export function taskPanel(task, { status = 'active', progress = '', compact = false } = {}) {
  const [icon, label] = statusMeta(status);
  return `<section class="task-panel ${compact ? 'task-panel--compact' : ''}" data-task-panel data-task-status="${h(status)}" aria-label="المهمة المطلوبة"><div class="task-panel__head"><span class="task-panel__kicker">مهمتك الآن</span><span class="task-status task-status--${h(status)}"><b aria-hidden="true">${icon}</b>${label}</span></div><h2>${h(task.title)}</h2>${progress ? `<div class="task-progress">${h(progress)}</div>` : ''}<div class="task-panel__details"><p><strong>كيف تنفذها؟</strong>${h(task.how)}</p><p><strong>متى تنتهي؟</strong>${h(task.done)}</p><p><strong>القيد</strong>${h(task.constraint)}</p></div></section>`;
}

export function eventPanel({ title, trigger, meaning, causal = 'during', actors = [] }) {
  const causalCopy = causal === 'because' ? 'بسبب ما حدث في المهمة' : causal === 'after' ? 'بعد إكمال الخطوة السابقة' : 'أثناء تنفيذ المهمة';
  return `<section class="task-event" data-task-event><span class="task-event__label">${h(causalCopy)}</span><h2>${h(title)}</h2><p><strong>ما الذي حدث؟</strong>${h(trigger)}</p><p><strong>ماذا يعني ذلك؟</strong>${h(meaning)}</p>${actors.length ? actorStrip(actors, 'أطراف هذا الحدث') : ''}</section>`;
}

export function decisionPrompt(question, intro = 'ظهرت هذه الخيارات لأن المهمة وصلت إلى موقف يحتاج إلى قرار قبل المتابعة.') {
  return `<section class="decision-prompt" data-decision-required aria-label="قرار مطلوب"><span class="decision-prompt__label">قرار مطلوب</span><p>${h(intro)}</p><h2>${h(question)}</h2><div class="decision-prompt__hint">يجب اختيار أحد الخيارات التالية للمتابعة.</div></section>`;
}

export function taskOutcome({ choice = '', result, resume = '', complete = false }) {
  return `<section class="task-outcome ${complete ? 'task-outcome--complete' : ''}" data-task-outcome><span class="task-outcome__label">${complete ? '✓ المهمة مكتملة' : 'نتيجة قرارك'}</span>${choice ? `<p><strong>اخترت:</strong>${h(choice)}</p>` : ''}<p><strong>النتيجة:</strong>${h(result)}</p>${resume ? `<p><strong>${complete ? 'ما التالي؟' : 'عودة إلى المهمة:'}</strong>${h(resume)}</p>` : ''}</section>`;
}

export function actorStrip(actors, label = 'في هذا المشهد') {
  return `<section class="actor-strip" data-actor-strip aria-label="${h(label)}"><span class="actor-strip__label">${h(label)}</span><div class="actor-strip__items">${actors.map(actor => actorChip(actor)).join('')}</div></section>`;
}

export function actorChip(actor) {
  if (!actor) return '';
  return `<article class="actor-chip ${actor.group ? 'actor-chip--group' : ''}"><img src="${h(actor.image)}" alt="" aria-hidden="true" loading="lazy"/><span><strong>${h(actor.name)}</strong><small>${h(actor.role)}</small></span></article>`;
}

export function actorMessage(actor, message, label = 'قال') {
  if (!actor) return '';
  return `<aside class="actor-message" data-actor-message><img src="${h(actor.image)}" alt="رسم كرتوني يمثل ${h(actor.name)}" loading="lazy"/><div><span>${h(label)}</span><strong>${h(actor.name)}</strong><small>${h(actor.role)}</small><p>${h(message)}</p></div></aside>`;
}

export function institutionCard({ name, type, role, symbol = '▦' }) {
  return `<aside class="institution-card" data-institution-card aria-label="جهة أو نظام في هذا المشهد"><div class="institution-card__symbol" aria-hidden="true">${h(symbol)}</div><div><span>${h(type)}</span><strong>${h(name)}</strong><p>${h(role)}</p></div></aside>`;
}

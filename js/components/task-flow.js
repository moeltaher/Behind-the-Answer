import { escapeHtml as h } from '../core/state.js';

function statusMeta(status) {
  return {
    active: ['●', 'المهمة جارية'],
    decision: ['!', 'قرار مطلوب'],
    resumed: ['↻', 'استؤنفت المهمة'],
    complete: ['✓', 'المهمة مكتملة']
  }[status] || ['●', 'المهمة جارية'];
}

export function taskPanel(task, { status = 'active', progress = '', compact = false } = {}) {
  const [icon, label] = statusMeta(status);
  return `<section class="task-panel ${compact ? 'task-panel--compact' : ''}" data-task-panel data-task-status="${h(status)}" aria-label="المهمة المطلوبة"><div class="task-panel__head"><span class="task-panel__kicker">مهمتك الآن</span><span class="task-status task-status--${h(status)}"><b aria-hidden="true">${icon}</b>${h(label)}</span></div><h2>${h(task.title)}</h2>${progress ? `<div class="task-progress">${h(progress)}</div>` : ''}<div class="task-panel__details"><p><strong>كيف تنفذها؟</strong>${h(task.how)}</p><p><strong>متى تنتهي؟</strong>${h(task.done)}</p><p><strong>القيد</strong>${h(task.constraint)}</p></div></section>`;
}

export function causalDecision({ action, event, decision, note = '' }) {
  return `<section class="decision-cause" data-decision-cause aria-label="سبب ظهور القرار"><div class="decision-cause__head"><span>لماذا ظهرت هذه الخيارات الآن؟</span><strong>اختيار مطلوب لإكمال الخطوة</strong></div><div class="decision-cause__flow"><div class="decision-cause__step"><small>ما فعلته</small><strong>${h(action)}</strong></div><span class="decision-cause__arrow" aria-hidden="true">←</span><div class="decision-cause__step"><small>ما حدث بعد ذلك</small><strong>${h(event)}</strong></div><span class="decision-cause__arrow" aria-hidden="true">←</span><div class="decision-cause__step decision-cause__step--decision"><small>قرارك الآن</small><strong>${h(decision)}</strong></div></div>${note ? `<p class="decision-cause__note">${h(note)}</p>` : ''}</section>`;
}

export function choiceRequirement(prompt, detail = 'اختر أحد الخيارات الظاهرة لإكمال الخطوة الحالية. لن تنتقل المهمة قبل اتخاذ هذا القرار.') {
  return `<div class="choice-requirement" data-choice-requirement role="note"><span aria-hidden="true">!</span><div><strong>${h(prompt)}</strong><small>${h(detail)}</small></div></div>`;
}

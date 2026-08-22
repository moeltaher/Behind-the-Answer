import { escapeHtml as h } from '../core/state.js';

function statusMeta(status) {
  return {
    active: ['●', 'المهمة جارية'],
    decision: ['!', 'قرار مطلوب'],
    resumed: ['↻', 'استؤنفت المهمة'],
    debt: ['↗', 'اكتملت مع عمل مفتوح'],
    complete: ['✓', 'المهمة مكتملة']
  }[status] || ['●', 'المهمة جارية'];
}

export function taskPanel(task, { status = 'active', progress = '', compact = false } = {}) {
  const [icon, label] = statusMeta(status);
  return `<section class="task-panel ${compact ? 'task-panel--compact' : ''}" data-task-panel data-task-status="${h(status)}" aria-label="المهمة المطلوبة"><div class="task-panel__head"><span class="task-panel__kicker">مهمتك الآن</span><span class="task-status task-status--${h(status)}"><b aria-hidden="true">${icon}</b>${h(label)}</span></div><h2>${h(task.title)}</h2>${progress ? `<div class="task-progress">${h(progress)}</div>` : ''}<div class="task-panel__details"><p><strong>كيف تنفذها؟</strong>${h(task.how)}</p><p><strong>متى تنتهي؟</strong>${h(task.done)}</p><p><strong>القيد</strong>${h(task.constraint)}</p></div></section>`;
}

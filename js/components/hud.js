import { escapeHtml as h } from '../core/state.js';

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

export function monitorTile(label, value, width) {
  const safeWidth = clampPercent(width);

  return `
    <div class="monitor-tile">
      <span>${h(label)}</span>
      <strong dir="auto">${h(value)}</strong>
      <div class="bar" aria-hidden="true">
        <i style="width:${safeWidth}%"></i>
      </div>
    </div>
  `;
}

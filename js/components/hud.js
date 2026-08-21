import { clamp, escapeHtml as h } from '../core/state.js';

export function monitorTile(label, value, width) {
  const safeWidth = clamp(Number(width) || 0);

  return `
    <div class="monitor-tile">
      <span>${h(label)}</span>
      <strong>${h(value)}</strong>
      <div class="bar" aria-hidden="true">
        <i style="width:${safeWidth}%"></i>
      </div>
    </div>
  `;
}

export function metric(name, value, label) {
  const safeValue = clamp(Number(value) || 0);

  return `
    <div class="metric-card">
      <div class="metric-head">
        <strong>${h(name)}</strong>
        <span>${h(label)}</span>
      </div>
      <div class="metric-bar" aria-hidden="true">
        <i style="width:${safeValue}%"></i>
      </div>
    </div>
  `;
}

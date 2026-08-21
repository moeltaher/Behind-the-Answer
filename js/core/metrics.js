import { clamp } from './state.js';

export function mutateMetrics(state, delta = {}) {
  for (const [key, value] of Object.entries(delta)) {
    state.metrics[key] = clamp((state.metrics[key] || 0) + value);
  }
}

export function addDecision(state, id, label, effectText, delta = {}) {
  const alreadyRecorded = state.decisions.some(decision => decision.id === id);

  if (!alreadyRecorded) {
    state.decisions.push({ id, label, effectText });
    mutateMetrics(state, delta);
  }
}

export function addDecision(state, id, label, effectText) {
  const alreadyRecorded = state.decisions.some(decision => decision.id === id);

  if (!alreadyRecorded) {
    state.decisions.push({ id, label, effectText });
  }
}

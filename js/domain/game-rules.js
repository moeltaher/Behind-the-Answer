export const MIN_COMPUTE_TO_CONTINUE = 7;
export const TRAINING_COMPUTE = 8;
export const DEPLOY_CAPACITY_LIMITS = [60,45,35];
export const FAILOVER_INGRESS_LIMITS = [20,20,20];
export const MAX_SURVIVABLE_FAILURES = 1;

export function hasUnresolved(check) {
  return Boolean(check) && Object.values(check).includes('unresolved');
}

export function unresolvedReadyIndices(flags) {
  return flags.dataStatuses.flatMap((status,index)=>status==='ready'&&hasUnresolved(flags.dataChecks[index])?[index]:[]);
}

export function exposedCurrentUnresolvedIndices(flags) {
  return flags.dataCurrentTrainingUsed.filter(index=>flags.dataStatuses[index]==='ready'&&hasUnresolved(flags.dataChecks[index]));
}

export function confirmedAnnotations(flags) {
  return flags.annotationResults.filter(result=>result.acceptedAsReasonable&&!result.pending&&!result.reviewRejected).length;
}

export function neededExtraChecks(flags) {
  const checks=[];
  if(flags.trainingCheckpoint==='recent') checks.push('checkpoint');
  if(flags.trainingIncidentChoice==='continue') checks.push('stability');
  return checks;
}

export function computeDescription(total=TRAINING_COMPUTE) {
  const initialMargin=total-MIN_COMPUTE_TO_CONTINUE;
  const afterFailure=total-1;
  const remainingMargin=afterFailure-MIN_COMPUTE_TO_CONTINUE;
  return {initialMargin,afterFailure,remainingMargin};
}

export function loadMargins(values) {
  return values.map((value,index)=>DEPLOY_CAPACITY_LIMITS[index]-value);
}

export function failoverCase(failedIndex,values) {
  const margins=loadMargins(values);
  const perSiteReceivable=margins.map((margin,index)=>index===failedIndex?0:Math.min(Math.max(0,margin),FAILOVER_INGRESS_LIMITS[index]));
  const spareElsewhere=perSiteReceivable.reduce((sum,value)=>sum+value,0);
  const displaced=values[failedIndex];
  return {displaced,spareElsewhere,perSiteReceivable,survivable:spareElsewhere>=displaced};
}

export function survivableFailures(values) {
  if(!Array.isArray(values)||values.length!==3) return 0;
  return [0,1,2].filter(index=>failoverCase(index,values).survivable).length;
}

export function resilienceRiskDecisionId(values) {
  return `deploy-resilience-risk-${values.join('-')}`;
}

export function hasResilienceResolution(state) {
  const flags=state.flags;
  if(!Array.isArray(flags.deployLoad)||flags.deployFailoverChecks.length!==3) return false;
  if(survivableFailures(flags.deployLoad)===3) return true;
  return state.decisions.some(decision=>decision.id===resilienceRiskDecisionId(flags.deployLoad));
}

export function recoveryVerificationDecisionId(recovery) {
  return recovery==='restart'?'deploy-recovery-verified-restart':'deploy-recovery-verified-rollback';
}

export function hasRecoveryVerification(state,recovery=state.flags.deployRecovery) {
  if(!recovery) return false;
  const id=recoveryVerificationDecisionId(recovery);
  return state.decisions.some(decision=>decision.id===id);
}

export function recoveryDispositionComplete(state) {
  const flags=state.flags;
  if(flags.deployRecovery==='rollback') return hasRecoveryVerification(state,'rollback');
  if(flags.deployRecovery==='restart') return hasRecoveryVerification(state,'restart')&&flags.deployRecoveryDisposition==='monitor';
  return false;
}

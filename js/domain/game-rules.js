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
  const initialMargin=total-MIN_COMPUTE_TO_CONTINUE,afterFailure=total-1,remainingMargin=afterFailure-MIN_COMPUTE_TO_CONTINUE;
  return {initialMargin,afterFailure,remainingMargin};
}
export function loadMargins(values) { return values.map((value,index)=>DEPLOY_CAPACITY_LIMITS[index]-value); }
export function failoverCase(failedIndex,values) {
  const margins=loadMargins(values),perSiteReceivable=margins.map((margin,index)=>index===failedIndex?0:Math.min(Math.max(0,margin),FAILOVER_INGRESS_LIMITS[index])),spareElsewhere=perSiteReceivable.reduce((sum,value)=>sum+value,0),displaced=values[failedIndex];
  return {displaced,spareElsewhere,perSiteReceivable,survivable:spareElsewhere>=displaced};
}
export function survivableFailures(values) {
  if(!Array.isArray(values)||values.length!==3)return 0;
  return [0,1,2].filter(index=>failoverCase(index,values).survivable).length;
}
export function hasResilienceResolution(state) {
  const flags=state.flags;
  if(!Array.isArray(flags.deployLoad)||flags.deployFailoverChecks.length!==3)return false;
  return survivableFailures(flags.deployLoad)===3||flags.deployResilienceAccepted===true;
}
export function recoveryDispositionComplete(state) {
  const flags=state.flags;
  if(flags.deployRecovery==='rollback')return flags.deployRecoveryVerifiedFor==='rollback'&&flags.deployRecoveryDisposition==='cleared';
  if(flags.deployRecovery==='restart')return flags.deployRecoveryVerifiedFor==='restart'&&flags.deployRecoveryDisposition==='monitor';
  return false;
}

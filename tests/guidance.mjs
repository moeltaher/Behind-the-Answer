import { DEFAULT_STATE, clone } from '../js/core/state.js';
import { sceneGuidance } from '../js/components/scene-guidance.js';

function stateWith(flags = {}) {
  const state = clone(DEFAULT_STATE);
  Object.assign(state.flags, flags);
  return state;
}

function expect(markup, fragment, label) {
  if (!markup.includes(fragment)) {
    throw new Error(`${label}: missing ${fragment}`);
  }
}

const mining = sceneGuidance('mineTask', stateWith({
  miningCount: 4,
  miningMinutes: 14,
  miningBUses: 2,
  miningWarning: true
}));
expect(mining, 'data-task-panel', 'mining warning');
expect(mining, 'data-decision-cause', 'mining warning');
expect(mining, 'زميل موسى', 'mining supporting actor');
expect(mining, 'ما فعلته', 'mining causal sequence');
expect(mining, 'قرارك الآن', 'mining causal sequence');

const factory = sceneGuidance('factoryIncident', stateWith());
expect(factory, 'data-decision-cause', 'factory incident');
expect(factory, 'فاحص جودة', 'factory supporting actor');
expect(factory, '49', 'factory trigger');

const dataFollowup = sceneGuidance('dataFollowup', stateWith({
  dataIndex: 2,
  dataFollowup: { index: 2 }
}));
expect(dataFollowup, 'data-task-panel', 'data follow-up task');
expect(dataFollowup, 'data-decision-cause', 'data follow-up cause');
expect(dataFollowup, 'مراجع جودة المنصة', 'data follow-up reviewer');

const dataChoice = sceneGuidance('dataClean', stateWith());
expect(dataChoice, 'data-choice-requirement', 'data required choice');
expect(dataChoice, 'يجب اختيار أحدها', 'data required choice');

const annotationReview = sceneGuidance('annotationReview', stateWith({
  annotationResults: [{ acceptedAsReasonable: true, pending: false, reviewRejected: true }]
}));
expect(annotationReview, 'data-task-panel', 'annotation review task');
expect(annotationReview, 'data-decision-cause', 'annotation review cause');
expect(annotationReview, 'اعتراضًا', 'annotation review decision');

const training = sceneGuidance('trainingRun', stateWith({
  trainingCompute: '8',
  trainingCheckpoint: 'recent'
}));
expect(training, 'data-decision-cause', 'training incident');
expect(training, 'لم يسبب العطل', 'training causal qualification');

const safetyRetest = sceneGuidance('safetyRetest', stateWith({
  safetyChoice: 'details',
  safetyRemediated: true
}));
expect(safetyRetest, 'data-task-panel', 'safety retest task');
expect(safetyRetest, 'data-decision-cause', 'safety retest sequence');
expect(safetyRetest, 'إعادة الاختبار الإلزامية', 'safety retest requirement');

const evaluation = sceneGuidance('evalTask', stateWith());
expect(evaluation, 'data-choice-requirement', 'evaluation required choice');

const launch = sceneGuidance('launchDecision', stateWith({
  trainingCompute: '8',
  trainingCheckpoint: 'recent',
  trainingIncidentChoice: 'continue',
  safetyRemediated: true,
  safetyRetested: true
}));
expect(launch, 'data-decision-cause', 'launch causal bundles');
expect(launch, 'نتجت عن اختيارات سابقة', 'launch causal explanation');

const deployment = sceneGuidance('deployIncident', stateWith({
  deployTabs: ['network', 'compute', 'model']
}));
expect(deployment, 'data-decision-cause', 'deployment recovery decision');
expect(deployment, 'بعد اكتمال التشخيص', 'deployment causal explanation');

console.log('Task, decision causality, and supporting-role guidance checks passed.');

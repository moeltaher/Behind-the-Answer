export const SCENES_BY_STAGE = {
  mining: ['ch1Intro','mineOrientation','mineTask','mineInspection','mineEnd','abstract1'],
  factory: ['ch2Intro','factoryOrientation','factoryMonitor','factoryIncident','factoryOutcome','abstract2'],
  datacenter: ['ch3Intro','dcInstall','dcCooling','dcCoolingOutcome','dcWorkers','abstract3'],
  data: ['ch4Intro','dataOrigins','dataClean','dataFollowup','dataCleanSummary','abstract4'],
  annotation: ['ch5Intro','annotationIntro','annotationTask','annotationReview','annotationEnd','abstract5'],
  training: ['ch6Intro','trainingSetup','trainingRun','trainingRecovery','trainingEval','abstract6'],
  evaluation: ['ch7Intro','evalTask','checkpointEval','safetyTest','safetyOutcome','safetyRetest','launchDecision','launchOutcome','abstract7'],
  deployment: ['ch8Intro','deployLoad','deployIncident','onCall','supportTask','deployEnd','abstract8'],
  ending: ['intro','zoomOut','pipelineAssemble','transferChallenge','finalAnswer','results','finalMessage']
};

export const SCENE_ORDER = [
  'intro','zoomOut',
  ...SCENES_BY_STAGE.mining,
  ...SCENES_BY_STAGE.factory,
  ...SCENES_BY_STAGE.datacenter,
  ...SCENES_BY_STAGE.data,
  ...SCENES_BY_STAGE.annotation,
  ...SCENES_BY_STAGE.training,
  ...SCENES_BY_STAGE.evaluation,
  ...SCENES_BY_STAGE.deployment,
  'pipelineAssemble','transferChallenge','finalAnswer','results','finalMessage'
];

const STAGE_BACKDROPS = {
  mining: './assets/images/scenes/01-mining.svg',
  factory: './assets/images/scenes/02-factory.svg',
  datacenter: './assets/images/scenes/03-datacenter.svg',
  data: './assets/images/scenes/04-data.svg',
  annotation: './assets/images/scenes/05-annotation.svg',
  training: './assets/images/scenes/06-training.svg',
  evaluation: './assets/images/scenes/07-evaluation.svg',
  deployment: './assets/images/scenes/08-deployment.svg',
  ending: './assets/images/scenes/09-user.svg'
};

const SCENE_TO_STAGE = Object.fromEntries(
  Object.entries(SCENES_BY_STAGE).flatMap(([stage, scenes]) => scenes.map(scene => [scene, stage]))
);

export function stageForScene(sceneId) { return SCENE_TO_STAGE[sceneId] || null; }

export function backdropForScene(sceneId) {
  const stage = stageForScene(sceneId);
  if (!stage) return null;
  return { group: stage, image: STAGE_BACKDROPS[stage] };
}

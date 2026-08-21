const STAGE_SCENES = {
  mining: [
    'ch1Intro',
    'mineOrientation',
    'mineTask',
    'mineInspection',
    'mineEnd',
    'abstract1',
    'transportMontage'
  ],
  factory: [
    'ch2Intro',
    'factoryOrientation',
    'factoryMonitor',
    'factoryIncident',
    'factoryOutcome',
    'abstract2',
    'hardwareMontage'
  ],
  datacenter: [
    'ch3Intro',
    'dcInstall',
    'dcCooling',
    'dcWorkers',
    'abstract3'
  ],
  data: [
    'ch4Intro',
    'dataOrigins',
    'dataClean',
    'dataCleanSummary',
    'abstract4'
  ],
  annotation: [
    'ch5Intro',
    'annotationIntro',
    'annotationTask',
    'annotationReview',
    'annotationEnd',
    'abstract5'
  ],
  training: [
    'ch6Intro',
    'trainingSetup',
    'trainingRun',
    'trainingEval'
  ],
  evaluation: [
    'ch7Intro',
    'evalTask',
    'safetyTest',
    'safetyOutcome',
    'launchDecision',
    'launchOutcome',
    'abstract7'
  ],
  deployment: [
    'ch8Intro',
    'deployLoad',
    'deployIncident',
    'onCall',
    'supportTask',
    'deployEnd',
    'abstract8'
  ],
  user: [
    'intro',
    'introLoading',
    'introExplain',
    'zoomOut',
    'ch9Intro',
    'pipelineAssemble',
    'aiAbstraction',
    'finalAnswer',
    'timelineReveal',
    'peopleReveal',
    'results',
    'finalMessage',
    'methodology'
  ]
};

export const STAGE_BACKDROPS = {
  mining: './assets/images/scenes/01-mining.svg',
  factory: './assets/images/scenes/02-factory.svg',
  datacenter: './assets/images/scenes/03-datacenter.svg',
  data: './assets/images/scenes/04-data.svg',
  annotation: './assets/images/scenes/05-annotation.svg',
  training: './assets/images/scenes/06-training.svg',
  evaluation: './assets/images/scenes/07-evaluation.svg',
  deployment: './assets/images/scenes/08-deployment.svg',
  user: './assets/images/scenes/09-user.svg'
};

const SCENE_TO_STAGE = Object.fromEntries(
  Object.entries(STAGE_SCENES).flatMap(([stage, scenes]) =>
    scenes.map(scene => [scene, stage])
  )
);

export function backdropForScene(sceneId) {
  const group = SCENE_TO_STAGE[sceneId];
  if (!group) return null;

  return {
    group,
    image: STAGE_BACKDROPS[group]
  };
}

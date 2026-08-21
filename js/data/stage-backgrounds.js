const GROUPS = {
  mining: new Set(['ch1Intro','mineOrientation','mineTask','mineInspection','mineEnd','abstract1','transportMontage']),
  factory: new Set(['ch2Intro','factoryOrientation','factoryMonitor','factoryIncident','factoryOutcome','abstract2','hardwareMontage']),
  datacenter: new Set(['ch3Intro','dcInstall','dcCooling','dcWorkers','abstract3']),
  data: new Set(['ch4Intro','dataOrigins','dataClean','dataCleanSummary','abstract4']),
  annotation: new Set(['ch5Intro','annotationIntro','annotationTask','annotationReview','annotationEnd','abstract5']),
  training: new Set(['ch6Intro','trainingSetup','trainingRun','trainingEval']),
  evaluation: new Set(['ch7Intro','evalTask','safetyTest','launchDecision','abstract7']),
  deployment: new Set(['ch8Intro','deployLoad','deployIncident','onCall','supportTask','deployEnd','abstract8']),
  user: new Set(['intro','introLoading','introError','zoomOut','ch9Intro','pipelineAssemble','aiAbstraction','finalAnswer','timelineReveal','peopleReveal','results','finalMessage','methodology'])
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

export function backdropForScene(sceneId) {
  for (const [group, scenes] of Object.entries(GROUPS)) {
    if (scenes.has(sceneId)) return { group, image: STAGE_BACKDROPS[group] };
  }
  return null;
}

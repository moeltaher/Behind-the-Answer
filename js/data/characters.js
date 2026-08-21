const CHARACTERS = {
  user: {
    name: 'أنت',
    role: 'المستخدم',
    image: './assets/images/characters/user.svg',
    tagline: 'تبدأ الرحلة من طلب بسيط على شاشة تبدو فورية.'
  },
  moussa: {
    name: 'موسى',
    role: 'عامل استخراج',
    image: './assets/images/characters/moussa.svg',
    tagline: 'يعمل في بداية السلسلة المادية التي ستصبح لاحقًا أجهزة.'
  },
  layla: {
    name: 'ليلى',
    role: 'فنية تشغيل',
    image: './assets/images/characters/layla.svg',
    tagline: 'تراقب التصنيع والجودة داخل مصنع المكونات الإلكترونية.'
  },
  carlos: {
    name: 'كارلوس',
    role: 'فني بنية تحتية',
    image: './assets/images/characters/carlos.svg',
    tagline: 'يركب الخوادم ويعمل وسط الكهرباء والتبريد والشبكات.'
  },
  noor: {
    name: 'نور',
    role: 'متخصصة تجهيز بيانات',
    image: './assets/images/characters/noor.svg',
    tagline: 'تنظف المواد المجمعة وتقرر ما يصلح للمرحلة التالية.'
  },
  amani: {
    name: 'أماني',
    role: 'عاملة تصنيف بيانات',
    image: './assets/images/characters/amani.svg',
    tagline: 'تقرأ أمثلة متكررة وتحول أحكامها إلى تصنيفات قابلة للاستخدام.'
  },
  david: {
    name: 'ديفيد',
    role: 'مهندس تعلم آلي',
    image: './assets/images/characters/david.svg',
    tagline: 'يجمع البيانات والخوادم داخل جولات تدريب وتجارب هندسية.'
  },
  reem: {
    name: 'ريم',
    role: 'مقيّمة بشرية',
    image: './assets/images/characters/reem.svg',
    tagline: 'تقارن الإجابات وتختبر اللغة والجودة والسلامة.'
  },
  hana: {
    name: 'هانا',
    role: 'مهندسة تشغيل',
    image: './assets/images/characters/hana.svg',
    tagline: 'تراقب الخدمة وتتعامل مع الأعطال والضغط بعد الإطلاق.'
  },
  samer: {
    name: 'سامر',
    role: 'دعم المستخدمين',
    image: './assets/images/characters/samer.svg',
    tagline: 'يتعامل مع المشكلات التي تصل من المستخدمين بعد تشغيل المنتج.'
  }
};

const STORY_CHARACTER_IDS = [
  'moussa',
  'layla',
  'carlos',
  'noor',
  'amani',
  'david',
  'reem',
  'hana',
  'samer'
];

const SCENE_CHARACTER = {
  intro: 'user',
  introLoading: 'user',
  introExplain: 'user',
  finalAnswer: 'user',

  mineOrientation: 'moussa',
  mineTask: 'moussa',
  mineInspection: 'moussa',
  mineEnd: 'moussa',

  factoryOrientation: 'layla',
  factoryMonitor: 'layla',
  factoryIncident: 'layla',
  factoryOutcome: 'layla',

  dcInstall: 'carlos',
  dcCooling: 'carlos',
  dcWorkers: 'carlos',

  dataClean: 'noor',
  dataCleanSummary: 'noor',

  annotationIntro: 'amani',
  annotationTask: 'amani',
  annotationReview: 'amani',
  annotationEnd: 'amani',

  trainingSetup: 'david',
  trainingRun: 'david',
  trainingEval: 'david',

  evalTask: 'reem',
  safetyTest: 'reem',
  safetyOutcome: 'reem',
  launchDecision: 'reem',
  launchOutcome: 'reem',

  deployLoad: 'hana',
  deployIncident: 'hana',
  onCall: 'hana',
  deployEnd: 'hana',

  supportTask: 'samer'
};

export function characterForScene(sceneId) {
  const characterId = SCENE_CHARACTER[sceneId];
  return characterId ? CHARACTERS[characterId] : null;
}

export function characterByName(name) {
  return Object.values(CHARACTERS).find(character => character.name === name) || null;
}

export function storyCharacters() {
  return STORY_CHARACTER_IDS.map(id => CHARACTERS[id]);
}

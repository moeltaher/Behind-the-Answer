const CHARACTERS = {
  user: {
    name: 'أنت', role: 'المستخدم', image: './assets/images/characters/user.svg',
    tagline: 'تبدأ الرحلة من طلب بسيط على شاشة تبدو فورية.'
  },
  moussa: {
    name: 'موسى', role: 'عامل استخراج', image: './assets/images/characters/moussa.svg',
    tagline: 'شخصية خيالية مركبة تمثل العمل في بداية السلسلة المادية.'
  },
  layla: {
    name: 'ليلى', role: 'فنية تشغيل', image: './assets/images/characters/layla.svg',
    tagline: 'شخصية خيالية مركبة تمثل تشغيل وفحص خطوط تصنيع المكونات.'
  },
  carlos: {
    name: 'كارلوس', role: 'فني بنية تحتية', image: './assets/images/characters/carlos.svg',
    tagline: 'شخصية خيالية مركبة تمثل تركيب وتشغيل بنية مراكز البيانات.'
  },
  noor: {
    name: 'نور', role: 'متخصصة تجهيز بيانات', image: './assets/images/characters/noor.svg',
    tagline: 'شخصية خيالية مركبة تمثل جمع وفرز ومراجعة مواد البيانات.'
  },
  amani: {
    name: 'أماني', role: 'عاملة تصنيف بيانات', image: './assets/images/characters/amani.svg',
    tagline: 'شخصية خيالية مركبة تمثل عمال التصنيف والمراجعة عبر منصات المهام.'
  },
  david: {
    name: 'ديفيد', role: 'مهندس تعلم آلي', image: './assets/images/characters/david.svg',
    tagline: 'شخصية خيالية مركبة تمثل فرق التدريب والتجارب الهندسية.'
  },
  reem: {
    name: 'ريم', role: 'مقيّمة بشرية', image: './assets/images/characters/reem.svg',
    tagline: 'شخصية خيالية مركبة تمثل تقييم الملاءمة واللغة والسلامة.'
  },
  hana: {
    name: 'هانا', role: 'مهندسة تشغيل', image: './assets/images/characters/hana.svg',
    tagline: 'شخصية خيالية مركبة تمثل تشغيل الخدمة والاستجابة للأعطال.'
  },
  samer: {
    name: 'سامر', role: 'دعم المستخدمين', image: './assets/images/characters/samer.svg',
    tagline: 'شخصية خيالية مركبة تمثل فرق الدعم التي تتلقى أثر الأعطال من المستخدمين.'
  }
};

const STORY_CHARACTER_IDS = ['moussa','layla','carlos','noor','amani','david','reem','hana','samer'];

// البطاقة الكبيرة تظهر عند دخول الدور فقط، لا في كل شاشة من المرحلة.
const SCENE_CHARACTER = {
  intro: 'user',
  mineOrientation: 'moussa',
  factoryOrientation: 'layla',
  dcInstall: 'carlos',
  dataClean: 'noor',
  annotationIntro: 'amani',
  trainingSetup: 'david',
  evalTask: 'reem',
  deployLoad: 'hana',
  supportTask: 'samer',
  finalAnswer: 'user'
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

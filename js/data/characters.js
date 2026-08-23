import { stageForScene } from './stage-backgrounds.js';
import { supportingActor } from './supporting-actors.js';

const CHARACTERS = {
  user: { name: 'أنت', role: 'المستخدم', image: './assets/images/characters/user.svg', tagline: 'تبدأ الرحلة من طلب بسيط على شاشة تبدو فورية.' },
  moussa: { name: 'موسى', role: 'عامل استخراج', image: './assets/images/characters/moussa.svg', tagline: 'يعمل تحت حصة إنتاج ونافذة تسليم، مع سلطة محدودة على قواعد الوردية.' },
  layla: { name: 'ليلى', role: 'فنية تشغيل', image: './assets/images/characters/layla.svg', tagline: 'تراقب دفعة مكونات مطلوبة للشحن وتوازن بين التوقف والفحص.' },
  carlos: { name: 'كارلوس', role: 'فني بنية تحتية', image: './assets/images/characters/carlos.svg', tagline: 'يجهز خادمًا داخل بنية تعتمد على الطاقة والشبكات والتبريد وفرق أخرى.' },
  noor: { name: 'نور', role: 'متخصصة تجهيز بيانات', image: './assets/images/characters/noor.svg', tagline: 'تراجع المصدر والحقوق والخصوصية والملاءمة قبل تمرير المواد.' },
  amani: { name: 'أماني', role: 'عاملة تصنيف بيانات', image: './assets/images/characters/amani.svg', tagline: 'تنفذ مهامًا صغيرة يُدفع مقابل المقبول منها، بينما يبقى بعض الوقت بلا أجر.' },
  david: { name: 'ديفيد', role: 'مهندس تعلم آلي', image: './assets/images/characters/david.svg', tagline: 'يشغّل جولة تدريب إضافي ويراقب السعة والأعطال وما تحتاجه النسخة من تحقق.' },
  reem: { name: 'ريم', role: 'مقيّمة بشرية', image: './assets/images/characters/reem.svg', tagline: 'تقارن المخرجات وتوثق الملاءمة والحدود بدل تحويل رأيها إلى «جودة نموذج» مباشرة.' },
  hana: { name: 'هانا', role: 'مهندسة تشغيل', image: './assets/images/characters/hana.svg', tagline: 'توزع الحمل وتجمع أدلة العطل وتختار مسار استعادة الخدمة.' },
  samer: { name: 'سامر', role: 'دعم المستخدمين', image: './assets/images/characters/samer.svg', tagline: 'يتعامل مع الأثر الذي يراه المستخدم بعد الحادث ويوازن بين السرعة وحفظ الأدلة.' }
};

const STORY_CHARACTER_IDS = ['moussa','layla','carlos','noor','amani','david','reem','hana','samer'];
const STAGE_CHARACTER = {mining:'moussa',factory:'layla',datacenter:'carlos',data:'noor',annotation:'amani',training:'david',evaluation:'reem',deployment:'hana'};
const MAIN_OVERRIDES={intro:'user',finalAnswer:'user',supportTask:'samer'};
const SUPPORT_OVERRIDES={safetyTest:'safetyTester',safetyOutcome:'safetyTester',safetyRetest:'safetyTester',governanceReview:'rightsReviewer',releaseGateReview:'releaseManager',launchDecision:'releaseManager',launchOutcome:'releaseManager'};
const HIDE_CHARACTER=new Set(['zoomOut','ch1Intro','ch2Intro','ch3Intro','ch4Intro','ch5Intro','ch6Intro','ch7Intro','ch8Intro','abstract1','abstract2','abstract3','abstract4','abstract5','abstract6','abstract7','abstract8','pipelineAssemble','transferChallenge','results']);
function withTagline(actor,tagline){return actor?{...actor,tagline}:null;}

export function characterForScene(sceneId) {
  if(MAIN_OVERRIDES[sceneId])return CHARACTERS[MAIN_OVERRIDES[sceneId]];
  if(SUPPORT_OVERRIDES[sceneId]){
    const actor=supportingActor(SUPPORT_OVERRIDES[sceneId]);
    const tagline=sceneId.startsWith('safety')?'يقود اختبار السلامة وإثبات إغلاق الخلل.':sceneId==='governanceReview'?'يفحص دليل الحقوق والترخيص وحواجز البيانات للنسخة الحالية.':'يمتلك مسؤولية مراجعة أدلة الإصدار وتثبيت قرار الموعد.';
    return withTagline(actor,tagline);
  }
  if(HIDE_CHARACTER.has(sceneId))return null;
  const characterId=STAGE_CHARACTER[stageForScene(sceneId)];
  return characterId?CHARACTERS[characterId]:null;
}
export function characterByName(name){return Object.values(CHARACTERS).find(character=>character.name===name)||null;}
export function storyCharacters(){return STORY_CHARACTER_IDS.map(id=>CHARACTERS[id]);}

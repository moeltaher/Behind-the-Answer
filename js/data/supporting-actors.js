const SUPPORTING_ACTORS = {
  supervisor: { name: 'مشرف الوردية', role: 'يشرف على الحصة والوقت', image: './assets/images/characters/supervisor.svg' },
  coworker: { name: 'زميل موسى', role: 'عامل في نفس موقع الاستخراج', image: './assets/images/characters/support-worker.svg' },
  maintenance: { name: 'فني صيانة', role: 'يفحص الأعطال والمعدات', image: './assets/images/characters/support-worker.svg' },
  qualityInspector: { name: 'فاحص جودة', role: 'يراجع الوحدات قبل تمريرها', image: './assets/images/characters/reviewer.svg' },
  cleaner: { name: 'عامل نظافة', role: 'يحافظ على بيئة التشغيل', image: './assets/images/characters/cleaner.svg' },
  securityWorker: { name: 'عامل أمن', role: 'يدير الوصول المادي للموقع', image: './assets/images/characters/security-worker.svg' },
  coolingTech: { name: 'فني تبريد', role: 'يصون أنظمة التبريد', image: './assets/images/characters/cooling-tech.svg' },
  electricalEngineer: { name: 'مهندسة كهرباء', role: 'تدير الطاقة والأنظمة الاحتياطية', image: './assets/images/characters/release-manager.svg' },
  cableTech: { name: 'فني كابلات', role: 'يوصل الشبكات والأجهزة', image: './assets/images/characters/cable-tech.svg' },
  networkOperator: { name: 'مشغل شبكة', role: 'يراقب الاتصال بين الأنظمة', image: './assets/images/characters/network-operator.svg' },
  contentCreators: { name: 'منتجو المحتوى', role: 'كتّاب ومبرمجون ومصورون ومستخدمون أنتجوا المواد الأصلية', image: './assets/images/characters/support-worker.svg', group: true },
  rightsReviewer: { name: 'مراجعة الحقوق والترخيص', role: 'تفحص دليل حق الاستخدام وشروط الترخيص قبل حسم حالة المادة', image: './assets/images/characters/reviewer.svg', group: true },
  dataReviewer: { name: 'مراجع جودة المنصة', role: 'يراجع تصنيفات العمال ويمكنه رفضها', image: './assets/images/characters/reviewer.svg' },
  infraTeam: { name: 'فريق البنية والتشغيل', role: 'يراقب الخوادم أثناء التدريب', image: './assets/images/characters/support-worker.svg', group: true },
  safetyTester: { name: 'مختبر سلامة', role: 'يختبر حدود النموذج ومخاطره', image: './assets/images/characters/reviewer.svg' },
  languageReviewer: { name: 'مراجع لغة', role: 'يراجع اللغة والسياق', image: './assets/images/characters/reviewer.svg' },
  releaseManager: { name: 'مها', role: 'مسؤولة الإصدار والموعد', image: './assets/images/characters/release-manager.svg' },
  affectedUser: { name: 'مستخدم متأثر', role: 'يرسل بلاغًا عن أثر العطل', image: './assets/images/characters/affected-user.svg' },
  transportTeam: { name: 'عمال النقل والمعالجة', role: 'ينقلون وينقون ويعالجون المواد', image: './assets/images/characters/support-worker.svg', group: true },
  operationsTeam: { name: 'فرق الشبكات والصيانة', role: 'تساند تشغيل الخدمة واستعادتها', image: './assets/images/characters/network-operator.svg', group: true }
};

export const DATACENTER_WORKERS = [
  { id: 'clean', actorId: 'cleaner', icon: '⌁' },
  { id: 'electric', actorId: 'electricalEngineer', icon: 'ϟ' },
  { id: 'security', actorId: 'securityWorker', icon: '◇' },
  { id: 'cool', actorId: 'coolingTech', icon: '◫' },
  { id: 'cable', actorId: 'cableTech', icon: '≋' },
  { id: 'network', actorId: 'networkOperator', icon: '◎' }
];

export function supportingActor(id) {
  return SUPPORTING_ACTORS[id] || null;
}

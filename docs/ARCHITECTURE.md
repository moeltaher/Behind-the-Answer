# بنية اللعبة الحالية

هذه الوثيقة تصف البنية الحالية فقط. تاريخ الجولات موجود في `AUDIT-HISTORY.md`.

## التطبيق

اللعبة تطبيق ثابت من HTML وCSS وJavaScript باستخدام ES modules، من دون backend أو قاعدة بيانات أو حساب مستخدم. `index.html` هي صفحة التشغيل الوحيدة، والحالة والإعدادات تحفظ في `localStorage`.

الحالة الحالية تستخدم `schemaVersion: 5`. تبقى مسارات migration للحفظ الأقدم لأنها توافق مستخدم حقيقي، وليست صفحة أو واجهة تشغيل قديمة.

## مصادر الحقيقة

- `js/app.js` — تركيب التطبيق، تسجيل routes، الإعدادات والخلفيات.
- `js/core/state.js` — شكل الحالة الافتراضية.
- `js/core/storage.js` — التحقق من الحالة، العلاقات السببية، migration والحفظ.
- `js/domain/game-rules.js` — قواعد مجال قابلة لإعادة الاستخدام: الحد الأدنى للحوسبة، التخصيص الحالي، مسائل البيانات غير المحسومة، الفحوص الإضافية، سعات التشغيل وحساب المرونة.
- `js/data/stage-backgrounds.js` — ربط المشاهد بالمجموعات البصرية وترتيب `SCENE_ORDER`.
- `js/data/stage-tasks.js` — الهدف والقيد وشرط الانتهاء لكل مرحلة.
- `js/components/scene-guidance.js` — العرض المرئي للمهمة، مع الاعتماد على قواعد المجال بدل إنشاء نسخة حسابية مستقلة.
- `js/scenes/` — منطق كل مشهد والأحداث والقرارات والتنقل.

## مجموعات المشاهد

`SCENES_BY_STAGE` يفصل الآن:

- `prelude`: البداية والانتقال من الواجهة.
- المراحل الثماني: mining إلى deployment.
- `ending`: تركيب النظام، الإجابة الأصلية، تحدي نقل التعلم، والنتائج.

البداية لم تعد مصنفة داخليًا كجزء من النهاية، لذلك لا يحتاج `app.js` إلى استثناء يدوي لإخفائها من تقدم المراحل.

## قواعد الحالة

يخزن النظام فقط ما يلزم لاستمرار السببية والتاريخ. من الأمثلة:

- `dataStatuses` لحالة المسار.
- `dataChecks` للأدلة المستقلة.
- `dataTrainingApproved / Held` لقرار الأهلية.
- `dataCurrentTrainingUsed` للنسخة الحالية.
- `dataTrainingUsed` للتاريخ.
- `candidateRevision` لربط أدلة التقييم بنسخة محددة.
- `releaseGates / extraChecks / deferredExtraChecks / monitoringChecksCompleted` لتتبع العمل المفتوح والمنجز.
- `deployLoad / deployFailoverChecks / deployTabs / deployRecovery` لتتبع التشغيل.

حقل `trainingCompute` ما زال موجودًا في schema v5 لتوافق الحفظ السابق، لكن أي جولة جديدة تضبطه إلى `8`؛ واجهة اختيار 8/12 حُذفت لأنها لم تعد تمثل مفاضلة حقيقية.

## قواعد المجال المشتركة

`js/domain/game-rules.js` يمنع تكرار الحسابات الأساسية في المشاهد:

- `MIN_COMPUTE_TO_CONTINUE` و`TRAINING_COMPUTE`.
- `hasUnresolved` ومشتقات حواجز البيانات.
- `neededExtraChecks`.
- `DEPLOY_CAPACITY_LIMITS` و`FAILOVER_INGRESS_LIMITS`.
- `failoverCase` و`survivableFailures`.

إذا تغيرت قاعدة حسابية، يجب تعديل المصدر المشترك لا نسخ متعددة في الواجهة.

## العرض

- `character-card.js` — الشخصية الرئيسية عند دخول الدور.
- `supporting-role-strip.js` — الأدوار الداعمة عند دخولها قرارًا أو تنفيذًا.
- `abstraction.js` — يشرح كيف يختصر النظام العمل؛ لا يقول إن الناتج «يتحول حرفيًا إلى المرحلة التالية».
- `progress.js` — تقدم المراحل ومقدماتها المختصرة والمصطلحات.
- `task-flow.js` — حالة «مهمتك الآن».

`persistentFooter` والأنماط المرتبطة به حُذفت لأنها كانت مخفية دائمًا. `ending.css` حُذف بعد نقل القواعد الحية إلى `stage-experience.css`. كما حُذف أصل صورة المشرف الذي لم يعد له استخدام.

## الاختبارات

- `static-integrity.mjs`: الاستيرادات والملفات والـexports والأصول والمشاهد.
- `storage-schema.mjs`: schema v5 والعلاقات السببية وmigration.
- `css-integrity.mjs`: selectors وcustom properties وkeyframes.
- `smoke.mjs`: رحلتان كاملتان desktop/mobile، causal checks، migration، axe، Firefox وWebKit.
- مجموعات `regression-*`: حوكمة البيانات، revisions، المرونة، الإرشاد، النتائج، الأدوار، والوضوح/remediation.

لا توجد ملفات `SECOND-AUDIT-VERIFICATION.md` وما شابه؛ التاريخ موحد في `AUDIT-HISTORY.md`.
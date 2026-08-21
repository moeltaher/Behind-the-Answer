import { DATACENTER_WORKERS, supportingActor } from '../data/supporting-actors.js';

export function createDatacenterRoutes(ctx) {
  const $ = ctx.$;
  const state = ctx.state;
  const { setChapter, chapterIntro, html, go, bind, tone, saveState, addDecision, addLedger } = ctx;
  const abstraction = (humans, word, line, next) =>
    ctx.abstraction(humans, word, line, next);
  const monitorTile = ctx.monitorTile;

  function ch3Intro() {
    chapterIntro(2, 'dcInstall');
  }

  function dcInstall() {
    setChapter(2);
    const steps = [
      ['rack', 'أدخل الخادم في الخزانة'],
      ['power', 'وصّل الطاقة'],
      ['network', 'وصّل الشبكة'],
      ['register', 'سجّل الجهاز في نظام التشغيل']
    ];

    html(`<div><span class="eyebrow">مركز بيانات افتراضي</span><h1 class="scene-title">أنت الآن كارلوس، فني بنية تحتية.</h1><div class="role-card card flat"><div class="avatar">▥</div><div><h3>كارلوس</h3><p>يركّب الخوادم ويصلها بالطاقة والشبكة داخل مركز البيانات.</p></div></div><div class="reality-note"><strong>ما هو الخادم؟</strong> حاسوب قوي مصمم للعمل المستمر. وعندما توجد أعداد كبيرة منه داخل مبنى واحد يسمى المكان «مركز بيانات».</div><div class="rack-board"><div class="server-rack">${Array.from({ length: 8 }, (_, index) => `<div class="server-unit"><span>وحدة ${index + 1}</span><span class="server-lights"><i></i><i></i><i></i></span></div>`).join('')}</div><div class="connect-panel">${steps.map(([id, label], index) => `<button class="connect-step ${state.flags.serverSteps.includes(id) ? 'done' : ''}" data-server-step="${id}" data-index="${index}"><span>${label}</span><span>${state.flags.serverSteps.includes(id) ? '✓' : '→'}</span></button>`).join('')}</div></div><div id="serverStepHelp" class="small muted">نفّذ الخطوات بالترتيب من تركيب الخادم إلى تسجيله.</div>${state.flags.serverSteps.length === steps.length ? '<div class="action-row"><button id="bootServer" class="primary-btn">شغّل اختبار الخادم</button></div>' : ''}</div>`);

    bind('[data-server-step]', 'click', event => {
      const index = Number(event.currentTarget.dataset.index);
      const id = event.currentTarget.dataset.serverStep;

      if (index !== state.flags.serverSteps.length) {
        $('#serverStepHelp').textContent = `ابدأ بالخطوة ${state.flags.serverSteps.length + 1} أولًا.`;
        tone(170, 0.06, 'square');
        return;
      }

      state.flags.serverSteps.push(id);
      saveState();
      dcInstall();
    });

    $('#bootServer')?.addEventListener('click', () => go('dcCooling'));
  }

  function dcCooling() {
    html(`<div><span class="eyebrow">إنذار التبريد أثناء اختبار المجموعة</span><h1 class="scene-title">وحدة التبريد رقم 3 لا تستجيب.</h1><p class="scene-subtitle">لم نصل بعد إلى خدمة المستخدمين. نحن نختبر مجموعة خوادم ستُستخدم لاحقًا في التدريب والتشغيل.</p><div class="monitor"><div class="monitor-tile"><span>حرارة القاعة</span><strong>33° م ↑</strong><div class="bar"><i style="width:88%;background:var(--danger)"></i></div></div>${monitorTile('القدرة الحاسوبية المتاحة', '92%', 72)}${monitorTile('الشبكة', 'مستقرة', 70)}${monitorTile('مهام الاختبار', 'تنتظر', 66)}</div><div class="alert"><strong>فريق البنية ينتظر إتمام الاختبار.</strong><span>يمكن نقل عبء الاختبار إلى قاعة أخرى، أو إيقاف المجموعة المتأثرة حتى إصلاح التبريد.</span></div><div class="choice-grid"><button id="dcMove" class="choice-btn"><strong>انقل عبء الاختبار إلى قاعة أخرى</strong><small>يحافظ على الاختبار لكنه يرفع الحمل في مكان آخر.</small></button><button id="dcStop" class="choice-btn"><strong>أوقف المجموعة المتأثرة</strong><small>يؤخر التجهيز لكنه يقلل الضغط على الأجهزة والعمال.</small></button></div></div>`);

    $('#dcMove').addEventListener('click', () => {
      addDecision(
        'dc-move',
        'نقلت عبء اختبار مركز البيانات',
        'حافظت على الجدول عبر نقل الضغط إلى بنية أخرى.',
        { pressure: 5, cost: -2, burden: 5, reliability: -2 }
      );
      go('dcWorkers');
    });

    $('#dcStop').addEventListener('click', () => {
      addDecision(
        'dc-stop',
        'أوقفت مجموعة خوادم بسبب التبريد',
        'أصبحت تكلفة التوقف مرئية بدل دفع البنية للعمل عند حدها.',
        { pressure: -3, cost: 6, burden: -5, reliability: 4 }
      );
      go('dcWorkers');
    });
  }

  function dcWorkers() {
    const revealed = state.flags.revealedWorkers.length;
    const cards = DATACENTER_WORKERS.map(({ id, actorId, icon }) => {
      const actor = supportingActor(actorId);
      const isRevealed = state.flags.revealedWorkers.includes(id);
      return `<button class="worker-person ${isRevealed ? 'revealed' : ''}" data-worker="${id}"><span class="person-icon">${icon}</span><strong>${ctx.h(actor.name)}</strong><small>${isRevealed ? ctx.h(actor.role) : 'اضغط للكشف عن الدور'}</small></button>`;
    }).join('');

    html(`<div><span class="eyebrow">العمل المحيط بالخادم</span><h1 class="scene-title">مركز البيانات لا يعمل بفني خوادم واحد.</h1><p class="scene-subtitle">اكشف ثلاثة أدوار على الأقل قبل المتابعة. الأدوار الثلاثة الأولى المطلوبة جزء من المهمة؛ ما تكشفه بعدها يحسب ضمن الاستكشاف الاختياري.</p><div class="worker-map">${cards}</div><div class="stage-output"><strong>ما الذي تنتجه هذه المرحلة؟</strong>خوادم تعمل ويمكن تخصيص قدرتها لتدريب النموذج أو تشغيله.</div><div class="action-row"><button id="dcReady" class="primary-btn" ${revealed < 3 ? 'disabled' : ''}>${revealed < 3 ? `اكشف ${3 - revealed} أدوار أخرى` : 'المجموعة جاهزة'}</button></div></div>`);

    bind('[data-worker]', 'click', event => {
      const id = event.currentTarget.dataset.worker;
      if (state.flags.revealedWorkers.includes(id)) return;

      state.flags.revealedWorkers.push(id);
      saveState();
      dcWorkers();
    });

    $('#dcReady')?.addEventListener('click', () => {
      addLedger(
        2,
        'كارلوس وفرق المرافق',
        'تركيب وطاقة وتبريد وشبكات وصيانة مستمرة',
        'خوادم متاحة للتشغيل',
        `استعرضت ${state.flags.revealedWorkers.length} من ${DATACENTER_WORKERS.length} أدوار داخل مركز البيانات.`
      );
      go('abstract3');
    });
  }

  function abstract3() {
    abstraction(
      [['كارلوس', 'فني بنية تحتية', '▥'], ['التبريد', '', '❄'], ['الكهرباء', '', '⚡'], ['الشبكات', '', '≋']],
      'الخوادم جاهزة للعمل',
      'التركيب والكهرباء والتبريد والشبكات والورديات أصبحت في لوحة التشغيل «قدرة حاسوبية متاحة».',
      'ch4Intro'
    );
  }

  return { ch3Intro, dcInstall, dcCooling, dcWorkers, abstract3 };
}

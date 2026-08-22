export function createRouter({ state, settings, sceneEl, save, tone }) {
  const routes = {};
  let transitionTimer = null;

  function focusRenderedContent(preferStatus=false) {
    const target=(preferStatus?sceneEl.querySelector('[role="status"]:not([hidden])'):null)||sceneEl.querySelector('h1');
    if (!target) {
      sceneEl.setAttribute('tabindex', '-1');
      sceneEl.focus({ preventScroll: true });
      return;
    }
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  }

  function html(content) {
    if (transitionTimer) clearTimeout(transitionTimer);
    const hadSceneFocus=sceneEl.contains(document.activeElement);
    sceneEl.classList.remove('entering');
    sceneEl.innerHTML = content;
    if (hadSceneFocus) requestAnimationFrame(()=>focusRenderedContent(true));
    if (!settings.reduceMotion) requestAnimationFrame(() => sceneEl.classList.add('entering'));
    transitionTimer = window.setTimeout(() => {
      sceneEl.classList.remove('entering');
      transitionTimer = null;
    }, settings.reduceMotion ? 0 : 600);
  }

  function bind(selector, event, handler) {
    sceneEl.querySelectorAll(selector).forEach(element => element.addEventListener(event, handler));
  }

  function render() {
    const route = routes[state.scene] || routes.intro;
    route();
  }

  function go(sceneId) {
    state.scene = sceneId;
    save();
    render();
    window.scrollTo({ top: 0, behavior: settings.reduceMotion ? 'auto' : 'smooth' });
    requestAnimationFrame(()=>focusRenderedContent(false));
    tone(520, 0.045);
  }

  function register(group) { Object.assign(routes, group); }

  return { html, bind, render, go, register, routes };
}

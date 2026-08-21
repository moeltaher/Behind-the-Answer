export function createRouter({ state, settings, sceneEl, save, tone }) {
  const routes = {};
  let transitionTimer = null;

  function html(content) {
    if (transitionTimer) clearTimeout(transitionTimer);
    sceneEl.classList.remove('entering');
    sceneEl.innerHTML = content;
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

  function focusSceneHeading() {
    const heading = sceneEl.querySelector('h1');
    if (!heading) {
      sceneEl.setAttribute('tabindex', '-1');
      sceneEl.focus({ preventScroll: true });
      return;
    }
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
  }

  function go(sceneId) {
    state.scene = sceneId;
    save();
    render();
    window.scrollTo({ top: 0, behavior: settings.reduceMotion ? 'auto' : 'smooth' });
    requestAnimationFrame(focusSceneHeading);
    tone(520, 0.045);
  }

  function register(group) { Object.assign(routes, group); }

  return { html, bind, render, go, register, routes };
}

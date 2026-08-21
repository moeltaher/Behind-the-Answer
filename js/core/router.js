export function createRouter({ state, settings, sceneEl, save, tone, renderLedger }) {
  const routes = {};
  let transitionTimer = null;

  function html(content) {
    if (transitionTimer) clearTimeout(transitionTimer);

    sceneEl.classList.remove('entering');
    sceneEl.innerHTML = content;

    requestAnimationFrame(() => sceneEl.classList.add('entering'));
    transitionTimer = window.setTimeout(() => {
      sceneEl.classList.remove('entering');
      transitionTimer = null;
    }, 600);
  }

  function bind(selector, event, handler) {
    sceneEl.querySelectorAll(selector).forEach(element => {
      element.addEventListener(event, handler);
    });
  }

  function render() {
    const route = routes[state.scene] || routes.intro;
    route();
    renderLedger();
  }

  function go(sceneId) {
    state.scene = sceneId;
    save();
    render();
    window.scrollTo({
      top: 0,
      behavior: settings.reduceMotion ? 'auto' : 'smooth'
    });
    tone(520, 0.045);
  }

  function register(group) {
    Object.assign(routes, group);
  }

  return { html, bind, render, go, register, routes };
}

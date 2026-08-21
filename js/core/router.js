export function createRouter({stateProxy,settingsProxy,sceneEl,save,tone,renderLedger}){const routes={};
  const html=content=>{sceneEl.classList.remove('entering');sceneEl.innerHTML=content;requestAnimationFrame(()=>sceneEl.classList.add('entering'));setTimeout(()=>sceneEl.classList.remove('entering'),600);};
  const bind=(selector,event,handler)=>sceneEl.querySelectorAll(selector).forEach(el=>el.addEventListener(event,handler));
  const render=()=>{(routes[stateProxy.scene]||routes.intro)();renderLedger();};
  const go=id=>{stateProxy.scene=id;save();render();window.scrollTo({top:0,behavior:settingsProxy.reduceMotion?'auto':'smooth'});tone(520,.045);};
  const register=group=>Object.assign(routes,group);
  return {html,bind,render,go,register,routes};}

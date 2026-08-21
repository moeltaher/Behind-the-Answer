const SETTING_IDS = [
  'reduceMotion',
  'highContrast',
  'largeText',
  'soundOn'
];

export function applySettings(settings) {
  document.body.classList.toggle('reduced-motion', settings.reduceMotion);
  document.body.classList.toggle('high-contrast', settings.highContrast);
  document.body.classList.toggle('large-text', settings.largeText);

  for (const id of SETTING_IDS) {
    const input = document.getElementById(id);
    if (input) input.checked = Boolean(settings[id]);
  }
}

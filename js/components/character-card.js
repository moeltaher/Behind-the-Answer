export function characterCard(character) {
  if (!character) return '';
  return `<aside class="scene-character" aria-label="الشخصية في هذا المشهد">
    <div class="scene-character__portrait">
      <img src="${character.image}" alt="رسم كرتوني لشخصية ${character.name} — ${character.role}" />
    </div>
    <div class="scene-character__copy">
      <span class="scene-character__label">من يعمل هنا؟</span>
      <strong>${character.name}</strong>
      <small>${character.role}</small>
      <p>${character.tagline}</p>
    </div>
  </aside>`;
}

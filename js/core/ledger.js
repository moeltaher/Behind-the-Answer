import { escapeHtml as h } from './state.js';

export function addLedger(state, chapter, human, work, system, details = '') {
  const alreadyRecorded = state.ledger.some(entry => entry.chapter === chapter);
  if (alreadyRecorded) return;

  state.ledger.push({ chapter, human, work, system, details });
}

function renderLedgerEntry(chapter, index, entry) {
  if (!entry) {
    return `
      <div class="ledger-entry locked">
        <div class="ledger-icon" aria-hidden="true">${chapter.icon}</div>
        <div>
          <h3>${index + 1}. ${h(chapter.title)}</h3>
          <p>لم تصل إلى هذه المرحلة بعد.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="ledger-entry">
      <div class="ledger-icon" aria-hidden="true">${chapter.icon}</div>
      <div>
        <h3>${index + 1}. ${h(chapter.title)}</h3>
        <p><strong>${h(entry.human)}</strong> — ${h(entry.work)}</p>
        <p>في النظام: <span class="system-name">${h(entry.system)}</span></p>
        ${entry.details ? `<p>${h(entry.details)}</p>` : ''}
      </div>
    </div>
  `;
}

export function renderLedger(state, chapters, container) {
  container.innerHTML = chapters
    .map((chapter, index) => {
      const entry = state.ledger.find(item => item.chapter === index);
      return renderLedgerEntry(chapter, index, entry);
    })
    .join('');
}

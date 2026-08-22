import { escapeHtml as h } from './state.js';

export function addLedger(state, chapter, human, work, system, details = '') {
  const alreadyRecorded = state.ledger.some(entry => entry.chapter === chapter && entry.human === human && entry.work === work && entry.system === system && entry.details === details);
  if (alreadyRecorded) return;

  state.ledger.push({ chapter, human, work, system, details });
}

function renderLedgerRecord(entry, latest) {
  return `<div class="ledger-record${latest ? ' ledger-record--latest' : ''}">${latest ? '<span class="kicker">السجل الأحدث</span>' : '<span class="kicker">سجل تاريخي</span>'}<p><strong>${h(entry.human)}</strong> — ${h(entry.work)}</p><p>في النظام: <span class="system-name">${h(entry.system)}</span></p>${entry.details ? `<p>${h(entry.details)}</p>` : ''}</div>`;
}

function renderLedgerEntry(chapter, index, entries) {
  if (!entries.length) {
    return `<div class="ledger-entry locked"><div class="ledger-icon" aria-hidden="true">${chapter.icon}</div><div><h3>${index + 1}. ${h(chapter.title)}</h3><p>لم تصل إلى هذه المرحلة بعد.</p></div></div>`;
  }
  const latest=entries[entries.length-1];
  const history=entries.slice(0,-1).reverse();
  return `<div class="ledger-entry"><div class="ledger-icon" aria-hidden="true">${chapter.icon}</div><div><h3>${index + 1}. ${h(chapter.title)}</h3>${renderLedgerRecord(latest,true)}${history.length ? `<details class="ledger-history"><summary>عرض ${history.length} سجل تاريخي سابق</summary>${history.map(entry=>renderLedgerRecord(entry,false)).join('')}</details>` : ''}</div></div>`;
}

export function renderLedger(state, chapters, container) {
  container.innerHTML = chapters.map((chapter, index) => renderLedgerEntry(chapter, index, state.ledger.filter(item => item.chapter === index))).join('');
}

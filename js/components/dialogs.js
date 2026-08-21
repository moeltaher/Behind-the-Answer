import { DEMO_PROMPT } from '../data/story.js';

export function bindDialogs(ctx) {
  ctx.$('#settingsBtn').addEventListener('click', () => {
    ctx.settingsDialog.showModal();
  });

  const promptDialogText = ctx.$('#promptDialogText');
  ctx.promptBtn.addEventListener('click', () => {
    if (promptDialogText) promptDialogText.textContent = DEMO_PROMPT;
    ctx.promptDialog.showModal();
  });
  ctx.promptDialog.addEventListener('close', () => {
    if (promptDialogText) promptDialogText.textContent = '';
  });

  ctx.ledgerBtn.addEventListener('click', () => {
    ctx.renderLedger();
    ctx.ledgerDialog.showModal();
  });

  ctx.$$('[data-close-dialog]').forEach(button => {
    button.addEventListener('click', () => {
      const dialog = ctx.$(`#${button.dataset.closeDialog}`);
      if (dialog?.open) dialog.close();
    });
  });

  ctx.$('#resetProgress').addEventListener('click', () => {
    ctx.confirmResetDialog.showModal();
  });

  ctx.$('#confirmReset').addEventListener('click', () => {
    ctx.resetGame(true);
  });
}

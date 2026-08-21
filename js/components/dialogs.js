export function bindDialogs(ctx) {
  ctx.$('#settingsBtn').addEventListener('click', () => {
    ctx.settingsDialog.showModal();
  });

  ctx.promptBtn.addEventListener('click', () => {
    ctx.promptDialog.showModal();
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

export const DEFAULT_STATE = {
    scene: 'intro',
    chapter: 0,
    metrics: {
      pressure: 50,
      cost: 50,
      burden: 42,
      quality: 62,
      visibility: 20
    },
    decisions: [],
    ledger: [],
    flags: {
      miningCount: 0,
      miningWarning: false,
      miningStopped: false,
      factoryPPE: [],
      factoryChoice: null,
      serverSteps: [],
      revealedWorkers: [],
      dataOrigins: [],
      dataIndex: 0,
      dataSort: {keep:0, remove:0, review:0},
      annotationIndex: 0,
      annotationCounts: {accepted:0, pending:0, rejected:0},
      tookBreak: false,
      trainingConfigured: false,
      evalIndex: 0,
      deployTabs: [],
      supportIndex: 0,
      finalEnding: null
    }
  };

export const clone = obj => JSON.parse(JSON.stringify(obj));
export const clamp = (v,min=0,max=100) => Math.max(min,Math.min(max,v));
export const escapeHtml = (str='') => String(str).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

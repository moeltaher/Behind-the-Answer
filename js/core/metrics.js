import { clamp } from './state.js';
export function mutateMetrics(state,delta={}){Object.entries(delta).forEach(([k,v])=>state.metrics[k]=clamp((state.metrics[k]||0)+v));}
export function addDecision(state,id,label,effectText,delta={}){if(!state.decisions.some(d=>d.id===id))state.decisions.push({id,label,effectText});mutateMetrics(state,delta);}

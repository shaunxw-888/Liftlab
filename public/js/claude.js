// Client for the Netlify Claude function.
import { auth } from './store.js';
import { EXERCISES, MUSCLES } from './exercises.js';
import { isAvailable } from './engine.js';

export async function askClaude(task, payload) {
  const user = auth.currentUser; if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  const r = await fetch('/.netlify/functions/claude', {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ task, payload })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Claude unavailable (${r.status})`);
  return data;
}

export function libraryText(state, { includeAddons = true, withReason = false } = {}) {
  return EXERCISES.filter(e => isAvailable(e, state) && (includeAddons || !e.tags.includes('addon')))
    .map(e => [e.id, e.name, e.primary.join('+'), e.secondary.join('+') || '-', e.type, withReason ? e.reason : (e.tags.join('+') || '-')].join(' | '))
    .join('\n');
}
export const MUSCLE_KEYS = Object.keys(MUSCLES);

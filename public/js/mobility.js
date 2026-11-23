// Separate mobility routine: static holds, tracked as minutes per area per week.
// Evidence: flexibility gains plateau around ~10 min of static stretching per muscle group per week
// (Sports Med 2025 meta-analysis); weekly frequency itself didn't change gains, so any split works.
import { weekStart, goalsOf } from './engine.js';

export const AREAS = {
  hips: 'Hips', hamstrings: 'Hamstrings', ankles: 'Calves and ankles',
  thoracic: 'Upper back', chest: 'Chest and shoulders', neck: 'Neck'
};
export const WEEKLY_TARGET_SECS = 600; // ~10 min per area per week
const HOLD_ROUNDS = 2;
const PREP_SECS = 5;

export const DRILLS = [
  { id: 'couch', name: 'Couch stretch', area: 'hips', hold: 45, sides: 2, cue: 'Back knee down, squeeze glute, hips forward' },
  { id: 'h9090', name: '90/90 hip stretch', area: 'hips', hold: 45, sides: 2, cue: 'Sit tall, lean over the front shin' },
  { id: 'ham_step', name: 'Standing hamstring stretch', area: 'hamstrings', hold: 45, sides: 2, cue: 'Heel on a low step, hinge forward with a flat back' },
  { id: 'ham_strap', name: 'Lying hamstring stretch', area: 'hamstrings', hold: 45, sides: 2, cue: 'On your back, straight leg up, pull gently with a towel' },
  { id: 'calf_wall', name: 'Wall calf stretch', area: 'ankles', hold: 45, sides: 2, cue: 'Back heel down, back knee straight' },
  { id: 'soleus_wall', name: 'Bent-knee calf stretch', area: 'ankles', hold: 45, sides: 2, cue: 'Back knee bent, drive it forward over the toes' },
  { id: 'open_book', name: 'Open book rotation', area: 'thoracic', hold: 45, sides: 2, cue: 'Lie on your side, rotate the top arm open and breathe' },
  { id: 'tspine_ext', name: 'Thoracic extension', area: 'thoracic', hold: 45, sides: 1, cue: 'Upper back over a foam roller or bench edge, arms overhead' },
  { id: 'doorway', name: 'Doorway pec stretch', area: 'chest', hold: 45, sides: 2, cue: 'Forearm on the door frame, step through gently' },
  { id: 'lat_overhead', name: 'Overhead lat stretch', area: 'chest', hold: 45, sides: 2, cue: 'Hold a rack or frame overhead, sit hips back' },
  { id: 'upper_trap', name: 'Upper trap stretch', area: 'neck', hold: 30, sides: 2, cue: 'Ear to shoulder, light hand pressure' },
  { id: 'levator', name: 'Levator stretch', area: 'neck', hold: 30, sides: 2, cue: 'Nose towards armpit, light hand pressure' }
];
export const DRILL = Object.fromEntries(DRILLS.map(d => [d.id, d]));

export function areasFor(state) {
  const a = ['hips', 'hamstrings', 'ankles', 'thoracic', 'chest'];
  if (goalsOf(state).posture) a.push('neck');
  return a;
}

export function weeklySecs(state, now = Date.now()) {
  const ws = weekStart(now); const out = Object.fromEntries(Object.keys(AREAS).map(k => [k, 0]));
  for (const l of state.mobilityLog || []) if (l.at >= ws) for (const [k, v] of Object.entries(l.secs || {})) out[k] = (out[k] || 0) + v;
  return out;
}

export function weekDone(state, now = Date.now()) {
  const w = weeklySecs(state, now);
  return areasFor(state).every(a => w[a] >= WEEKLY_TARGET_SECS);
}

// ~12 min routine: the 4 areas furthest from this week's target, alternating drills.
export function buildRoutine(state, now = Date.now()) {
  const w = weeklySecs(state, now);
  const n = (state.mobilityLog || []).length;
  const areas = areasFor(state).sort((a, b) => w[a] - w[b]).slice(0, 4);
  const steps = [];
  areas.forEach((area, k) => {
    const opts = DRILLS.filter(d => d.area === area);
    const d = opts[(n + k) % opts.length];
    for (let r = 1; r <= HOLD_ROUNDS; r++) for (let s = 0; s < d.sides; s++)
      steps.push({ drill: d.id, area, secs: d.hold, side: d.sides === 2 ? (s ? 'Right' : 'Left') : null, round: r, rounds: HOLD_ROUNDS });
  });
  const secs = steps.reduce((a, s) => a + s.secs + PREP_SECS, 0);
  return { steps, areas, minutes: Math.round(secs / 60) };
}
export { PREP_SECS };

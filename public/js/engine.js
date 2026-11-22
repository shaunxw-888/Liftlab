// Liftlab engine: recovery, weekly planning, session generation, progression, plates, PRs.
// Pure functions only (no DOM, no Firebase) so they can be tested in Node.
import { EX, EXERCISES, RECOVERY_TAU, MUSCLES, SEEDS } from './exercises.js';

const H = 3600000, DAY = 24 * H;

// ---------- maths ----------
export const e1rm = (w, r) => (!w || !r || r < 1) ? 0 : r === 1 ? w : w * 36 / (37 - Math.min(r, 30));
export const weightFor = (e1, reps, rir = 2) => e1 * (37 - Math.min(reps + rir, 30)) / 36;
export const roundTo = (w, inc) => Math.round(w / inc) * inc;
export const fmtKg = (w) => (w == null ? '' : (Math.round(w * 100) / 100).toString());

const isWeighted = (ex) => ex.loading !== 'bodyweight';

// ---------- dates ----------
export function weekStart(t) {
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow); return d.getTime();
}
export const weekKey = (t) => new Date(weekStart(t)).toISOString().slice(0, 10);
export const dayStart = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

// ---------- availability ----------
export function isAvailable(ex, state) {
  const eq = new Set(state.equipment || []);
  return ex.equip.every(k => eq.has(k)) && !(state.excluded || []).includes(ex.id);
}

// ---------- basketball ----------
export function gameTimes(state, now) {
  const out = [];
  const gd = state.settings?.gameDay;
  if (gd != null && gd !== '') {
    for (let w = -1; w <= 1; w++) {
      const ws = weekStart(now) + w * 7 * DAY;
      const t = ws + ((Number(gd) + 6) % 7) * DAY + 19 * H; // 7pm on game day
      if (!(state.gameSkips || []).includes(weekKey(t))) out.push(t);
    }
  }
  (state.games || []).forEach(t => out.push(t));
  return out;
}
const GAME_LOAD = { quads: 5, hamstrings: 3, calves: 6, glutes: 4, adductors: 3, abductors: 3, lowerBack: 1 };

// relation of a given day to the game: 'game' | 'before' | 'after' | null
export function gameRelation(state, t) {
  const ds = dayStart(t);
  for (const g of gameTimes(state, t)) {
    const gs = dayStart(g);
    if (gs === ds) return 'game';
    if (gs === ds + DAY) return 'before';
    if (gs === ds - DAY) return 'after';
  }
  return null;
}

// ---------- recovery ----------
export function readiness(state, now = Date.now()) {
  const fat = Object.fromEntries(Object.keys(MUSCLES).map(m => [m, 0]));
  const add = (m, c, t) => {
    const h = (now - t) / H; if (h < 0 || h > 24 * 7) return;
    fat[m] += c * Math.exp(-h / (RECOVERY_TAU[m] || 24));
  };
  for (const w of state.workouts || []) {
    if (now - w.startedAt > 8 * DAY) continue;
    for (const e of w.exercises) {
      const ex = EX[e.exId]; if (!ex || ex.tags.includes('mobility')) continue;
      for (const s of e.sets) {
        if (!s.done || s.warmup) continue;
        const t = s.at || w.endedAt || w.startedAt;
        ex.primary.forEach(m => add(m, 1, t));
        ex.secondary.forEach(m => add(m, 0.5, t));
      }
    }
  }
  for (const g of gameTimes(state, now)) for (const [m, c] of Object.entries(GAME_LOAD)) add(m, c, g);
  const out = {};
  for (const m of Object.keys(fat)) {
    let r = Math.max(0, Math.min(100, Math.round(100 - fat[m] * 9)));
    const s = state.soreness?.[m];
    if (s) {
      const age = (now - s.at) / H;
      if (s.level === 'bit' && age < 36) r = Math.min(r, 60);
      if (s.level === 'very' && age < 60) r = Math.min(r, 25);
    }
    out[m] = r;
  }
  return out;
}

// ---------- weekly plan ----------
export const TEMPLATE_NAMES = { upper: 'Upper Body', lower: 'Lower Body + Core', full: 'Full Body' };
const PLANS = {
  2: ['full', 'full'], 3: ['upper', 'lower', 'full'], 4: ['upper', 'lower', 'upper', 'lower'],
  5: ['upper', 'lower', 'full', 'upper', 'lower'], 6: ['upper', 'lower', 'full', 'upper', 'lower', 'full']
};
const SLOTS = {
  upper: [['chest', 'lats', 'upperBack', 'sideDelts', 'triceps', 'biceps', 'rearDelts'],
          ['frontDelts', 'upperBack', 'chest', 'lats', 'sideDelts', 'rearDelts', 'biceps', 'triceps']],
  lower: [['quads', 'hamstrings', 'glutes', 'calves', 'abductors', 'abs'],
          ['hamstrings', 'quads', 'glutes', 'calves', 'adductors', 'obliques', 'abs']],
  full: [['quads', 'chest', 'upperBack', 'hamstrings', 'sideDelts', 'abs'],
         ['hamstrings', 'chest', 'lats', 'quads', 'sideDelts', 'biceps', 'abs']]
};
const WEEKLY = { // hard sets per week for "build"
  chest: 12, lats: 8, upperBack: 8, quads: 12, hamstrings: 10, glutes: 6, sideDelts: 10, rearDelts: 6,
  frontDelts: 3, biceps: 8, triceps: 8, calves: 8, abs: 6, obliques: 3, adductors: 3, abductors: 4
};
export function weeklyTarget(m, goal) {
  const base = WEEKLY[m] || 0;
  return goal === 'build' ? base : Math.round(base * 0.8);
}
export function planWeek(settings) {
  const days = Math.min(6, Math.max(2, Number(settings?.days) || 3));
  const types = PLANS[days];
  const seen = {};
  return types.map((type, i) => {
    seen[type] = (seen[type] || 0);
    const variant = type === 'full' && days === 3 ? 1 : seen[type]++ % 2;
    return { key: `${type}${i}`, type, variant, name: TEMPLATE_NAMES[type] };
  });
}
export function frequency(plan) {
  const f = {};
  plan.forEach(p => new Set(SLOTS[p.type][p.variant]).forEach(m => { f[m] = (f[m] || 0) + 1; }));
  return f;
}

export function weekWorkouts(state, now = Date.now()) {
  const ws = weekStart(now);
  return (state.workouts || []).filter(w => w.startedAt >= ws && w.startedAt < ws + 7 * DAY);
}

// Session cards for this week: remaining templates, ordered by readiness.
export function sessionCards(state, now = Date.now()) {
  const plan = planWeek(state.settings);
  const done = weekWorkouts(state, now);
  const doneKeys = new Set(done.map(w => w.templateKey));
  const ready = readiness(state, now);
  const rel = gameRelation(state, now);
  const remaining = plan.filter(p => !doneKeys.has(p.key));
  const cards = remaining.map(p => {
    const muscles = [...new Set(SLOTS[p.type][p.variant])];
    const key3 = muscles.slice(0, 3);
    const score = Math.round(key3.reduce((a, m) => a + ready[m], 0) / key3.length);
    let note = null, penalty = 0;
    if ((p.type === 'lower' || p.type === 'full') && rel) {
      note = rel === 'before' ? 'Game tomorrow: save your legs' : rel === 'game' ? 'Game day: legs not recommended' : 'Day after game: legs still recovering';
      penalty = p.type === 'lower' ? 50 : 25;
    }
    return { ...p, muscles, score, note, rank: score - penalty, perMuscle: Object.fromEntries(key3.map(m => [m, ready[m]])) };
  });
  cards.sort((a, b) => b.rank - a.rank);
  return { cards, done, plan, total: plan.length };
}

// ---------- history ----------
export function exerciseHistory(state, exId, beforeTime = Infinity) {
  const out = [];
  for (const w of state.workouts || []) {
    if (w.startedAt >= beforeTime) continue;
    const e = w.exercises.find(x => x.exId === exId);
    if (!e) continue;
    const sets = e.sets.filter(s => s.done && !s.warmup);
    if (sets.length) out.push({ at: w.startedAt, rough: !!w.rough, workoutId: w.id, sets, rir: e.firstRir || null });
  }
  return out.sort((a, b) => b.at - a.at);
}

export function bestFor(state, exId, beforeTime = Infinity) {
  const b = { e1rm: 0, weight: 0, reps: 0, repsAt: {}, sessions: 0 };
  for (const h of exerciseHistory(state, exId, beforeTime)) {
    b.sessions++;
    for (const s of h.sets) {
      b.e1rm = Math.max(b.e1rm, e1rm(s.weight, s.reps));
      b.weight = Math.max(b.weight, s.weight || 0);
      b.reps = Math.max(b.reps, s.reps || 0);
      const k = fmtKg(s.weight || 0);
      b.repsAt[k] = Math.max(b.repsAt[k] || 0, s.reps);
    }
  }
  return b;
}

export function detectPR(state, exId, set, beforeTime) {
  const ex = EX[exId]; const b = bestFor(state, exId, beforeTime);
  if (!b.sessions || set.warmup) return null;
  if (isWeighted(ex) && set.weight) {
    if (e1rm(set.weight, set.reps) > b.e1rm + 0.05) return 'e1RM PR';
    if (set.weight > b.weight) return 'Weight PR';
    const prev = b.repsAt[fmtKg(set.weight)];
    if (prev != null && set.reps > prev) return `Rep PR at ${fmtKg(set.weight)} kg`;
    return null;
  }
  return set.reps > b.reps ? 'Rep PR' : null;
}

// ---------- progression ----------
export function repRange(ex, goal) {
  if (goal === 'strength' && ex.type === 'compound' && ex.loading === 'barbell') return [4, 6];
  return ex.reps;
}
export function incFor(ex) { return ex.inc || 2.5; }

export function suggestTarget(state, exId, now = Date.now()) {
  const ex = EX[exId]; const goal = state.settings?.goal || 'build';
  const [lo, hi] = repRange(ex, goal); const inc = incFor(ex);
  let hist = exerciseHistory(state, exId, now);
  // A single rough day doesn't count against progression.
  if (hist.length >= 2 && hist[0].rough && !hist[1].rough) hist = hist.slice(1);
  const last = hist[0];
  if (!last) {
    const seed = (state.seeds || SEEDS)[exId];
    if (seed && isWeighted(ex)) {
      const e1 = seed.e1rm || e1rm(seed.weight, seed.reps);
      const reps = Math.min(hi, lo + 1);
      return { weight: Math.max(inc, roundTo(weightFor(e1, reps, 2), inc)), reps, lo, hi, reason: 'Starting point from your Gravl best' };
    }
    return { weight: null, reps: lo + 1 > hi ? lo : lo + 1, lo, hi, reason: 'First time: pick a weight with 2 reps left in the tank' };
  }
  const sets = last.sets;
  const top = Math.max(...sets.map(s => s.weight || 0));
  const atTop = sets.filter(s => (s.weight || 0) === top);
  const minReps = Math.min(...atTop.map(s => s.reps));
  const unit = ex.unit === 's' ? 's' : ex.unit === 'm' ? 'm' : 'reps';
  if (!isWeighted(ex) || !top) {
    const reps = minReps >= hi ? hi : Math.min(hi, minReps + 1);
    return { weight: null, reps, lo, hi, reason: minReps >= hi ? `Top of range: slow it down or add load` : `Aim for ${reps} ${unit}` };
  }
  if (minReps >= hi) {
    const easy = last.rir === '3+';
    const w = top + inc * (easy ? 2 : 1);
    return { weight: w, reps: lo, lo, hi, reason: `+${fmtKg(w - top)} kg: hit ${hi} on every set${easy ? ' with reps to spare' : ''}` };
  }
  if (minReps >= lo) {
    const reps = Math.min(hi, minReps + 1);
    return { weight: top, reps, lo, hi, reason: `Same weight, aim for ${reps}` };
  }
  const prev = hist[1];
  const prevBelow = prev && Math.min(...prev.sets.map(s => s.reps)) < lo;
  if (prevBelow) {
    const w = Math.max(inc, roundTo(top * 0.93, inc));
    return { weight: w, reps: lo, lo, hi, reason: 'Lighter: missed the range twice, rebuild' };
  }
  return { weight: top, reps: lo, lo, hi, reason: `Same weight, aim for ${lo}` };
}

export function warmups(ex, weight) {
  if (!weight || ex.type !== 'compound' || !['barbell', 'plate'].includes(ex.loading) || weight < 40) return [];
  const bar = ex.bar === 'olympic' ? 20 : 0;
  return [[0.5, 8], [0.7, 5], [0.85, 3]].map(([p, r]) => ({ weight: Math.max(bar, roundTo(weight * p, incFor(ex))), reps: r, warmup: true, done: false }));
}

// ---------- generation ----------
function rankFor(muscle, state, used, wantCompound, now) {
  const recent = new Set();
  for (const w of state.workouts || []) if (now - w.startedAt < 21 * DAY) w.exercises.forEach(e => recent.add(e.exId));
  const boosted = new Set(state.boosted || []);
  return EXERCISES
    .filter(e => e.primary.includes(muscle) && !e.tags.includes('addon') && isAvailable(e, state) && !used.has(e.id))
    .map((e, i) => ({ e, s: (boosted.has(e.id) ? 6 : 0) + (recent.has(e.id) ? 2 : 0) + (wantCompound === (e.type === 'compound') ? 3 : 0) - i * 0.01 }))
    .sort((a, b) => b.s - a.s).map(x => x.e);
}

export function estimateMinutes(items) {
  let s = 0;
  for (const it of items) {
    const ex = EX[it.exId]; if (ex.tags.includes('mobility')) continue;
    const n = it.sets.filter(x => !x.warmup).length, wu = it.sets.filter(x => x.warmup).length;
    const work = ex.perSide ? 70 : 45;
    s += n * (work + (it.superset === 'a' ? 15 : ex.rest)) + wu * 75;
  }
  return Math.round(s / 60);
}

export function generateSession(state, tpl, opts = {}) {
  const now = opts.now || Date.now();
  const goal = state.settings?.goal || 'build';
  const minutes = opts.minutes || Number(state.settings?.minutes) || 60;
  const plan = planWeek(state.settings);
  const freq = frequency(plan);
  const ready = readiness(state, now);
  const addons = state.settings?.addons || {};
  const rel = gameRelation(state, now);
  const used = new Set(); const items = [];
  const slots = SLOTS[tpl.type][tpl.variant];

  // Jump work first while fresh, never around the game.
  if (addons.jump && tpl.type !== 'upper' && !rel) {
    const jumps = EXERCISES.filter(e => e.tags.includes('jump') && isAvailable(e, state) && !e.tags.includes('advanced'));
    const pick = jumps[(weekStart(now) / (7 * DAY) + tpl.variant) % jumps.length | 0] || jumps[0];
    if (pick) { items.push({ exId: pick.id, sets: 3, priority: 0 }); used.add(pick.id); }
  }

  slots.forEach((m, idx) => {
    const wk = weeklyTarget(m, goal); if (!wk) return;
    let n = Math.round(wk / (freq[m] || 1));
    if (ready[m] < 50) n = Math.max(2, Math.round(n * 0.6)); // under-recovered: trim
    if (ready[m] < 25) return; // very sore: skip
    n = Math.max(2, Math.min(8, n));
    const big = ['chest', 'lats', 'upperBack', 'quads', 'hamstrings'].includes(m);
    const firstCompound = big || m === 'frontDelts' || m === 'glutes';
    const ranked = rankFor(m, state, used, firstCompound, now);
    if (!ranked.length) return;
    const pickIdx = firstCompound && ranked.length > 1 ? tpl.variant % 2 : 0;
    const first = ranked[pickIdx];
    const parts = n >= 5 && big ? [Math.ceil(n / 2), Math.floor(n / 2)] : [Math.min(4, n)];
    items.push({ exId: first.id, sets: parts[0], priority: idx + 1 }); used.add(first.id);
    if (parts[1]) {
      const second = rankFor(m, state, used, false, now)[0];
      if (second) { items.push({ exId: second.id, sets: Math.min(4, parts[1]), priority: idx + 1.5 }); used.add(second.id); }
    }
  });

  if (addons.posture && tpl.type !== 'lower') {
    const p = EXERCISES.find(e => e.tags.includes('posture') && e.tags.includes('addon') && isAvailable(e, state) && !used.has(e.id));
    if (p) { items.push({ exId: p.id, sets: 2, priority: 50 }); used.add(p.id); }
  }

  // Order: jumps, compounds, isolations.
  const order = (it) => { const e = EX[it.exId]; return e.tags.includes('jump') ? 0 : e.type === 'compound' ? 1 : 2; };
  items.sort((a, b) => order(a) - order(b) || a.priority - b.priority);

  // Build set targets.
  let built = items.map((it, i) => buildItem(state, it.exId, it.sets, now, i === items.findIndex(x => EX[x.exId].type === 'compound')));
  built.forEach((b, i) => { b.priority = items[i].priority; });

  // Superset last two isolations if they hit different muscles.
  const iso = built.filter(b => EX[b.exId].type === 'isolation' && !EX[b.exId].tags.includes('addon'));
  if (iso.length >= 2) {
    const [a, b] = iso.slice(-2);
    if (EX[a.exId].primary[0] !== EX[b.exId].primary[0]) { a.superset = 'a'; b.superset = 'b'; }
  }

  // Trim to time budget: drop sets from lowest priority, then whole exercises.
  let guard = 0;
  while (estimateMinutes(built) > minutes && guard++ < 60) {
    const byPri = [...built].sort((a, b) => b.priority - a.priority);
    const victim = byPri.find(b => b.sets.filter(s => !s.warmup).length > 2);
    if (victim) { const i = victim.sets.map(s => !s.warmup).lastIndexOf(true); victim.sets.splice(i, 1); continue; }
    if (built.length <= 3) break;
    built.splice(built.indexOf(byPri[0]), 1);
  }

  const mobility = addons.mobility ? EXERCISES.filter(e => e.tags.includes('mobility') && isAvailable(e, state)).slice(tpl.variant, tpl.variant + 2).map(e => e.id) : [];
  return { templateKey: tpl.key, type: tpl.type, name: tpl.name, exercises: built, mobility, estMinutes: estimateMinutes(built) };
}

export function buildItem(state, exId, nSets, now = Date.now(), withWarmups = false) {
  const ex = EX[exId]; const t = suggestTarget(state, exId, now);
  const sets = [];
  if (withWarmups) sets.push(...warmups(ex, t.weight));
  for (let i = 0; i < nSets; i++) sets.push({ weight: t.weight, reps: t.reps, done: false });
  return { exId, target: t, sets, adjusted: false, lowered: false };
}

// ---------- swaps ----------
export function swapOptions(state, exId, inSession = []) {
  const ex = EX[exId]; const taken = new Set(inSession);
  return EXERCISES
    .filter(e => e.id !== exId && !taken.has(e.id) && e.primary.some(m => ex.primary.includes(m)) && isAvailable(e, state) && !e.tags.includes('mobility'))
    .sort((a, b) => (b.type === ex.type) - (a.type === ex.type))
    .slice(0, 3);
}

// ---------- plates ----------
export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
export const PLATE_COLOURS = { 25: '#e5484d', 20: '#3b82f6', 15: '#f5c518', 10: '#22c55e', 5: '#e8e8e8', 2.5: '#e5484d', 1.25: '#a1a1aa' };
export function barWeight(ex, state) {
  const o = state.barOverrides?.[ex.id];
  if (o != null) return o;
  if (ex.loading === 'plate') return 0;
  return ex.bar === 'olympic' ? 20 : ex.bar === 'ez' ? 10 : ex.bar === 'smith' ? 15 : null;
}
export function plateBreakdown(ex, total, state) {
  if (!total || !['barbell', 'plate'].includes(ex.loading)) return null;
  const bar = barWeight(ex, state) ?? 0;
  let side = (total - bar) / 2; if (side < 0) return { bar, perSide: [], ok: false };
  const perSide = [];
  for (const p of PLATES) while (side >= p - 1e-6) { perSide.push(p); side -= p; }
  return { bar, perSide, ok: side < 0.01 };
}

// ---------- weekly stats ----------
export function setsPerMuscle(workouts) {
  const out = Object.fromEntries(Object.keys(MUSCLES).map(m => [m, 0]));
  for (const w of workouts) for (const e of w.exercises) {
    const ex = EX[e.exId]; if (!ex || ex.tags.includes('mobility')) continue;
    const n = e.sets.filter(s => s.done && !s.warmup).length;
    ex.primary.forEach(m => out[m] += n); ex.secondary.forEach(m => out[m] += n * 0.5);
  }
  return out;
}
export function band(m, goal) {
  const t = weeklyTarget(m, goal); if (!t) return null;
  return { lo: Math.max(2, Math.round(t * 0.8)), hi: ['chest', 'quads', 'hamstrings', 'lats', 'upperBack'].includes(m) ? 20 : 16, target: t };
}
export function workoutStats(w) {
  let vol = 0, sets = 0; const rests = [];
  let prevAt = null;
  const all = [];
  w.exercises.forEach(e => e.sets.forEach(s => { if (s.done && !s.warmup) { sets++; vol += (s.weight || 0) * (s.reps || 0) * (EX[e.exId]?.perSide ? 2 : 1); } if (s.done && s.at) all.push(s.at); }));
  all.sort((a, b) => a - b).forEach(t => { if (prevAt && t - prevAt < 15 * 60000) rests.push(t - prevAt); prevAt = t; });
  const prs = w.exercises.reduce((a, e) => a + e.sets.filter(s => s.pr).length, 0);
  const dur = (w.endedAt || Date.now()) - w.startedAt;
  return { vol: Math.round(vol), sets, prs, dur, avgRest: rests.length ? rests.reduce((a, b) => a + b, 0) / rests.length : 0 };
}

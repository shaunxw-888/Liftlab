import { EX, EXERCISES, MUSCLES, EQUIPMENT, DEFAULT_EQUIPMENT } from './exercises.js';
import * as E from './engine.js';
import * as DB from './store.js';
import { muscleIcon, recoveryMap, heatColor } from './bodymap.js';
import { lineChart } from './charts.js';
import { askClaude, libraryText, MUSCLE_KEYS } from './claude.js';

// ---------------- icons ----------------
const ICON = {
  logo: '<svg viewBox="0 0 48 48" width="56" height="56"><rect width="48" height="48" rx="12" fill="#2F7BFF"/><path d="M12 30V18M16 33V15M32 33V15M36 30V18M16 24h16" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24"><path d="M6 7v10M3 9.5v5M18 7v10M21 9.5v5M6 12h12"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M5 20V11M12 20V5M19 20v-6"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg>',
  timer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
  trophy: '<svg class="trophy" viewBox="0 0 24 24"><path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8"/></svg>',
  spark: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 2 1 3 3 3 3s1-3 0-7z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>'
};

// ---------------- state ----------------
const S = {
  uid: null, loaded: false, settings: null, equipment: [], excluded: [], boosted: [], barOverrides: {}, soreness: {},
  gameSkips: [], games: [], bodyweight: [], notes: {}, reviews: {}, busy: null, workouts: [], active: null, preview: null,
  view: { name: 'home' }, sheet: null, cardMin: {}, toast: null, authError: '', setupDraft: null
};
const $app = document.getElementById('app');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtDur = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`; };
const fmtMin = (ms) => `${Math.round(ms / 60000)} min`;
const unitOf = (ex) => ex.unit === 's' ? 's' : ex.unit === 'm' ? 'm' : '';
const wLabel = (ex) => ex.loading === 'dumbbell' ? 'kg each' : ex.loading === 'bodyweight' ? '+kg' : 'kg';
const dayName = (t) => new Date(t).toLocaleDateString('en-AU', { weekday: 'long' });
const shortDate = (t) => new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });

// ---------------- persistence ----------------
function persistProfile() { DB.saveProfile(S); }
function persistActive() { DB.writeActive(S.active); }

// ---------------- audio ----------------
let actx = null;
function unlockAudio() { if (!actx) try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { } if (actx?.state === 'suspended') actx.resume(); }
function beep() {
  if (!actx) return;
  [0, 0.25].forEach(d => { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, actx.currentTime + d); g.gain.exponentialRampToValueAtTime(0.3, actx.currentTime + d + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + d + 0.2); o.connect(g).connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + 0.22); });
}

// ---------------- toast ----------------
let toastTimer;
function toast(msg, kind = '') { S.toast = { msg, kind }; renderToast(); clearTimeout(toastTimer); toastTimer = setTimeout(() => { S.toast = null; renderToast(); }, 3200); }
function renderToast() { const t = document.getElementById('toast'); if (!t) return; t.innerHTML = S.toast ? `<div class="toast ${S.toast.kind}">${S.toast.msg}</div>` : ''; }

// ---------------- render ----------------
let lastViewKey = '';
function render() {
  const sc = document.querySelector('.screen'); const key = JSON.stringify(S.view);
  const keep = sc && key === lastViewKey ? sc.scrollTop : 0;
  lastViewKey = key;
  let body;
  if (!S.uid) body = authScreen();
  else if (!S.loaded) body = `<div class="screen center"><div class="spinner"></div></div>`;
  else if (!S.settings) body = setupScreen(true);
  else body = screen();
  const showTabs = S.uid && S.loaded && S.settings && !['exercise', 'summary', 'session'].includes(S.view.name);
  $app.innerHTML = body + (showTabs ? miniBar() + tabBar() : '') + sheetHtml() + `<div id="toast"></div>`;
  renderToast();
  const nsc = document.querySelector('.screen'); if (nsc) nsc.scrollTop = keep;
  tick();
}
function screen() {
  switch (S.view.name) {
    case 'home': return homeScreen();
    case 'session': return sessionScreen();
    case 'exercise': return exerciseScreen();
    case 'summary': return summaryScreen();
    case 'progress': return progressScreen();
    case 'exdetail': return exDetailScreen();
    case 'settings': return setupScreen(false);
    default: return homeScreen();
  }
}
function tabBar() {
  const t = S.view.name === 'progress' || S.view.name === 'exdetail' ? 'progress' : S.view.name === 'settings' ? 'settings' : 'train';
  const b = (k, label, icon) => `<button class="tab ${t === k ? 'on' : ''}" data-a="tab" data-v="${k}">${icon}<span>${label}</span></button>`;
  return `<nav class="tabbar">${b('train', 'Train', ICON.dumbbell)}${b('progress', 'Progress', ICON.chart)}${b('settings', 'Settings', ICON.gear)}</nav>`;
}
function miniBar() {
  const a = S.active; if (!a || S.view.name === 'session') return '';
  const cur = a.exercises[a.cursor || 0]; const ex = cur && EX[cur.exId];
  const nxt = cur?.sets.find(s => !s.done);
  return `<button class="minibar" data-a="openSession"><div><b>${ex ? ex.name : esc(a.name)}</b><small>${nxt ? `${nxt.reps}${unitOf(ex)} × ${nxt.weight ?? 'BW'}${nxt.weight ? ' kg' : ''}` : 'In progress'}</small></div><span class="mono" id="mini-time">${fmtDur(Date.now() - a.startedAt)}</span></button>`;
}

// ---------------- auth ----------------
function authScreen() {
  return `<div class="screen auth"><div class="brand">${ICON.logo}<h1>Liftlab</h1><p>Open, tap start, lift.</p></div>
  <form id="authForm" class="card form">
    <label>Email<input name="email" type="email" autocomplete="username" required></label>
    <label>Password<input name="password" type="password" autocomplete="current-password" required></label>
    ${S.authError ? `<div class="err">${esc(S.authError)}</div>` : ''}
    <button class="btn primary big" type="submit">Sign in</button>
    <button class="btn ghost" type="button" data-a="resetPw">Forgot password</button>
  </form></div>`;
}

// ---------------- setup / settings ----------------
function draft() {
  if (!S.setupDraft) S.setupDraft = {
    settings: structuredClone(S.settings ? { ...S.settings, goals: E.goalsOf(S) } : { goals: { muscle: true }, days: 3, minutes: 60, gameDay: 4, comments: '' }),
    equipment: [...(S.equipment?.length ? S.equipment : DEFAULT_EQUIPMENT)]
  };
  return S.setupDraft;
}
function setupScreen(first) {
  const d = draft(); const st = d.settings;
  const seg = (field, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(st[field]) === String(v) ? 'on' : ''}" data-a="draft" data-f="${field}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const goal = (k, l, sub) => `<label class="row tick"><input type="checkbox" data-a="draftGoal" data-f="${k}" ${st.goals?.[k] ? 'checked' : ''}><div><b>${l}</b><small>${sub}</small></div></label>`;
  const ai = S.settings?.ai;
  const eq = Object.entries(EQUIPMENT).map(([k, l]) => `<label class="chip check ${d.equipment.includes(k) ? 'on' : ''}"><input type="checkbox" data-a="draftEq" data-f="${k}" ${d.equipment.includes(k) ? 'checked' : ''}>${l}</label>`).join('');
  const bw = S.bodyweight?.length ? S.bodyweight.at(-1) : null;
  return `<div class="screen">
    <header class="top"><h1>${first ? 'Set up Liftlab' : 'Settings'}</h1></header>
    ${first ? '<p class="muted pad">Takes about a minute. You can change any of this later.</p>' : ''}
    <section class="card"><h3>Goals</h3><p class="muted small">Tick any combination.</p>
      ${goal('muscle', 'Build muscle', 'Hypertrophy volume and rep ranges')}
      ${goal('strength', 'Get stronger', 'Heavier 4-6 rep work on main lifts')}
      ${goal('cut', 'Cutting', 'Slightly less volume, keep weights heavy')}
      ${goal('jump', 'Jump higher / athletic', 'Plyos first in lower and full sessions')}
      ${goal('posture', 'Back and neck (clinic posture)', 'Upper back and deep neck work')}
      ${goal('mobility', 'Mobility', 'Short drills during rest periods')}
      <h3 class="mt">Anything else?</h3>
      <textarea id="commentsIn" placeholder="e.g. want to dunk by mid-year, lower back tight after long clinic days, prioritise arms">${esc(st.comments || '')}</textarea>
      <p class="muted small">Claude reads this and fine-tunes your programme.</p>
      ${ai?.summary ? `<div class="badge mt">${ICON.spark} ${esc(ai.summary)}</div>` : ''}</section>
    <section class="card"><h3>Days per week</h3>${seg('days', [[2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']])}
      <h3>Session length</h3>${seg('minutes', [[30, '30'], [45, '45'], [60, '60'], [75, '75'], [90, '90']])}</section>
    <section class="card"><h3>Weekly game</h3><p class="muted small">Legs and jumps are kept away from the day before and after.</p>
      ${seg('gameDay', [['', 'None'], [1, 'Mo'], [2, 'Tu'], [3, 'We'], [4, 'Th'], [5, 'Fr'], [6, 'Sa'], [0, 'Su']])}</section>
    <section class="card"><h3>Gym equipment</h3><p class="muted small">Untick anything your gym doesn't have.</p><div class="chips">${eq}</div></section>
    ${!first ? `<section class="card"><h3>Bodyweight</h3><div class="row"><input id="bwIn" type="number" inputmode="decimal" placeholder="${bw ? bw.kg : 'kg'}"><button class="btn" data-a="addBw">Log</button></div>
      ${bw ? `<p class="muted small">Last: ${bw.kg} kg on ${shortDate(bw.at)}</p>` : ''}</section>
      <section class="card"><h3>Excluded exercises</h3>${S.excluded.length ? S.excluded.map(id => `<div class="row"><span>${EX[id]?.name || id}</span><button class="btn small" data-a="unexclude" data-v="${id}">Restore</button></div>`).join('') : '<p class="muted small">None</p>'}</section>` : ''}
    <button class="btn primary big wide" data-a="saveSetup" ${S.busy ? 'disabled' : ''}>${S.busy === 'goals' ? '<span class="spinner sm"></span> Claude is updating your plan' : first ? 'Build my week' : 'Save'}</button>
    ${!first ? '<button class="btn ghost wide" data-a="signOut">Sign out</button><p class="muted small center-text">Liftlab v1.1</p>' : ''}
    <div class="spacer"></div></div>`;
}

// ---------------- home ----------------
function homeScreen() {
  const now = Date.now();
  const { cards, done, total } = E.sessionCards(S, now);
  const ready = E.readiness(S, now);
  const segs = Array.from({ length: total }, (_, i) => `<i class="${i < done.length ? 'on' : ''}"></i>`).join('');
  const rel = E.gameRelation(S, now);
  const gd = S.settings.gameDay;
  const wk = E.weekKey(now);
  const skipped = S.gameSkips.includes(wk);
  const cardHtml = cards.map((c, i) => {
    const mins = S.cardMin[c.key] || Number(S.settings.minutes) || 60;
    const preview = E.generateSession(S, c, { minutes: mins, now });
    const sets = preview.exercises.reduce((a, e) => a + e.sets.filter(s => !s.warmup).length, 0);
    return `<article class="scard ${i === 0 ? 'first' : ''}">
      <div class="scard-top"><span class="kicker">${c.type === 'full' ? 'FULL BODY' : c.type === 'upper' ? 'UPPER BODY' : 'LOWER BODY + CORE'}</span>${i === 0 ? '<span class="pill">Up next</span>' : ''}</div>
      <h2>${c.muscles.slice(0, 4).map(m => MUSCLES[m]).join(', ')}</h2>
      <div class="ready-row">${Object.entries(c.perMuscle).map(([m, r]) => `<span class="rchip" style="--c:${heatColor(r)}">${MUSCLES[m]} ${r}%</span>`).join('')}</div>
      ${c.note ? `<div class="note warn">${c.note}</div>` : ''}
      <p class="meta">${preview.estMinutes} min · ${preview.exercises.length} exercises · ${sets} sets</p>
      <div class="seg small">${[30, 45, 60, 75, 90].map(m => `<button class="${m === mins ? 'on' : ''}" data-a="cardMin" data-k="${c.key}" data-v="${m}">${m}</button>`).join('')}</div>
      <button class="btn primary big wide" data-a="openCard" data-k="${c.key}">${S.active ? 'View session' : 'Start session'} ${ICON.chev}</button>
    </article>`;
  }).join('');
  return `<div class="screen">
    <header class="top"><div><small class="muted">${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</small><h1>This week</h1></div></header>
    <div class="weekbar">${segs}</div><p class="muted pad">${done.length} of ${total} completed this week</p>
    ${S.active ? `<button class="card resume" data-a="openSession"><b>Workout in progress</b><span>${esc(S.active.name)} · tap to resume</span></button>` : ''}
    ${cards.length ? `<div class="carousel">${cardHtml}</div>` : `<section class="card done-week"><h2>Week done 💪</h2><p class="muted">All ${total} sessions complete. Rest up, or start an extra session below.</p><button class="btn" data-a="extraSession">Extra session</button></section>`}
    ${gd !== '' && gd != null ? `<section class="card game"><div><b>${skipped ? 'No game this week' : `Game: ${DAYS[gd]}`}</b><small class="muted">${rel === 'before' ? 'Tomorrow. Legs are being kept fresh.' : rel === 'game' ? 'Today. Good luck!' : rel === 'after' ? 'Yesterday. Legs still recovering.' : 'Planned around automatically.'}</small></div>
      <button class="btn small" data-a="toggleGameWeek">${skipped ? 'Undo' : 'No game this week'}</button></section>` : ''}
    <section class="card"><div class="row"><b>Played basketball today?</b><button class="btn small" data-a="logGame">Log game</button></div><p class="muted small">Extra games count towards leg recovery.</p></section>
    ${done.length ? `<section class="card"><h3>Done this week</h3>${done.map(w => `<button class="row link" data-a="viewWorkout" data-v="${w.id}"><span>${ICON.check} ${esc(w.name)}</span><span class="muted">${dayName(w.startedAt)}</span></button>`).join('')}</section>` : ''}
    <section class="card"><h3>Recovery</h3><p class="muted small">Estimated from what you've trained. Tap a muscle if you're sore.</p>
      <div class="mapwrap" data-a="mapTap">${recoveryMap(ready)}</div>
      <div class="legend"><span style="--c:#2F7BFF">Fresh</span><span style="--c:#7aa8ff">Good</span><span style="--c:#f5a524">Tired</span><span style="--c:#e5484d">Sore</span></div>
      <div class="mgrid">${Object.keys(MUSCLES).filter(m => m !== 'neck').map(m => `<button class="mcell" data-a="soreOpen" data-v="${m}"><span class="dot" style="background:${heatColor(ready[m])}"></span>${MUSCLES[m]}<b>${ready[m]}%</b>${S.soreness[m] ? '<em>sore</em>' : ''}</button>`).join('')}</div></section>
    <div class="spacer"></div></div>`;
}

// ---------------- session (preview / active) ----------------
function currentSession() { return S.active || S.preview; }
function sessionScreen() {
  const s = currentSession(); if (!s) { S.view = { name: 'home' }; return homeScreen(); }
  const active = !!S.active;
  const muscles = [...new Set(s.exercises.flatMap(e => EX[e.exId].primary))];
  const ready = E.readiness(S);
  const lowered = active ? s.exercises.filter(e => e.lowered).length : 0;
  const rows = s.exercises.map((e, i) => {
    const ex = EX[e.exId]; const work = e.sets.filter(x => !x.warmup);
    const doneN = work.filter(x => x.done).length; const allDone = doneN === work.length && work.length;
    const t = e.target; const u = unitOf(ex);
    return `<div class="exrow-wrap" data-swipe="${i}"><div class="swipe-bg">Swap</div>
      <div class="exrow ${allDone ? 'complete' : ''}" data-a="openEx" data-v="${i}">
        <div class="thumb">${muscleIcon(ex.primary, ex.secondary, 46)}${allDone ? `<span class="tick">${ICON.check}</span>` : ''}</div>
        <div class="exinfo">${e.superset ? '<span class="tag">Superset</span>' : ''}<b>${ex.name}</b>
          <small>${work.length} × ${t.reps}${u} ${t.weight != null ? `@ ${E.fmtKg(t.weight)} ${wLabel(ex)}` : ex.loading === 'bodyweight' ? '· BW' : ''}${active ? ` · ${doneN}/${work.length}` : ''}</small></div>
        <button class="icon-btn" data-a="exMenu" data-v="${i}" aria-label="Options">${ICON.dots}</button>
      </div></div>`;
  }).join('');
  return `<div class="screen">
    <header class="top"><button class="icon-btn" data-a="back">${ICON.back}</button><h1 class="small">${esc(s.name)}</h1>
      ${active ? `<span class="mono pill" id="wtimer">${fmtDur(Date.now() - s.startedAt)}</span>` : '<span></span>'}</header>
    <div class="ready-row pad">${muscles.map(m => `<span class="rchip" style="--c:${heatColor(ready[m])}">${MUSCLES[m]} ${ready[m]}%</span>`).join('')}</div>
    <div class="row pad"><b class="count">${s.exercises.length} exercises · ~${E.estimateMinutes(s.exercises)} min</b><div class="row tight"><button class="btn small ai" data-a="askOpen">${ICON.spark} Ask Claude</button><button class="btn small" data-a="addExercise">+ Add</button></div></div>
    ${s.aiNote ? `<div class="badge">${ICON.spark} ${esc(s.aiNote)}</div>` : ''}
    ${lowered >= 2 && !s.trimmed ? `<div class="card note"><b>Rough day?</b><span>You've lowered a couple of lifts. Trim a set from the rest of the session? This won't count against your progression.</span><div class="row"><button class="btn small primary" data-a="trimRest">Trim</button><button class="btn small" data-a="dismissTrim">Keep going</button></div></div>` : ''}
    <p class="muted small pad">Swipe left on an exercise to swap it. Tap to open.</p>
    <div class="exlist">${rows}</div>
    ${s.mobility?.length ? `<section class="card"><h3>During rests (mobility)</h3>${s.mobility.map(id => `<div class="row"><span>${EX[id].name}</span><small class="muted">${EX[id].reps[0]}–${EX[id].reps[1]}${unitOf(EX[id]) || ' reps'}${EX[id].perSide ? '/side' : ''}</small></div>`).join('')}</section>` : ''}
    <div class="spacer"></div>
    <div class="bottom-cta">${active ? `<button class="btn ghost" data-a="discard">${ICON.x}</button><button class="btn primary big" data-a="finish">Finish</button>` : `<button class="btn primary big wide" data-a="startWorkout">Start workout</button>`}</div>
  </div>`;
}

// ---------------- exercise logging ----------------
function exerciseScreen() {
  const a = S.active; const i = S.view.i; const e = a?.exercises[i];
  if (!e) { S.view = { name: 'session' }; return sessionScreen(); }
  const ex = EX[e.exId]; const t = e.target; const u = unitOf(ex);
  let workN = 0;
  const rows = e.sets.map((s, j) => {
    const label = s.warmup ? 'W' : String(++workN);
    const pb = E.plateBreakdown(ex, s.weight, S);
    const plates = pb ? `<div class="plates" title="${pb.perSide.join(' + ')}">${pb.perSide.map(p => `<i style="--h:${16 + p * 1.1}px;background:${E.PLATE_COLOURS[p]}"></i>`).join('')}<span class="barend"></span></div>` : '<div class="plates none"></div>';
    return `<div class="setrow ${s.done ? 'done' : ''} ${s.warmup ? 'warm' : ''}">
      <button class="setnum" data-a="toggleSet" data-i="${i}" data-j="${j}">${s.done ? (s.pr ? ICON.trophy : ICON.check) : label}</button>
      <button class="cell" data-a="editSet" data-i="${i}" data-j="${j}" data-f="reps">${s.reps}<small>${u || 'reps'}${ex.perSide ? '/side' : ''}</small></button>
      <button class="cell" data-a="editSet" data-i="${i}" data-j="${j}" data-f="weight">${s.weight != null ? E.fmtKg(s.weight) : 'BW'}<small>${s.weight != null ? wLabel(ex) : ''}</small></button>
      ${plates}
    </div>${s.pr ? `<div class="prlabel">${ICON.trophy} ${s.pr}</div>` : ''}${pb && !s.done && !s.warmup && j === e.sets.findIndex(x => !x.done) ? `<div class="perside">Per side: ${pb.perSide.length ? pb.perSide.map(E.fmtKg).join(' + ') : 'empty bar'}${pb.bar ? ` · bar ${pb.bar} kg` : ''}</div>` : ''}`;
  }).join('');
  const next = a.exercises.findIndex((x, k) => k > i && x.sets.some(s => !s.done));
  const rest = a.rest;
  return `<div class="screen ex">
    <header class="top"><button class="icon-btn" data-a="openSession">${ICON.back}</button><span></span>
      <button class="icon-btn" data-a="swapOpen" data-v="${i}" aria-label="Swap">${ICON.swap}</button></header>
    <div class="exhead">${muscleIcon(ex.primary, ex.secondary, 64)}<div><h1>${ex.name}</h1><small class="muted">${ex.primary.map(m => MUSCLES[m]).join(', ')}${e.superset ? ' · Superset' : ''}</small></div></div>
    <div class="badge">${ICON.spark} ${esc(t.reason)}</div>
    <div class="chips pad"><button class="chip" data-a="restCycle" data-v="${i}">${ICON.timer} Rest ${fmtDur((e.rest ?? ex.rest) * 1000)}</button><span class="chip muted">${t.lo}–${t.hi} ${u || 'reps'}</span>${ex.perSide ? '<span class="chip muted">per side</span>' : ''}</div>
    <div class="sethead"><span>Set</span><span>${u === 's' ? 'Secs' : u === 'm' ? 'Metres' : 'Reps'}</span><span>${ex.loading === 'dumbbell' ? 'kg each' : 'Total kg'}</span><span></span></div>
    <div class="sets">${rows}</div>
    <button class="btn dashed wide" data-a="addSet" data-v="${i}">+ Add set</button>
    <section class="card"><h3>Notes</h3><textarea id="noteIn" data-ex="${e.exId}" placeholder="Seat height, grip, cues… carries over to next time">${esc(S.notes[e.exId] || '')}</textarea></section>
    ${next >= 0 ? `<button class="btn wide" data-a="openEx" data-v="${next}">Next: ${EX[a.exercises[next].exId].name} ${ICON.chev}</button>` : `<button class="btn primary wide" data-a="openSession">Back to session</button>`}
    <div class="spacer"></div>
    ${rest ? `<div class="restbar"><span class="kicker">REST</span><button data-a="restAdd" data-v="-15">-15s</button><span class="mono big" id="rest-time">${fmtDur(rest.end - Date.now())}</span><button data-a="restAdd" data-v="15">+15s</button><button class="icon-btn" data-a="restStop">${ICON.stop}</button><div class="restprog" id="rest-prog"></div></div>` : ''}
  </div>`;
}

// ---------------- summary ----------------
function summaryScreen() {
  const w = S.workouts.find(x => x.id === S.view.id); if (!w) { S.view = { name: 'home' }; return homeScreen(); }
  const st = E.workoutStats(w);
  return `<div class="screen">
    <header class="top"><button class="icon-btn" data-a="tab" data-v="${S.view.from || 'train'}">${ICON.back}</button><span></span><button class="icon-btn danger" data-a="deleteWorkout" data-v="${w.id}">${ICON.trash}</button></header>
    <input class="title-input" id="wname" data-id="${w.id}" value="${esc(w.name)}">
    <p class="mono accent big">${fmtDur(st.dur)}</p><p class="muted pad">${new Date(w.startedAt).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
    <section class="card stats4">
      <div><small>Volume</small><b class="c-blue">${st.vol.toLocaleString()} kg</b></div>
      <div><small>Sets</small><b class="c-orange">${st.sets}</b></div>
      <div><small>Records</small><b class="c-gold">${st.prs}</b></div>
      <div><small>Avg rest</small><b class="c-teal">${st.avgRest > 10000 ? fmtDur(st.avgRest) : '–'}</b></div>
    </section>
    ${w.rough ? '<div class="card note"><b>Rough day logged</b><span>This session won\'t count against your progression.</span></div>' : ''}
    <section class="card"><h3>Exercises</h3>${w.exercises.filter(e => e.sets.some(s => s.done)).map(e => {
      const ex = EX[e.exId]; const ws = e.sets.filter(s => s.done && !s.warmup); const best = ws.reduce((b, s) => E.e1rm(s.weight, s.reps) >= E.e1rm(b.weight, b.reps) ? s : b, ws[0] || {});
      const pr = e.sets.find(s => s.pr);
      return `<button class="row link" data-a="exDetail" data-v="${e.exId}"><div class="thumb sm">${muscleIcon(ex.primary, ex.secondary, 34)}</div><div class="grow"><b>${ex.name}</b><small class="muted">${ws.length} sets · best ${best.reps}${unitOf(ex)} × ${best.weight ?? 'BW'}${best.weight ? ' kg' : ''}</small></div>${pr ? `<span class="pill gold">${ICON.trophy} ${pr.pr.split(' ')[0]}</span>` : ''}</button>`;
    }).join('')}</section>
    <button class="btn primary big wide" data-a="tab" data-v="${S.view.from || 'train'}">Done</button><div class="spacer"></div></div>`;
}

// ---------------- progress ----------------
function progressScreen() {
  const now = Date.now();
  const ws = E.weekStart(now);
  const thisWeek = E.weekWorkouts(S, now);
  const plan = E.planWeek(S.settings);
  const spm = E.setsPerMuscle(thisWeek);
  // previous 4 weeks
  const prev = [1, 2, 3, 4].map(k => S.workouts.filter(w => w.startedAt >= ws - k * 7 * 864e5 && w.startedAt < ws - (k - 1) * 7 * 864e5));
  const agg = (list) => list.reduce((a, w) => { const s = E.workoutStats(w); a.vol += s.vol; a.sets += s.sets; a.dur += s.dur; return a; }, { vol: 0, sets: 0, dur: 0 });
  const cur = agg(thisWeek); const avg = prev.map(agg).reduce((a, b) => ({ vol: a.vol + b.vol / 4, sets: a.sets + b.sets / 4, dur: a.dur + b.dur / 4 }), { vol: 0, sets: 0, dur: 0 });
  const delta = (c, p) => !p ? '' : `<small class="${c >= p ? 'up' : 'down'}">${c >= p ? '▲' : '▼'} ${Math.abs(Math.round((c - p) / p * 100))}% vs 4-wk avg</small>`;
  // streak
  let streak = 0; for (let k = 1; k < 200; k++) { const n = S.workouts.filter(w => w.startedAt >= ws - k * 7 * 864e5 && w.startedAt < ws - (k - 1) * 7 * 864e5).length; if (n >= plan.length) streak++; else break; }
  if (thisWeek.length >= plan.length) streak++;
  // PRs this week
  const prs = []; thisWeek.forEach(w => w.exercises.forEach(e => e.sets.forEach(s => { if (s.pr) prs.push({ exId: e.exId, s }); })));
  const rings = Object.keys(MUSCLES).map(m => ({ m, b: E.band(m, S), v: spm[m] })).filter(x => x.b);
  const ring = ({ m, b, v }) => { const pct = Math.min(1, v / b.hi); const col = v < b.lo ? 'var(--muted2)' : v > b.hi ? '#f5a524' : '#22c55e'; const C = 2 * Math.PI * 22;
    return `<div class="ring"><svg viewBox="0 0 54 54"><circle cx="27" cy="27" r="22" class="rbg"/>${pct > 0 ? `<circle cx="27" cy="27" r="22" stroke="${col}" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 27 27)" class="rfg"/>` : ''}</svg><b>${Math.round(v * 2) / 2}</b><small>${MUSCLES[m]}</small><em>${b.lo}–${b.hi}</em></div>`; };
  // exercises with history
  const exIds = [...new Set(S.workouts.flatMap(w => w.exercises.filter(e => e.sets.some(s => s.done && !s.warmup)).map(e => e.exId)))];
  const plateaus = exIds.filter(id => { const h = E.exerciseHistory(S, id); if (h.length < 3 || now - h[0].at > 21 * 864e5) return false; const best = (x) => Math.max(...x.sets.map(s => E.e1rm(s.weight, s.reps))); const recent = h.filter(x => now - x.at < 21 * 864e5); const before = h.filter(x => now - x.at >= 21 * 864e5); return before.length && recent.length >= 2 && Math.max(...recent.map(best)) <= Math.max(...before.map(best)); });
  // calendar
  const d = new Date(); const y = d.getFullYear(), mo = d.getMonth(); const first = new Date(y, mo, 1); const days = new Date(y, mo + 1, 0).getDate(); const off = (first.getDay() + 6) % 7;
  const wDays = new Map(); S.workouts.forEach(w => { const t = new Date(w.startedAt); if (t.getFullYear() === y && t.getMonth() === mo) wDays.set(t.getDate(), w.id); });
  const cal = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span class="ch">${x}</span>`).join('') + Array.from({ length: off }, () => '<span></span>').join('') + Array.from({ length: days }, (_, k) => { const n = k + 1; const id = wDays.get(n); return id ? `<button class="cd on" data-a="viewWorkout" data-v="${id}" data-from="progress">${n}</button>` : `<span class="cd ${n === d.getDate() ? 'today' : ''}">${n}</span>`; }).join('');
  return `<div class="screen">
    <header class="top"><h1>Progress</h1></header>
    <div class="chips pad"><span class="chip big">${ICON.flame} ${thisWeek.length}/${plan.length} this week</span><span class="chip big">🔥 ${streak} wk streak</span><span class="chip big">${ICON.trophy} ${prs.length} PRs</span></div>
    ${reviewCard(thisWeek)}
    <section class="card"><h3>Sets per muscle this week</h3><p class="muted small">Grey = below target, green = in range, amber = above. Half sets count for secondary muscles.</p><div class="rings">${rings.map(ring).join('')}</div></section>
    ${prs.length ? `<section class="card"><h3>${ICON.trophy} Personal records this week</h3>${prs.map(p => `<button class="row link" data-a="exDetail" data-v="${p.exId}"><span>${EX[p.exId].name}</span><small class="accent">${p.s.pr} · ${p.s.reps} × ${p.s.weight ?? 'BW'}</small></button>`).join('')}</section>` : ''}
    ${plateaus.length ? `<section class="card note"><h3>Plateau check</h3><p class="small muted">No e1RM gain in about 3 weeks. Consider a swap or a lighter week.</p>${plateaus.map(id => `<button class="row link" data-a="exDetail" data-v="${id}"><span>${EX[id].name}</span>${ICON.chev}</button>`).join('')}</section>` : ''}
    <div class="grid3"><section class="card stat"><small>Volume</small><b class="c-blue">${Math.round(cur.vol).toLocaleString()} kg</b>${delta(cur.vol, avg.vol)}</section>
      <section class="card stat"><small>Sets</small><b class="c-orange">${cur.sets}</b>${delta(cur.sets, avg.sets)}</section>
      <section class="card stat"><small>Time</small><b class="c-green">${fmtMin(cur.dur)}</b>${delta(cur.dur, avg.dur)}</section></div>
    <section class="card"><h3>Exercise progress</h3>${exIds.length ? exIds.map(id => { const b = E.bestFor(S, id); return `<button class="row link" data-a="exDetail" data-v="${id}"><div class="thumb sm">${muscleIcon(EX[id].primary, EX[id].secondary, 34)}</div><span class="grow">${EX[id].name}</span><small class="muted">${b.e1rm ? `e1RM ${E.fmtKg(Math.round(b.e1rm * 10) / 10)}` : `best ${b.reps}`}</small>${ICON.chev}</button>`; }).join('') : '<p class="muted small">Log a workout to see graphs here.</p>'}</section>
    <section class="card"><h3>${d.toLocaleDateString('en-AU', { month: 'long' })}</h3><p class="muted small">${wDays.size} workouts this month</p><div class="cal">${cal}</div></section>
    <section class="card"><h3>Latest workouts</h3>${S.workouts.slice(0, 6).map(w => { const st = E.workoutStats(w); return `<button class="row link" data-a="viewWorkout" data-v="${w.id}" data-from="progress"><div class="grow"><b>${esc(w.name)}</b><small class="muted">${shortDate(w.startedAt)} · ${fmtDur(st.dur)}</small></div>${st.prs ? `<span class="pill gold">${ICON.trophy} ${st.prs}</span>` : ''}</button>`; }).join('') || '<p class="muted small">Nothing yet.</p>'}</section>
    <div class="spacer"></div></div>`;
}

function exDetailScreen() {
  const id = S.view.id; const ex = EX[id]; const metric = S.view.metric || (ex.loading === 'bodyweight' ? 'reps' : 'e1rm'); const range = S.view.range || 'all';
  const cut = { '1m': 30, '3m': 91, '6m': 182, all: 1e5 }[range] * 864e5;
  const hist = E.exerciseHistory(S, id).filter(h => Date.now() - h.at < cut).reverse();
  const val = (h) => metric === 'e1rm' ? Math.max(...h.sets.map(s => E.e1rm(s.weight, s.reps))) : metric === 'weight' ? Math.max(...h.sets.map(s => s.weight || 0)) : metric === 'volume' ? h.sets.reduce((a, s) => a + (s.weight || 0) * s.reps, 0) : Math.max(...h.sets.map(s => s.reps));
  const pts = hist.map(h => ({ x: h.at, y: Math.round(val(h) * 10) / 10 }));
  const prs = []; let mx = -1; hist.forEach((h, i) => { const v = Math.max(...h.sets.map(s => E.e1rm(s.weight, s.reps) || s.reps)); if (v > mx) { if (i) prs.push(i); mx = v; } });
  const b = E.bestFor(S, id);
  const boosted = S.boosted.includes(id), excluded = S.excluded.includes(id);
  const seg = (field, opts, cur) => `<div class="seg small">${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-a="exView" data-f="${field}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const bar = E.barWeight(ex, S);
  return `<div class="screen">
    <header class="top"><button class="icon-btn" data-a="tab" data-v="progress">${ICON.back}</button><span></span><span></span></header>
    <div class="exhead">${muscleIcon(ex.primary, ex.secondary, 64)}<div><h1>${ex.name}</h1><small class="muted">${ex.reason}</small></div></div>
    <div class="grid3"><section class="card stat"><small>e1RM</small><b class="c-blue">${b.e1rm ? E.fmtKg(Math.round(b.e1rm * 10) / 10) : '–'}</b></section><section class="card stat"><small>Max weight</small><b class="c-orange">${b.weight || '–'}</b></section><section class="card stat"><small>Max reps</small><b class="c-green">${b.reps || '–'}</b></section></div>
    <section class="card">${seg('metric', ex.loading === 'bodyweight' ? [['reps', 'Reps']] : [['e1rm', 'e1RM'], ['weight', 'Weight'], ['volume', 'Volume'], ['reps', 'Reps']], metric)}
      ${lineChart(pts, { unit: metric === 'reps' ? unitOf(ex) || 'reps' : 'kg', prs })}${seg('range', [['1m', '1M'], ['3m', '3M'], ['6m', '6M'], ['all', 'All']], range)}</section>
    <div class="chips pad"><button class="chip ${boosted ? 'on' : ''}" data-a="boost" data-v="${id}">${ICON.heart} ${boosted ? 'Boosted' : 'Boost'}</button><button class="chip ${excluded ? 'on danger' : ''}" data-a="exclude" data-v="${id}">${excluded ? 'Excluded' : 'Exclude'}</button>
      ${bar != null && ex.loading === 'barbell' ? `<button class="chip" data-a="barOverride" data-v="${id}">Bar ${bar} kg</button>` : ''}</div>
    <section class="card"><h3>History</h3>${E.exerciseHistory(S, id).slice(0, 12).map(h => `<div class="row"><small class="muted">${shortDate(h.at)}${h.rough ? ' · rough' : ''}</small><span>${h.sets.map(s => `${s.reps}${unitOf(ex)}×${s.weight ?? 'BW'}`).join(', ')}</span></div>`).join('') || '<p class="muted small">No sets yet.</p>'}</section>
    <div class="spacer"></div></div>`;
}

// ---------------- sheets ----------------
function sheetHtml() {
  const sh = S.sheet; if (!sh) return '';
  let inner = '';
  if (sh.type === 'edit') {
    const a = S.active, e = a.exercises[sh.i], s = e.sets[sh.j], ex = EX[e.exId];
    const isW = sh.f === 'weight'; const step = isW ? E.incFor(ex) : 1; const v = sh.value;
    inner = `<h3>${isW ? `Weight (${wLabel(ex)})` : unitOf(ex) === 's' ? 'Seconds' : unitOf(ex) === 'm' ? 'Metres' : 'Reps'}</h3>
      <div class="stepper"><button data-a="sheetAdj" data-v="${-step * 2}">−${E.fmtKg(step * 2)}</button><button data-a="sheetAdj" data-v="${-step}">−${E.fmtKg(step)}</button>
        <input id="sheetVal" type="number" inputmode="decimal" value="${v ?? ''}" placeholder="${isW ? 'BW' : ''}"><button data-a="sheetAdj" data-v="${step}">+${E.fmtKg(step)}</button><button data-a="sheetAdj" data-v="${step * 2}">+${E.fmtKg(step * 2)}</button></div>
      <label class="row toggle"><span>Apply to remaining sets</span><input type="checkbox" id="applyRest" ${sh.applyRest ? 'checked' : ''}></label>
      <button class="btn primary big wide" data-a="sheetSave">Done</button>`;
  } else if (sh.type === 'rir') {
    inner = `<span class="kicker red">EXERTION</span><h3>How many more reps could you have done?</h3><p class="muted small">Only asked on your main lifts. Helps pick today's weights.</p>
      <div class="rir"><button class="g" data-a="rir" data-v="3+">3+</button><button class="y" data-a="rir" data-v="1-2">1–2</button><button class="r" data-a="rir" data-v="0">0</button></div><button class="btn ghost wide" data-a="closeSheet">Skip</button>`;
  } else if (sh.type === 'adjust') {
    inner = `<h3>${sh.up ? 'Feeling strong' : 'Tough one'}</h3><p>${sh.up ? `That looked easy. Do the remaining sets at <b>${E.fmtKg(sh.weight)} kg</b>?` : `Drop the remaining sets to <b>${E.fmtKg(sh.weight)} kg</b> to stay in range?`}</p>
      <div class="row"><button class="btn primary big grow" data-a="applyAdjust">Yes</button><button class="btn big grow" data-a="closeSheet">Keep as is</button></div>`;
  } else if (sh.type === 'ask') {
    const quick = ['Only have 30 min', "Gym's packed, avoid cables", 'Something is sore', 'Low energy today', 'More arms today'];
    inner = `<h3>${ICON.spark} Rework this session</h3><p class="muted small">Tell Claude what's going on. Completed exercises stay as they are.</p>
      <div class="chips">${quick.map(q => `<button class="chip" data-a="askQuick" data-v="${esc(q)}">${q}</button>`).join('')}</div>
      <textarea id="askIn" placeholder="e.g. left knee sore, keep it upper-focused">${esc(sh.text || '')}</textarea>
      <button class="btn primary big wide" data-a="askSend" ${S.busy ? 'disabled' : ''}>${S.busy === 'rework' ? '<span class="spinner sm"></span> Reworking' : 'Rework session'}</button>`;
  } else if (sh.type === 'swap') {
    inner = swapSheet(sh);
  } else if (sh.type === 'menu') {
    inner = `<h3>${EX[currentSession().exercises[sh.i].exId].name}</h3>
      <button class="btn wide" data-a="swapOpen" data-v="${sh.i}">${ICON.swap} Swap</button>
      <button class="btn wide" data-a="move" data-v="-1">Move up</button><button class="btn wide" data-a="move" data-v="1">Move down</button>
      <button class="btn wide" data-a="supersetNext">${currentSession().exercises[sh.i].superset ? 'Remove superset' : 'Superset with next'}</button>
      <button class="btn wide" data-a="setCount" data-v="1">+1 set</button><button class="btn wide" data-a="setCount" data-v="-1">−1 set</button>
      <button class="btn wide danger" data-a="removeEx">Remove</button>`;
  } else if (sh.type === 'sore') {
    const cur = S.soreness[sh.m]?.level || 'fresh';
    inner = `<h3>${MUSCLES[sh.m]}</h3><p class="muted small">Only needed if the estimate feels wrong.</p>
      <div class="rir"><button class="g ${cur === 'fresh' ? 'sel' : ''}" data-a="setSore" data-v="fresh">Fresh</button><button class="y ${cur === 'bit' ? 'sel' : ''}" data-a="setSore" data-v="bit">Bit sore</button><button class="r ${cur === 'very' ? 'sel' : ''}" data-a="setSore" data-v="very">Very sore</button></div>`;
  } else if (sh.type === 'finish') {
    inner = `<h3>Unfinished sets</h3><p class="muted">You have ${sh.left} sets not ticked off.</p>
      <button class="btn primary big wide" data-a="doFinish">Save completed sets only</button><button class="btn big wide" data-a="closeSheet">Keep going</button>`;
  } else if (sh.type === 'discard') {
    inner = `<h3>Discard workout?</h3><p class="muted">Nothing from this session will be saved.</p><button class="btn big wide danger" data-a="doDiscard">Discard</button><button class="btn big wide" data-a="closeSheet">Cancel</button>`;
  } else if (sh.type === 'bar') {
    inner = `<h3>Bar weight for ${EX[sh.id].name}</h3><p class="muted small">Only change if your gym's bar differs.</p><div class="seg">${[0, 7, 10, 15, 20].map(v => `<button data-a="setBar" data-v="${v}">${v} kg</button>`).join('')}</div><button class="btn ghost wide" data-a="setBar" data-v="">Reset to default</button>`;
  }
  return `<div class="sheet-bg" data-a="closeSheet"></div><div class="sheet"><div class="grab"></div>${inner}</div>`;
}

function swapSheet(sh) {
  const s = currentSession(); const add = sh.mode === 'add';
  const cur = add ? null : s.exercises[sh.i]; const ex = cur && EX[cur.exId];
  const inSession = s.exercises.map(e => e.exId);
  const q = (sh.q || '').toLowerCase();
  const aiIds = (sh.aiPicks || []).map(p => p.exId);
  const picks = add ? [] : E.swapOptions(S, cur.exId, [...inSession, ...aiIds]);
  const list = EXERCISES.filter(e => E.isAvailable(e, S) && !inSession.includes(e.id) && (q ? e.name.toLowerCase().includes(q) || e.primary.some(m => MUSCLES[m].toLowerCase().includes(q)) : add || e.primary.some(m => ex.primary.includes(m))));
  const item = (e) => `<button class="row link pick" data-a="swapPick" data-v="${e.id}"><div class="thumb sm">${muscleIcon(e.primary, e.secondary, 34)}</div><div class="grow"><b>${e.name}</b><small class="muted">${e.reason}</small></div></button>`;
  const reasons = [['taken', 'Equipment taken'], ['discomfort', 'Discomfort'], ['dislike', "Don't like it"], ['nogym', "Gym doesn't have this"]];
  return `<h3>${add ? 'Add exercise' : `Swap ${ex.name}`}</h3>
    ${!add ? `<div class="chips">${reasons.map(([k, l]) => `<button class="chip ${sh.reason === k ? 'on' : ''}" data-a="swapReason" data-v="${k}">${l}</button>`).join('')}</div>` : ''}
    ${sh.reason === 'nogym' ? `<div class="card inset"><p class="small">Which one is missing? It'll be removed from your gym permanently.</p><div class="chips">${ex.equip.map(k => `<button class="chip" data-a="removeEquip" data-v="${k}">${EQUIPMENT[k]}</button>`).join('') || '<span class="muted small">No equipment needed</span>'}</div></div>` : ''}
    ${sh.reason === 'dislike' ? '<p class="small accent">It won\'t be suggested again (restore in Settings).</p>' : ''}
    ${!add ? `<div class="askrow"><input id="swapAsk" class="search" placeholder="Ask Claude, e.g. shoulder niggly, need pain-free option" value="${esc(sh.ask || '')}"><button class="btn small ai" data-a="swapAsk" ${S.busy ? 'disabled' : ''}>${S.busy === 'swap' ? '<span class="spinner sm"></span>' : ICON.spark}</button></div>` : ''}
    ${sh.aiPicks?.length ? `<h4>${ICON.spark} Claude suggests</h4>${sh.aiPicks.map(p => EX[p.exId] ? `<button class="row link pick" data-a="swapPick" data-v="${p.exId}"><div class="thumb sm">${muscleIcon(EX[p.exId].primary, EX[p.exId].secondary, 34)}</div><div class="grow"><b>${EX[p.exId].name}</b><small class="accent">${esc(p.why)}</small></div></button>` : '').join('')}` : ''}
    ${picks.length && !q ? `<h4>Best alternatives</h4>${picks.map(item).join('')}` : ''}
    <input id="swapSearch" class="search" placeholder="Search exercises or muscles" value="${esc(sh.q || '')}">
    <div class="swaplist">${list.filter(e => q || !picks.includes(e)).slice(0, 25).map(item).join('')}</div>`;
}

// ---------------- workout logic ----------------
function openCard(key) {
  if (S.active) { S.view = { name: 'session' }; return render(); }
  const tpl = E.planWeek(S.settings).find(p => p.key === key) || { key: 'extra', type: 'full', variant: 1, name: 'Full Body' };
  const g = E.generateSession(S, tpl, { minutes: S.cardMin[key] || Number(S.settings.minutes) || 60 });
  S.preview = { ...g, name: tpl.name };
  S.view = { name: 'session' }; render();
}
function startWorkout() {
  unlockAudio();
  S.active = { ...structuredClone(S.preview), id: uid(), startedAt: Date.now(), cursor: 0, rest: null };
  S.preview = null; persistActive();
  S.view = { name: 'exercise', i: 0 }; render();
}
function mainLift(a, i) {
  const e = a.exercises[i]; const ex = EX[e.exId]; if (ex.type !== 'compound' || ex.loading === 'bodyweight') return false;
  const compIdx = a.exercises.filter((x, k) => k <= i && EX[x.exId].type === 'compound' && EX[x.exId].loading !== 'bodyweight').length;
  return compIdx <= 3;
}
function startRest(a, e) {
  const ex = EX[e.exId]; const secs = e.superset === 'a' ? 20 : (e.rest ?? ex.rest);
  if (!secs) return;
  a.rest = { end: Date.now() + secs * 1000, total: secs * 1000, exName: ex.name, notified: false };
}
function toggleSet(i, j) {
  unlockAudio();
  const a = S.active; const e = a.exercises[i]; const s = e.sets[j]; const ex = EX[e.exId];
  if (s.done) { s.done = false; s.pr = null; delete s.at; persistActive(); return render(); }
  s.done = true; s.at = Date.now(); a.cursor = i;
  if (!s.warmup) {
    if ((s.weight != null && e.target.weight != null && s.weight < e.target.weight - 0.01) || s.reps < e.target.reps) e.lowered = true;
    s.pr = E.detectPR(S, e.exId, s, a.startedAt);
    if (s.pr) toast(`${ICON.trophy} ${s.pr}!`, 'gold');
  }
  startRest(a, e);
  const working = e.sets.filter(x => !x.warmup);
  const isFirstWorking = !s.warmup && working.indexOf(s) === 0;
  persistActive();
  if (isFirstWorking && mainLift(a, i) && !e.firstRir) { S.sheet = { type: 'rir', i, j }; return render(); }
  advanceAfterSet(i);
}
function advanceAfterSet(i) {
  const a = S.active; const e = a.exercises[i];
  const partner = e.superset === 'a' ? i + 1 : e.superset === 'b' ? i - 1 : -1;
  if (partner >= 0 && a.exercises[partner]?.sets.some(x => !x.done)) { S.view = { name: 'exercise', i: partner }; return render(); }
  if (!e.sets.some(x => !x.done)) {
    const next = a.exercises.findIndex(x => x.sets.some(s => !s.done));
    if (next >= 0) { S.view = { name: 'exercise', i: next }; toast(`Next: ${EX[a.exercises[next].exId].name}`); }
    else { S.view = { name: 'session' }; toast('All sets done. Tap Finish when ready.'); }
  }
  render();
}
function onRir(v) {
  const sh = S.sheet; const a = S.active; const e = a.exercises[sh.i]; const s = e.sets[sh.j]; const ex = EX[e.exId];
  e.firstRir = v; S.sheet = null;
  if (!e.adjusted && s.weight != null) {
    const inc = E.incFor(ex);
    if (v === '3+' && s.reps >= e.target.reps) S.sheet = { type: 'adjust', i: sh.i, up: true, weight: s.weight + inc * (s.reps >= e.target.hi ? 2 : 1) };
    else if (v === '0' && s.reps < e.target.lo) S.sheet = { type: 'adjust', i: sh.i, up: false, weight: Math.max(inc, E.roundTo(s.weight * 0.93, inc)) };
  }
  persistActive();
  if (!S.sheet) return advanceAfterSet(sh.i);
  render();
}
function applyAdjust() {
  const sh = S.sheet; const e = S.active.exercises[sh.i];
  e.sets.forEach(s => { if (!s.done && !s.warmup) s.weight = sh.weight; });
  e.adjusted = true; e.target = { ...e.target, weight: sh.weight, reason: sh.up ? 'Bumped up today: first set felt easy' : 'Dropped today to stay in range' };
  S.sheet = null; persistActive(); advanceAfterSet(sh.i);
}
function finishWorkout() {
  const a = S.active; const left = a.exercises.reduce((n, e) => n + e.sets.filter(s => !s.done && !s.warmup).length, 0);
  if (left && S.sheet?.type !== 'finish') { S.sheet = { type: 'finish', left }; return render(); }
  S.sheet = null;
  const w = { id: a.id, name: a.name, templateKey: a.templateKey, type: a.type, startedAt: a.startedAt, endedAt: Date.now(),
    exercises: a.exercises.map(e => ({ exId: e.exId, target: e.target, firstRir: e.firstRir || null, lowered: !!e.lowered, sets: e.sets.filter(s => s.done) })).filter(e => e.sets.length) };
  const under = w.exercises.filter(e => e.lowered || (e.target?.reps && e.sets.filter(s => !s.warmup).some(s => s.reps < e.target.reps - 1))).length;
  w.rough = under >= 2 || !!a.trimmed;
  if (!w.exercises.length) { S.active = null; persistActive(); S.view = { name: 'home' }; toast('Nothing logged, workout discarded'); return render(); }
  S.workouts.unshift(w); S.active = null; persistActive();
  DB.saveWorkout(S, w);
  S.view = { name: 'summary', id: w.id, from: 'train' }; render();
}

// ---------------- Claude ----------------
async function reworkSession(request) {
  if (!request) return toast('Tell Claude what to change');
  const s = currentSession(); const active = !!S.active;
  const isDone = (e) => e.sets.some(x => x.done);
  const done = active ? s.exercises.filter(isDone) : [];
  const remaining = s.exercises.filter(e => !done.includes(e));
  const elapsed = active ? (Date.now() - s.startedAt) / 60000 : 0;
  const minutes = Math.max(15, Math.round((S.cardMin[s.templateKey] || Number(S.settings.minutes) || 60) - elapsed));
  S.busy = 'rework'; render();
  try {
    const res = await askClaude('rework', { request, type: s.type, minutes, done: done.map(e => e.exId),
      remaining: remaining.map(e => ({ exId: e.exId, sets: e.sets.filter(x => !x.warmup).length })), readiness: E.readiness(S), library: libraryText(S) });
    const seen = new Set(done.map(e => e.exId));
    const items = (res.exercises || []).filter(x => EX[x.exId] && E.isAvailable(EX[x.exId], S) && !seen.has(x.exId) && seen.add(x.exId))
      .map((x, i) => {
        const keep = remaining.find(e => e.exId === x.exId);
        if (keep) { const w = keep.sets.filter(z => z.warmup); const t = keep.sets.find(z => !z.warmup) || {}; keep.sets = [...w, ...Array.from({ length: x.sets }, () => ({ weight: t.weight ?? keep.target.weight, reps: t.reps ?? keep.target.reps, done: false }))]; return keep; }
        return E.buildItem(S, x.exId, x.sets, Date.now(), !done.length && i === 0 && EX[x.exId].type === 'compound');
      });
    if (!items.length) throw new Error('No usable exercises returned');
    s.exercises = [...done, ...items]; s.aiNote = res.summary; S.sheet = null;
    if (active) persistActive();
    toast(`${ICON.spark} Session reworked`, 'ok');
  } catch (e) { toast(`Claude couldn't rework it: ${esc(e.message)}`); }
  S.busy = null; render();
}
async function swapWithClaude(request) {
  const sh = S.sheet; if (!request) return toast('Tell Claude why you want to swap');
  const s = currentSession(); const cur = s.exercises[sh.i];
  sh.ask = request; S.busy = 'swap'; render();
  try {
    const res = await askClaude('swap', { current: `${cur.exId} (${EX[cur.exId].name})`, request, inSession: s.exercises.map(e => e.exId), library: libraryText(S, { withReason: true }) });
    if (S.sheet === sh) sh.aiPicks = (res.options || []).filter(o => EX[o.exId] && E.isAvailable(EX[o.exId], S));
  } catch (e) { toast(`Claude unavailable: ${esc(e.message)}`); }
  S.busy = null; render();
}
async function weeklyReview() {
  const now = Date.now(); const wk = E.weekKey(now); const thisWeek = E.weekWorkouts(S, now);
  const g = E.goalsOf(S); const spm = E.setsPerMuscle(thisWeek);
  const sets = Object.keys(MUSCLES).map(m => { const b = E.band(m, S); return b ? `${MUSCLES[m]} ${spm[m]} (${b.lo}-${b.hi})` : null; }).filter(Boolean).join(', ');
  const ids = [...new Set(S.workouts.filter(w => now - w.startedAt < 42 * 864e5).flatMap(w => w.exercises.map(e => e.exId)))];
  const trends = ids.map(id => { const h = E.exerciseHistory(S, id).filter(x => now - x.at < 42 * 864e5).reverse(); if (!h.length) return null;
    const v = (x) => Math.round(Math.max(...x.sets.map(s => E.e1rm(s.weight, s.reps) || s.reps)) * 10) / 10; return `${EX[id].name}: ${h.map(v).join(' > ')}`; }).filter(Boolean).join('; ');
  const tw = thisWeek.map(w => `${w.name} (${dayName(w.startedAt)}${w.rough ? ', rough day' : ''}): ` + w.exercises.map(e => `${EX[e.exId].name} ${e.sets.filter(s => !s.warmup).map(s => `${s.reps}x${s.weight ?? 'BW'}`).join(',')}`).join('; ')).join(' | ');
  S.busy = 'review'; render();
  try {
    const res = await askClaude('review', { goals: Object.keys(g).filter(k => g[k]), comments: S.settings.comments, thisWeek: tw || 'none', sets, trends: trends || 'no history yet' });
    S.reviews = { ...S.reviews, [wk]: { ...res, at: now } }; persistProfile();
  } catch (e) { toast(`Claude unavailable: ${esc(e.message)}`); }
  S.busy = null; render();
}
function reviewCard(thisWeek) {
  const r = S.reviews?.[E.weekKey(Date.now())];
  if (!r) return thisWeek.length ? `<section class="card ai-card"><div class="row"><div><b>${ICON.spark} Weekly review</b><small class="muted">What improved, what stalled, one change.</small></div><button class="btn small ai" data-a="review" ${S.busy ? 'disabled' : ''}>${S.busy === 'review' ? '<span class="spinner sm"></span>' : 'Review'}</button></div></section>` : '';
  const li = (a) => a.map(x => `<li>${esc(x)}</li>`).join('');
  return `<section class="card ai-card"><span class="kicker">${ICON.spark} WEEKLY REVIEW</span><h3>${esc(r.headline)}</h3>
    ${r.improved?.length ? `<h4>Improved</h4><ul>${li(r.improved)}</ul>` : ''}${r.stalled?.length ? `<h4>Stalled</h4><ul>${li(r.stalled)}</ul>` : ''}
    <h4>Next week</h4><p>${esc(r.change)}</p><button class="btn small ghost" data-a="review">${S.busy === 'review' ? '<span class="spinner sm"></span>' : 'Refresh'}</button></section>`;
}

// ---------------- actions ----------------
const A = {
  tab: (d) => { S.view = { name: d.v === 'train' ? 'home' : d.v }; if (d.v === 'settings') S.setupDraft = null; render(); },
  back: () => { S.preview = S.active ? S.preview : null; S.view = { name: 'home' }; render(); },
  openSession: () => { S.view = { name: 'session' }; render(); },
  openCard: (d) => openCard(d.k),
  extraSession: () => openCard('extra'),
  cardMin: (d) => { S.cardMin[d.k] = Number(d.v); render(); },
  startWorkout,
  openEx: (d) => { if (!S.active) return; S.view = { name: 'exercise', i: Number(d.v) }; render(); },
  toggleSet: (d) => toggleSet(Number(d.i), Number(d.j)),
  editSet: (d) => { const s = S.active.exercises[d.i].sets[d.j]; S.sheet = { type: 'edit', i: Number(d.i), j: Number(d.j), f: d.f, value: s[d.f], applyRest: !s.done }; render(); },
  sheetAdj: (d) => { const inp = document.getElementById('sheetVal'); const v = Math.max(0, (Number(inp.value) || 0) + Number(d.v)); inp.value = Math.round(v * 100) / 100; },
  sheetSave: () => {
    const sh = S.sheet; const e = S.active.exercises[sh.i]; const raw = document.getElementById('sheetVal').value;
    const v = raw === '' ? null : Number(raw); const applyRest = document.getElementById('applyRest').checked;
    e.sets.forEach((s, k) => { if (k === sh.j || (applyRest && k > sh.j && !s.done && !s.warmup)) s[sh.f] = sh.f === 'reps' ? Math.max(0, Math.round(v || 0)) : v; });
    const s = e.sets[sh.j];
    if (!s.warmup && ((sh.f === 'weight' && v != null && e.target.weight != null && v < e.target.weight - 0.01) || (sh.f === 'reps' && v < e.target.reps))) e.lowered = true;
    S.sheet = null; persistActive(); render();
  },
  addSet: (d) => { const e = S.active.exercises[d.v]; const last = [...e.sets].reverse().find(s => !s.warmup) || {}; e.sets.push({ weight: last.weight ?? e.target.weight, reps: last.reps ?? e.target.reps, done: false }); persistActive(); render(); },
  rir: (d) => onRir(d.v),
  applyAdjust,
  closeSheet: () => { const sh = S.sheet; S.sheet = null; if (sh?.type === 'rir' || sh?.type === 'adjust') return advanceAfterSet(sh.i); render(); },
  restAdd: (d) => { const r = S.active?.rest; if (!r) return; r.end += Number(d.v) * 1000; r.total += Number(d.v) * 1000; persistActive(); tick(); },
  restStop: () => { S.active.rest = null; persistActive(); render(); },
  restCycle: (d) => { const e = S.active.exercises[d.v]; const ex = EX[e.exId]; const opts = [60, 90, 120, 150, 180, 240]; const cur = e.rest ?? ex.rest; e.rest = opts[(opts.indexOf(cur) + 1) % opts.length] || 90; persistActive(); render(); },
  exMenu: (d, ev) => { ev.stopPropagation(); S.sheet = { type: 'menu', i: Number(d.v) }; render(); },
  move: (d) => { const s = currentSession(); const i = S.sheet.i, k = i + Number(d.v); if (k < 0 || k >= s.exercises.length) return; [s.exercises[i], s.exercises[k]] = [s.exercises[k], s.exercises[i]]; S.sheet.i = k; persistActive(); render(); },
  supersetNext: () => { const s = currentSession(); const i = S.sheet.i; const e = s.exercises[i];
    if (e.superset) { const p = e.superset === 'a' ? s.exercises[i + 1] : s.exercises[i - 1]; e.superset = null; if (p) p.superset = null; }
    else if (s.exercises[i + 1]) { e.superset = 'a'; s.exercises[i + 1].superset = 'b'; }
    S.sheet = null; persistActive(); render(); },
  setCount: (d) => { const e = currentSession().exercises[S.sheet.i]; if (Number(d.v) > 0) { const l = [...e.sets].reverse().find(s => !s.warmup) || {}; e.sets.push({ weight: l.weight ?? e.target.weight, reps: l.reps ?? e.target.reps, done: false }); } else { const k = e.sets.map(s => !s.done && !s.warmup).lastIndexOf(true); if (k >= 0 && e.sets.filter(s => !s.warmup).length > 1) e.sets.splice(k, 1); } persistActive(); render(); },
  removeEx: () => { currentSession().exercises.splice(S.sheet.i, 1); S.sheet = null; persistActive(); render(); },
  swapOpen: (d, ev) => { ev?.stopPropagation(); S.sheet = { type: 'swap', i: Number(d.v), q: '', reason: null }; render(); },
  addExercise: () => { S.sheet = { type: 'swap', mode: 'add', q: '' }; render(); },
  swapReason: (d) => { S.sheet.reason = S.sheet.reason === d.v ? null : d.v; render(); },
  removeEquip: (d) => { S.equipment = S.equipment.filter(k => k !== d.v); persistProfile(); toast(`${EQUIPMENT[d.v]} removed from your gym`); S.sheet.reason = null; render(); },
  swapPick: (d) => {
    const sh = S.sheet; const s = currentSession();
    if (sh.mode === 'add') { s.exercises.push(E.buildItem(S, d.v, 3)); }
    else {
      const old = s.exercises[sh.i];
      if (sh.reason === 'dislike' && !S.excluded.includes(old.exId)) { S.excluded.push(old.exId); persistProfile(); }
      const n = Math.max(2, old.sets.filter(x => !x.warmup && !x.done).length || 3);
      const it = E.buildItem(S, d.v, n); it.superset = old.superset;
      const doneSets = old.sets.filter(x => x.done);
      if (doneSets.length && S.active) { s.exercises.splice(sh.i + 1, 0, it); old.sets = doneSets; } else s.exercises[sh.i] = it;
    }
    S.sheet = null; persistActive(); render();
  },
  trimRest: () => { const a = S.active; a.exercises.forEach(e => { if (e.sets.every(s => !s.done)) { const k = e.sets.map(s => !s.warmup).lastIndexOf(true); if (e.sets.filter(s => !s.warmup).length > 2) e.sets.splice(k, 1); } }); a.trimmed = true; persistActive(); toast('Trimmed. Rough day noted.'); render(); },
  dismissTrim: () => { S.active.trimmed = true; S.active.roughDismissed = true; persistActive(); render(); },
  finish: finishWorkout,
  askOpen: () => { S.sheet = { type: 'ask', text: '' }; render(); },
  askQuick: (d) => { const t = document.getElementById('askIn'); t.value = t.value ? `${t.value}. ${d.v}` : d.v; },
  askSend: () => reworkSession(document.getElementById('askIn').value.trim()),
  swapAsk: () => swapWithClaude(document.getElementById('swapAsk').value.trim()),
  review: () => weeklyReview(),
  doFinish: () => { S.sheet = { type: 'finish' }; finishWorkout(); },
  discard: () => { S.sheet = { type: 'discard' }; render(); },
  doDiscard: () => { S.active = null; S.sheet = null; persistActive(); S.view = { name: 'home' }; render(); },
  viewWorkout: (d) => { S.view = { name: 'summary', id: d.v, from: d.from || 'train' }; render(); },
  deleteWorkout: (d) => { if (!confirmTwice(d.v)) return; S.workouts = S.workouts.filter(w => w.id !== d.v); DB.removeWorkout(S, d.v); S.view = { name: 'home' }; toast('Workout deleted'); render(); },
  exDetail: (d) => { S.view = { name: 'exdetail', id: d.v }; render(); },
  exView: (d) => { S.view = { ...S.view, [d.f]: d.v }; render(); },
  boost: (d) => { S.boosted = S.boosted.includes(d.v) ? S.boosted.filter(x => x !== d.v) : [...S.boosted, d.v]; persistProfile(); render(); },
  exclude: (d) => { S.excluded = S.excluded.includes(d.v) ? S.excluded.filter(x => x !== d.v) : [...S.excluded, d.v]; persistProfile(); render(); },
  unexclude: (d) => { S.excluded = S.excluded.filter(x => x !== d.v); persistProfile(); render(); },
  barOverride: (d) => { S.sheet = { type: 'bar', id: d.v }; render(); },
  setBar: (d) => { S.barOverrides = { ...S.barOverrides }; if (d.v === '') delete S.barOverrides[S.sheet.id]; else S.barOverrides[S.sheet.id] = Number(d.v); S.sheet = null; persistProfile(); render(); },
  soreOpen: (d) => { S.sheet = { type: 'sore', m: d.v }; render(); },
  mapTap: (d, ev) => { const m = ev.target.closest('[data-muscle]')?.dataset.muscle; if (m && MUSCLES[m]) { S.sheet = { type: 'sore', m }; render(); } },
  setSore: (d) => { S.soreness = { ...S.soreness }; if (d.v === 'fresh') delete S.soreness[S.sheet.m]; else S.soreness[S.sheet.m] = { level: d.v, at: Date.now() }; S.sheet = null; persistProfile(); render(); },
  logGame: () => { S.games = [...(S.games || []).filter(t => Date.now() - t < 14 * 864e5), Date.now()]; persistProfile(); toast('Game logged. Leg recovery updated.'); render(); },
  toggleGameWeek: () => { const k = E.weekKey(Date.now()); S.gameSkips = S.gameSkips.includes(k) ? S.gameSkips.filter(x => x !== k) : [...S.gameSkips, k]; persistProfile(); render(); },
  draft: (d) => { const st = draft().settings; st[d.f] = d.f === 'gameDay' ? (d.v === '' ? '' : Number(d.v)) : isNaN(Number(d.v)) ? d.v : Number(d.v); render(); },
  saveSetup: async () => {
    const ci = document.getElementById('commentsIn'); const d = draft(); if (ci) d.settings.comments = ci.value;
    const prev = S.settings; const st = d.settings;
    const goalsChanged = JSON.stringify(prev?.goals || {}) !== JSON.stringify(st.goals || {}) || (prev?.comments || '') !== (st.comments || '');
    S.settings = st; S.equipment = d.equipment; persistProfile();
    if (goalsChanged && (st.comments || '').trim()) {
      S.busy = 'goals'; render();
      try {
        const g = st.goals || {};
        const res = await askClaude('goals', { goals: Object.keys(g).filter(k => g[k]), comments: st.comments, library: libraryText(S), muscles: MUSCLE_KEYS });
        S.settings = { ...S.settings, ai: { ...res, avoid: (res.avoid || []).filter(id => EX[id]), prefer: (res.prefer || []).filter(id => EX[id]), at: Date.now() } };
        persistProfile(); toast(`${ICON.spark} Plan updated`, 'ok');
      } catch (e) { toast(`Saved, but Claude couldn't read your comments: ${esc(e.message)}`); }
      S.busy = null;
    } else if (goalsChanged && !(st.comments || '').trim()) { S.settings = { ...S.settings, ai: null }; persistProfile(); toast('Saved'); }
    else toast('Saved');
    S.setupDraft = null; S.view = { name: prev ? 'settings' : 'home' }; lastViewKey = ''; render();
  },
  addBw: () => { const v = Number(document.getElementById('bwIn').value); if (!v) return; S.bodyweight = [...(S.bodyweight || []), { kg: v, at: Date.now() }]; persistProfile(); toast(`Logged ${v} kg`); render(); },
  signOut: () => { DB.signOut(); },
  resetPw: async () => { const email = document.querySelector('input[name=email]').value; if (!email) { S.authError = 'Enter your email first'; return render(); } try { await DB.resetPassword(email); S.authError = 'Reset email sent'; } catch (e) { S.authError = e.message; } render(); }
};
let confirmId = null;
function confirmTwice(id) { if (confirmId === id) { confirmId = null; return true; } confirmId = id; toast('Tap delete again to confirm'); setTimeout(() => { confirmId = null; }, 3000); return false; }

// ---------------- events ----------------
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a]'); if (!el) return;
  const fn = A[el.dataset.a]; if (!fn) return;
  if (el.tagName === 'INPUT') return; // handled on change
  ev.preventDefault(); fn(el.dataset, ev);
});
document.addEventListener('change', (ev) => {
  const el = ev.target;
  if (el.dataset.a === 'draftGoal') { const st = draft().settings; st.goals = { ...(st.goals || {}), [el.dataset.f]: el.checked }; return; }
  if (el.id === 'commentsIn') { draft().settings.comments = el.value; return; }
  if (el.dataset.a === 'draftEq') { const d = draft(); d.equipment = el.checked ? [...new Set([...d.equipment, el.dataset.f])] : d.equipment.filter(k => k !== el.dataset.f); el.closest('.chip').classList.toggle('on', el.checked); return; }
  if (el.id === 'noteIn') { S.notes = { ...S.notes, [el.dataset.ex]: el.value }; persistProfile(); }
  if (el.id === 'wname') { const w = S.workouts.find(x => x.id === el.dataset.id); if (w) { w.name = el.value || w.name; DB.saveWorkout(S, w); } }
});
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'swapSearch' && S.sheet) { S.sheet.q = ev.target.value; const pos = ev.target.selectionStart; render(); const n = document.getElementById('swapSearch'); n.focus(); n.setSelectionRange(pos, pos); }
});
document.addEventListener('submit', async (ev) => {
  if (ev.target.id !== 'authForm') return; ev.preventDefault();
  const f = new FormData(ev.target); S.authError = '';
  try { await DB.signIn(f.get('email'), f.get('password')); } catch (e) { S.authError = 'Sign in failed. Check your email and password.'; render(); }
});

// Swipe left on an exercise row to swap.
let sw = null;
document.addEventListener('touchstart', (ev) => { const w = ev.target.closest('[data-swipe]'); if (!w) return; sw = { w, row: w.querySelector('.exrow'), x: ev.touches[0].clientX, y: ev.touches[0].clientY, dx: 0, lock: null }; }, { passive: true });
document.addEventListener('touchmove', (ev) => {
  if (!sw) return; const dx = ev.touches[0].clientX - sw.x, dy = ev.touches[0].clientY - sw.y;
  if (sw.lock == null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) sw.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  if (sw.lock !== 'x') return; sw.w.classList.add('swiping'); sw.dx = Math.min(0, dx); sw.row.style.transform = `translateX(${Math.max(-120, sw.dx)}px)`;
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!sw) return; const { row, dx, w } = sw; setTimeout(() => w.classList.remove('swiping'), 220); row.style.transition = 'transform .2s'; row.style.transform = '';
  setTimeout(() => { row.style.transition = ''; }, 220);
  if (dx < -70) { S.sheet = { type: 'swap', i: Number(w.dataset.swipe), q: '', reason: null }; render(); }
  if (Math.abs(dx) > 8) { const stop = (e) => { e.stopPropagation(); e.preventDefault(); }; document.addEventListener('click', stop, { capture: true, once: true }); setTimeout(() => document.removeEventListener('click', stop, { capture: true }), 50); }
  sw = null;
});

// ---------------- timers ----------------
function tick() {
  const a = S.active; if (!a) return;
  const wt = document.getElementById('wtimer'); if (wt) wt.textContent = fmtDur(Date.now() - a.startedAt);
  const mt = document.getElementById('mini-time'); if (mt) mt.textContent = fmtDur(Date.now() - a.startedAt);
  const r = a.rest; if (!r) return;
  const left = r.end - Date.now();
  const el = document.getElementById('rest-time'); if (el) el.textContent = fmtDur(left);
  const pg = document.getElementById('rest-prog'); if (pg) pg.style.width = `${Math.max(0, Math.min(100, (1 - left / r.total) * 100))}%`;
  if (left <= 0 && !r.notified) { r.notified = true; beep(); toast(`${ICON.check} Rest for ${r.exName} is up`, 'ok'); a.rest = null; persistActive(); render(); }
}
setInterval(tick, 250);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

// ---------------- boot ----------------
const cache = DB.readCache();
DB.onAuth(async (user) => {
  if (!user) { Object.assign(S, { uid: null, loaded: false }); return render(); }
  S.uid = user.uid;
  if (cache && cache.uid === user.uid) { applyProfile(cache); S.workouts = cache.workouts || []; S.loaded = true; }
  S.active = DB.readActive();
  render();
  try {
    const { profile, workouts } = await DB.loadAll(user.uid);
    if (profile) applyProfile(profile);
    S.workouts = workouts; S.loaded = true; DB.writeCache(S); render();
  } catch (e) { console.warn('load failed', e); S.loaded = true; render(); }
});
function applyProfile(p) {
  for (const k of DB.PROFILE_KEYS) if (p[k] != null) S[k] = p[k];
  S.equipment = S.equipment?.length ? S.equipment : [...DEFAULT_EQUIPMENT];
  S.excluded ||= []; S.boosted ||= []; S.gameSkips ||= []; S.games ||= []; S.soreness ||= {}; S.notes ||= {}; S.barOverrides ||= {}; S.bodyweight ||= []; S.reviews ||= {};
  if (S.settings && !S.settings.goals) S.settings = { ...S.settings, goals: E.goalsOf(S) };
}
render();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { });


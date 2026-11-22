// Liftlab's own stylised body map. Each muscle is its own region so it can be
// highlighted (exercise icons) or coloured by readiness (recovery heatmap).
const sym = (cx, cy, rx, ry, rot = 0) => [
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})"/>`,
  `<ellipse cx="${100 - cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${-rot} ${100 - cx} ${cy})"/>`
].join('');

const FRONT = {
  neck: '<rect x="45" y="23" width="10" height="8" rx="3"/>',
  frontDelts: sym(31, 41, 6, 6.5, -20),
  sideDelts: sym(25.5, 46, 3.5, 7, 15),
  chest: sym(41, 48, 9.5, 7.5, 0),
  biceps: sym(25, 62, 4.5, 10, 8),
  forearms: sym(21, 84, 4, 11, 10),
  abs: '<rect x="43.5" y="58" width="13" height="32" rx="5"/>',
  obliques: sym(37.5, 73, 3.8, 11, 0),
  abductors: sym(33.5, 101, 3.8, 8, 0),
  quads: sym(41.5, 122, 7, 20, 3),
  adductors: sym(47.2, 112, 2.6, 11, 0),
  calves: sym(41.5, 163, 4.8, 14, 2)
};
const BACK = {
  traps: '<path d="M50 24 L64 37 L50 54 L36 37 Z"/>',
  rearDelts: sym(30.5, 42, 6, 6.5, 20),
  upperBack: '<rect x="41" y="44" width="18" height="14" rx="4"/>',
  lats: sym(39, 64, 7, 13, -12),
  triceps: sym(25, 61, 4.5, 10, 8),
  forearms: sym(21, 84, 4, 11, 10),
  lowerBack: '<rect x="43" y="77" width="14" height="12" rx="4"/>',
  glutes: sym(42.5, 101, 8, 9, 0),
  hamstrings: sym(42, 128, 6.5, 18, 2),
  calves: sym(42, 162, 5.5, 14, 2)
};
const SILHOUETTE = '<path d="M50 4a10 10 0 1 1 0 20a10 10 0 1 1 0-20zM36 32h28l10 6 6 22 6 30-6 2-8-28-4 20 4 20-2 48-2 32h-10l-2-50-2 0-2 50h-10l-2-32-2-48 4-20-4-20-8 28-6-2 6-30 6-22z"/>';

const FRONT_SET = new Set(Object.keys(FRONT)), BACK_SET = new Set(Object.keys(BACK));

function figure(map, colorOf, x = 0) {
  let s = `<g transform="translate(${x} 0)"><g fill="var(--body)">${SILHOUETTE}</g>`;
  for (const [m, shape] of Object.entries(map)) s += `<g data-muscle="${m}" fill="${colorOf(m)}">${shape}</g>`;
  return s + '</g>';
}

// Small icon: one figure (front or back, whichever shows the primary muscle).
export function muscleIcon(primary = [], secondary = [], size = 44) {
  const p = new Set(primary), sec = new Set(secondary);
  const useBack = primary.some(m => BACK_SET.has(m) && !FRONT_SET.has(m));
  const color = (m) => p.has(m) ? 'var(--accent)' : sec.has(m) ? 'var(--accent-dim)' : 'var(--muscle)';
  const LOWER = new Set(['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors']);
  const vb = LOWER.has(primary[0]) ? '12 88 76 88' : primary[0] === 'abs' || primary[0] === 'obliques' || primary[0] === 'lowerBack' ? '14 30 72 72' : '6 18 88 88';
  return `<svg class="micon" viewBox="${vb}" width="${size}" height="${size}" aria-hidden="true">${figure(useBack ? BACK : FRONT, color)}</svg>`;
}

// Heatmap: front + back, coloured by readiness 0-100. Tappable regions.
export function heatColor(r) {
  if (r == null) return 'var(--muscle)';
  if (r >= 85) return '#2F7BFF';
  if (r >= 60) return '#7aa8ff';
  if (r >= 40) return '#f5a524';
  return '#e5484d';
}
export function recoveryMap(ready, height = 220) {
  const c = (m) => heatColor(ready[m]);
  return `<svg class="bodymap" viewBox="0 0 210 182" height="${height}">${figure(FRONT, c, 0)}${figure(BACK, c, 110)}</svg>`;
}

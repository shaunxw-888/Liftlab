// Minimal SVG line chart with PR markers.
export function lineChart(points, { height = 180, unit = 'kg', prs = [] } = {}) {
  if (points.length < 1) return '<div class="empty">No data yet</div>';
  const W = 340, H = height, P = { l: 34, r: 10, t: 12, b: 22 };
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  let x0 = Math.min(...xs), x1 = Math.max(...xs); if (x1 === x0) { x0 -= 86400000; x1 += 86400000; }
  let y0 = Math.min(...ys), y1 = Math.max(...ys); const pad = (y1 - y0) * 0.15 || Math.max(1, y1 * 0.1); y0 -= pad; y1 += pad;
  const X = (x) => P.l + (x - x0) / (x1 - x0) * (W - P.l - P.r);
  const Y = (y) => H - P.b - (y - y0) / (y1 - y0) * (H - P.t - P.b);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join(' ');
  const area = `${d} L${X(points.at(-1).x).toFixed(1)} ${H - P.b} L${X(points[0].x).toFixed(1)} ${H - P.b} Z`;
  const fmt = (v) => (Math.round(v * 10) / 10).toString();
  const date = (t) => new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  const prSet = new Set(prs);
  const grid = [0, 0.5, 1].map(f => { const v = y0 + (y1 - y0) * f; return `<line x1="${P.l}" x2="${W - P.r}" y1="${Y(v)}" y2="${Y(v)}" class="grid"/><text x="${P.l - 6}" y="${Y(v) + 3}" text-anchor="end" class="axis">${fmt(v)}</text>`; }).join('');
  const dots = points.map((p, i) => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${prSet.has(i) ? 4.5 : 3}" class="${prSet.has(i) ? 'dot pr' : 'dot'}"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    <defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${area}" fill="url(#cg)" stroke="none"/><path d="${d}" class="line"/>${dots}
    <text x="${P.l}" y="${H - 6}" class="axis">${date(x0)}</text><text x="${W - P.r}" y="${H - 6}" text-anchor="end" class="axis">${date(x1)}</text>
    <text x="${W - P.r}" y="${P.t}" text-anchor="end" class="axis">${unit}</text></svg>`;
}

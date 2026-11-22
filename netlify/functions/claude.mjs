// Liftlab -> Claude proxy. Keeps the API key server-side and only serves the signed-in owner.
// Claude answers through forced tool calls so the app always gets valid JSON back.

const FIREBASE_WEB_KEY = 'AIzaSyDlwHFcbEGgx-_k3AKaIkSohdQoH1aDqew';
const MODEL = 'claude-sonnet-5-5';

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function verify(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ idToken: token })
  });
  if (!r.ok) return null;
  const u = (await r.json()).users?.[0];
  if (!u) return null;
  const allowed = process.env.ALLOWED_EMAIL;
  if (allowed && u.email?.toLowerCase() !== allowed.toLowerCase()) return null;
  return u;
}

const STYLE = `You are the coaching brain inside Liftlab, a personal training app for one user: a dentist (long hours in static clinical postures) who plays competitive basketball on Thursdays.
Programme with current evidence: roughly 10-20 hard sets per muscle per week, about 2x per week frequency, compounds before isolations, stretch-position exercises favoured, plyometrics low volume and fresh, no redundant exercise variations.
Only ever use exercise ids from the provided library. Never invent exercises. Weights and reps are handled by the app's progression rules, not by you.
Write for a phone screen: short, plain, direct. Never use em dashes.`;

const TOOLS = {
  goals: {
    name: 'set_program_adjustments',
    description: 'Translate the user goals and comments into programme adjustments.',
    input_schema: {
      type: 'object', required: ['summary', 'addonLevels', 'muscleBias', 'avoid', 'prefer'],
      properties: {
        summary: { type: 'string', description: 'One or two short sentences telling the user what you changed and why.' },
        addonLevels: {
          type: 'object', required: ['jump', 'posture', 'mobility'],
          properties: Object.fromEntries(['jump', 'posture', 'mobility'].map(k => [k, { type: 'string', enum: ['off', 'light', 'focus'] }]))
        },
        muscleBias: { type: 'array', description: 'Weekly set changes for specific muscles (-4 to +4).', items: { type: 'object', required: ['muscle', 'delta'], properties: { muscle: { type: 'string' }, delta: { type: 'integer', minimum: -4, maximum: 4 } } } },
        avoid: { type: 'array', items: { type: 'string' }, description: 'Exercise ids to keep out of generated sessions (e.g. for an issue mentioned).' },
        prefer: { type: 'array', items: { type: 'string' }, description: 'Exercise ids to favour.' }
      }
    }
  },
  rework: {
    name: 'rework_session',
    description: 'Rebuild the remaining part of a session to fit the user request.',
    input_schema: {
      type: 'object', required: ['summary', 'exercises'],
      properties: {
        summary: { type: 'string', description: 'One short sentence on what changed.' },
        exercises: { type: 'array', items: { type: 'object', required: ['exId', 'sets'], properties: { exId: { type: 'string' }, sets: { type: 'integer', minimum: 1, maximum: 6 } } } }
      }
    }
  },
  swap: {
    name: 'pick_swaps',
    description: 'Pick the best 1-3 replacement exercises for the request.',
    input_schema: {
      type: 'object', required: ['options'],
      properties: { options: { type: 'array', maxItems: 3, items: { type: 'object', required: ['exId', 'why'], properties: { exId: { type: 'string' }, why: { type: 'string', description: 'Under 12 words.' } } } } }
    }
  },
  review: {
    name: 'weekly_review',
    description: 'Short weekly training review.',
    input_schema: {
      type: 'object', required: ['headline', 'improved', 'stalled', 'change'],
      properties: {
        headline: { type: 'string', description: 'Under 12 words.' },
        improved: { type: 'array', items: { type: 'string' }, maxItems: 3 },
        stalled: { type: 'array', items: { type: 'string' }, maxItems: 3 },
        change: { type: 'string', description: 'One concrete thing to change next week.' }
      }
    }
  }
};

const PROMPTS = {
  goals: (p) => `Ticked goals: ${p.goals.join(', ') || 'none'}.
User comments: """${p.comments || '(none)'}"""
Available exercise library (id | name | primary | secondary | tags):
${p.library}
Muscle keys: ${p.muscles.join(', ')}.
Set add-on levels (off if the matching goal is unticked and comments don't ask for it), weekly set biases, exercises to avoid or prefer. Keep changes minimal and justified.`,
  rework: (p) => `User request: """${p.request}"""
Session type: ${p.type}. Time budget for the remaining exercises: about ${p.minutes} minutes.
Already completed (keep, don't repeat): ${p.done.join(', ') || 'none'}.
Current remaining plan (exId x sets): ${p.remaining.map(e => `${e.exId} x${e.sets}`).join(', ')}.
Muscle readiness (0-100): ${JSON.stringify(p.readiness)}.
Available exercises (id | name | primary | secondary | type | tags):
${p.library}
Return the new remaining plan in order. Keep the same training intent unless the request changes it.`,
  swap: (p) => `Replace: ${p.current}. Reason: """${p.request}"""
Already in session: ${p.inSession.join(', ')}.
Available exercises (id | name | primary | secondary | type | reason):
${p.library}`,
  review: (p) => `Ticked goals: ${p.goals.join(', ')}. Comments: """${p.comments || ''}"""
Workouts this week: ${p.thisWeek}
Weekly sets per muscle vs target band: ${p.sets}
Estimated 1RM trend per exercise (last 6 weeks): ${p.trends}
Write a short, honest review. Reference real numbers.`
};

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'POST only' });
  if (!process.env.ANTHROPIC_API_KEY) return json(500, { error: 'ANTHROPIC_API_KEY not set in Netlify' });
  const user = await verify(req).catch(() => null);
  if (!user) return json(401, { error: 'Not signed in' });
  let body; try { body = await req.json(); } catch { return json(400, { error: 'Bad JSON' }); }
  const tool = TOOLS[body.task]; if (!tool) return json(400, { error: 'Unknown task' });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 1200, system: STYLE,
      tools: [tool], tool_choice: { type: 'tool', name: tool.name },
      messages: [{ role: 'user', content: PROMPTS[body.task](body.payload || {}) }]
    })
  });
  if (!r.ok) return json(502, { error: `Claude error ${r.status}`, detail: (await r.text()).slice(0, 300) });
  const out = await r.json();
  const call = out.content?.find(c => c.type === 'tool_use');
  if (!call) return json(502, { error: 'No structured answer' });
  return json(200, call.input);
};

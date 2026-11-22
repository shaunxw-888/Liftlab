# Liftlab spec

## Principles
- Open app, tap Start, tap sets. Anything else is optional.
- Evidence-based programming; lean exercise library, each exercise kept for a stated reason.
- Adaptive within and across sessions, without nagging.

## v1 (built)
- Setup: goal tick boxes (build muscle, get stronger, cutting, jump/athletic, back and neck, mobility) plus an "Anything else?" comments box Claude reads, days per week, session length, weekly game day, equipment checklist.
- Weekly plan around the Thursday game: no heavy legs or jumps the day before, day of, or day after. "No game this week" and "Log game".
- Home: weekly progress bar, session cards ordered by readiness, per-muscle readiness chips, time adjuster, recovery heatmap, optional soreness (Fresh / Bit sore / Very sore).
- Session: exercise list, swipe left to swap, menu (swap, reorder, superset, +/- set, remove), add exercise, rough-day trim prompt.
- Swap sheet: 2-3 best alternatives with reasons, reason chips (Equipment taken, Discomfort, Don't like it = exclude, Gym doesn't have this = remove equipment), search.
- Logging: tap set number to complete (tap again to undo), suggested weight and reps with reason badge, tap reps/weight to edit (apply to remaining sets), plate diagram + per-side text (bar inferred from exercise, plate-loaded machines count plates only), auto warm-ups on first big lift, rest timer (auto-start, -15/+15, banner + beep), pinned notes.
- RIR on first working set of main lifts only (3+ / 1-2 / 0); max one in-session weight adjustment per exercise.
- Rough day: 2+ lowered lifts = flagged; doesn't count against progression unless repeated.
- PRs: e1RM, weight, or rep PR at a weight, labelled with a trophy.
- Progress: weekly chips, streak, sets per muscle vs target band, PRs, plateau flags, volume/sets/time vs 4-week average, per-exercise line graphs (e1RM, weight, volume, reps; 1M-All), calendar, latest workouts.
- Finish: unfinished sets → "Save completed sets only". Summary with volume, sets, records, average rest.

## Evidence rules
- ~10-20 hard sets per muscle per week (80% of build volume when cutting), each muscle ~2x per week.
- Compounds 5-10 reps, isolations 10-20; strength goal uses 4-6 on barbell compounds.
- Rest 2-3 min compounds, 1-1.5 min isolation.
- Double progression; +2 increments if the first set felt 3+ RIR; -7% after two sessions below range.
- e1RM: Brzycki (matches Gravl).

## v1.1 Claude features (Netlify function, Sonnet, owner-only)
- Comments box → add-on levels (off/light/focus), weekly set bias per muscle, exercises to avoid/prefer. Summary shown in Settings.
- Ask Claude on the session screen: rework remaining exercises (completed ones kept).
- Ask Claude in the swap sheet: 1-3 picks with reasons.
- Weekly review card on Progress (cached per week).
- Claude only picks from the library; progression rules still set weights and reps.

## v2 (next)
- Strength score tiers (e1RM / bodyweight vs standards), DOTS, badges.
- Save session as template.
- Nutrition tab (on hold).

## Not possible as a web app
- Apple Health sync, haptics, reliable lock-screen rest alerts.

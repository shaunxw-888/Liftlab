// Curated exercise library. Each exercise is here for a stated reason.
// loading: barbell | dumbbell | machine | plate | cable | bodyweight
// bar: olympic | ez | smith (bar weight inferred from the exercise, no setup)

export const MUSCLES = {
  chest: 'Chest', lats: 'Lats', upperBack: 'Upper back', frontDelts: 'Front delts',
  sideDelts: 'Side delts', rearDelts: 'Rear delts', biceps: 'Biceps', triceps: 'Triceps',
  forearms: 'Forearms', traps: 'Traps', abs: 'Abs', obliques: 'Obliques',
  lowerBack: 'Lower back', glutes: 'Glutes', quads: 'Quads', hamstrings: 'Hamstrings',
  adductors: 'Adductors', abductors: 'Abductors', calves: 'Calves', neck: 'Neck'
};

// Recovery time constant (hours). Bigger muscles recover more slowly.
export const RECOVERY_TAU = {
  quads: 34, hamstrings: 36, glutes: 32, lowerBack: 36, lats: 28, upperBack: 26, chest: 28,
  frontDelts: 22, sideDelts: 20, rearDelts: 20, biceps: 22, triceps: 22, forearms: 18,
  traps: 22, abs: 18, obliques: 18, adductors: 26, abductors: 22, calves: 22, neck: 18
};

export const EQUIPMENT = {
  barbell: 'Barbell + plates', rack: 'Squat rack', bench: 'Flat bench', incline_bench: 'Adjustable bench',
  dumbbells: 'Dumbbells', cable: 'Cable station', smith: 'Smith machine', ez_bar: 'EZ bar',
  leg_press: 'Leg press', hack_squat: 'Hack squat', leg_ext: 'Leg extension',
  leg_curl_seated: 'Seated leg curl', pulldown: 'Lat pulldown', pullup_bar: 'Pull-up bar',
  chest_press: 'Chest press machine', preacher: 'Preacher bench', adductor: 'Adductor machine',
  abductor: 'Abductor machine', seated_calf: 'Seated calf raise', back_ext: 'Back extension bench',
  ab_wheel: 'Ab wheel', box: 'Plyo box', med_ball: 'Medicine ball', band: 'Resistance band'
};

const E = (o) => ({ unit: 'reps', inc: 2.5, rest: 90, type: 'isolation', secondary: [], tags: [], ...o });

export const EXERCISES = [
  // Chest
  E({ id: 'bench_press', name: 'Barbell Bench Press', primary: ['chest'], secondary: ['frontDelts', 'triceps'], equip: ['barbell', 'bench'], loading: 'barbell', bar: 'olympic', type: 'compound', reps: [6, 10], rest: 180, reason: 'Heaviest chest press, best for strength' }),
  E({ id: 'incline_bench', name: 'Barbell Incline Bench Press', primary: ['chest'], secondary: ['frontDelts', 'triceps'], equip: ['barbell', 'incline_bench'], loading: 'barbell', bar: 'olympic', type: 'compound', reps: [6, 10], rest: 180, reason: 'Biases upper chest' }),
  E({ id: 'incline_db_press', name: 'Dumbbell Incline Press', primary: ['chest'], secondary: ['frontDelts', 'triceps'], equip: ['dumbbells', 'incline_bench'], loading: 'dumbbell', type: 'compound', reps: [8, 12], rest: 150, reason: 'Deeper stretch, easier on shoulders' }),
  E({ id: 'machine_chest_press', name: 'Machine Chest Press', primary: ['chest'], secondary: ['triceps'], equip: ['chest_press'], loading: 'machine', inc: 5, type: 'compound', reps: [8, 12], rest: 120, reason: 'Stable, safe to push near failure' }),
  E({ id: 'cable_fly', name: 'Cable Fly', primary: ['chest'], equip: ['cable'], loading: 'cable', reps: [10, 15], rest: 90, reason: 'Loads chest in the stretch' }),
  // Back
  E({ id: 'pullup', name: 'Pull-up', primary: ['lats'], secondary: ['biceps', 'upperBack'], equip: ['pullup_bar'], loading: 'bodyweight', type: 'compound', reps: [6, 12], rest: 150, reason: 'Best bodyweight lat builder' }),
  E({ id: 'lat_pulldown', name: 'Lat Pulldown', primary: ['lats'], secondary: ['biceps'], equip: ['pulldown'], loading: 'machine', inc: 5, type: 'compound', reps: [8, 12], rest: 120, reason: 'Easy to load and progress' }),
  E({ id: 'cs_row', name: 'Chest-Supported DB Row', primary: ['upperBack'], secondary: ['lats', 'rearDelts', 'biceps'], equip: ['dumbbells', 'incline_bench'], loading: 'dumbbell', type: 'compound', reps: [8, 12], rest: 120, reason: 'No lower-back load' }),
  E({ id: 'cable_row', name: 'Seated Cable Row', primary: ['upperBack'], secondary: ['lats', 'biceps'], equip: ['cable'], loading: 'cable', inc: 5, type: 'compound', reps: [8, 12], rest: 120, reason: 'Constant tension, joint friendly' }),
  E({ id: 'barbell_row', name: 'Barbell Row', primary: ['upperBack'], secondary: ['lats', 'lowerBack', 'biceps'], equip: ['barbell'], loading: 'barbell', bar: 'olympic', type: 'compound', reps: [6, 10], rest: 150, reason: 'Heavy loading for whole back' }),
  E({ id: 'db_row', name: 'One-Arm Dumbbell Row', primary: ['lats'], secondary: ['upperBack', 'biceps'], equip: ['dumbbells', 'bench'], loading: 'dumbbell', type: 'compound', reps: [8, 12], rest: 120, reason: 'Long range of motion for lats' }),
  // Shoulders
  E({ id: 'ohp', name: 'Barbell Overhead Press', primary: ['frontDelts'], secondary: ['sideDelts', 'triceps'], equip: ['barbell', 'rack'], loading: 'barbell', bar: 'olympic', type: 'compound', reps: [6, 10], rest: 150, reason: 'Heaviest shoulder press' }),
  E({ id: 'db_shoulder_press', name: 'Dumbbell Shoulder Press', primary: ['frontDelts'], secondary: ['sideDelts', 'triceps'], equip: ['dumbbells', 'incline_bench'], loading: 'dumbbell', type: 'compound', reps: [8, 12], rest: 120, reason: 'Freer path, shoulder friendly' }),
  E({ id: 'cable_lateral', name: 'Cable Lateral Raise', primary: ['sideDelts'], equip: ['cable'], loading: 'cable', inc: 1.25, reps: [10, 20], rest: 75, reason: 'Tension at the bottom (stretch)' }),
  E({ id: 'db_lateral', name: 'Dumbbell Lateral Raise', primary: ['sideDelts'], equip: ['dumbbells'], loading: 'dumbbell', reps: [10, 20], rest: 75, reason: 'Simple, no cable needed' }),
  E({ id: 'reverse_fly', name: 'Reverse Cable Fly', primary: ['rearDelts'], secondary: ['upperBack'], equip: ['cable'], loading: 'cable', inc: 1.25, reps: [12, 20], rest: 75, reason: 'Isolates rear delts' }),
  E({ id: 'face_pull', name: 'Face Pull', primary: ['rearDelts'], secondary: ['upperBack', 'traps'], equip: ['cable'], loading: 'cable', inc: 2.5, reps: [12, 20], rest: 75, tags: ['posture'], reason: 'Rear delts plus upper back for posture' }),
  // Biceps
  E({ id: 'incline_db_curl', name: 'Incline Dumbbell Curl', primary: ['biceps'], equip: ['dumbbells', 'incline_bench'], loading: 'dumbbell', reps: [8, 15], rest: 75, reason: 'Trains biceps in the stretch' }),
  E({ id: 'ez_curl', name: 'EZ Bar Curl', primary: ['biceps'], secondary: ['forearms'], equip: ['ez_bar'], loading: 'barbell', bar: 'ez', reps: [8, 12], rest: 90, reason: 'Heaviest curl, wrist friendly' }),
  E({ id: 'preacher_curl', name: 'Preacher Curl', primary: ['biceps'], equip: ['preacher', 'ez_bar'], loading: 'barbell', bar: 'ez', reps: [8, 15], rest: 75, reason: 'Strict, no swinging' }),
  // Triceps
  E({ id: 'overhead_ext', name: 'Overhead Cable Extension', primary: ['triceps'], equip: ['cable'], loading: 'cable', reps: [8, 15], rest: 75, reason: 'Grows long head best (stretch)' }),
  E({ id: 'pushdown', name: 'Cable Pushdown', primary: ['triceps'], equip: ['cable'], loading: 'cable', reps: [10, 15], rest: 75, reason: 'Easy on elbows, high reps' }),
  E({ id: 'close_grip_bench', name: 'Close Grip Bench Press', primary: ['triceps'], secondary: ['chest', 'frontDelts'], equip: ['barbell', 'bench'], loading: 'barbell', bar: 'olympic', type: 'compound', reps: [6, 10], rest: 150, reason: 'Heavy triceps compound' }),
  E({ id: 'skullcrusher', name: 'EZ Bar Skullcrusher', primary: ['triceps'], equip: ['ez_bar', 'bench'], loading: 'barbell', bar: 'ez', reps: [8, 12], rest: 90, reason: 'Free-weight long-head option' }),
  // Quads
  E({ id: 'back_squat', name: 'Back Squat', primary: ['quads'], secondary: ['glutes', 'adductors', 'lowerBack'], equip: ['barbell', 'rack'], loading: 'barbell', bar: 'olympic', type: 'compound', reps: [5, 8], rest: 180, inc: 2.5, reason: 'Heaviest leg lift, carries over to jumping' }),
  E({ id: 'hack_squat', name: 'Hack Squat', primary: ['quads'], secondary: ['glutes'], equip: ['hack_squat'], loading: 'plate', inc: 5, type: 'compound', reps: [8, 12], rest: 150, reason: 'Quad focus, no back loading' }),
  E({ id: 'leg_press', name: 'Leg Press', primary: ['quads'], secondary: ['glutes', 'adductors'], equip: ['leg_press'], loading: 'plate', inc: 5, type: 'compound', reps: [8, 12], rest: 150, reason: 'Heavy and stable, low fatigue' }),
  E({ id: 'bss', name: 'Bulgarian Split Squat', primary: ['quads'], secondary: ['glutes', 'adductors'], equip: ['dumbbells', 'bench'], loading: 'dumbbell', type: 'compound', reps: [8, 12], rest: 120, perSide: true, reason: 'Single-leg strength, great for basketball' }),
  E({ id: 'leg_extension', name: 'Leg Extension', primary: ['quads'], equip: ['leg_ext'], loading: 'machine', inc: 5, reps: [10, 15], rest: 90, reason: 'Isolates rectus femoris' }),
  // Hamstrings / glutes
  E({ id: 'rdl', name: 'Romanian Deadlift', primary: ['hamstrings'], secondary: ['glutes', 'lowerBack'], equip: ['barbell'], loading: 'barbell', bar: 'olympic', type: 'compound', reps: [6, 10], rest: 180, reason: 'Loads hamstrings at long length' }),
  E({ id: 'deadlift', name: 'Deadlift', primary: ['hamstrings'], secondary: ['glutes', 'lowerBack', 'upperBack', 'traps', 'forearms'], equip: ['barbell'], loading: 'barbell', bar: 'olympic', type: 'compound', reps: [4, 8], rest: 210, inc: 5, reason: 'Whole posterior chain strength' }),
  E({ id: 'seated_leg_curl', name: 'Seated Leg Curl', primary: ['hamstrings'], equip: ['leg_curl_seated'], loading: 'machine', inc: 5, reps: [10, 15], rest: 90, reason: 'Beats lying curl (stretch position)' }),
  E({ id: 'nordic', name: 'Nordic Curl', primary: ['hamstrings'], equip: [], loading: 'bodyweight', reps: [4, 8], rest: 120, tags: ['athletic'], reason: 'Cuts hamstring injury risk for sprinting' }),
  E({ id: 'hip_thrust', name: 'Barbell Hip Thrust', primary: ['glutes'], secondary: ['hamstrings'], equip: ['barbell', 'bench'], loading: 'barbell', bar: 'olympic', type: 'compound', reps: [8, 12], rest: 150, reason: 'Heavy glute loading, low back stress' }),
  // Calves
  E({ id: 'standing_calf', name: 'Smith Machine Calf Raise', primary: ['calves'], equip: ['smith'], loading: 'barbell', bar: 'smith', reps: [8, 15], rest: 90, inc: 5, reason: 'Straight knee, pause in stretch' }),
  E({ id: 'seated_calf', name: 'Seated Calf Raise', primary: ['calves'], equip: ['seated_calf'], loading: 'plate', inc: 5, reps: [12, 20], rest: 75, reason: 'Bent knee targets soleus' }),
  // Hips
  E({ id: 'adductor_machine', name: 'Adductor Machine', primary: ['adductors'], equip: ['adductor'], loading: 'machine', inc: 5, reps: [10, 15], rest: 75, reason: 'Direct adductor work' }),
  E({ id: 'copenhagen', name: 'Copenhagen Plank', primary: ['adductors'], secondary: ['obliques'], equip: ['bench'], loading: 'bodyweight', unit: 's', reps: [20, 40], rest: 60, perSide: true, tags: ['athletic'], reason: 'Groin injury prevention for sport' }),
  E({ id: 'abductor_machine', name: 'Abductor Machine', primary: ['abductors'], secondary: ['glutes'], equip: ['abductor'], loading: 'machine', inc: 5, reps: [12, 20], rest: 60, reason: 'Glute med, hip stability' }),
  E({ id: 'cable_abduction', name: 'Cable Hip Abduction', primary: ['abductors'], secondary: ['glutes'], equip: ['cable'], loading: 'cable', inc: 1.25, reps: [10, 15], rest: 60, perSide: true, reason: 'Single-leg hip stability' }),
  // Core
  E({ id: 'cable_crunch', name: 'Cable Crunch', primary: ['abs'], equip: ['cable'], loading: 'cable', inc: 5, reps: [10, 15], rest: 60, reason: 'Loadable, easy to progress' }),
  E({ id: 'hanging_leg_raise', name: 'Hanging Leg Raise', primary: ['abs'], secondary: ['obliques'], equip: ['pullup_bar'], loading: 'bodyweight', reps: [8, 15], rest: 75, reason: 'Lower abs and hip flexors' }),
  E({ id: 'pallof', name: 'Pallof Press', primary: ['obliques'], secondary: ['abs'], equip: ['cable'], loading: 'cable', inc: 1.25, reps: [10, 12], rest: 60, perSide: true, tags: ['athletic'], reason: 'Anti-rotation, carries to sport' }),
  E({ id: 'ab_wheel', name: 'Ab Wheel Rollout', primary: ['abs'], equip: ['ab_wheel'], loading: 'bodyweight', reps: [6, 12], rest: 75, reason: 'Abs under stretch' }),
  E({ id: 'back_extension', name: 'Back Extension', primary: ['lowerBack'], secondary: ['glutes', 'hamstrings'], equip: ['back_ext'], loading: 'bodyweight', reps: [10, 15], rest: 75, reason: 'Lower back endurance' }),
  // Traps / forearms
  E({ id: 'db_shrug', name: 'Dumbbell Shrug', primary: ['traps'], equip: ['dumbbells'], loading: 'dumbbell', reps: [10, 15], rest: 75, reason: 'Direct trap work' }),
  E({ id: 'farmer_carry', name: 'Farmer Carry', primary: ['forearms'], secondary: ['traps', 'obliques'], equip: ['dumbbells'], loading: 'dumbbell', unit: 'm', reps: [30, 40], rest: 90, reason: 'Grip and trunk stiffness' }),
  // Posture add-on
  E({ id: 'neck_flexor', name: 'Deep Neck Flexor Hold', primary: ['neck'], equip: [], loading: 'bodyweight', unit: 's', reps: [20, 30], rest: 45, tags: ['posture', 'addon'], reason: 'Reduces neck pain in sustained postures' }),
  E({ id: 'prone_yt', name: 'Prone Y-T Raise', primary: ['upperBack'], secondary: ['rearDelts', 'traps'], equip: ['incline_bench'], loading: 'dumbbell', inc: 1, reps: [10, 15], rest: 60, tags: ['posture', 'addon'], reason: 'Lower and mid traps for posture' }),
  E({ id: 'band_pull_apart', name: 'Band Pull-Apart', primary: ['rearDelts'], secondary: ['upperBack'], equip: ['band'], loading: 'bodyweight', reps: [15, 25], rest: 45, tags: ['posture', 'addon'], reason: 'Quick upper-back activation' }),
  // Jump / power add-on (foot contacts, never to fatigue)
  E({ id: 'cmj', name: 'Countermovement Jump', primary: ['quads'], secondary: ['glutes', 'calves'], equip: [], loading: 'bodyweight', reps: [3, 5], rest: 90, tags: ['jump', 'addon'], reason: 'Max-intent vertical jump practice' }),
  E({ id: 'box_jump', name: 'Box Jump', primary: ['quads'], secondary: ['glutes', 'calves'], equip: ['box'], loading: 'bodyweight', reps: [3, 5], rest: 90, tags: ['jump', 'addon'], reason: 'Explosive jump, low landing stress' }),
  E({ id: 'depth_jump', name: 'Depth Jump', primary: ['calves'], secondary: ['quads', 'glutes'], equip: ['box'], loading: 'bodyweight', reps: [3, 5], rest: 120, tags: ['jump', 'addon', 'advanced'], reason: 'Reactive strength for take-off' }),
  E({ id: 'broad_jump', name: 'Broad Jump', primary: ['glutes'], secondary: ['quads', 'hamstrings'], equip: [], loading: 'bodyweight', reps: [3, 5], rest: 90, tags: ['jump', 'addon'], reason: 'Horizontal power' }),
  E({ id: 'pogo', name: 'Pogo Hops', primary: ['calves'], equip: [], loading: 'bodyweight', reps: [10, 20], rest: 60, tags: ['jump', 'addon'], reason: 'Ankle stiffness for jumping' }),
  E({ id: 'sl_bound', name: 'Single-Leg Bound', primary: ['glutes'], secondary: ['quads', 'calves'], equip: [], loading: 'bodyweight', reps: [3, 5], rest: 90, perSide: true, tags: ['jump', 'addon'], reason: 'One-leg take-off power' }),
  E({ id: 'mb_throw', name: 'Med Ball Scoop Throw', primary: ['glutes'], secondary: ['obliques'], equip: ['med_ball'], loading: 'bodyweight', reps: [3, 5], rest: 75, tags: ['jump', 'addon'], reason: 'Hip extension power' }),
  // Mobility add-on (done during rests)
  E({ id: 'couch_stretch', name: 'Couch Stretch', primary: ['quads'], equip: [], loading: 'bodyweight', unit: 's', reps: [30, 45], rest: 0, perSide: true, tags: ['mobility', 'addon'], reason: 'Hip flexors, tight from sitting' }),
  E({ id: 'ankle_df', name: 'Ankle Dorsiflexion Rock', primary: ['calves'], equip: [], loading: 'bodyweight', reps: [10, 15], rest: 0, perSide: true, tags: ['mobility', 'addon'], reason: 'Ankle range for squats and landing' }),
  E({ id: 'thoracic_rot', name: 'Thoracic Rotation', primary: ['upperBack'], equip: [], loading: 'bodyweight', reps: [8, 10], rest: 0, perSide: true, tags: ['mobility', 'addon'], reason: 'Upper back mobility for clinic posture' }),
  E({ id: 'hip_9090', name: '90/90 Hip Switch', primary: ['glutes'], equip: [], loading: 'bodyweight', reps: [8, 10], rest: 0, tags: ['mobility', 'addon'], reason: 'Hip rotation range' })
];

export const EX = Object.fromEntries(EXERCISES.map(e => [e.id, e]));

// Best sets from Gravl screenshots, used only until real history exists.
export const SEEDS = {
  back_squat: { weight: 90, reps: 8 }, deadlift: { weight: 95, reps: 8 }, rdl: { weight: 100, reps: 8 },
  bss: { weight: 22, reps: 10 }, incline_bench: { weight: 75, reps: 9 }, incline_db_press: { weight: 34, reps: 8 },
  close_grip_bench: { weight: 70, reps: 8 }, ohp: { weight: 50, reps: 8 }, db_shoulder_press: { weight: 27.5, reps: 9 },
  barbell_row: { weight: 70, reps: 9 }, db_row: { weight: 37.5, reps: 7 }, cs_row: { weight: 22.5, reps: 11 },
  ez_curl: { weight: 20, reps: 10 }, db_lateral: { weight: 12.5, reps: 10 }, leg_press: { weight: 140, reps: 8 },
  standing_calf: { weight: 95, reps: 10 }, cable_abduction: { weight: 17.5, reps: 9 }, bench_press: { e1rm: 109 }, leg_extension: { e1rm: 93 }
};

// First-time estimates for weighted exercises with no history or seed.
// ref + ratio: estimated 1RM = ratio x your best estimated 1RM on the reference lift.
// weight: a fixed conservative starting weight.
export const START = {
  machine_chest_press: { ref: 'bench_press', ratio: 0.85 },
  cable_fly: { ref: 'bench_press', ratio: 0.2 },
  lat_pulldown: { ref: 'barbell_row', ratio: 0.85 },
  cable_row: { ref: 'barbell_row', ratio: 0.9 },
  cable_lateral: { ref: 'db_lateral', ratio: 0.6 },
  reverse_fly: { ref: 'db_lateral', ratio: 0.6 },
  face_pull: { ref: 'barbell_row', ratio: 0.3 },
  incline_db_curl: { weight: 12.5 },
  preacher_curl: { ref: 'ez_curl', ratio: 0.85 },
  overhead_ext: { ref: 'close_grip_bench', ratio: 0.25 },
  pushdown: { ref: 'close_grip_bench', ratio: 0.3 },
  skullcrusher: { ref: 'close_grip_bench', ratio: 0.35 },
  hack_squat: { ref: 'leg_press', ratio: 0.55 },
  seated_leg_curl: { ref: 'rdl', ratio: 0.45 },
  hip_thrust: { ref: 'rdl', ratio: 1.0 },
  seated_calf: { ref: 'standing_calf', ratio: 0.5 },
  adductor_machine: { ref: 'leg_extension', ratio: 0.6 },
  abductor_machine: { ref: 'leg_extension', ratio: 0.6 },
  cable_abduction: { weight: 15 },
  cable_crunch: { weight: 30 },
  db_shrug: { ref: 'db_row', ratio: 0.85 },
  farmer_carry: { weight: 30 },
  prone_yt: { weight: 4 },
  bench_press: { ref: 'incline_bench', ratio: 1.15 },
  back_squat: { weight: 60 }, deadlift: { weight: 80 }, rdl: { weight: 60 }, barbell_row: { weight: 50 },
  incline_bench: { ref: 'bench_press', ratio: 0.85 }, incline_db_press: { ref: 'bench_press', ratio: 0.32 },
  close_grip_bench: { ref: 'bench_press', ratio: 0.8 }, ohp: { ref: 'bench_press', ratio: 0.6 },
  db_shoulder_press: { ref: 'ohp', ratio: 0.45 }, db_row: { ref: 'barbell_row', ratio: 0.5 },
  cs_row: { ref: 'db_row', ratio: 0.75 }, ez_curl: { weight: 20 }, db_lateral: { weight: 8 },
  leg_press: { ref: 'back_squat', ratio: 1.5 }, leg_extension: { weight: 40 }, bss: { ref: 'back_squat', ratio: 0.25 },
  standing_calf: { weight: 60 }
};

export const DEFAULT_EQUIPMENT = Object.keys(EQUIPMENT);

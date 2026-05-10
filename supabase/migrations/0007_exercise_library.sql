-- =============================================================================
-- Exercise library (global)
-- =============================================================================
-- Coach-curated catalog of exercises with default sets/reps/rest, optional
-- video / image / gif. Used by the day builder so coaches can "Add from
-- library" instead of typing the same lifts over and over.
-- -----------------------------------------------------------------------------

-- Enum of broad muscle groups for filter / grouping.
do $$ begin
  create type public.muscle_group as enum (
    'chest',
    'back',
    'shoulders',
    'arms',
    'legs',
    'glutes',
    'core',
    'cardio',
    'full_body',
    'other'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.exercise_library (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  name_ar         text,
  muscle_group    public.muscle_group not null default 'other',
  default_sets    int not null default 3,
  default_reps    text not null default '8-12',
  default_rest_seconds int not null default 90,
  default_notes   text,
  video_url       text,
  image_url       text,
  gif_url         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists idx_exercise_library_name
  on public.exercise_library (lower(name));

create index if not exists idx_exercise_library_group
  on public.exercise_library (muscle_group);

drop trigger if exists trg_exercise_library_updated_at on public.exercise_library;
create trigger trg_exercise_library_updated_at
  before update on public.exercise_library
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.exercise_library enable row level security;

drop policy if exists "exercise_library_read_authenticated"
  on public.exercise_library;
create policy "exercise_library_read_authenticated"
  on public.exercise_library
  for select
  to authenticated
  using (true);

drop policy if exists "exercise_library_write_admin" on public.exercise_library;
create policy "exercise_library_write_admin"
  on public.exercise_library
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Seed common compound + isolation lifts. Idempotent: only seeds when the
-- table is empty so we don't fight admins who edited the rows manually.
-- ---------------------------------------------------------------------------
insert into public.exercise_library
  (name, name_ar, muscle_group, default_sets, default_reps, default_rest_seconds, default_notes)
select * from (values
  ('Barbell Back Squat', 'سكوات بالبار', 'legs', 4, '5-8', 180, 'Brace, push knees out, full depth.'),
  ('Front Squat', 'فرونت سكوات', 'legs', 4, '6-10', 150, 'Elbows up, vertical torso.'),
  ('Romanian Deadlift', 'روماني ديدليفت', 'legs', 4, '8-10', 150, 'Hinge from hips, soft knees.'),
  ('Conventional Deadlift', 'ديدليفت تقليدي', 'back', 3, '3-5', 240, 'Brace hard, bar over midfoot.'),
  ('Hip Thrust', 'هيب ثرست', 'glutes', 4, '8-12', 120, 'Squeeze glutes at top, chin tucked.'),
  ('Bulgarian Split Squat', 'سبليت سكوات بلغاري', 'legs', 3, '8-10', 90, 'Front foot flat, knee over toe.'),
  ('Walking Lunge', 'لانج', 'legs', 3, '10-12 ea', 90, 'Long step, drop back knee.'),
  ('Leg Press', 'ليج برس', 'legs', 4, '10-12', 120, 'Full ROM, no lockout.'),
  ('Leg Curl', 'ليج كيرل', 'legs', 3, '10-15', 75, 'Squeeze hamstrings.'),
  ('Leg Extension', 'ليج اكستنشن', 'legs', 3, '12-15', 60, 'Pause at top.'),
  ('Bench Press', 'بنش بريس', 'chest', 4, '6-8', 150, 'Tuck elbows ~45°, bar to lower chest.'),
  ('Incline DB Press', 'بنش مائل دامبل', 'chest', 4, '8-10', 120, 'Bench at 30°, full ROM.'),
  ('Dumbbell Fly', 'فلاي', 'chest', 3, '10-12', 75, 'Soft elbow, stretch then squeeze.'),
  ('Push-Up', 'ضغط', 'chest', 3, 'AMRAP', 60, 'Brace core, full lockout.'),
  ('Cable Fly', 'كيبل فلاي', 'chest', 3, '12-15', 75, 'Slight elbow bend, squeeze.'),
  ('Pull-Up', 'بول اب', 'back', 4, '5-8', 120, 'Full hang, chest to bar.'),
  ('Lat Pulldown', 'لات بولدون', 'back', 4, '8-12', 90, 'Pull to upper chest.'),
  ('Barbell Row', 'باربل رو', 'back', 4, '6-10', 120, 'Hinge ~45°, pull to lower chest.'),
  ('Seated Cable Row', 'كيبل رو', 'back', 3, '10-12', 90, 'Chest up, pull to navel.'),
  ('Face Pull', 'فيس بول', 'shoulders', 3, '12-15', 60, 'Pull to forehead, squeeze rear delts.'),
  ('Overhead Press', 'بريس عالي', 'shoulders', 4, '6-8', 150, 'Brace, drive head through.'),
  ('Dumbbell Lateral Raise', 'سايد لاترال', 'shoulders', 3, '12-15', 60, 'Lead with elbow, no swing.'),
  ('Rear Delt Fly', 'رير ديلت', 'shoulders', 3, '12-15', 60, 'Hinge, pinch shoulder blades.'),
  ('EZ Bar Curl', 'باي بار', 'arms', 3, '8-12', 75, 'Elbows pinned, full ROM.'),
  ('Hammer Curl', 'هامر', 'arms', 3, '10-12', 60, 'Neutral grip.'),
  ('Triceps Pushdown', 'ترايسبس بولدون', 'arms', 3, '10-12', 60, 'Elbows pinned to ribs.'),
  ('Skull Crusher', 'سكال كراشر', 'arms', 3, '8-12', 90, 'Lower to forehead, full extension.'),
  ('Plank', 'بلانك', 'core', 3, '45-60s', 60, 'Brace ribs, glutes squeezed.'),
  ('Hanging Leg Raise', 'رفع رجل معلق', 'core', 3, '8-12', 75, 'Posterior tilt, no swing.'),
  ('Cable Crunch', 'كيبل كرنش', 'core', 3, '12-15', 60, 'Round spine, hips fixed.'),
  ('Treadmill Walk (incline)', 'مشي بميل', 'cardio', 1, '30-45 min', 0, 'Steady pace, incline 5-8%.'),
  ('Stationary Bike', 'عجلة ثابتة', 'cardio', 1, '20-30 min', 0, 'Moderate cadence.'),
  ('Jump Rope', 'حبل', 'cardio', 1, '5-10 min', 60, 'Soft knees, light bounce.')
) as v(name, name_ar, muscle_group, default_sets, default_reps, default_rest_seconds, default_notes)
where not exists (select 1 from public.exercise_library);

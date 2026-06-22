create extension if not exists pgcrypto;

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  type text not null default 'strength' check (type in ('strength', 'cardio', 'court', 'rest')),
  status text not null default 'completed' check (status in ('completed', 'partial', 'planned', 'rest')),
  activity text not null,
  duration integer check (duration is null or duration >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  weight numeric(5, 1) check (weight is null or weight between 40 and 250),
  waist numeric(5, 1) check (waist is null or waist between 40 and 200),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  storage_path text not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists workouts_user_date_idx on public.workouts(user_id, date desc);
create index if not exists measurements_user_date_idx on public.measurements(user_id, date desc);
create index if not exists progress_photos_user_date_idx on public.progress_photos(user_id, date desc);

alter table public.workouts enable row level security;
alter table public.measurements enable row level security;
alter table public.progress_photos enable row level security;

drop policy if exists "Users can select own workouts" on public.workouts;
create policy "Users can select own workouts"
on public.workouts for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own workouts" on public.workouts;
create policy "Users can insert own workouts"
on public.workouts for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own workouts" on public.workouts;
create policy "Users can update own workouts"
on public.workouts for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own workouts" on public.workouts;
create policy "Users can delete own workouts"
on public.workouts for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can select own measurements" on public.measurements;
create policy "Users can select own measurements"
on public.measurements for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own measurements" on public.measurements;
create policy "Users can insert own measurements"
on public.measurements for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own measurements" on public.measurements;
create policy "Users can update own measurements"
on public.measurements for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own measurements" on public.measurements;
create policy "Users can delete own measurements"
on public.measurements for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can select own photo rows" on public.progress_photos;
create policy "Users can select own photo rows"
on public.progress_photos for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own photo rows" on public.progress_photos;
create policy "Users can insert own photo rows"
on public.progress_photos for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own photo rows" on public.progress_photos;
create policy "Users can delete own photo rows"
on public.progress_photos for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own progress photos" on storage.objects;
create policy "Users can read own progress photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload own progress photos" on storage.objects;
create policy "Users can upload own progress photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own progress photos" on storage.objects;
create policy "Users can update own progress photos"
on storage.objects for update
to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own progress photos" on storage.objects;
create policy "Users can delete own progress photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'progress-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

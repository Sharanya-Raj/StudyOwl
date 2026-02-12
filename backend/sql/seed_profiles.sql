-- Seed a test user in public.profiles for foreign key integrity
insert into public.profiles (id, name, avatar_url, courses, study_preferences, is_available)
values ('00000000-0000-0000-0000-000000000001', 'Test User', null, null, null, true)
on conflict (id) do nothing;

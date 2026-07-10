insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'aarav.seed@sparmate.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'maya.seed@sparmate.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000103', 'authenticated', 'authenticated', 'kabir.seed@sparmate.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000104', 'authenticated', 'authenticated', 'nisha.seed@sparmate.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000105', 'authenticated', 'authenticated', 'rohan.seed@sparmate.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000106', 'authenticated', 'authenticated', 'zara.seed@sparmate.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000107', 'authenticated', 'authenticated', 'dev.seed@sparmate.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000108', 'authenticated', 'authenticated', 'ishita.seed@sparmate.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000109', 'authenticated', 'authenticated', 'arjun.seed@sparmate.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000110', 'authenticated', 'authenticated', 'tara.seed@sparmate.test', crypt('password123', gen_salt('bf')), now(), now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into profiles (
  id,
  name,
  age,
  weight_kg,
  bio,
  avatar_url,
  gym_name,
  gym_verified,
  martial_arts,
  skill_level,
  availability,
  location_city
) values
  ('00000000-0000-0000-0000-000000000101', 'Aarav Singh', 25, 70, 'Muay Thai striker looking for technical rounds.', 'https://randomuser.me/api/portraits/men/32.jpg', 'Combat Lab', true, array['Muay Thai', 'Boxing'], 'intermediate', array['weekdays', 'evenings'], 'Mumbai'),
  ('00000000-0000-0000-0000-000000000102', 'Maya Rao', 28, 58, 'BJJ purple belt. Flow rolls and positional sparring.', 'https://randomuser.me/api/portraits/women/44.jpg', 'Ground Control', true, array['BJJ', 'Judo'], 'advanced', array['weekends', 'mornings'], 'Bengaluru'),
  ('00000000-0000-0000-0000-000000000103', 'Kabir Mehta', 31, 82, 'MMA hobbyist, happy to drill before rounds.', 'https://randomuser.me/api/portraits/men/46.jpg', 'Octagon Fit', false, array['MMA', 'Wrestling'], 'intermediate', array['weekdays'], 'Delhi'),
  ('00000000-0000-0000-0000-000000000104', 'Nisha Khan', 23, 62, 'Boxing footwork nerd. Light sparring preferred.', 'https://randomuser.me/api/portraits/women/68.jpg', 'Southpaw Studio', true, array['Boxing'], 'beginner', array['evenings'], 'Pune'),
  ('00000000-0000-0000-0000-000000000105', 'Rohan Iyer', 35, 88, 'No-gi grappler, wrestling entries and scrambles.', 'https://randomuser.me/api/portraits/men/75.jpg', 'Mat House', false, array['BJJ', 'Wrestling'], 'advanced', array['weekends'], 'Chennai'),
  ('00000000-0000-0000-0000-000000000106', 'Zara Ali', 27, 64, 'Kickboxing rounds, clean technique, good vibes.', 'https://randomuser.me/api/portraits/women/65.jpg', 'Strike Club', true, array['Kickboxing', 'Muay Thai'], 'intermediate', array['weekdays', 'mornings'], 'Hyderabad'),
  ('00000000-0000-0000-0000-000000000107', 'Dev Patel', 21, 74, 'Beginner MMA, looking for patient partners.', 'https://randomuser.me/api/portraits/men/22.jpg', 'Cage Ready', false, array['MMA'], 'beginner', array['weekends', 'evenings'], 'Ahmedabad'),
  ('00000000-0000-0000-0000-000000000108', 'Ishita Sen', 30, 55, 'Judo grips, throws, and careful randori.', 'https://randomuser.me/api/portraits/women/12.jpg', 'Kodokan India', true, array['Judo', 'BJJ'], 'advanced', array['mornings'], 'Kolkata'),
  ('00000000-0000-0000-0000-000000000109', 'Arjun Nair', 26, 79, 'Karate base, building boxing and low kicks.', 'https://randomuser.me/api/portraits/men/54.jpg', 'Dojo 360', false, array['Karate', 'Kickboxing'], 'intermediate', array['weekdays', 'evenings'], 'Kochi'),
  ('00000000-0000-0000-0000-000000000110', 'Tara Dsouza', 24, 60, 'Taekwondo kicks and boxing basics.', 'https://randomuser.me/api/portraits/women/29.jpg', 'Fight Factory', false, array['Taekwondo', 'Boxing'], 'beginner', array['weekends', 'mornings'], 'Goa')
on conflict (id) do update set
  name = excluded.name,
  age = excluded.age,
  weight_kg = excluded.weight_kg,
  bio = excluded.bio,
  avatar_url = excluded.avatar_url,
  gym_name = excluded.gym_name,
  gym_verified = excluded.gym_verified,
  martial_arts = excluded.martial_arts,
  skill_level = excluded.skill_level,
  availability = excluded.availability,
  location_city = excluded.location_city,
  updated_at = now();

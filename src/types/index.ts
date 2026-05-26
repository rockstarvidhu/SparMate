export type MartialArt =
  | 'Muay Thai'
  | 'BJJ'
  | 'MMA'
  | 'Boxing'
  | 'Wrestling'
  | 'Kickboxing'
  | 'Judo'
  | 'Karate'
  | 'Taekwondo';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type Availability = 'weekdays' | 'weekends' | 'mornings' | 'evenings';

export type SwipeDirection = 'left' | 'right';

export interface Profile {
  id: string;
  name: string;
  age: number | null;
  weight_kg: number | null;
  bio: string | null;
  avatar_url: string | null;
  gym_name: string | null;
  gym_verified: boolean;
  martial_arts: MartialArt[];
  skill_level: SkillLevel;
  availability: Availability[];
  location_lat: number | null;
  location_lng: number | null;
  location_city: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  // joined fields
  other_user?: Profile;
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
  deleted_at: string | null;
}

export interface Filters {
  martial_arts: MartialArt[];
  weight_min: number;
  weight_max: number;
  skill_levels: SkillLevel[];
  availability: Availability[];
  radius_km: number;
}

export const DEFAULT_FILTERS: Filters = {
  martial_arts: [],
  weight_min: 50,
  weight_max: 120,
  skill_levels: [],
  availability: [],
  radius_km: 30,
};

export const MARTIAL_ARTS: MartialArt[] = [
  'Muay Thai', 'BJJ', 'MMA', 'Boxing',
  'Wrestling', 'Kickboxing', 'Judo', 'Karate', 'Taekwondo',
];

export const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

export const AVAILABILITY_OPTIONS: { value: Availability; label: string }[] = [
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekends', label: 'Weekends' },
  { value: 'mornings', label: 'Mornings' },
  { value: 'evenings', label: 'Evenings' },
];

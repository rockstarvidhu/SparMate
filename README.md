# SparMate 🥊

A Tinder-style sparring partner finder for combat sports athletes.

## Tech Stack
- **Frontend**: React Native (Expo)
- **Backend**: Supabase (Auth, PostgreSQL, Realtime)
- **Navigation**: React Navigation v6

## Features
- 🔐 Email/password auth with session persistence
- 👤 Multi-step onboarding profile setup
- 🔥 Swipe-to-match discover screen (left/right gestures)
- ⚡ Filters by martial art, weight range, skill level, distance, availability
- 💬 Realtime chat between matched users
- 🛡 Gym name display (verification badge system ready)
- 📱 Safe area + dark theme throughout

---

## Setup

### 1. Clone and install
```bash
git clone https://github.com/yourname/sparmate
cd sparmate
npm install
```

### 2. Set up Supabase
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `supabase/schema.sql`
3. In **Settings → API**, copy your Project URL and anon key

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

### 4. Run the app
```bash
npx expo start
```
Press `i` for iOS Simulator, `a` for Android emulator, or scan the QR code with Expo Go.

---

## Project Structure
```
sparmate/
├── App.tsx                          # Root entry point
├── supabase/
│   └── schema.sql                   # Full DB schema + RLS + triggers
└── src/
    ├── lib/supabase.ts              # Supabase client
    ├── types/index.ts               # TypeScript types + constants
    ├── constants/theme.ts           # Dark theme tokens
    ├── context/AuthContext.tsx      # Global auth + profile state
    ├── navigation/index.tsx         # Auth / onboarding / main nav
    └── screens/
        ├── auth/
        │   ├── LoginScreen.tsx
        │   └── SignupScreen.tsx
        ├── onboarding/
        │   └── ProfileSetupScreen.tsx   # 4-step onboarding
        └── main/
            ├── DiscoverScreen.tsx       # Swipe cards
            ├── FiltersScreen.tsx        # Filter preferences
            ├── MatchesScreen.tsx        # Matches + chat list
            ├── ChatScreen.tsx           # Realtime chat
            └── ProfileScreen.tsx        # View/edit own profile
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | Extended user data (linked to `auth.users`) |
| `swipes` | Records every left/right swipe |
| `matches` | Auto-created by trigger when both users swipe right |
| `messages` | Chat messages per match, realtime-enabled |

Realtime is enabled on `messages` and `matches` tables. All tables have RLS policies.

---

## Next Features to Build
- [ ] Location detection with `expo-location` + distance-based sorting
- [ ] Profile photo upload via Supabase Storage
- [ ] Push notifications (Expo Notifications + Supabase Edge Functions)
- [ ] Gym verification flow
- [ ] Post-spar rating system
- [ ] "Super Spar" (like Super Like) with limited daily uses

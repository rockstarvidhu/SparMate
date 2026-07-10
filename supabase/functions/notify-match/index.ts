import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

type MatchRow = {
  id: string;
  user1_id: string;
  user2_id: string;
};

type ProfileRow = {
  id: string;
  name: string;
  push_token: string | null;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = await req.json().catch(() => null);
  const match = payload?.record as MatchRow | undefined;

  if (!match?.id || !match.user1_id || !match.user2_id) {
    return Response.json({ error: 'Missing match record' }, { status: 400 });
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, name, push_token')
    .in('id', [match.user1_id, match.user2_id])
    .returns<ProfileRow[]>();

  if (error || !profiles || profiles.length < 2) {
    return Response.json({ error: error?.message ?? 'Profiles not found' }, { status: 500 });
  }

  const messages = profiles
    .filter((profile) => !!profile.push_token)
    .map((profile) => {
      const other = profiles.find((p) => p.id !== profile.id);
      return {
        to: profile.push_token,
        sound: 'default',
        title: 'New SparMate match',
        body: other ? `You matched with ${other.name}. Time to set up a round.` : 'You have a new match.',
        data: { matchId: match.id },
        channelId: 'matches',
      };
    });

  if (messages.length === 0) {
    return Response.json({ sent: 0 });
  }

  const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });

  const result = await expoResponse.json();
  return Response.json({ sent: messages.length, result });
});

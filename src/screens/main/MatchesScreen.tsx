import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, font } from '../../constants/theme';
import { Match, Profile, Message } from '../../types';
import { RootStackParams } from '../../navigation';

type Nav = NativeStackNavigationProp<RootStackParams>;

const AVATAR_COLORS = ['#2C1A0E', '#0E1F2C', '#0E2C1A', '#2C0E22', '#1A0E2C'];
const TEXT_COLORS   = ['#FF7A50', '#7AB8E8', '#4DD890', '#E87AB0', '#B07AE8'];

function avatarColorFor(id: string) {
  const idx = id.charCodeAt(0) % AVATAR_COLORS.length;
  return { bg: AVATAR_COLORS[idx], text: TEXT_COLORS[idx] };
}

function MatchAvatar({ name, userId, size = 44 }: { name: string; userId: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const { bg, text } = avatarColorFor(userId);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Text style={[styles.avatarText, { color: text, fontSize: size * 0.32 }]}>{initials}</Text>
    </View>
  );
}

interface MatchWithExtra extends Match {
  other_user: Profile;
  last_message?: Message;
  unread_count: number;
}

export default function MatchesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [matches, setMatches]   = useState<MatchWithExtra[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { loadMatches(); }, []);

  // Subscribe to new matches
  useEffect(() => {
    if (!user) return;
    const sub = supabase
      .channel('matches')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'matches',
        filter: `user1_id=eq.${user.id}`,
      }, () => loadMatches())
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'matches',
        filter: `user2_id=eq.${user.id}`,
      }, () => loadMatches())
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [user]);

  async function loadMatches() {
    if (!user) return;

    const { data: matchRows } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!matchRows) { setLoading(false); return; }

    const enriched: MatchWithExtra[] = await Promise.all(
      matchRows.map(async (m) => {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;

        const [{ data: otherProfile }, { data: lastMsgArr }, { count }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', otherId).single(),
          supabase.from('messages').select('*').eq('match_id', m.id)
            .order('created_at', { ascending: false }).limit(1),
          supabase.from('messages').select('*', { count: 'exact', head: true })
            .eq('match_id', m.id).eq('read', false).neq('sender_id', user.id),
        ]);

        return {
          ...m,
          other_user: otherProfile,
          last_message: lastMsgArr?.[0],
          unread_count: count ?? 0,
        };
      })
    );

    setMatches(enriched.filter(m => m.other_user));
    setLoading(false);
  }

  const newMatches = matches.filter(m => !m.last_message);
  const conversations = matches.filter(m => !!m.last_message);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Matches</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : matches.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤜🤛</Text>
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySub}>Swipe right on fighters you want to spar with!</Text>
        </View>
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <View>
              {/* New matches bubbles */}
              {newMatches.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>New matches</Text>
                  <FlatList
                    horizontal
                    data={newMatches}
                    keyExtractor={m => m.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 16, paddingHorizontal: spacing.xl }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.bubbleItem}
                        onPress={() => navigation.navigate('Chat', {
                          matchId: item.id,
                          otherUser: item.other_user,
                        })}
                      >
                        <View style={styles.newMatchRing}>
                          <MatchAvatar
                            name={item.other_user.name}
                            userId={item.other_user.id}
                            size={52}
                          />
                        </View>
                        <Text style={styles.bubbleName} numberOfLines={1}>
                          {item.other_user.name.split(' ')[0]}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
              )}

              {/* Conversations */}
              {conversations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Messages</Text>
                  {conversations.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.convoRow}
                      onPress={() => navigation.navigate('Chat', {
                        matchId: item.id,
                        otherUser: item.other_user,
                      })}
                    >
                      <MatchAvatar
                        name={item.other_user.name}
                        userId={item.other_user.id}
                      />
                      <View style={styles.convoInfo}>
                        <View style={styles.convoTopRow}>
                          <Text style={styles.convoName}>{item.other_user.name}</Text>
                          <Text style={styles.convoTime}>
                            {formatTime(item.last_message!.created_at)}
                          </Text>
                        </View>
                        <Text style={styles.convoSub}>
                          {item.other_user.martial_arts?.[0]} · {item.other_user.weight_kg} kg
                        </Text>
                        <Text style={styles.lastMsg} numberOfLines={1}>
                          {item.last_message!.sender_id === user?.id
                            ? `You: ${item.last_message!.content}`
                            : item.last_message!.content
                          }
                        </Text>
                      </View>
                      {item.unread_count > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{item.unread_count}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffH < 168) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  section: { paddingVertical: spacing.md },
  sectionLabel: {
    fontSize: font.sm, color: colors.textHint,
    fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  bubbleItem: { alignItems: 'center', width: 64 },
  newMatchRing: {
    padding: 2, borderRadius: 30,
    borderWidth: 1.5, borderColor: colors.accent,
  },
  bubbleName: {
    fontSize: 11, color: colors.textMuted,
    marginTop: 4, textAlign: 'center',
  },
  convoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
    gap: spacing.md,
  },
  avatar: {
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: { fontWeight: '600' },
  convoInfo: { flex: 1, gap: 2 },
  convoTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
  },
  convoName: { fontSize: font.base, fontWeight: '600', color: colors.text },
  convoTime: { fontSize: 11, color: colors.textHint },
  convoSub: { fontSize: 11, color: colors.textHint },
  lastMsg: { fontSize: font.sm, color: colors.textMuted },
  unreadBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: font.lg, fontWeight: '600', color: colors.text },
  emptySub: { fontSize: font.base, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 },
});

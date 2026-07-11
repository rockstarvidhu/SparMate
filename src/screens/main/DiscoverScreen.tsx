import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated, PanResponder,
  TouchableOpacity, ActivityIndicator, Dimensions, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Profile } from '../../types';
import { colors, spacing, radius, font, skillColor } from '../../constants/theme';
import { useLocation, getDistanceKm, formatDistance } from '../../hooks/useLocation';
import { loadFilters } from './FiltersScreen';
import AvatarComponent from '../../components/Avatar';

const { width: W } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;
const CARD_WIDTH = W - spacing.xl * 2;
const NOISE_DOTS = Array.from({ length: 90 }, (_, i) => ({
  left: (((i * 37) % 100) / 100) * W,
  top: (((i * 53) % 100) / 100) * 900,
  opacity: 0.035 + ((i % 4) * 0.018),
  size: i % 7 === 0 ? 2 : 1,
}));

// ── Profile enriched with computed distance ───────────
interface ProfileWithDistance extends Profile {
  distanceKm?: number;
}

// ── Tag chip ──────────────────────────────────────────
function Tag({ label, style }: { label: string; style?: object }) {
  return (
    <View style={[tagStyles.tag, style]}>
      <Text style={tagStyles.text}>{label}</Text>
    </View>
  );
}
const tagStyles = StyleSheet.create({
  tag: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 0.5, borderColor: `${colors.accent}50`,
    backgroundColor: colors.accentDim,
  },
  text: { fontSize: 11, color: colors.accentLight, fontWeight: '500' },
});

function MatteBackground() {
  return (
    <View pointerEvents="none" style={styles.backgroundTexture}>
      <LinearGradient
        colors={['#111111', '#0D0D0D', '#101010']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
      />
      {NOISE_DOTS.map((dot, index) => (
        <View
          key={index}
          style={[
            styles.noiseDot,
            {
              left: dot.left,
              top: dot.top,
              width: dot.size,
              height: dot.size,
              opacity: dot.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

function nearbyLabel(count: number, radiusKm: number) {
  if (count === 0) return '';
  return count === 1 ? '1 fighter nearby' : `${count} fighters within ${radiusKm} km`;
}

// ── Swipeable Card ────────────────────────────────────
function SparCard({
  profile,
  onSwipe,
}: {
  profile: ProfileWithDistance;
  onSwipe: (dir: 'left' | 'right') => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const visibleArts = profile.martial_arts.slice(0, 2);
  const extraArts = profile.martial_arts.length - visibleArts.length;

  const rotate = pan.x.interpolate({
    inputRange: [-200, 0, 200],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });
  const likeOpacity = pan.x.interpolate({ inputRange: [20, 80], outputRange: [0, 1], extrapolate: 'clamp' });
  const nopeOpacity = pan.x.interpolate({ inputRange: [-80, -20], outputRange: [1, 0], extrapolate: 'clamp' });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event(
      [null, { dx: pan.x, dy: pan.y }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, { dx }) => {
      if (dx > SWIPE_THRESHOLD) {
        Animated.spring(pan, { toValue: { x: W + 100, y: 0 }, useNativeDriver: false })
          .start(() => onSwipe('right'));
      } else if (dx < -SWIPE_THRESHOLD) {
        Animated.spring(pan, { toValue: { x: -(W + 100), y: 0 }, useNativeDriver: false })
          .start(() => onSwipe('left'));
      } else {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();
      }
    },
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] },
      ]}
    >
      {/* SPAR / PASS stamps */}
      <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
        <Text style={styles.stampText}>SPAR 🥊</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
        <Text style={[styles.stampText, { color: '#E24B4A' }]}>PASS ✕</Text>
      </Animated.View>

      <View style={styles.cardTop}>
        {profile.avatar_url ? (
          <ImageBackground
            source={{ uri: profile.avatar_url }}
            style={styles.heroImage}
            imageStyle={styles.heroImageInner}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.heroFallback}>
            <AvatarComponent
              name={profile.name}
              userId={profile.id}
              avatarUrl={profile.avatar_url}
              size={112}
            />
          </View>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.04)', 'rgba(0,0,0,0.38)', 'rgba(0,0,0,0.88)']}
          locations={[0.12, 0.52, 1]}
          style={StyleSheet.absoluteFill}
        />

        {profile.martial_arts[0] && (
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>{profile.martial_arts[0]}</Text>
          </View>
        )}

        {profile.gym_verified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>Verified gym</Text>
          </View>
        )}

        <View style={styles.heroMeta}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            {profile.age && <Text style={styles.age}>{profile.age}</Text>}
          </View>
          <View style={styles.locationRow}>
            {profile.location_city && (
              <Text style={styles.location}>{profile.location_city}</Text>
            )}
            {profile.distanceKm !== undefined && (
              <View style={styles.distancePill}>
                <Text style={styles.distanceText}>
                  {formatDistance(profile.distanceKm)} away
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.cardBody}>
        {/* Tags */}
        <View style={styles.tags}>
          {visibleArts.map(art => (
            <Tag key={art} label={art} />
          ))}
          {extraArts > 0 && (
            <View style={[tagStyles.tag, styles.moreTag]}>
              <Text style={[tagStyles.text, styles.moreTagText]}>+{extraArts}</Text>
            </View>
          )}
          {profile.weight_kg && (
            <View style={[tagStyles.tag, { borderColor: colors.border, backgroundColor: 'transparent' }]}>
              <Text style={[tagStyles.text, { color: colors.textMuted }]}>{profile.weight_kg} kg</Text>
            </View>
          )}
          {profile.skill_level && (
            <View style={[tagStyles.tag, {
              borderColor: `${skillColor[profile.skill_level]}50`,
              backgroundColor: `${skillColor[profile.skill_level]}15`,
            }]}>
              <Text style={[tagStyles.text, { color: skillColor[profile.skill_level] }]}>
                {profile.skill_level.charAt(0).toUpperCase() + profile.skill_level.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {/* Availability */}
        {profile.availability.length > 0 && (
          <View style={styles.availRow}>
            <View style={styles.availDot} />
            <Text style={styles.availText}>Available {profile.availability.join(', ')}</Text>
          </View>
        )}

        {profile.bio && (
          <Text style={styles.bio} numberOfLines={2}>{profile.bio}</Text>
        )}
        {profile.gym_name && (
          <Text style={styles.gym}>🏋️ {profile.gym_name}</Text>
        )}
      </View>
    </Animated.View>
  );
}

// ── Main Screen ───────────────────────────────────────
export default function DiscoverScreen() {
  const { user } = useAuth();
  const { coords, error: locError, loading: locLoading } = useLocation();
  const [profiles, setProfiles]   = useState<ProfileWithDistance[]>([]);
  const [loading, setLoading]     = useState(true);
  const [empty, setEmpty]         = useState(false);
  const [locationLabel, setLocationLabel] = useState('');

  // Load profiles once location resolves (or times out after 5s)
  useEffect(() => {
    if (!locLoading) loadProfiles();
  }, [locLoading]);

  // Failsafe: load without location after 5s
  useEffect(() => {
    const t = setTimeout(() => { if (loading) loadProfiles(); }, 5000);
    return () => clearTimeout(t);
  }, []);

  async function loadProfiles() {
    if (!user) return;
    setLoading(true);

    // Load saved filters
    const filters = await loadFilters();

    const [{ data: swipedRows }, { data: blockedRows }] = await Promise.all([
      supabase.from('swipes').select('swiped_id').eq('swiper_id', user.id),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', user.id),
    ]);
    const excludeIds = [
      user.id,
      ...(swipedRows?.map(r => r.swiped_id) ?? []),
      ...(blockedRows?.map(r => r.blocked_id) ?? []),
    ];

    // Build query
    let query = supabase
      .from('profiles')
      .select('*')
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .not('martial_arts', 'eq', '{}');

    // Apply martial arts filter
    if (filters.martial_arts.length > 0) {
      query = query.overlaps('martial_arts', filters.martial_arts);
    }

    // Apply weight filter
    query = query
      .gte('weight_kg', filters.weight_min)
      .lte('weight_kg', filters.weight_max);

    // Apply skill level filter
    if (filters.skill_levels.length > 0) {
      query = query.in('skill_level', filters.skill_levels);
    }

    // Apply availability filter
    if (filters.availability.length > 0) {
      query = query.overlaps('availability', filters.availability);
    }

    const { data } = await query.limit(50);
    let results: ProfileWithDistance[] = data ?? [];

    // Compute distance and filter by radius if we have coords
    if (coords) {
      results = results
        .map(p => ({
          ...p,
          distanceKm: p.location_lat && p.location_lng
            ? getDistanceKm(coords.lat, coords.lng, p.location_lat, p.location_lng)
            : undefined,
        }))
        .filter(p =>
          p.distanceKm === undefined || p.distanceKm <= filters.radius_km
        )
        // Sort: closest first
        .sort((a, b) => {
          if (a.distanceKm === undefined) return 1;
          if (b.distanceKm === undefined) return -1;
          return a.distanceKm - b.distanceKm;
        });

      const nearCount = results.filter(p => p.distanceKm !== undefined).length;
      setLocationLabel(nearbyLabel(nearCount, filters.radius_km));
    } else {
      setLocationLabel(`${results.length} fighters`);
    }

    setProfiles(results);
    setEmpty(results.length === 0);
    setLoading(false);
  }

  async function handleSwipe(profile: ProfileWithDistance, dir: 'left' | 'right') {
    setProfiles(prev => prev.filter(p => p.id !== profile.id));
    if (profiles.length <= 1) setEmpty(true);
    await supabase.from('swipes').insert({
      swiper_id: user!.id,
      swiped_id: profile.id,
      direction: dir,
    });
  }

  const isLoading = loading || locLoading;

  return (
    <SafeAreaView style={styles.container}>
      <MatteBackground />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          Spar<Text style={{ color: colors.accent }}>Mate</Text>
        </Text>
        <View style={styles.headerRight}>
          {locLoading && (
            <View style={styles.locatingPill}>
              <ActivityIndicator size="small" color={colors.accent} style={{ transform: [{ scale: 0.7 }] }} />
              <Text style={styles.locatingText}>Finding location...</Text>
            </View>
          )}
          {!locLoading && locationLabel ? (
            <Text style={styles.subtitle}>{locationLabel}</Text>
          ) : null}
          {locError && (
            <Text style={styles.locError}>📍 Location off</Text>
          )}
        </View>
      </View>

      {/* Card stack */}
      <View style={styles.deck}>
        {isLoading && <ActivityIndicator color={colors.accent} size="large" />}

        {!isLoading && empty && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🥊</Text>
            <Text style={styles.emptyTitle}>No fighters nearby!</Text>
            <Text style={styles.emptySub}>Try expanding your distance or filters.</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={loadProfiles}>
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isLoading && profiles.slice(0, 3).reverse().map((profile, i) => (
          i === profiles.slice(0, 3).length - 1
            ? <SparCard
                key={profile.id}
                profile={profile}
                onSwipe={(dir) => handleSwipe(profile, dir)}
              />
            : <View
                key={profile.id}
                style={[
                  styles.card, styles.stackedCard,
                  { transform: [
                      { scale: 0.96 - (profiles.slice(0, 3).length - 1 - i) * 0.02 },
                      { translateY: -(profiles.slice(0, 3).length - 1 - i) * 8 },
                    ],
                  },
                ]}
              />
        ))}
      </View>

      {/* Action buttons */}
      {!isLoading && !empty && profiles.length > 0 && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.passBtn}
            onPress={() => handleSwipe(profiles[profiles.length - 1], 'left')}
          >
            <Text style={styles.passIcon}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sparBtn}
            onPress={() => handleSwipe(profiles[profiles.length - 1], 'right')}
          >
            <Text style={styles.sparBtnText}>Request spar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.passBtn}>
            <Text style={styles.infoIcon}>ℹ</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#0D0D0D' },
  backgroundTexture: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  noiseDot: {
    position: 'absolute',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md, paddingBottom: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo:       { fontSize: 22, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  subtitle:   { fontSize: font.sm, color: 'rgba(255,255,255,0.58)', fontWeight: '500' },
  locatingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accentDim,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: radius.full,
  },
  locatingText: { fontSize: 11, color: colors.accentLight },
  locError:   { fontSize: font.sm, color: colors.textMuted },

  deck:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.sm },
  card: {
    position: 'absolute', width: CARD_WIDTH,
    backgroundColor: '#191919',
    borderRadius: radius.xl,
    borderWidth: 1, borderColor: 'rgba(255,77,28,0.14)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.38,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  stackedCard: { height: 500, backgroundColor: '#151515' },
  cardTop: {
    height: 295,
    backgroundColor: '#141414',
    overflow: 'hidden',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImageInner: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  heroFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1F1F1F',
  },
  heroBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(17,17,17,0.72)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  heroBadgeText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '700',
  },
  verifiedBadge: {
    position: 'absolute', top: 14, right: 14,
    backgroundColor: 'rgba(255,77,28,0.92)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radius.full,
  },
  verifiedText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  heroMeta: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: 7,
  },
  cardBody:   { padding: spacing.md, gap: 10 },
  nameRow:    { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  name:       { fontSize: 25, fontWeight: '800', color: colors.text },
  age:        { fontSize: font.lg, color: 'rgba(255,255,255,0.72)', fontWeight: '500' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  location:   { fontSize: font.sm, color: 'rgba(255,255,255,0.76)', fontWeight: '600' },
  distancePill: {
    backgroundColor: 'rgba(77,216,144,0.15)',
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 0.5, borderColor: 'rgba(77,216,144,0.28)',
  },
  distanceText: { fontSize: 11, color: colors.success, fontWeight: '500' },
  tags:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  moreTag: { borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  moreTagText: { color: colors.textMuted },
  availRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  availDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  availText:  { fontSize: font.sm, color: colors.textMuted },
  bio:        { fontSize: font.sm, color: colors.textMuted, lineHeight: 18 },
  gym:        { fontSize: font.sm, color: colors.textHint },

  stamp: {
    position: 'absolute', top: 24, zIndex: 10,
    padding: 8, paddingHorizontal: 14,
    borderRadius: radius.md, borderWidth: 2,
  },
  likeStamp:  { right: 16, borderColor: colors.accent, transform: [{ rotate: '10deg' }] },
  nopeStamp:  { left: 16, borderColor: '#E24B4A', transform: [{ rotate: '-10deg' }] },
  stampText:  { fontSize: font.lg, fontWeight: '800', color: colors.accent, letterSpacing: 1 },

  actions: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md, paddingTop: 0,
  },
  passBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(25,25,25,0.92)',
    borderWidth: 0.8, borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  passIcon:   { fontSize: 20, color: colors.textMuted },
  infoIcon:   { fontSize: 20, color: colors.textMuted },
  sparBtn: {
    flex: 1, backgroundColor: colors.accent,
    borderRadius: radius.md, paddingVertical: 15, alignItems: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.26,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  sparBtnText: { color: '#fff', fontSize: font.base, fontWeight: '600' },

  emptyState: { alignItems: 'center', gap: spacing.sm },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: { fontSize: font.lg, fontWeight: '600', color: colors.text },
  emptySub:   { fontSize: font.base, color: colors.textMuted, textAlign: 'center' },
  refreshBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl, paddingVertical: 12,
    backgroundColor: colors.accent, borderRadius: radius.md,
  },
  refreshBtnText: { color: '#fff', fontWeight: '600' },
});

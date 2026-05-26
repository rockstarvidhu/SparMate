import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useAvatarUpload } from '../../hooks/useAvatarUpload';
import AvatarComponent from '../../components/Avatar';
import { colors, spacing, radius, font, skillColor } from '../../constants/theme';
import { MartialArt, SkillLevel, Availability, MARTIAL_ARTS, SKILL_LEVELS, AVAILABILITY_OPTIONS } from '../../types';

function Tag({ label, color = colors.accentLight, bg = colors.accentDim }: {
  label: string; color?: string; bg?: string;
}) {
  return (
    <View style={[tagS.tag, { backgroundColor: bg, borderColor: `${color}50` }]}>
      <Text style={[tagS.text, { color }]}>{label}</Text>
    </View>
  );
}
const tagS = StyleSheet.create({
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full, borderWidth: 0.5 },
  text: { fontSize: 11, fontWeight: '500' },
});

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[chipS.chip, active && chipS.active]} onPress={onPress}>
      <Text style={[chipS.text, active && chipS.activeText]}>{label}</Text>
    </TouchableOpacity>
  );
}
const chipS = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border },
  active: { borderColor: colors.accent, backgroundColor: colors.accentDim },
  text: { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
  activeText: { color: colors.accentLight },
});

export default function ProfileScreen() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { pickAndUpload, uploading } = useAvatarUpload();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);

  const [name, setName]         = useState(profile?.name ?? '');
  const [age, setAge]           = useState(String(profile?.age ?? ''));
  const [weight, setWeight]     = useState(String(profile?.weight_kg ?? ''));
  const [bio, setBio]           = useState(profile?.bio ?? '');
  const [gymName, setGymName]   = useState(profile?.gym_name ?? '');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>(profile?.skill_level ?? 'beginner');
  const [martialArts, setMartialArts] = useState<MartialArt[]>(profile?.martial_arts ?? []);
  const [availability, setAvailability] = useState<Availability[]>(profile?.availability ?? []);

  function toggle<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  }

  async function handleAvatarPress() {
    const url = await pickAndUpload();
    if (url) Alert.alert('Photo updated!', 'Your profile photo has been saved.');
  }

  async function handleSave() {
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      name, age: parseInt(age) || null,
      weight_kg: parseFloat(weight) || null,
      bio, gym_name: gymName,
      skill_level: skillLevel,
      martial_arts: martialArts,
      availability,
      updated_at: new Date().toISOString(),
    }).eq('id', profile!.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    await refreshProfile();
    setEditing(false);
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.headerActions}>
          {editing ? (
            <>
              <TouchableOpacity onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>Save</Text>
                }
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar — always tappable to change photo */}
        <View style={styles.avatarSection}>
          <AvatarComponent
            name={profile.name}
            userId={profile.id}
            avatarUrl={profile.avatar_url}
            size={100}
            onPress={handleAvatarPress}
            uploading={uploading}
            showEditBadge
          />
          {profile.gym_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>🛡 Gym verified</Text>
            </View>
          )}
          <Text style={styles.tapHint}>Tap photo to change</Text>
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <View>
              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={colors.textHint} />
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Age</Text>
                <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholderTextColor={colors.textHint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" placeholderTextColor={colors.textHint} />
              </View>
            </View>
            <View>
              <Text style={styles.label}>Gym name</Text>
              <TextInput style={styles.input} value={gymName} onChangeText={setGymName} placeholderTextColor={colors.textHint} />
            </View>
            <View>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                value={bio} onChangeText={setBio} multiline placeholderTextColor={colors.textHint}
              />
            </View>
            <View>
              <Text style={styles.label}>Skill level</Text>
              <View style={styles.chipRow}>
                {SKILL_LEVELS.map(s => (
                  <Chip key={s} label={s} active={skillLevel === s} onPress={() => setSkillLevel(s)} />
                ))}
              </View>
            </View>
            <View>
              <Text style={styles.label}>Martial arts</Text>
              <View style={styles.chipRow}>
                {MARTIAL_ARTS.map(a => (
                  <Chip key={a} label={a}
                    active={martialArts.includes(a)}
                    onPress={() => setMartialArts(prev => toggle(prev, a) as MartialArt[])}
                  />
                ))}
              </View>
            </View>
            <View>
              <Text style={styles.label}>Availability</Text>
              <View style={styles.chipRow}>
                {AVAILABILITY_OPTIONS.map(o => (
                  <Chip key={o.value} label={o.label}
                    active={availability.includes(o.value)}
                    onPress={() => setAvailability(prev => toggle(prev, o.value) as Availability[])}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.viewContent}>
            <Text style={styles.profileName}>{profile.name}</Text>
            {profile.age && <Text style={styles.profileMeta}>{profile.age} yrs · {profile.weight_kg} kg</Text>}
            {profile.location_city && <Text style={styles.profileLocation}>📍 {profile.location_city}</Text>}
            {profile.bio && <Text style={styles.profileBio}>{profile.bio}</Text>}
            {profile.gym_name && <View style={styles.gymRow}><Text style={styles.gymText}>🏋️ {profile.gym_name}</Text></View>}
            <View style={styles.tagGroup}>
              {profile.martial_arts.map(a => <Tag key={a} label={a} />)}
              <Tag label={profile.skill_level} color={skillColor[profile.skill_level]} bg={`${skillColor[profile.skill_level]}15`} />
            </View>
            {profile.availability.length > 0 && (
              <View style={styles.availRow}>
                <View style={styles.availDot} />
                <Text style={styles.availText}>Available {profile.availability.join(', ')}</Text>
              </View>
            )}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>—</Text>
                <Text style={styles.statLabel}>Spars done</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>—</Text>
                <Text style={styles.statLabel}>Matches</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNum}>—</Text>
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cancelText: { fontSize: font.base, color: colors.textMuted },
  editBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.md, borderWidth: 0.5, borderColor: colors.border },
  editBtnText: { fontSize: font.sm, color: colors.text },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.md, backgroundColor: colors.accent, minWidth: 52, alignItems: 'center' },
  saveBtnText: { fontSize: font.sm, color: '#fff', fontWeight: '600' },
  scroll: { padding: spacing.xl },
  avatarSection: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.sm },
  verifiedBadge: { backgroundColor: colors.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  verifiedText: { fontSize: 11, color: '#fff', fontWeight: '500' },
  tapHint: { fontSize: 11, color: colors.textHint },
  viewContent: { gap: spacing.md },
  profileName: { fontSize: font.xxl, fontWeight: '700', color: colors.text, letterSpacing: -0.5, textAlign: 'center' },
  profileMeta: { fontSize: font.base, color: colors.textMuted, textAlign: 'center' },
  profileLocation: { fontSize: font.base, color: colors.textMuted, textAlign: 'center' },
  profileBio: { fontSize: font.base, color: colors.textMuted, lineHeight: 22, textAlign: 'center', paddingHorizontal: spacing.md },
  gymRow: { alignItems: 'center' },
  gymText: { fontSize: font.base, color: colors.textMuted },
  tagGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  availRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  availDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  availText: { fontSize: font.sm, color: colors.textMuted },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  statCard: { flex: 1, backgroundColor: colors.bgCard, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', gap: 4, borderWidth: 0.5, borderColor: colors.border },
  statNum: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted },
  editForm: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  label: { fontSize: font.sm, color: colors.textMuted, fontWeight: '500', marginBottom: 6 },
  input: { backgroundColor: colors.bgCard, borderWidth: 0.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 12, color: colors.text, fontSize: font.base },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  signOutBtn: { marginTop: spacing.xl, paddingVertical: 14, borderRadius: radius.md, borderWidth: 0.5, borderColor: colors.border, alignItems: 'center' },
  signOutText: { color: colors.textMuted, fontSize: font.base },
});

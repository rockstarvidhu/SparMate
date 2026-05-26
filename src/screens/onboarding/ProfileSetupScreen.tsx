import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, radius, font } from '../../constants/theme';
import { MartialArt, SkillLevel, Availability, MARTIAL_ARTS, SKILL_LEVELS, AVAILABILITY_OPTIONS } from '../../types';

const STEPS = ['basics', 'martial', 'gym', 'avail'] as const;
type Step = typeof STEPS[number];

function ChipSelect<T extends string>({
  options, selected, onToggle, color = colors.accent,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (v: T) => void;
  color?: string;
}) {
  return (
    <View style={chipStyles.row}>
      {options.map(o => {
        const active = selected.includes(o.value);
        return (
          <TouchableOpacity
            key={o.value}
            style={[chipStyles.chip, active && { borderColor: color, backgroundColor: `${color}20` }]}
            onPress={() => onToggle(o.value)}
          >
            <Text style={[chipStyles.label, active && { color }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 0.5, borderColor: colors.border,
  },
  label: { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },
});

export default function ProfileSetupScreen() {
  const { user, refreshProfile } = useAuth();

  const [step, setStep]             = useState<Step>('basics');
  const [age, setAge]               = useState('');
  const [weight, setWeight]         = useState('');
  const [bio, setBio]               = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('beginner');
  const [martialArts, setMartialArts] = useState<MartialArt[]>([]);
  const [gymName, setGymName]       = useState('');
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [saving, setSaving]         = useState(false);

  function toggleItem<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  }

  async function handleSave() {
    if (martialArts.length === 0) {
      Alert.alert('Pick at least one martial art!'); return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({
      id: user!.id,
      age: age ? parseInt(age) : null,
      weight_kg: weight ? parseFloat(weight) : null,
      bio: bio || null,
      skill_level: skillLevel,
      martial_arts: martialArts,
      gym_name: gymName || null,
      availability,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    await refreshProfile();
  }

  const stepIndex = STEPS.indexOf(step);
  const progress  = ((stepIndex + 1) / STEPS.length) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>
          Spar<Text style={{ color: colors.accent }}>Mate</Text>
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.stepLabel}>Step {stepIndex + 1} of {STEPS.length}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── STEP 1: Basics ── */}
        {step === 'basics' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>The basics</Text>
            <Text style={styles.sectionSub}>Tell partners a bit about you.</Text>

            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 24"
              placeholderTextColor={colors.textHint}
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
            />

            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 72"
              placeholderTextColor={colors.textHint}
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />

            <Text style={styles.label}>Skill level</Text>
            <ChipSelect
              options={SKILL_LEVELS.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
              selected={[skillLevel]}
              onToggle={(v) => setSkillLevel(v)}
            />

            <Text style={[styles.label, { marginTop: spacing.md }]}>Short bio (optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="What you train for, your experience, what you're looking for..."
              placeholderTextColor={colors.textHint}
              multiline
              value={bio}
              onChangeText={setBio}
            />
          </View>
        )}

        {/* ── STEP 2: Martial Arts ── */}
        {step === 'martial' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your disciplines</Text>
            <Text style={styles.sectionSub}>Select all martial arts you train.</Text>
            <ChipSelect
              options={MARTIAL_ARTS.map(a => ({ value: a, label: a }))}
              selected={martialArts}
              onToggle={(v) => setMartialArts(prev => toggleItem(prev, v))}
            />
          </View>
        )}

        {/* ── STEP 3: Gym ── */}
        {step === 'gym' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your gym</Text>
            <Text style={styles.sectionSub}>
              Adding your gym builds trust with potential partners.
            </Text>
            <Text style={styles.label}>Gym name (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Knockout Academy"
              placeholderTextColor={colors.textHint}
              value={gymName}
              onChangeText={setGymName}
            />
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                🛡 Gym verification badges will be available soon. Your listed gym will be shown on your profile.
              </Text>
            </View>
          </View>
        )}

        {/* ── STEP 4: Availability ── */}
        {step === 'avail' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            <Text style={styles.sectionSub}>When are you usually free to spar?</Text>
            <ChipSelect
              options={AVAILABILITY_OPTIONS}
              selected={availability}
              onToggle={(v) => setAvailability(prev => toggleItem(prev, v))}
            />
          </View>
        )}
      </ScrollView>

      {/* Footer nav */}
      <View style={styles.footer}>
        {stepIndex > 0 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setStep(STEPS[stepIndex - 1])}
          >
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, saving && { opacity: 0.6 }]}
          disabled={saving}
          onPress={() => {
            if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]);
            else handleSave();
          }}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.nextBtnText}>
                {stepIndex < STEPS.length - 1 ? 'Next →' : 'Start finding partners 🥊'}
              </Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: 60, paddingBottom: spacing.md,
  },
  logo: {
    fontSize: 24, fontWeight: '700',
    color: colors.text, letterSpacing: -0.5,
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 3, backgroundColor: colors.bgCard,
    borderRadius: radius.full, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.accent,
    borderRadius: radius.full,
  },
  stepLabel: {
    fontSize: font.sm, color: colors.textHint,
    marginTop: 6,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: font.xl, fontWeight: '700',
    color: colors.text, letterSpacing: -0.5,
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: font.base, color: colors.textMuted,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: font.sm, color: colors.textMuted,
    fontWeight: '500', marginBottom: 6, marginTop: 8,
  },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    color: colors.text, fontSize: font.base,
  },
  infoBox: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md, padding: spacing.md,
    borderWidth: 0.5, borderColor: colors.border,
    marginTop: spacing.md,
  },
  infoText: { color: colors.textMuted, fontSize: font.sm, lineHeight: 20 },
  footer: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    paddingBottom: 32,
  },
  backBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: 15,
    borderRadius: radius.md,
    borderWidth: 0.5, borderColor: colors.border,
    justifyContent: 'center',
  },
  backBtnText: { color: colors.textMuted, fontSize: font.base },
  nextBtn: {
    flex: 1, backgroundColor: colors.accent,
    borderRadius: radius.md, paddingVertical: 15,
    alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontSize: font.base, fontWeight: '600' },
});

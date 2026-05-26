import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius, font } from '../../constants/theme';
import {
  Filters, DEFAULT_FILTERS, MartialArt, SkillLevel,
  Availability, MARTIAL_ARTS, SKILL_LEVELS, AVAILABILITY_OPTIONS,
} from '../../types';

const STORAGE_KEY = 'sparmate_filters';

export async function loadFilters(): Promise<Filters> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_FILTERS;
  } catch { return DEFAULT_FILTERS; }
}

export async function saveFilters(f: Filters) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(f));
}

function SectionTitle({ title }: { title: string }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Chip({
  label, active, onPress, activeColor = colors.accent,
}: {
  label: string; active: boolean;
  onPress: () => void; activeColor?: string;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && { borderColor: activeColor, backgroundColor: `${activeColor}20` },
      ]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && { color: activeColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function WeightSlider({
  value, min, max, onChange, label,
}: {
  value: number; min: number; max: number;
  onChange: (v: number) => void; label: string;
}) {
  // Simplified step buttons for RN compatibility (no native Slider needed)
  const step = 5;
  return (
    <View style={styles.weightRow}>
      <Text style={styles.weightLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.weightValue}>{value} kg</Text>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function FiltersScreen() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  function toggle<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
  }

  async function handleApply() {
    await saveFilters(filters);
    Alert.alert('Filters saved', 'Your preferences will apply on the next discover refresh.');
  }

  function handleReset() {
    setFilters(DEFAULT_FILTERS);
  }

  const RADIUS_OPTIONS = [5, 15, 30, 50, 100];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Filters</Text>
        <TouchableOpacity onPress={handleReset}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Martial Arts */}
        <SectionTitle title="Martial art" />
        <View style={styles.chips}>
          {MARTIAL_ARTS.map(art => (
            <Chip
              key={art}
              label={art}
              active={filters.martial_arts.includes(art)}
              onPress={() => setFilters(f => ({ ...f, martial_arts: toggle(f.martial_arts, art) as MartialArt[] }))}
            />
          ))}
        </View>

        {/* Weight range */}
        <SectionTitle title="Weight range (kg)" />
        <View style={styles.weightCard}>
          <WeightSlider
            label="Min weight"
            value={filters.weight_min}
            min={40} max={filters.weight_max - 5}
            onChange={v => setFilters(f => ({ ...f, weight_min: v }))}
          />
          <View style={styles.divider} />
          <WeightSlider
            label="Max weight"
            value={filters.weight_max}
            min={filters.weight_min + 5} max={150}
            onChange={v => setFilters(f => ({ ...f, weight_max: v }))}
          />
          <View style={styles.weightRangeBadge}>
            <Text style={styles.weightRangeText}>
              {filters.weight_min} – {filters.weight_max} kg
            </Text>
          </View>
        </View>

        {/* Skill level */}
        <SectionTitle title="Skill level" />
        <View style={styles.chips}>
          {SKILL_LEVELS.map(level => (
            <Chip
              key={level}
              label={level.charAt(0).toUpperCase() + level.slice(1)}
              active={filters.skill_levels.includes(level)}
              onPress={() => setFilters(f => ({ ...f, skill_levels: toggle(f.skill_levels, level) as SkillLevel[] }))}
            />
          ))}
        </View>

        {/* Distance */}
        <SectionTitle title="Distance" />
        <View style={styles.chips}>
          {RADIUS_OPTIONS.map(km => (
            <Chip
              key={km}
              label={`${km} km`}
              active={filters.radius_km === km}
              onPress={() => setFilters(f => ({ ...f, radius_km: km }))}
            />
          ))}
        </View>

        {/* Availability */}
        <SectionTitle title="Availability" />
        <View style={styles.chips}>
          {AVAILABILITY_OPTIONS.map(o => (
            <Chip
              key={o.value}
              label={o.label}
              active={filters.availability.includes(o.value)}
              onPress={() => setFilters(f => ({ ...f, availability: toggle(f.availability, o.value) as Availability[] }))}
            />
          ))}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
          <Text style={styles.applyText}>Apply filters</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border,
  },
  title: { fontSize: font.xl, fontWeight: '700', color: colors.text },
  resetText: { fontSize: font.base, color: colors.accent },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  sectionTitle: {
    fontSize: font.sm, color: colors.textMuted,
    fontWeight: '600', marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: radius.full,
    borderWidth: 0.5, borderColor: colors.border,
  },
  chipText: { fontSize: font.sm, color: colors.textMuted, fontWeight: '500' },

  weightCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border,
    overflow: 'hidden',
  },
  weightRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  weightLabel: { fontSize: font.base, color: colors.textMuted },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bgInput,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: colors.border,
  },
  stepBtnText: { fontSize: 18, color: colors.text, lineHeight: 22 },
  weightValue: { fontSize: font.md, fontWeight: '600', color: colors.text, minWidth: 60, textAlign: 'center' },
  divider: { height: 0.5, backgroundColor: colors.border },
  weightRangeBadge: {
    alignItems: 'center', paddingVertical: 8,
    borderTopWidth: 0.5, borderTopColor: colors.border,
    backgroundColor: colors.accentDim,
  },
  weightRangeText: { fontSize: font.sm, color: colors.accent, fontWeight: '600' },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    paddingBottom: 32,
    borderTopWidth: 0.5, borderTopColor: colors.border,
  },
  applyBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md, paddingVertical: 15,
    alignItems: 'center',
  },
  applyText: { color: '#fff', fontSize: font.md, fontWeight: '600' },
});

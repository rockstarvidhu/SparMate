import React from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { colors } from '../constants/theme';

const AVATAR_BG_COLORS = ['#2C1A0E', '#0E1F2C', '#0E2C1A', '#2C0E22', '#1A0E2C'];
const AVATAR_TX_COLORS = ['#FF7A50', '#7AB8E8', '#4DD890', '#E87AB0', '#B07AE8'];

function colorFor(id: string) {
  const idx = (id?.charCodeAt(0) ?? 0) % AVATAR_BG_COLORS.length;
  return { bg: AVATAR_BG_COLORS[idx], text: AVATAR_TX_COLORS[idx] };
}

interface AvatarProps {
  name: string;
  userId: string;
  avatarUrl?: string | null;
  size?: number;
  onPress?: () => void;
  uploading?: boolean;
  showEditBadge?: boolean;
}

export default function Avatar({
  name, userId, avatarUrl,
  size = 90, onPress,
  uploading = false,
  showEditBadge = false,
}: AvatarProps) {
  const initials = name
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const { bg, text } = colorFor(userId);
  const fontSize = size * 0.28;

  // avatarUrl already has ?t=timestamp appended by useAvatarUpload
  // so React Native treats it as a new image every time it changes
  const inner = avatarUrl ? (
    <Image
      source={{ uri: avatarUrl, cache: 'reload' }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      resizeMode="cover"
    />
  ) : (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize, fontWeight: '700', color: text }}>{initials}</Text>
    </View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={{
        width: size, height: size, borderRadius: size / 2,
        borderWidth: 2, borderColor: colors.accent,
        overflow: 'hidden',
      }}
      activeOpacity={0.8}
    >
      {inner}

      {uploading && (
        <View style={[styles.overlay]}>
          <ActivityIndicator color="#fff" />
        </View>
      )}

      {showEditBadge && !uploading && (
        <View style={styles.editBadge}>
          <Text style={styles.editBadgeText}>📷</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: 26, height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#111',
  },
  editBadgeText: { fontSize: 12 },
});

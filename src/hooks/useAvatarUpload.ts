import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useAvatarUpload() {
  const { user, refreshProfile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function pickAndUpload(): Promise<string | null> {
    setError(null);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo library permission denied.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,       // ← get base64 directly, avoids fetch() blob issue on iOS
    });

    if (result.canceled || !result.assets[0]) return null;

    const asset = result.assets[0];

    if (!asset.base64) {
      setError('Could not read image data.');
      return null;
    }

    setUploading(true);

    try {
      const filePath = `${user!.id}/avatar.jpg`;

      // Upload using base64 → ArrayBuffer — works reliably on iOS + Android
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(asset.base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Append timestamp so the URL is unique and bypasses cache
      const freshUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: freshUrl, updated_at: new Date().toISOString() })
        .eq('id', user!.id);

      if (updateError) throw updateError;

      await refreshProfile();
      return freshUrl;

    } catch (e: any) {
      setError(e.message ?? 'Upload failed.');
      return null;
    } finally {
      setUploading(false);
    }
  }

  return { pickAndUpload, uploading, error };
}

import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Coords {
  lat: number;
  lng: number;
}

export function useLocation() {
  const { user } = useAuth();
  const [coords, setCoords]     = useState<Coords | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    requestAndSave();
  }, [user]);

  async function requestAndSave() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Distance sorting unavailable.');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude: lat, longitude: lng } = loc.coords;
      setCoords({ lat, lng });

      // Reverse geocode to get city name
      const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const city = place?.city || place?.district || place?.region || null;

      // Save to profile
      await supabase.from('profiles').update({
        location_lat: lat,
        location_lng: lng,
        location_city: city,
        updated_at: new Date().toISOString(),
      }).eq('id', user!.id);

    } catch (e) {
      setError('Could not get location.');
    } finally {
      setLoading(false);
    }
  }

  return { coords, error, loading, refresh: requestAndSave };
}

// ── Haversine distance formula ────────────────────────
// Returns distance in km between two lat/lng points
export function getDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number) { return (deg * Math.PI) / 180; }

// Format distance for display
export function formatDistance(km: number): string {
  if (km < 1)    return `${Math.round(km * 1000)} m`;
  if (km < 10)   return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
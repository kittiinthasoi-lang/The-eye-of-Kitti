/**
 * Haptic vibration feedback for visually impaired users
 */
export function triggerHaptic(pattern: number | number[] = 100) {
  if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration permissions or restrictions
    }
  }
}

export const HAPTIC_PATTERNS = {
  TAP: 50,
  SUCCESS: [80, 50, 80],
  WARNING: [250, 100, 200],
  DANGER: [400, 120, 400, 120, 500],
  SOS_PULSE: [600, 150, 600, 150, 800],
  TACTILE_BLOCK: [120, 60, 120],
};

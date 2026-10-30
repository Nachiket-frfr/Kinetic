/**
 * Haptic feedback utility for Samsung Galaxy & Android devices.
 * Uses navigator.vibrate with distinct vibration patterns.
 */
export function triggerHaptic(type = 'light') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'light') {
        navigator.vibrate(20); // Quick tick for button click / step
      } else if (type === 'medium') {
        navigator.vibrate(45); // Rep counted
      } else if (type === 'heavy') {
        navigator.vibrate([60, 40, 60]); // Form warning
      } else if (type === 'success') {
        navigator.vibrate([40, 60, 80]); // Set / Workout completed
      }
    } catch {
      // Ignore vibration errors
    }
  }
}

export default triggerHaptic;

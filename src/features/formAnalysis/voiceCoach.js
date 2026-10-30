/**
 * Voice Coach — Real-time audible workout feedback.
 * Uses the Web Speech Synthesis API with throttling to provide
 * spoken form corrections and rep count callouts without annoying spam.
 */

let lastSpokenText = '';
let lastSpokenTime = 0;
const MIN_INTERVAL_MS = 2500; // minimum gap between verbal cues

export function speakFeedback(text, priority = false) {
  if (!('speechSynthesis' in window)) return;

  const now = Date.now();
  // Don't repeat the exact same cue within 4 seconds unless high priority
  if (!priority && text === lastSpokenText && now - lastSpokenTime < 4000) {
    return;
  }
  if (!priority && now - lastSpokenTime < MIN_INTERVAL_MS) {
    return;
  }

  // Cancel any queued speech if priority (e.g. severe form error)
  if (priority) {
    window.speechSynthesis.cancel();
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05; // slightly energetic tempo
  utterance.pitch = 1.0;
  utterance.volume = 0.85;

  lastSpokenText = text;
  lastSpokenTime = now;

  window.speechSynthesis.speak(utterance);
}

export function cancelSpeech() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

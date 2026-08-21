let audioContext = null;

export function tone(settings, frequency = 440, duration = 0.06, type = 'sine') {
  if (!settings.soundOn) return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    audioContext ||= new AudioContext();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.025;

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + duration
    );
    oscillator.stop(audioContext.currentTime + duration);
  } catch {
    // Audio is optional; unsupported browser contexts should not break the game.
  }
}

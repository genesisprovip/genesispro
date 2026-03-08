/**
 * Sound effects for live event notifications.
 *
 * NOTE: Actual .mp3 files need to be added to assets/sounds/:
 *   - assets/sounds/fight-start.mp3  (short bell / ring sound)
 *   - assets/sounds/result.mp3       (victory fanfare)
 *
 * Until real audio files are placed there, the play functions will
 * silently catch the "asset not found" error and do nothing.
 */

import { Audio } from 'expo-av';

let fightStartSound: Audio.Sound | null = null;
let resultSound: Audio.Sound | null = null;

async function ensureAudioMode() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch {
    // ignore – non-critical
  }
}

/**
 * Play a bell/ring sound when a new fight starts.
 */
export async function playFightStartSound(): Promise<void> {
  try {
    await ensureAudioMode();

    // Unload previous instance to avoid leaks
    if (fightStartSound) {
      await fightStartSound.unloadAsync().catch(() => {});
      fightStartSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/assets/sounds/fight-start.mp3'),
      { shouldPlay: true, volume: 0.8 }
    );
    fightStartSound = sound;

    // Auto-unload when done
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        fightStartSound = null;
      }
    });
  } catch {
    // Sound file not found or playback error – silently ignore.
    // Add the actual .mp3 to assets/sounds/fight-start.mp3 to enable.
    console.log('[sounds] fight-start.mp3 not available – skipping');
  }
}

/**
 * Play a fanfare sound when a fight result is announced.
 */
export async function playResultSound(): Promise<void> {
  try {
    await ensureAudioMode();

    if (resultSound) {
      await resultSound.unloadAsync().catch(() => {});
      resultSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/assets/sounds/result.mp3'),
      { shouldPlay: true, volume: 0.9 }
    );
    resultSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        resultSound = null;
      }
    });
  } catch {
    console.log('[sounds] result.mp3 not available – skipping');
  }
}

/**
 * Clean up loaded sounds (call on unmount).
 */
export async function unloadSounds(): Promise<void> {
  if (fightStartSound) {
    await fightStartSound.unloadAsync().catch(() => {});
    fightStartSound = null;
  }
  if (resultSound) {
    await resultSound.unloadAsync().catch(() => {});
    resultSound = null;
  }
}

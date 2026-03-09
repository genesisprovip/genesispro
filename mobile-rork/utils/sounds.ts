/**
 * Sound effects for live event notifications.
 * Uses WAV files generated synthetically (bell ring + victory fanfare).
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

    if (fightStartSound) {
      await fightStartSound.unloadAsync().catch(() => {});
      fightStartSound = null;
    }

    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/assets/sounds/fight-start.wav'),
      { shouldPlay: true, volume: 0.8 }
    );
    fightStartSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync().catch(() => {});
        fightStartSound = null;
      }
    });
  } catch {
    console.log('[sounds] fight-start.wav not available – skipping');
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
      require('@/assets/sounds/result.wav'),
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
    console.log('[sounds] result.wav not available – skipping');
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

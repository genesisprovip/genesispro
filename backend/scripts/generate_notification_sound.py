"""
Generate a custom notification sound for GenesisPro fight alerts.
Style: Short, pleasant, two-tone chime — recognizable without being annoying.
Inspired by: WhatsApp/Telegram notification tones — clean, modern, minimal.
Output: 16-bit PCM WAV, 44100 Hz, mono, ~0.8 seconds
"""
import struct
import math
import wave

SAMPLE_RATE = 44100
CHANNELS = 1
SAMPLE_WIDTH = 2  # 16-bit

def generate_tone(freq, duration, volume=0.5, fade_in=0.01, fade_out=0.05):
    """Generate a sine wave tone with envelope."""
    samples = []
    n_samples = int(SAMPLE_RATE * duration)
    fade_in_samples = int(SAMPLE_RATE * fade_in)
    fade_out_samples = int(SAMPLE_RATE * fade_out)

    for i in range(n_samples):
        # Sine wave
        t = i / SAMPLE_RATE
        sample = math.sin(2 * math.pi * freq * t)

        # Add a subtle harmonic for warmth (octave above, quiet)
        sample += 0.15 * math.sin(2 * math.pi * freq * 2 * t)
        # Add a fifth harmonic for brightness
        sample += 0.08 * math.sin(2 * math.pi * freq * 3 * t)

        # Envelope: fade in/out
        envelope = 1.0
        if i < fade_in_samples:
            envelope = i / fade_in_samples
        elif i > n_samples - fade_out_samples:
            remaining = n_samples - i
            envelope = remaining / fade_out_samples

        # Exponential decay for natural sound
        decay = math.exp(-2.0 * t / duration)

        sample *= volume * envelope * decay
        samples.append(sample)

    return samples


def generate_silence(duration):
    """Generate silence."""
    return [0.0] * int(SAMPLE_RATE * duration)


def mix_samples(*sample_lists):
    """Mix multiple sample lists together."""
    max_len = max(len(s) for s in sample_lists)
    result = [0.0] * max_len
    for samples in sample_lists:
        for i, s in enumerate(samples):
            result[i] += s
    return result


def to_pcm16(samples):
    """Convert float samples to 16-bit PCM bytes."""
    # Normalize to prevent clipping
    peak = max(abs(s) for s in samples) or 1.0
    if peak > 0.95:
        samples = [s * 0.95 / peak for s in samples]

    data = b''
    for s in samples:
        clamped = max(-1.0, min(1.0, s))
        data += struct.pack('<h', int(clamped * 32767))
    return data


def save_wav(filename, samples):
    """Save samples as WAV file."""
    pcm_data = to_pcm16(samples)
    with wave.open(filename, 'wb') as w:
        w.setnchannels(CHANNELS)
        w.setsampwidth(SAMPLE_WIDTH)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm_data)


# ─── Notification Sound: "Genesis Chime" ───
# Two ascending notes (major third interval) — pleasant, recognizable
# Similar to premium sports app notifications

# Note frequencies (musical notes)
E5 = 659.25   # First note
Ab5 = 830.61  # Second note (major third up) — bright, positive feeling
C6 = 1046.50  # Optional subtle top note

# Build the sound:
# 1. First note: E5 for 0.15s
note1 = generate_tone(E5, 0.20, volume=0.6, fade_in=0.005, fade_out=0.08)

# 2. Short gap
gap = generate_silence(0.06)

# 3. Second note: Ab5 for 0.25s (slightly longer, ascending = positive feeling)
note2 = generate_tone(Ab5, 0.28, volume=0.55, fade_in=0.005, fade_out=0.12)

# 4. Subtle high shimmer on top of note2 for sparkle
shimmer = generate_tone(C6, 0.15, volume=0.12, fade_in=0.01, fade_out=0.08)

# Combine: note1 + gap + (note2 mixed with shimmer)
note2_with_shimmer = mix_samples(note2, shimmer)
final = note1 + gap + note2_with_shimmer

# Add a tiny tail of silence so it doesn't clip
final += generate_silence(0.1)

# Total duration: ~0.8 seconds
print(f"Duration: {len(final) / SAMPLE_RATE:.2f}s")
print(f"Samples: {len(final)}")

# Save
output_path = r"C:\genesispro\mobile-rork\assets\sounds\fight_alert.wav"
import os
os.makedirs(os.path.dirname(output_path), exist_ok=True)
save_wav(output_path, final)
print(f"Saved: {output_path}")

# Also save a variant — slightly different for general notifications
# Three quick soft notes (C-E-G major chord arpeggio)
C5 = 523.25
E5b = 659.25
G5 = 783.99

n1 = generate_tone(C5, 0.12, volume=0.45, fade_in=0.005, fade_out=0.06)
g1 = generate_silence(0.04)
n2 = generate_tone(E5b, 0.12, volume=0.4, fade_in=0.005, fade_out=0.06)
g2 = generate_silence(0.04)
n3 = generate_tone(G5, 0.20, volume=0.45, fade_in=0.005, fade_out=0.10)

general = n1 + g1 + n2 + g2 + n3 + generate_silence(0.1)
general_path = r"C:\genesispro\mobile-rork\assets\sounds\notification.wav"
save_wav(general_path, general)
print(f"Saved: {general_path}")
print(f"General duration: {len(general) / SAMPLE_RATE:.2f}s")

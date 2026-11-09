/**
 * Web Audio API Sound Synthesizer
 * 100% offline, zero network requests, pure browser audio synthesis.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 1. Correct Answer Bell (Chime)
export function playCorrectSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (e) {
    // Ignore audio permission errors
  }
}

// 2. Incorrect Answer Soft Low Tone
export function playIncorrectSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
    osc.frequency.linearRampToValueAtTime(164.81, ctx.currentTime + 0.25); // E3

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Ignore
  }
}

// 3. Card Flip Swoosh
export function playFlipSound() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Ignore
  }
}

// 4. Pomodoro Timer Finish Gong
export function playTimerFinishSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0.25, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.8);
    });
  } catch (e) {
    // Ignore
  }
}

// 5. Ambient Sound Synthesizer (Rain / Cafe Hum / White Noise)
class AmbientSynthesizer {
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private currentType: string | null = null;

  start(type: 'rain' | 'cafe' | 'whitenoise', volume = 0.3) {
    this.stop();
    try {
      const ctx = getAudioContext();
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      if (type === 'rain') {
        // Pinkish noise with lowpass filter
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99765 * b0 + white * 0.0990460;
          b1 = 0.96300 * b1 + white * 0.1947840;
          b2 = 0.57000 * b2 + white * 0.5500000;
          output[i] = (b0 + b1 + b2) * 0.12;
        }
      } else if (type === 'cafe') {
        // Warm brown noise with rhythmic resonance
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = output[i];
          output[i] *= 1.8;
        }
      } else {
        // White noise
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * 0.15;
        }
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Filter
      const filter = ctx.createBiquadFilter();
      filter.type = type === 'rain' ? 'lowpass' : type === 'cafe' ? 'bandpass' : 'allpass';
      filter.frequency.value = type === 'rain' ? 800 : type === 'cafe' ? 450 : 2000;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();

      this.noiseNode = whiteNoise;
      this.gainNode = gain;
      this.currentType = type;
    } catch (e) {
      // Ignore
    }
  }

  stop() {
    if (this.noiseNode) {
      try {
        (this.noiseNode as any).stop();
        this.noiseNode.disconnect();
      } catch (e) {
        // Ignore
      }
      this.noiseNode = null;
    }
    this.currentType = null;
  }

  isPlaying(type: string): boolean {
    return this.currentType === type;
  }

  setVolume(vol: number) {
    if (this.gainNode && audioCtx) {
      this.gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
    }
  }
}

export const ambientPlayer = new AmbientSynthesizer();

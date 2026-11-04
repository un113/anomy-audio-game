import * as Tone from 'tone';
import { AllAnomyEffects, AllAnomyStats, AnomyEffectId } from './types';
import { INSTRUMENT_DEFINITIONS } from './constants';

export interface AnomyInstrument {
  triggerAttackRelease: (...args: Parameters<Tone.PolySynth['triggerAttackRelease']>) => void;
  releaseAll: (...args: Parameters<Tone.PolySynth['releaseAll']>) => void;
  dispose: () => void;
  readonly disposed: boolean;
}

export type PlayableInstrument = AnomyInstrument | Tone.Sampler;

class AnomyVoice implements AnomyInstrument {
  constructor(
    private synth: Tone.PolySynth,
    private noise: Tone.NoiseSynth | null,
    private nodes: Tone.ToneAudioNode[],
  ) {}

  get disposed(): boolean {
    return this.synth.disposed;
  }

  triggerAttackRelease(...args: Parameters<Tone.PolySynth['triggerAttackRelease']>): void {
    this.synth.triggerAttackRelease(...args);
    if (this.noise) {
      const [, duration, time, velocity] = args;
      const noiseDuration = Array.isArray(duration) ? duration[0] : duration;
      this.noise.triggerAttackRelease(noiseDuration, time, velocity);
    }
  }

  releaseAll(...args: Parameters<Tone.PolySynth['releaseAll']>): void {
    this.synth.releaseAll(...args);
    this.noise?.triggerRelease(args[0]);
  }

  dispose(): void {
    this.synth.dispose();
    this.noise?.dispose();
    this.nodes.forEach(node => node.dispose());
  }
}

let masterLimiter: Tone.Limiter | null = null;

export function getMasterOutput(): Tone.Limiter {
  if (!masterLimiter) {
    masterLimiter = new Tone.Limiter(-1).toDestination();
  }
  return masterLimiter;
}

export function createAnomyInstrument(
  anomyId: string,
  statsMap: AllAnomyStats,
  effectsMap: AllAnomyEffects = {},
): AnomyInstrument {
  const stats = statsMap[anomyId] || { softness: 0, echo: 0, brightness: 0 };
  const softnessRate = stats.softness / 100;
  const echoRate = stats.echo / 100;
  const brightnessRate = stats.brightness / 100;

  const oscType: 'sine' | 'triangle' | 'square' =
    softnessRate >= 0.7 ? 'sine' : softnessRate >= 0.35 ? 'triangle' : 'square';

  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: oscType },
    envelope: {
      attack: 0.01 + softnessRate * 0.1,
      decay: 0.2,
      sustain: 0.5,
      release: 0.1 + softnessRate * 0.4,
    },
  });

  // Set safe volume to prevent clipping
  synth.volume.value = -8;

  const filter = new Tone.Filter(1000 + brightnessRate * 4000, 'lowpass');
  const reverb = new Tone.Reverb({
    decay: Math.max(0.1, 0.2 + echoRate * 3),
    wet: echoRate * 0.4,
  });

  const nodes: Tone.ToneAudioNode[] = [filter, reverb];
  let noise: Tone.NoiseSynth | null = null;
  const effect: AnomyEffectId | null = effectsMap[anomyId] ?? null;

  synth.connect(filter);
  let previous: Tone.ToneAudioNode = filter;
  if (effect === 'vibrato') {
    const vibrato = new Tone.Vibrato({ frequency: 4.5, depth: 0.08, wet: 0.24 });
    nodes.push(vibrato);
    previous.connect(vibrato);
    previous = vibrato;
  } else if (effect === 'radio') {
    const radioFilter = new Tone.Filter({ frequency: 1450, type: 'bandpass', Q: 0.8 });
    const crusher = new Tone.BitCrusher(8);
    noise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.01, decay: 0.12, sustain: 0.04, release: 0.06 },
    });
    noise.volume.value = -31;
    nodes.push(radioFilter, crusher);
    previous.connect(radioFilter);
    radioFilter.connect(crusher);
    noise.connect(radioFilter);
    previous = crusher;
  }

  previous.connect(reverb);
  reverb.connect(getMasterOutput());
  return new AnomyVoice(synth, noise, nodes);
}

export async function createInstrumentFromSelection(
  selectedValue: string | null,
  statsMap: AllAnomyStats,
  effectsMap: AllAnomyEffects = {},
): Promise<PlayableInstrument | null> {
  if (!selectedValue) return null;
  if (selectedValue.startsWith('anomy_')) {
    return createAnomyInstrument(selectedValue, statsMap, effectsMap);
  }

  const def = INSTRUMENT_DEFINITIONS[selectedValue];
  if (def?.type === 'sample') {
    const sampler = new Tone.Sampler({
      urls: { C4: def.file },
    });
    sampler.volume.value = -6;
    sampler.connect(getMasterOutput());
    await Tone.loaded();
    return sampler;
  }
  return null;
}

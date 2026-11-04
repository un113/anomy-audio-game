import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { AllAnomyEffects, AllAnomyStats, SongConfig } from '../types';
import { createInstrumentFromSelection, PlayableInstrument } from '../audio';
import { findItemById } from '../constants';
import { assetPath } from '../assetPath';

type PerformancePhase = 'entrance' | 'loading' | 'playing' | 'finished' | 'error';

interface PerformanceScreenProps {
  active: boolean;
  song: SongConfig | null;
  formation: Record<number, string | null>;
  stats: AllAnomyStats;
  effects: AllAnomyEffects;
  onBackToArrangement: () => void;
  setStatus: (status: string) => void;
}

export const PerformanceScreen: React.FC<PerformanceScreenProps> = ({
  active,
  song,
  formation,
  stats,
  effects,
  onBackToArrangement,
  setStatus,
}) => {
  const [phase, setPhase] = useState<PerformancePhase>('entrance');
  const [elapsed, setElapsed] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const instrumentsRef = useRef<(PlayableInstrument | null)[]>([]);
  const eventIdsRef = useRef<number[]>([]);
  const bgmPlayerRef = useRef<Tone.Player | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const clearPlayback = useCallback(() => {
    Tone.Transport.stop();
    eventIdsRef.current.forEach(id => Tone.Transport.clear(id));
    eventIdsRef.current = [];
    Tone.Transport.seconds = 0;
    if (bgmPlayerRef.current) {
      bgmPlayerRef.current.dispose();
      bgmPlayerRef.current = null;
    }
    instrumentsRef.current.forEach(instrument => {
      if (instrument && !instrument.disposed) instrument.dispose();
    });
    instrumentsRef.current = [];
  }, []);

  const startPlayback = useCallback(async () => {
    if (!song) return;
    setPhase('loading');
    setStatus(`${song.title}を準備しています…`);
    clearPlayback();

    try {
      const midi = await Midi.fromUrl(song.filename);
      if (song.bgm) {
        const player = new Tone.Player(song.bgm).toDestination();
        bgmPlayerRef.current = player;
        await Tone.loaded();
        player.volume.value = -15;
        player.sync().start(0);
      }

      const instruments: (PlayableInstrument | null)[] = [];
      for (let index = 0; index < song.tracks.length; index += 1) {
        instruments.push(await createInstrumentFromSelection(formation[index] ?? null, stats, effects));
      }
      instrumentsRef.current = instruments;
      Tone.Transport.bpm.value = midi.header.tempos[0]?.bpm || 120;
      Tone.Transport.seconds = 0;

      midi.tracks.forEach((track, index) => {
        const instrument = instruments[index];
        if (!instrument) return;
        track.notes.forEach(note => {
          const eventId = Tone.Transport.schedule(time => {
            instrument.triggerAttackRelease(note.name, note.duration, time, note.velocity);
          }, note.time);
          eventIdsRef.current.push(eventId);
        });
      });

      const duration = Math.max(midi.duration, bgmPlayerRef.current?.buffer.duration ?? 0);
      setTotalDuration(duration);
      const endId = Tone.Transport.schedule(time => {
        Tone.Draw.schedule(() => {
          clearPlayback();
          setElapsed(duration);
          setPhase('finished');
          setStatus('演奏が終わりました');
        }, time);
      }, duration + 0.5);
      eventIdsRef.current.push(endId);

      startTimeRef.current = performance.now();
      setPhase('playing');
      setStatus(`${song.title}を演奏中`);
      Tone.Transport.start();
    } catch (error) {
      console.error('Failed to play song:', error);
      clearPlayback();
      setPhase('error');
      setStatus('曲の再生に失敗しました');
    }
  }, [clearPlayback, effects, formation, setStatus, song, stats]);

  useEffect(() => {
    if (!active) return;
    setPhase('entrance');
    setElapsed(0);
    setTotalDuration(0);
    timeoutRef.current = window.setTimeout(() => { void startPlayback(); }, 1000);
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      clearPlayback();
    };
  }, [active, clearPlayback, startPlayback]);

  useEffect(() => {
    if (phase !== 'playing' || !startTimeRef.current) return;
    const interval = window.setInterval(() => {
      setElapsed((performance.now() - (startTimeRef.current ?? performance.now())) / 1000);
    }, 100);
    return () => window.clearInterval(interval);
  }, [phase]);

  const assignedNames = song?.tracks.map((_, index) => {
    const itemId = formation[index];
    return itemId ? findItemById(itemId)?.name : null;
  }).filter(Boolean) ?? [];
  const progress = totalDuration > 0 ? Math.min(100, Math.round((elapsed / totalDuration) * 100)) : 0;

  return (
    <section className={`screen performance-screen ${active ? 'active' : ''} ${phase}`} aria-label="演奏画面">
      <header className="performance-header">
        <div><span className="arrange-kicker">NOW PLAYING</span><h1>{song?.title ?? '演奏'}</h1><p>{assignedNames.join(' ・ ') || 'メンバーを編成してください'}</p></div>
        <span className={`performance-state ${phase}`}>{phase === 'entrance' ? '登場' : phase === 'loading' ? '準備中' : phase === 'playing' ? '演奏中' : phase === 'finished' ? '演奏終了' : '再生できません'}</span>
      </header>
      <div className={`performance-stage ${phase}`}>
        <div className="performance-sky" aria-hidden="true"><span className="performance-sun" /><span className="performance-cloud cloud-one" /><span className="performance-cloud cloud-two" /></div>
        <div className="performance-ground" aria-hidden="true" />
        <div className="performance-note note-one" aria-hidden="true">♪</div>
        <div className="performance-note note-two" aria-hidden="true">♫</div>
        <div className={`performance-anomy ${phase === 'entrance' ? 'entering' : ''}`}>
          <img src={assetPath('images/dot_anomy.png')} alt="アノミー" />
          {phase === 'entrance' && <span className="entrance-caption">アノミー、登場！</span>}
          {phase === 'loading' && <span className="entrance-caption">曲を準備中…</span>}
          {phase === 'error' && <span className="entrance-caption error-caption">曲を読み込めませんでした</span>}
        </div>
        {phase === 'finished' && <div className="finished-caption">おつかれさま！</div>}
      </div>
      <div className="performance-progress">
        <div className="performance-progress-label"><span>{phase === 'playing' ? '伴奏とメロディを再生中' : phase === 'finished' ? '演奏が終わりました' : '曲の準備をしています'}</span><span>{phase === 'playing' ? `${Math.floor(elapsed)}秒` : ''}</span></div>
        <div className="performance-progress-track" role="progressbar" aria-label="曲の進行状況" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>
      </div>
      <footer className="performance-footer">
        <button type="button" className="performance-back" onClick={() => { clearPlayback(); setStatus('編成を調整できます'); onBackToArrangement(); }}>編成に戻る</button>
        {(phase === 'finished' || phase === 'error') && <button type="button" className="performance-replay" onClick={() => { setPhase('entrance'); setElapsed(0); timeoutRef.current = window.setTimeout(() => { void startPlayback(); }, 700); }}>もう一度演奏</button>}
      </footer>
    </section>
  );
};

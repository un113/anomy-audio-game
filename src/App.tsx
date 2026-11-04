import React, { useState, useEffect } from 'react';
import { MasterData, SongConfig, AllAnomyEffects, AllAnomyStats, AnomyEffectId } from './types';
import { DEFAULT_STATS, EFFECTS_STORAGE_KEY, STORAGE_KEY } from './constants';
import { HomeScreen } from './components/HomeScreen';
import { PlayScreen } from './components/PlayScreen';
import { GrowScreen } from './components/GrowScreen';
import { PerformanceScreen } from './components/PerformanceScreen';
import * as Tone from 'tone';
import { assetPath } from './assetPath';

const FALLBACK_MASTER: MasterData = {
  songs: [
    {
      id: "track_kaeru",
      title: "カエルの歌",
      filename: assetPath("songs/カエルの歌.mid"),
      tracks: [
        {
          name: "パート1",
          defaultInstrument: "anomy_1",
          slotType: "anomy",
          spotImage: "images/spot1.png",
          x: 150,
          y: 150
        },
        {
          name: "パート2",
          defaultInstrument: "anomy_2",
          slotType: "anomy",
          spotImage: "images/spot2.png",
          x: 410,
          y: 150
        }
      ],
      availableInstruments: ["anomy_1", "anomy_2", "anomy_3"]
    },
    {
      id: "track_konpeitou",
      title: "こんぺいとうの踊り",
      filename: assetPath("songs/konpeitou.mid"),
      bgm: assetPath("songs/konpeitou.mp3"),
      tracks: [
        {
          name: "可変メロディ",
          defaultInstrument: "anomy_1",
          slotType: "anomy",
          spotImage: "images/spot1.png",
          x: 280,
          y: 150
        }
      ],
      availableInstruments: ["anomy_1", "anomy_2", "anomy_3"]
    }
  ]
};

export const App: React.FC = () => {
  const [activeScreen, setActiveScreen] = useState<'home' | 'arrange' | 'performance' | 'grow'>('home');
  const [songs, setSongs] = useState<SongConfig[]>([]);
  const [currentSong, setCurrentSong] = useState<SongConfig | null>(null);
  const [formation, setFormation] = useState<Record<number, string | null>>({});
  const [stats, setStats] = useState<AllAnomyStats>(DEFAULT_STATS);
  const [effects, setEffects] = useState<AllAnomyEffects>({ anomy_1: null, anomy_2: null });
  const [status, setStatus] = useState<string>('準備中');

  // Load stats from storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setStats(prev => ({ ...prev, ...parsed }));
      }
      const savedEffects = localStorage.getItem(EFFECTS_STORAGE_KEY);
      if (savedEffects) setEffects(prev => ({ ...prev, ...JSON.parse(savedEffects) }));
    } catch (e) {
      console.warn('Failed to load stats from storage:', e);
    }
  }, []);

  const handleUpdateStats = (newStats: AllAnomyStats) => {
    setStats(newStats);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStats));
    } catch (e) {
      console.warn('Failed to save stats to storage:', e);
    }
  };

  const handleUpdateEffect = (anomyId: string, effect: AnomyEffectId | null) => {
    setEffects(prev => {
      const updated = { ...prev, [anomyId]: effect };
      try {
        localStorage.setItem(EFFECTS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Failed to save Anomy effects:', e);
      }
      return updated;
    });
  };

  const initSongFormation = (song: SongConfig) => {
    setCurrentSong(song);
    const newFormation: Record<number, string | null> = {};
    song.tracks.forEach((track, index) => {
      newFormation[index] = track.defaultInstrument || null;
    });
    setFormation(newFormation);
  };

  const startPerformance = async () => {
    try {
      await Tone.start();
      setActiveScreen('performance');
    } catch (error) {
      console.error('Unable to start audio:', error);
      setStatus('音声を開始できませんでした');
    }
  };

  // Load master.json
  useEffect(() => {
    const loadMaster = async () => {
      try {
        const response = await fetch(assetPath('master.json'));
        if (!response.ok) throw new Error('Fetch master.json failed');
        const data: MasterData = await response.json();
        const normalizedSongs = data.songs.map(song => ({
          ...song,
          filename: assetPath(song.filename),
          bgm: song.bgm ? assetPath(song.bgm) : undefined,
        }));
        setSongs(normalizedSongs);
        if (normalizedSongs.length > 0) {
          initSongFormation(normalizedSongs[0]);
        }
        setStatus('準備完了');
      } catch (e) {
        console.warn('Falling back to embedded master data:', e);
        setSongs(FALLBACK_MASTER.songs);
        initSongFormation(FALLBACK_MASTER.songs[0]);
        setStatus('準備完了');
      }
    };

    loadMaster();
  }, []);

  return (
    <div id="game">
      <div id="navButtons">
        <button
          id="showHomeScreenBtn"
          className={activeScreen === 'home' ? 'nav-active' : ''}
          onClick={() => setActiveScreen('home')}
        >
          🏠 ルーム
        </button>
        <button
          id="showPlayScreenBtn"
          className={activeScreen === 'arrange' || activeScreen === 'performance' ? 'nav-active' : ''}
          onClick={() => setActiveScreen('arrange')}
        >
          🎵 演奏画面へ
        </button>
        <button
          id="showGrowScreenBtn"
          className={activeScreen === 'grow' ? 'nav-active' : ''}
          onClick={() => setActiveScreen('grow')}
        >
          🌱 育成画面へ
        </button>
      </div>

      <HomeScreen
        active={activeScreen === 'home'}
        onNavigate={screen => setActiveScreen(screen === 'play' ? 'arrange' : 'grow')}
        stats={stats}
        onUpdateStats={handleUpdateStats}
        effects={effects}
        onUpdateEffect={handleUpdateEffect}
        songs={songs}
        setStatus={setStatus}
      />

      <PlayScreen
        active={activeScreen === 'arrange'}
        songs={songs}
        currentSong={currentSong}
        onSelectSong={initSongFormation}
        formation={formation}
        setFormation={setFormation}
        stats={stats}
        setStatus={setStatus}
        onStartPerformance={() => { void startPerformance(); }}
      />

      <PerformanceScreen
        active={activeScreen === 'performance'}
        song={currentSong}
        formation={formation}
        stats={stats}
        effects={effects}
        onBackToArrangement={() => setActiveScreen('arrange')}
        setStatus={setStatus}
      />

      <GrowScreen
        active={activeScreen === 'grow'}
        stats={stats}
        effects={effects}
        onUpdateStats={handleUpdateStats}
        setStatus={setStatus}
      />

      <div id="statusLabel">{status}</div>
    </div>
  );
};

export default App;

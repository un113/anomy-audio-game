import React, { useState } from 'react';
import * as Tone from 'tone';
import { AllAnomyEffects, AllAnomyStats } from '../types';
import { ANOMY_SLOTS } from '../constants';
import { createAnomyInstrument } from '../audio';
import { assetPath } from '../assetPath';

interface GrowScreenProps {
  active: boolean;
  stats: AllAnomyStats;
  effects: AllAnomyEffects;
  onUpdateStats: (newStats: AllAnomyStats) => void;
  setStatus: (status: string) => void;
}

export const GrowScreen: React.FC<GrowScreenProps> = ({
  active,
  stats,
  effects,
  onUpdateStats,
  setStatus,
}) => {
  const [growTargetId, setGrowTargetId] = useState<string>('anomy_1');
  const [isJumping, setIsJumping] = useState<boolean>(false);

  const currentTarget = ANOMY_SLOTS.find(a => a.id === growTargetId) || ANOMY_SLOTS[0];
  const currentStats = stats[growTargetId] || { softness: 0, echo: 0, brightness: 0 };

  const handleFeed = (statName: 'softness' | 'echo' | 'brightness') => {
    const updated = {
      ...stats,
      [growTargetId]: {
        ...currentStats,
        [statName]: Math.min(100, currentStats[statName] + 10),
      },
    };
    onUpdateStats(updated);

    // Trigger jump animation
    setIsJumping(false);
    requestAnimationFrame(() => {
      setIsJumping(true);
      setTimeout(() => setIsJumping(false), 350);
    });

    setStatus(`${currentTarget.name}の${statName}UP!`);
  };

  const handleTestSound = async () => {
    try {
      await Tone.start();
      const testSynth = createAnomyInstrument(growTargetId, stats, effects);
      testSynth.triggerAttackRelease('C4', '0.5');
      setTimeout(() => {
        try {
          testSynth.dispose();
        } catch (e) {
          console.warn('Error disposing test synth:', e);
        }
      }, 2000);
    } catch (e) {
      console.error(e);
      setStatus('音の再生に失敗しました');
    }
  };

  const handleReset = () => {
    const updated = {
      ...stats,
      [growTargetId]: { softness: 0, echo: 0, brightness: 0 },
    };
    onUpdateStats(updated);
    setStatus('能力をリセットしました');
  };

  return (
    <section id="growScreen" className={`screen ${active ? 'active' : ''}`}>
      <div id="growTargetSelector">
        {ANOMY_SLOTS.map(anomy => (
          <button
            key={anomy.id}
            className={`target-btn ${growTargetId === anomy.id ? 'active' : ''}`}
            onClick={() => setGrowTargetId(anomy.id)}
          >
            {anomy.name}を育てる
          </button>
        ))}
      </div>

      <div id="growStage">
        <div
          id="growAnomy"
          className={`grow-room-sprite ${isJumping ? 'jump' : ''}`}
          role="img"
          aria-label={currentTarget.name}
        />
        <img
          className="food-icon"
          src={assetPath('images/food.png')}
          alt="やわらか餌"
          data-stat="softness"
          title="やわらか餌 (+10)"
          onClick={() => handleFeed('softness')}
        />
        <img
          className="food-icon"
          src={assetPath('images/food2.png')}
          alt="ひびき餌"
          data-stat="echo"
          title="ひびき餌 (+10)"
          onClick={() => handleFeed('echo')}
        />
        <img
          className="food-icon"
          src={assetPath('images/food3.png')}
          alt="あかるさ餌"
          data-stat="brightness"
          title="あかるさ餌 (+10)"
          onClick={() => handleFeed('brightness')}
        />
      </div>

      <div id="statsPanel">
        <p>
          <strong id="currentTargetName">{currentTarget.name}</strong> の能力値
        </p>
        <p>
          softness：<span id="softnessValue">{currentStats.softness}</span>
        </p>
        <p>
          echo：<span id="echoValue">{currentStats.echo}</span>
        </p>
        <p>
          brightness：<span id="brightnessValue">{currentStats.brightness}</span>
        </p>

        <div id="growButtons">
          <button id="testSoundBtn" onClick={handleTestSound}>
            今の音を確認する(デバッグ)
          </button>
          <button id="resetStatsBtn" onClick={handleReset}>
            能力リセット
          </button>
        </div>
      </div>
    </section>
  );
};

import React, { useMemo, useRef, useState } from 'react';
import { AllAnomyStats, SongConfig, DraggedItemInfo, PlayableItem } from '../types';
import { ANOMY_SLOTS, NORMAL_INSTRUMENTS, findItemById } from '../constants';

interface PlayScreenProps {
  active: boolean;
  songs: SongConfig[];
  currentSong: SongConfig | null;
  onSelectSong: (song: SongConfig) => void;
  formation: Record<number, string | null>;
  setFormation: React.Dispatch<React.SetStateAction<Record<number, string | null>>>;
  stats: AllAnomyStats;
  setStatus: (status: string) => void;
  onStartPerformance: () => void;
}

export const PlayScreen: React.FC<PlayScreenProps> = ({
  active,
  songs,
  currentSong,
  onSelectSong,
  formation,
  setFormation,
  stats,
  setStatus,
  onStartPerformance,
}) => {
  const [tabFilter, setTabFilter] = useState<'all' | 'anomy' | 'instrument'>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const draggedItemRef = useRef<DraggedItemInfo | null>(null);

  const allItems: PlayableItem[] = useMemo(() => [...ANOMY_SLOTS, ...NORMAL_INSTRUMENTS], []);
  const allowedItems = useMemo(() => {
    if (!currentSong) return [];
    if (currentSong.availableInstruments?.length) {
      return currentSong.availableInstruments
        .map(findItemById)
        .filter((item): item is PlayableItem => Boolean(item));
    }
    const types = new Set(currentSong.tracks.map(track => track.slotType));
    return allItems.filter(item => types.has(item.type));
  }, [allItems, currentSong]);
  const trayItems = tabFilter === 'all'
    ? allowedItems
    : allowedItems.filter(item => item.type === tabFilter);
  const assignedCount = Object.values(formation).filter(Boolean).length;

  const assignItem = (targetIndex: number, dragged: DraggedItemInfo | null) => {
    const targetTrack = currentSong?.tracks[targetIndex];
    if (!targetTrack || !dragged) return;
    const item = findItemById(dragged.id);
    if (!item || item.type !== targetTrack.slotType || !allowedItems.some(candidate => candidate.id === item.id)) {
      setStatus('このパートには選べないメンバーです');
      return;
    }

    setFormation(previous => {
      const next = { ...previous };
      if (dragged.fromTrackIndex !== null && dragged.fromTrackIndex !== undefined) {
        next[dragged.fromTrackIndex] = null;
      }
      next[targetIndex] = dragged.id;
      return next;
    });
    setSelectedItemId(null);
    draggedItemRef.current = null;
    setStatus(`${targetTrack.name}に${item.name}を編成しました`);
  };

  const handleSlotClick = (index: number) => {
    if (selectedItemId) {
      assignItem(index, { id: selectedItemId, type: findItemById(selectedItemId)?.type ?? 'anomy', fromTrackIndex: null });
      return;
    }
    setFormation(previous => ({ ...previous, [index]: null }));
  };

  const handleSongChange = (songId: string) => {
    const song = songs.find(candidate => candidate.id === songId);
    if (!song) return;
    onSelectSong(song);
    setSelectedItemId(null);
    setStatus(`${song.title}を選びました`);
  };

  return (
    <section id="playScreen" className={`screen ${active ? 'active' : ''}`} aria-label="演奏の編成">
      <div className="arrange-header">
        <div>
          <span className="arrange-kicker">MUSIC SETUP</span>
          <h1>曲の編成</h1>
          <p>曲に合わせて、パートを担当するメンバーを選びます。</p>
        </div>
        <label className="song-picker">
          <span>演奏する曲</span>
          <select id="songSelect" value={currentSong?.id || ''} onChange={event => handleSongChange(event.target.value)}>
            {songs.map(song => <option key={song.id} value={song.id}>{song.title}</option>)}
          </select>
        </label>
      </div>

      {currentSong ? (
        <>
          <section className="score-board" aria-label={`${currentSong.title}のパート編成`}>
            <div className="score-heading">
              <div><span className="arrange-kicker">SCORE</span><h2>{currentSong.title}</h2></div>
              <span className="part-count">{currentSong.tracks.length} パート</span>
            </div>
            <div className="score-staff">
              {currentSong.tracks.map((track, index) => {
                const itemId = formation[index];
                const item = itemId ? findItemById(itemId) : null;
                return (
                  <div className="score-row" key={`${currentSong.id}-${index}`}>
                    <div className="score-part-label"><span className="clef-mark">𝄞</span><span>{track.name}<small>{track.slotType === 'anomy' ? 'アノミーパート' : '楽器パート'}</small></span></div>
                    <div
                      className={`score-assignment ${item ? 'has-member' : ''} ${selectedItemId ? 'can-assign' : ''}`}
                      role="button"
                      tabIndex={0}
                      draggable={Boolean(item)}
                      aria-label={`${track.name}の担当: ${item?.name ?? '未設定'}。${selectedItemId ? 'クリックして選択中のメンバーを配置' : 'クリックして担当を外す'}`}
                      onDragStart={() => {
                        if (item) draggedItemRef.current = { id: item.id, type: item.type, fromTrackIndex: index };
                      }}
                      onClick={() => handleSlotClick(index)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleSlotClick(index);
                        }
                      }}
                      onDragOver={event => event.preventDefault()}
                      onDrop={event => { event.preventDefault(); assignItem(index, draggedItemRef.current); }}
                    >
                      {item ? <><img src={item.icon} alt="" /><span>{item.name}<small>クリックで外す・ドラッグで移動</small></span></> : <><span className="empty-slot-mark">＋</span><span>担当を選ぶ<small>クリックまたはドラッグで配置</small></span></>}
                    </div>
                    <div className="score-notes" aria-hidden="true">♩　♪　♫　♩　♪　♬</div>
                  </div>
                );
              })}
            </div>
            <p className="score-note">この曲で選べるメンバー：{allowedItems.map(item => item.name).join('、') || 'なし'}</p>
          </section>

          <section className="member-picker" aria-label="編成メンバー">
            <div className="member-heading"><div><h2>メンバーを選ぶ</h2><p>{selectedItemId ? 'パートをクリックして配置します' : 'メンバーを選択するか、パートへドラッグします'}</p></div><span>{assignedCount}/{currentSong.tracks.length} 配置済み</span></div>
            <div className="member-tabs" role="group" aria-label="メンバーの絞り込み">
              {(['all', 'anomy', 'instrument'] as const).map(filter => <button type="button" key={filter} className={tabFilter === filter ? 'selected' : ''} onClick={() => setTabFilter(filter)} disabled={filter !== 'all' && !allowedItems.some(item => item.type === filter)}>{filter === 'all' ? 'すべて' : filter === 'anomy' ? 'アノミー' : '楽器'}</button>)}
            </div>
            <div className="member-grid">
              {trayItems.map(item => <button type="button" key={item.id} className={`member-card ${selectedItemId === item.id ? 'chosen' : ''}`} aria-pressed={selectedItemId === item.id} draggable onClick={() => setSelectedItemId(selectedItemId === item.id ? null : item.id)} onDragStart={() => { draggedItemRef.current = { id: item.id, type: item.type, fromTrackIndex: null }; }}>
                <img src={item.icon} alt="" /><span>{item.name}</span><small>{item.type === 'anomy' ? `やわらかさ ${stats[item.id]?.softness ?? 0} ・ ひびき ${stats[item.id]?.echo ?? 0}` : '演奏パートに配置'}</small>
              </button>)}
            </div>
          </section>

          <div className="arrange-footer"><span>編成は曲ごとに変わります</span><button type="button" className="start-performance" disabled={assignedCount === 0} onClick={onStartPerformance}>演奏をスタート <span aria-hidden="true">▶</span></button></div>
        </>
      ) : <p className="loading-song">曲を読み込み中…</p>}
    </section>
  );
};

export interface TrackConfig {
  name: string;
  defaultInstrument?: string;
  slotType: 'anomy' | 'instrument';
  spotImage: string;
  x: number;
  y: number;
}

export interface SongConfig {
  id: string;
  title: string;
  filename: string;
  bgm?: string;
  tracks: TrackConfig[];
  availableInstruments?: string[];
}

export interface MasterData {
  songs: SongConfig[];
}

export interface AnomySlot {
  id: string;
  name: string;
  type: 'anomy';
  icon: string;
  growImg: string;
}

export interface NormalInstrument {
  id: string;
  name: string;
  type: 'instrument';
  icon: string;
}

export type PlayableItem = AnomySlot | NormalInstrument;

export interface AnomyStats {
  softness: number;
  echo: number;
  brightness: number;
}

export type AllAnomyStats = Record<string, AnomyStats>;

export type AnomyEffectId = 'vibrato' | 'radio';
export type AllAnomyEffects = Record<string, AnomyEffectId | null>;

export interface DraggedItemInfo {
  id: string;
  type: 'anomy' | 'instrument';
  fromTrackIndex: number | null;
}

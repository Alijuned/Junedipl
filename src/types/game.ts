export type GamePhase =
  | 'menu'
  | 'intro'
  | 'playing'
  | 'collision'
  | 'gameover'
  | 'paused'
  | 'restarting';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export type LaneIndex = -1 | 0 | 1;

export type CollectiblePowerUpType =
  | 'fhe'
  | 'zero_mev'
  | 'encrypted_intents'
  | 'confidential_settlement';

export type PowerUpType = CollectiblePowerUpType | 'hoverboard';

export type CharacterSkinId = 'classic' | 'violet' | 'chrome' | 'gala';
export type HoverboardSkinId = 'mk1' | 'violet_pulse' | 'phantom' | 'prism';

export interface CharacterSkinDef {
  id: CharacterSkinId;
  name: string;
  subtitle: string;
  cost: number;
  suitColor: number;
  shirtColor: number;
  trimColor: number;
  glowColor: number;
  accentHex: string;
}

export interface HoverboardSkinDef {
  id: HoverboardSkinId;
  name: string;
  subtitle: string;
  cost: number;
  deckColor: number;
  railColor: number;
  glowColor: number;
  accentHex: string;
}

export type MissionCategory = 'daily' | 'tokens' | 'distance' | 'highscore';

export interface MissionDef {
  id: string;
  title: string;
  description: string;
  category: MissionCategory;
  target: number;
  rewardTokens: number;
  metric:
    | 'run_tokens'
    | 'total_tokens'
    | 'run_distance'
    | 'total_distance'
    | 'run_score'
    | 'powerups_used';
}

export interface MissionProgress {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number; // 0 to 1
  quality: GraphicsQuality;
}

export interface SaveData {
  bestScore: number;
  totalTokens: number;
  totalDistance: number;
  runsCompleted: number;
  unlockedCharacters: CharacterSkinId[];
  selectedCharacter: CharacterSkinId;
  unlockedBoards: HoverboardSkinId[];
  selectedBoard: HoverboardSkinId;
  dailyMissionDate: string;
  missions: Record<string, MissionProgress>;
  settings: GameSettings;
}

export interface ActivePowerUpHUD {
  type: PowerUpType;
  label: string;
  subtitle?: string;
  remaining: number;
  duration: number;
}

export interface PowerUpPickupBanner {
  id: number;
  type: CollectiblePowerUpType;
  title: string;
  subtitle: string;
  bonusText: string;
}

export interface IntroCaptionState {
  visible: boolean;
  speaker: string;
  text: string;
  sceneIndex: number;
}

export interface HudSnapshot {
  phase: GamePhase;
  score: number;
  bestScore: number;
  runTokens: number;
  totalTokens: number;
  distance: number;
  speedKmh: number;
  multiplier: number;
  hasShield: boolean;
  stealthActive: boolean;
  hoverboardActive: boolean;
  hoverboardCharge: number; // 0..100
  activePowerUps: ActivePowerUpHUD[];
  pickupBanner: PowerUpPickupBanner | null;
  introCaption: IntroCaptionState;
  isNewBest: boolean;
  chaseProximity: number; // 0 = far, 1 = right behind player
  bannerMessage: string | null;
}

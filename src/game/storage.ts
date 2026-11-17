import {
  CharacterSkinDef,
  CharacterSkinId,
  GraphicsQuality,
  HoverboardSkinDef,
  HoverboardSkinId,
  MissionDef,
  MissionProgress,
  SaveData,
} from '../types/game';

const STORAGE_KEY = 'fluton_run_save_v1';

export function detectDefaultGraphicsQuality(): GraphicsQuality {
  if (typeof navigator === 'undefined') return 'medium';
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;

  if (isMobile) {
    if (cores <= 4 || mem <= 3) return 'low';
    return 'medium';
  }
  if (cores <= 2) return 'low';
  if (cores <= 4) return 'medium';
  return 'high';
}

export const CHARACTER_SKINS: CharacterSkinDef[] = [
  {
    id: 'classic',
    name: 'Fluton Classic',
    subtitle: 'Official black tuxedo & violet aura',
    cost: 0,
    suitColor: 0x111116,
    shirtColor: 0xf8f8fc,
    trimColor: 0xffffff,
    glowColor: 0x9333ea,
    accentHex: '#9333ea',
  },
  {
    id: 'violet',
    name: 'Royal Violet',
    subtitle: 'Deep amethyst lapel & neon rim',
    cost: 150,
    suitColor: 0x1a102b,
    shirtColor: 0xf4f0ff,
    trimColor: 0xc084fc,
    glowColor: 0xa855f7,
    accentHex: '#a855f7',
  },
  {
    id: 'chrome',
    name: 'Midnight Silver',
    subtitle: 'Brushed platinum trim & crisp glow',
    cost: 350,
    suitColor: 0x141720,
    shirtColor: 0xffffff,
    trimColor: 0xe2e8f0,
    glowColor: 0x7c3aed,
    accentHex: '#c4b5fd',
  },
  {
    id: 'gala',
    name: 'Obsidian Gala',
    subtitle: 'Executive velvet & radiant violet halo',
    cost: 600,
    suitColor: 0x09090d,
    shirtColor: 0xfaf5ff,
    trimColor: 0xd8b4fe,
    glowColor: 0xc026d3,
    accentHex: '#d946ef',
  },
];

export const HOVERBOARD_SKINS: HoverboardSkinDef[] = [
  {
    id: 'mk1',
    name: 'Fluton Mk.I',
    subtitle: 'Signature black & violet mag-rail deck',
    cost: 0,
    deckColor: 0x12101a,
    railColor: 0x9333ea,
    glowColor: 0xa855f7,
    accentHex: '#9333ea',
  },
  {
    id: 'violet_pulse',
    name: 'Violet Pulse',
    subtitle: 'Overcharged plasma rails & bright core',
    cost: 120,
    deckColor: 0x1e1133,
    railColor: 0xc084fc,
    glowColor: 0xc084fc,
    accentHex: '#c084fc',
  },
  {
    id: 'phantom',
    name: 'Obsidian Phantom',
    subtitle: 'Stealth carbon weave with white trim',
    cost: 280,
    deckColor: 0x0b0b10,
    railColor: 0xffffff,
    glowColor: 0x7c3aed,
    accentHex: '#e2e8f0',
  },
  {
    id: 'prism',
    name: 'Syndicate Apex',
    subtitle: 'High-contrast pearl deck & magenta thrusters',
    cost: 500,
    deckColor: 0xf3f0ff,
    railColor: 0x7e22ce,
    glowColor: 0xd946ef,
    accentHex: '#d946ef',
  },
];

export const MISSIONS: MissionDef[] = [
  {
    id: 'daily_sprint',
    title: 'Daily Transit Dash',
    description: 'Run 450 meters in a single run',
    category: 'daily',
    target: 450,
    rewardTokens: 60,
    metric: 'run_distance',
  },
  {
    id: 'daily_collector',
    title: 'Daily Token Sweep',
    description: 'Collect 35 Fluton tokens in one run',
    category: 'daily',
    target: 35,
    rewardTokens: 50,
    metric: 'run_tokens',
  },
  {
    id: 'token_vault_1',
    title: 'Fluton Vault',
    description: 'Collect 150 total Fluton tokens',
    category: 'tokens',
    target: 150,
    rewardTokens: 100,
    metric: 'total_tokens',
  },
  {
    id: 'distance_marathon',
    title: 'Metropolitan Express',
    description: 'Cover 2,500 meters total distance',
    category: 'distance',
    target: 2500,
    rewardTokens: 140,
    metric: 'total_distance',
  },
  {
    id: 'score_challenger',
    title: 'Untouchable Cat',
    description: 'Reach a score of 5,000 in a single run',
    category: 'highscore',
    target: 5000,
    rewardTokens: 120,
    metric: 'run_score',
  },
  {
    id: 'powerup_specialist',
    title: 'Tech Savvy',
    description: 'Activate 8 power-ups across runs',
    category: 'daily',
    target: 8,
    rewardTokens: 75,
    metric: 'powerups_used',
  },
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function createInitialMissions(): Record<string, MissionProgress> {
  const result: Record<string, MissionProgress> = {};
  for (const m of MISSIONS) {
    result[m.id] = { progress: 0, completed: false, claimed: false };
  }
  return result;
}

export function getDefaultSaveData(): SaveData {
  return {
    bestScore: 0,
    totalTokens: 0,
    totalDistance: 0,
    runsCompleted: 0,
    unlockedCharacters: ['classic'],
    selectedCharacter: 'classic',
    unlockedBoards: ['mk1'],
    selectedBoard: 'mk1',
    dailyMissionDate: todayKey(),
    missions: createInitialMissions(),
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.75,
      quality: detectDefaultGraphicsQuality(),
    },
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSaveData();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const defaults = getDefaultSaveData();
    const today = todayKey();
    const missions: Record<string, MissionProgress> = { ...defaults.missions };

    if (parsed.missions) {
      for (const m of MISSIONS) {
        const savedM = parsed.missions[m.id];
        if (savedM) {
          if (m.category === 'daily' && parsed.dailyMissionDate !== today) {
            missions[m.id] = { progress: 0, completed: false, claimed: false };
          } else {
            missions[m.id] = { ...savedM };
          }
        }
      }
    }

    const savedQuality = parsed.settings?.quality;
    const quality: GraphicsQuality =
      savedQuality === 'low' || savedQuality === 'medium' || savedQuality === 'high'
        ? savedQuality
        : defaults.settings.quality;

    return {
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
      totalTokens: typeof parsed.totalTokens === 'number' ? parsed.totalTokens : 0,
      totalDistance: typeof parsed.totalDistance === 'number' ? parsed.totalDistance : 0,
      runsCompleted: typeof parsed.runsCompleted === 'number' ? parsed.runsCompleted : 0,
      unlockedCharacters:
        Array.isArray(parsed.unlockedCharacters) && parsed.unlockedCharacters.length > 0
          ? (parsed.unlockedCharacters as CharacterSkinId[])
          : ['classic'],
      selectedCharacter: parsed.selectedCharacter || 'classic',
      unlockedBoards:
        Array.isArray(parsed.unlockedBoards) && parsed.unlockedBoards.length > 0
          ? (parsed.unlockedBoards as HoverboardSkinId[])
          : ['mk1'],
      selectedBoard: parsed.selectedBoard || 'mk1',
      dailyMissionDate: today,
      missions,
      settings: {
        soundEnabled: parsed.settings?.soundEnabled ?? true,
        musicEnabled: parsed.settings?.musicEnabled ?? true,
        volume: typeof parsed.settings?.volume === 'number' ? parsed.settings.volume : 0.75,
        quality,
      },
    };
  } catch {
    return getDefaultSaveData();
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota issues gracefully
  }
}

export function applyRunToMissions(
  data: SaveData,
  runStats: {
    runScore: number;
    runTokens: number;
    runDistance: number;
    powerupsUsed: number;
  }
): SaveData {
  const nextMissions: Record<string, MissionProgress> = { ...data.missions };
  const nextTotalTokens = data.totalTokens + runStats.runTokens;
  const nextTotalDistance = data.totalDistance + runStats.runDistance;

  for (const m of MISSIONS) {
    const prev = nextMissions[m.id] || { progress: 0, completed: false, claimed: false };
    let val = prev.progress;
    if (m.metric === 'run_distance') val = Math.max(prev.progress, Math.floor(runStats.runDistance));
    else if (m.metric === 'run_tokens') val = Math.max(prev.progress, runStats.runTokens);
    else if (m.metric === 'run_score') val = Math.max(prev.progress, Math.floor(runStats.runScore));
    else if (m.metric === 'total_tokens') val = nextTotalTokens;
    else if (m.metric === 'total_distance') val = Math.floor(nextTotalDistance);
    else if (m.metric === 'powerups_used') val = prev.progress + runStats.powerupsUsed;

    const clamped = Math.min(m.target, val);
    nextMissions[m.id] = {
      progress: clamped,
      completed: prev.completed || clamped >= m.target,
      claimed: prev.claimed,
    };
  }

  return {
    ...data,
    bestScore: Math.max(data.bestScore, Math.floor(runStats.runScore)),
    totalTokens: nextTotalTokens,
    totalDistance: Math.floor(nextTotalDistance),
    runsCompleted: data.runsCompleted + 1,
    missions: nextMissions,
  };
}

import React from 'react';
import {
  Check,
  Lock,
  Play,
  RotateCcw,
  Settings,
  Trophy,
  Volume2,
  X,
} from 'lucide-react';
import {
  CharacterSkinId,
  GameSettings,
  HoverboardSkinId,
  HudSnapshot,
  SaveData,
} from '../types/game';
import { CHARACTER_SKINS, HOVERBOARD_SKINS, MISSIONS } from '../game/storage';
import { FlutonTokenIcon } from './FlutonTokenIcon';

/* ---------------- GARAGE MODAL (CHARACTERS & HOVERBOARDS) ---------------- */
interface GarageModalProps {
  tab: 'characters' | 'boards';
  saveData: SaveData;
  onChangeTab: (tab: 'characters' | 'boards') => void;
  onSelectOrBuyChar: (id: CharacterSkinId) => void;
  onSelectOrBuyBoard: (id: HoverboardSkinId) => void;
  onClose: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  tab,
  saveData,
  onChangeTab,
  onSelectOrBuyChar,
  onSelectOrBuyBoard,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0e0b1a] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              Fluton Loadout
            </h2>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1">
              <FlutonTokenIcon size={20} />
              <span className="font-mono-nums text-sm font-bold text-white">
                {saveData.totalTokens.toLocaleString()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="flex gap-2 mt-4 p-1 bg-white/5 rounded-xl">
          <button
            type="button"
            onClick={() => onChangeTab('characters')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              tab === 'characters'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Fluton Characters
          </button>
          <button
            type="button"
            onClick={() => onChangeTab('boards')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              tab === 'boards'
                ? 'bg-purple-600 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Hoverboards
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
          {tab === 'characters'
            ? CHARACTER_SKINS.map((skin) => {
                const unlocked = saveData.unlockedCharacters.includes(skin.id);
                const selected = saveData.selectedCharacter === skin.id;
                const canAfford = saveData.totalTokens >= skin.cost;

                return (
                  <div
                    key={skin.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                      selected
                        ? 'border-purple-400 bg-purple-950/35'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-display text-base font-bold text-white">
                          {skin.name}
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">{skin.subtitle}</div>
                      </div>
                      <span
                        className="w-5 h-5 rounded-full border border-white/40 shrink-0"
                        style={{ backgroundColor: skin.accentHex }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectOrBuyChar(skin.id)}
                      disabled={!unlocked && !canAfford}
                      className={`h-10 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                        selected
                          ? 'bg-purple-600 text-white'
                          : unlocked
                          ? 'bg-white text-black hover:bg-slate-200 cursor-pointer'
                          : canAfford
                          ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                          : 'bg-white/10 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {selected ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Equipped</span>
                        </>
                      ) : unlocked ? (
                        <span>Equip</span>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <FlutonTokenIcon size={16} />
                          <span className="font-mono-nums">{skin.cost}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            : HOVERBOARD_SKINS.map((board) => {
                const unlocked = saveData.unlockedBoards.includes(board.id);
                const selected = saveData.selectedBoard === board.id;
                const canAfford = saveData.totalTokens >= board.cost;

                return (
                  <div
                    key={board.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between gap-3 ${
                      selected
                        ? 'border-purple-400 bg-purple-950/35'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-display text-base font-bold text-white">
                          {board.name}
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">{board.subtitle}</div>
                      </div>
                      <span
                        className="w-5 h-5 rounded-full border border-white/40 shrink-0"
                        style={{ backgroundColor: board.accentHex }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectOrBuyBoard(board.id)}
                      disabled={!unlocked && !canAfford}
                      className={`h-10 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                        selected
                          ? 'bg-purple-600 text-white'
                          : unlocked
                          ? 'bg-white text-black hover:bg-slate-200 cursor-pointer'
                          : canAfford
                          ? 'bg-purple-600 hover:bg-purple-500 text-white cursor-pointer'
                          : 'bg-white/10 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {selected ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Equipped</span>
                        </>
                      ) : unlocked ? (
                        <span>Equip</span>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <FlutonTokenIcon size={16} />
                          <span className="font-mono-nums">{board.cost}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
};

/* ---------------- MISSIONS MODAL ---------------- */
interface MissionsModalProps {
  saveData: SaveData;
  onClaimMission: (missionId: string) => void;
  onClose: () => void;
}

export const MissionsModal: React.FC<MissionsModalProps> = ({
  saveData,
  onClaimMission,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-[#0e0b1a] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              Missions & Challenges
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Complete daily & career milestones to earn Fluton tokens
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3 overflow-y-auto pr-1">
          {MISSIONS.map((m) => {
            const p = saveData.missions[m.id] || { progress: 0, completed: false, claimed: false };
            const pct = Math.min(100, Math.round((p.progress / m.target) * 100));

            return (
              <div
                key={m.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-purple-300 font-semibold">
                    <span>{m.category === 'daily' ? 'Daily Mission' : 'Challenge'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-nums">
                      {p.progress.toLocaleString()} / {m.target.toLocaleString()}
                    </span>
                  </div>
                  <div className="font-display text-base font-bold text-white mt-0.5">
                    {m.title}
                  </div>
                  <div className="text-xs text-slate-300">{m.description}</div>
                  <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="shrink-0">
                  {p.claimed ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-slate-300 text-xs font-semibold">
                      <Check className="w-4 h-4 text-purple-300" />
                      <span>Claimed</span>
                    </span>
                  ) : p.completed ? (
                    <button
                      type="button"
                      onClick={() => onClaimMission(m.id)}
                      className="h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FlutonTokenIcon size={16} />
                      <span>Claim +{m.rewardTokens}</span>
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-xs font-mono-nums text-slate-200">
                      <FlutonTokenIcon size={16} />
                      <span>+{m.rewardTokens}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------------- SETTINGS MODAL ---------------- */
interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onClose: () => void;
}

const QUALITY_OPTIONS: { id: GameSettings['quality']; label: string; hint: string }[] = [
  { id: 'low', label: 'LOW', hint: 'Max FPS & battery' },
  { id: 'medium', label: 'MEDIUM', hint: 'Balanced HD' },
  { id: 'high', label: 'HIGH', hint: 'Full visuals' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-40 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0e0b1a] border border-white/15 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-purple-400" />
            <h2 className="font-display text-xl font-bold text-white">Graphics & Audio</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-white">Graphics Quality</div>
              <div className="text-xs text-purple-300 font-semibold">
                {QUALITY_OPTIONS.find((q) => q.id === settings.quality)?.hint}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
              {QUALITY_OPTIONS.map((opt) => {
                const active = settings.quality === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, quality: opt.id })}
                    className={`py-2 rounded-lg text-xs font-display font-bold tracking-wider transition-colors cursor-pointer ${
                      active
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Sound Effects</div>
              <div className="text-xs text-slate-300">Footsteps, whistle, barks, train horns</div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, soundEnabled: !settings.soundEnabled })
              }
              className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                settings.soundEnabled
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {settings.soundEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Background Music</div>
              <div className="text-xs text-slate-300">Dynamic Fluton synthwave chase beat</div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({ ...settings, musicEnabled: !settings.musicEnabled })
              }
              className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                settings.musicEnabled
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {settings.musicEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="pt-2">
            <div className="flex items-center justify-between text-sm font-semibold text-white mb-2">
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-300" />
                <span>Master Volume</span>
              </span>
              <span className="font-mono-nums text-purple-300">
                {Math.round(settings.volume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) =>
                onUpdateSettings({ ...settings, volume: parseFloat(e.target.value) })
              }
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full h-11 rounded-xl bg-white text-black font-semibold text-sm hover:bg-slate-200 transition-colors cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
};

/* ---------------- PAUSE MODAL ---------------- */
interface PauseModalProps {
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  hud,
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu,
}) => {
  return (
    <div className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0e0b1a] border border-white/15 rounded-2xl p-6 shadow-2xl text-center">
        <h2 className="font-display text-2xl font-bold text-white tracking-wide">
          PAUSED
        </h2>
        <p className="text-xs text-slate-300 mt-1 font-mono-nums">
          Score {hud.score.toLocaleString()} · {hud.runTokens} Tokens · {hud.distance}m
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="h-12 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-display text-base font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Resume Run</span>
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="h-11 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="h-11 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
            <span>Graphics & Audio</span>
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="h-11 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold cursor-pointer"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- GAME OVER MODAL ---------------- */
interface GameOverModalProps {
  hud: HudSnapshot;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  hud,
  onRestart,
  onMainMenu,
}) => {
  return (
    <div className="fixed inset-0 z-30 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0e0b1a] border border-purple-500/40 rounded-2xl p-6 shadow-2xl text-center">
        <div className="inline-flex items-center justify-center mb-3">
          <FlutonTokenIcon size={48} />
        </div>
        <h2 className="font-display text-3xl font-bold text-white tracking-wide">
          CAUGHT BY SECURITY
        </h2>
        <p className="text-xs text-purple-300 font-semibold mt-1">
          {hud.isNewBest ? 'NEW PERSONAL BEST!' : 'FLUTON RUN · SYDNEYSUNDOWN'}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2.5 bg-white/5 border border-white/10 rounded-xl p-3.5">
          <div>
            <div className="text-[11px] text-slate-300">Final Score</div>
            <div className="font-mono-nums text-lg font-bold text-white mt-0.5">
              {hud.score.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-300">Tokens</div>
            <div className="font-mono-nums text-lg font-bold text-purple-300 mt-0.5">
              +{hud.runTokens.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-300">Best Score</div>
            <div className="font-mono-nums text-lg font-bold text-white mt-0.5 flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-purple-400" />
              <span>{hud.bestScore.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-slate-300 font-mono-nums">
          Distance covered: {hud.distance}m · Total Vault: {hud.totalTokens.toLocaleString()} Tokens
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 h-12 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-display text-base font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(147,51,234,0.5)] cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Run Again</span>
          </button>
          <button
            type="button"
            onClick={onMainMenu}
            className="flex-1 h-12 rounded-xl bg-white text-black hover:bg-slate-200 font-semibold text-sm cursor-pointer"
          >
            Main Menu
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-white/10 text-[11px] text-slate-400 tracking-wider">
          POWERED BY FLUTON · CREATED BY SYDNEYSUNDOWN
        </div>
      </div>
    </div>
  );
};

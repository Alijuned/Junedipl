import React, { useState } from 'react';
import {
  Play,
  Settings,
  ShoppingBag,
  Target,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SaveData } from '../types/game';
import { FlutonTokenIcon } from './FlutonTokenIcon';
import { CHARACTER_SKINS, HOVERBOARD_SKINS, MISSIONS } from '../game/storage';

interface MainMenuProps {
  saveData: SaveData;
  onPlay: (withIntro: boolean) => void;
  onOpenGarage: (tab: 'characters' | 'boards') => void;
  onOpenMissions: () => void;
  onOpenSettings: () => void;
  onToggleSoundQuick: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  saveData,
  onPlay,
  onOpenGarage,
  onOpenMissions,
  onOpenSettings,
  onToggleSoundQuick,
}) => {
  const [mascotImgFailed, setMascotImgFailed] = useState(false);

  const selectedChar =
    CHARACTER_SKINS.find((c) => c.id === saveData.selectedCharacter) || CHARACTER_SKINS[0];
  const selectedBoard =
    HOVERBOARD_SKINS.find((b) => b.id === saveData.selectedBoard) || HOVERBOARD_SKINS[0];

  const claimableCount = MISSIONS.filter((m) => {
    const p = saveData.missions[m.id];
    return p && p.completed && !p.claimed;
  }).length;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar: Brand & Saved Totals */}
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-auto bg-[#0b0914]/90 border border-white/15 rounded-xl px-4 py-3 shadow-xl">
          <div className="flex items-center gap-3">
            <FlutonTokenIcon size={36} />
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-white leading-none">
                FLUTON RUN
              </h1>
              <p className="text-xs font-medium tracking-widest text-purple-300 mt-1">
                FLUTON × SYDNEYSUNDOWN
              </p>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2 sm:gap-3">
          <div className="bg-[#0b0914]/90 border border-white/15 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-purple-400 shrink-0" />
            <div className="text-right">
              <div className="text-[11px] text-slate-300 leading-none">Best Score</div>
              <div className="font-mono-nums text-sm sm:text-base font-bold text-white mt-0.5">
                {saveData.bestScore.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-[#0b0914]/90 border border-purple-500/40 rounded-xl px-3.5 py-2 flex items-center gap-2.5">
            <FlutonTokenIcon size={24} />
            <div className="text-right">
              <div className="text-[11px] text-purple-200 leading-none">Tokens</div>
              <div className="font-mono-nums text-sm sm:text-base font-bold text-white mt-0.5">
                {saveData.totalTokens.toLocaleString()}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleSoundQuick}
            aria-label="Toggle Sound"
            className="w-11 h-11 rounded-xl bg-[#0b0914]/90 border border-white/15 hover:border-purple-400 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            {saveData.settings.soundEnabled ? (
              <Volume2 className="w-5 h-5 text-purple-300" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="Open Settings"
            className="w-11 h-11 rounded-xl bg-[#0b0914]/90 border border-white/15 hover:border-purple-400 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Left Compact Official Mascot Card (Leaves center 3D scene open!) */}
      <div className="hidden md:flex items-center justify-start my-auto">
        <div className="pointer-events-auto w-60 bg-[#0b0914]/90 border border-white/15 rounded-2xl p-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-16 h-20 rounded-xl bg-white/95 border border-purple-400/50 overflow-hidden shrink-0 flex items-center justify-center">
              {!mascotImgFailed ? (
                <img
                  src="/assets/aistudio/IMG_20261113_222724_e3d6c511.png"
                  alt="Official Fluton Cat Mascot"
                  referrerPolicy="no-referrer"
                  onError={() => setMascotImgFailed(true)}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <FlutonTokenIcon size={36} />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs text-purple-300 font-semibold">Active Runner</div>
              <div className="font-display text-base font-bold text-white truncate">
                {selectedChar.name}
              </div>
              <div className="text-xs text-slate-300 mt-1 truncate">
                Board: {selectedBoard.name}
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 text-xs text-slate-300 leading-relaxed">
            Swipe or use Arrow keys to dodge gFluton trains, collect tokens, and outrun security.
          </div>
        </div>
      </div>

      {/* Bottom Action Dock */}
      <div className="flex flex-col items-center gap-3">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 bg-[#0b0914]/92 border border-white/15 rounded-2xl p-3 shadow-2xl">
          <button
            type="button"
            onClick={() => onOpenGarage('characters')}
            className="h-12 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-purple-300" />
            <span>Characters</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenGarage('boards')}
            className="h-12 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 text-purple-300" />
            <span>Hoverboards</span>
          </button>

          <button
            type="button"
            onClick={onOpenMissions}
            className="relative h-12 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Target className="w-4 h-4 text-purple-300" />
            <span>Missions</span>
            {claimableCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-mono-nums font-bold bg-purple-600 text-white rounded">
                {claimableCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onPlay(true)}
            className="h-12 px-7 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-display text-lg font-bold tracking-wide flex items-center gap-2.5 shadow-[0_0_24px_rgba(147,51,234,0.6)] transition-transform active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>PLAY</span>
          </button>
        </div>

        {/* Official Footer Branding */}
        <div className="bg-[#0b0914]/80 border border-white/10 rounded-lg px-3.5 py-1.5 text-[11px] sm:text-xs font-medium tracking-wider text-slate-200 flex items-center gap-2">
          <span>FLUTON RUN</span>
          <span aria-hidden="true">·</span>
          <span className="text-purple-300">POWERED BY FLUTON</span>
          <span aria-hidden="true">·</span>
          <span>CREATED BY SYDNEYSUNDOWN</span>
        </div>
      </div>
    </div>
  );
};

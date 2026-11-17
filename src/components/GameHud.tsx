import React from 'react';
import {
  EyeOff,
  Magnet,
  Pause,
  Rocket,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HudSnapshot, PowerUpType } from '../types/game';
import { FlutonTokenIcon } from './FlutonTokenIcon';

interface GameHudProps {
  hud: HudSnapshot;
  onPause: () => void;
  onActivateHoverboard: () => void;
  onSkipIntro: () => void;
}

function PowerUpIcon({ type }: { type: PowerUpType }) {
  if (type === 'fhe') return <ShieldCheck className="w-4 h-4 text-purple-300" />;
  if (type === 'zero_mev') return <Zap className="w-4 h-4 text-fuchsia-300" />;
  if (type === 'encrypted_intents') return <EyeOff className="w-4 h-4 text-violet-300" />;
  if (type === 'confidential_settlement') return <Magnet className="w-4 h-4 text-purple-300" />;
  return <Rocket className="w-4 h-4 text-purple-300" />;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  onPause,
  onActivateHoverboard,
  onSkipIntro,
}) => {
  if (hud.phase === 'intro') {
    return (
      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="bg-[#0b0914]/90 border border-white/15 rounded-xl px-4 py-2 text-xs font-display font-bold tracking-widest text-purple-300">
            OPENING CHASE · SCENE {hud.introCaption.sceneIndex}
          </div>
          <button
            type="button"
            onClick={onSkipIntro}
            className="pointer-events-auto h-11 px-4 rounded-xl bg-[#0b0914]/92 border border-white/20 hover:border-purple-400 text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            Skip Intro
          </button>
        </div>

        {hud.introCaption.visible && (
          <div className="mx-auto mb-6 max-w-xl w-full bg-[#0b0914]/92 border border-purple-500/40 rounded-2xl px-5 py-4 shadow-2xl">
            <div className="text-xs font-display font-bold tracking-wider text-purple-300">
              {hud.introCaption.speaker}
            </div>
            <div className="text-base sm:text-lg font-semibold text-white mt-1">
              {hud.introCaption.text}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-3 sm:p-5">
      {/* Top Bar: Score (Left) & Tokens + Pause (Right) */}
      <div className="flex items-start justify-between gap-3">
        {/* Score Cluster */}
        <div className="bg-[#0b0914]/90 border border-white/15 rounded-xl px-4 py-2.5 shadow-xl min-w-[165px]">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold tracking-wider text-purple-300">
              SCORE
            </span>
            {hud.stealthActive && (
              <span className="px-1.5 py-0.5 rounded bg-purple-700 text-white font-display text-[10px] font-bold tracking-wider">
                STEALTH
              </span>
            )}
          </div>
          <div className="font-mono-nums text-2xl sm:text-3xl font-bold text-white leading-tight">
            {hud.score.toLocaleString()}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300 font-mono-nums">
            <span>BEST {hud.bestScore.toLocaleString()}</span>
            <span aria-hidden="true">·</span>
            <span>{hud.distance}m</span>
          </div>
        </div>

        {/* Center Event Banner (Transient, non-blocking) */}
        {hud.bannerMessage && !hud.pickupBanner && (
          <div className="hidden sm:block bg-purple-700/95 border border-purple-300/40 rounded-xl px-5 py-2 text-sm font-display font-bold tracking-wider text-white shadow-xl">
            {hud.bannerMessage}
          </div>
        )}

        {/* Right Cluster: Tokens & Pause */}
        <div className="flex items-center gap-2.5">
          <div className="bg-[#0b0914]/90 border border-purple-500/40 rounded-xl px-3.5 py-2 flex items-center gap-2.5 shadow-xl">
            <FlutonTokenIcon size={28} />
            <div className="text-right">
              <div className="text-[11px] text-purple-200 leading-none">Tokens</div>
              <div className="font-mono-nums text-lg sm:text-xl font-bold text-white mt-0.5">
                {hud.runTokens.toLocaleString()}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause Game"
            className="pointer-events-auto w-12 h-12 rounded-xl bg-[#0b0914]/90 border border-white/15 hover:border-purple-400 flex items-center justify-center text-white transition-colors cursor-pointer shadow-xl"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center-Top Floating Power-Up Activation + "+10 FLUTON COINS" Reward Animation */}
      <div className="pointer-events-none fixed inset-x-0 top-20 sm:top-24 flex justify-center px-4">
        <AnimatePresence mode="wait">
          {hud.pickupBanner && (
            <motion.div
              key={hud.pickupBanner.id}
              initial={{ opacity: 0, y: 18, scale: 0.86 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 360, damping: 24 }}
              className="flex flex-col items-center text-center"
            >
              <div className="bg-[#0b0914]/94 border-2 border-purple-400 rounded-2xl px-6 py-3 shadow-[0_0_28px_rgba(168,85,247,0.55)]">
                <div className="flex items-center justify-center gap-2 text-lg sm:text-2xl font-display font-black tracking-wider text-white">
                  <PowerUpIcon type={hud.pickupBanner.type} />
                  <span>{hud.pickupBanner.title}</span>
                </div>
                <div className="text-xs sm:text-sm font-medium text-purple-200 mt-0.5">
                  {hud.pickupBanner.subtitle}
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.85 }}
                animate={{ opacity: 1, y: -2, scale: 1.04 }}
                transition={{ delay: 0.06, type: 'spring', stiffness: 420, damping: 20 }}
                className="mt-2 inline-flex items-center gap-2 bg-purple-600 border border-purple-200/70 rounded-xl px-4 py-1.5 shadow-xl"
              >
                <FlutonTokenIcon size={22} />
                <span className="font-display text-sm sm:text-base font-extrabold tracking-wider text-white">
                  {hud.pickupBanner.bonusText}
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Bar: Active Power-Up Timers & Hoverboard Trigger */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2 max-w-[260px] w-full">
          {hud.activePowerUps.map((pu) => {
            const pct = Math.max(0, Math.min(100, (pu.remaining / pu.duration) * 100));
            return (
              <div
                key={pu.type}
                className="bg-[#0b0914]/92 border border-purple-500/45 rounded-xl px-3 py-2 shadow-lg"
              >
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white">
                  <span className="flex items-center gap-1.5 truncate">
                    <PowerUpIcon type={pu.type} />
                    <span className="font-display tracking-wide truncate">{pu.label}</span>
                  </span>
                  <span className="font-mono-nums text-purple-200 shrink-0">
                    {pu.remaining.toFixed(1)}s
                  </span>
                </div>
                {pu.subtitle && (
                  <div className="text-[10px] text-purple-300/90 mt-0.5 truncate">
                    {pu.subtitle}
                  </div>
                )}
                <div className="mt-1.5 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-[width] duration-75"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Manual Hoverboard Button */}
        <div className="pointer-events-auto flex flex-col items-end gap-1.5">
          <button
            type="button"
            onClick={onActivateHoverboard}
            disabled={hud.hoverboardActive || hud.hoverboardCharge < 100}
            className={`h-12 px-4 rounded-xl border font-display text-sm font-bold tracking-wide flex items-center gap-2 transition-colors shadow-xl ${
              hud.hoverboardActive
                ? 'bg-purple-600 border-purple-300 text-white'
                : hud.hoverboardCharge >= 100
                ? 'bg-[#0b0914]/92 border-purple-400 hover:bg-purple-600 text-white cursor-pointer'
                : 'bg-[#0b0914]/80 border-white/15 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Zap className="w-4 h-4 text-purple-300" />
            <span>
              {hud.hoverboardActive
                ? 'Board Active'
                : hud.hoverboardCharge >= 100
                ? 'Hoverboard (H)'
                : `Charging ${hud.hoverboardCharge}%`}
            </span>
          </button>
          <div className="hidden sm:block text-[11px] text-white/80 bg-[#0b0914]/75 px-2.5 py-1 rounded-md border border-white/10">
            Arrows / Swipe: Move · Up / Space: Jump · Down: Slide · Double-Tap / H: Board
          </div>
        </div>
      </div>
    </div>
  );
};

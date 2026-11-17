/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { MainMenu } from './components/MainMenu';
import {
  GameOverModal,
  GarageModal,
  MissionsModal,
  PauseModal,
  SettingsModal,
} from './components/Modals';
import { audioEngine } from './game/audio';
import { FlutonEngine } from './game/FlutonEngine';
import {
  applyRunToMissions,
  CHARACTER_SKINS,
  HOVERBOARD_SKINS,
  loadSaveData,
  MISSIONS,
  persistSaveData,
} from './game/storage';
import {
  CharacterSkinId,
  GameSettings,
  HoverboardSkinId,
  HudSnapshot,
  SaveData,
} from './types/game';

const INITIAL_HUD: HudSnapshot = {
  phase: 'menu',
  score: 0,
  bestScore: 0,
  runTokens: 0,
  totalTokens: 0,
  distance: 0,
  speedKmh: 0,
  multiplier: 1,
  hasShield: false,
  stealthActive: false,
  hoverboardActive: false,
  hoverboardCharge: 100,
  activePowerUps: [],
  pickupBanner: null,
  introCaption: { visible: false, speaker: '', text: '', sceneIndex: 0 },
  isNewBest: false,
  chaseProximity: 0,
  bannerMessage: null,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FlutonEngine | null>(null);

  const [saveData, setSaveData] = useState<SaveData>(() => loadSaveData());
  const saveDataRef = useRef<SaveData>(saveData);
  saveDataRef.current = saveData;

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    ...INITIAL_HUD,
    bestScore: saveData.bestScore,
    totalTokens: saveData.totalTokens,
  }));

  const [garageTab, setGarageTab] = useState<'characters' | 'boards' | null>(null);
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSaveData((prev) => {
      const next = updater(prev);
      persistSaveData(next);
      saveDataRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    audioEngine.updateSettings(saveData.settings);
    engineRef.current?.setGraphicsQuality(saveData.settings.quality);
  }, [saveData.settings]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const initial = saveDataRef.current;
    audioEngine.updateSettings(initial.settings);

    const engine = new FlutonEngine(
      container,
      initial.bestScore,
      initial.totalTokens,
      initial.selectedCharacter,
      initial.selectedBoard,
      initial.settings.quality,
      (snapshot) => {
        setHud(snapshot);
      },
      (runStats) => {
        updateSave((prev) => {
          const updated = applyRunToMissions(prev, runStats);
          engine.updateSavedTotals(updated.bestScore, updated.totalTokens);
          return updated;
        });
      }
    );

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [updateSave]);

  const handlePlay = (withIntro: boolean) => {
    setGarageTab(null);
    setMissionsOpen(false);
    setSettingsOpen(false);
    engineRef.current?.startNewRun(withIntro);
  };

  const handleSelectOrBuyChar = (id: CharacterSkinId) => {
    const def = CHARACTER_SKINS.find((c) => c.id === id);
    if (!def) return;

    updateSave((prev) => {
      const unlocked = prev.unlockedCharacters.includes(id);
      if (unlocked) {
        engineRef.current?.applySkins(id, prev.selectedBoard);
        return { ...prev, selectedCharacter: id };
      }
      if (prev.totalTokens < def.cost) return prev;
      const nextTokens = prev.totalTokens - def.cost;
      engineRef.current?.applySkins(id, prev.selectedBoard);
      engineRef.current?.updateSavedTotals(prev.bestScore, nextTokens);
      return {
        ...prev,
        totalTokens: nextTokens,
        unlockedCharacters: [...prev.unlockedCharacters, id],
        selectedCharacter: id,
      };
    });
  };

  const handleSelectOrBuyBoard = (id: HoverboardSkinId) => {
    const def = HOVERBOARD_SKINS.find((b) => b.id === id);
    if (!def) return;

    updateSave((prev) => {
      const unlocked = prev.unlockedBoards.includes(id);
      if (unlocked) {
        engineRef.current?.applySkins(prev.selectedCharacter, id);
        return { ...prev, selectedBoard: id };
      }
      if (prev.totalTokens < def.cost) return prev;
      const nextTokens = prev.totalTokens - def.cost;
      engineRef.current?.applySkins(prev.selectedCharacter, id);
      engineRef.current?.updateSavedTotals(prev.bestScore, nextTokens);
      return {
        ...prev,
        totalTokens: nextTokens,
        unlockedBoards: [...prev.unlockedBoards, id],
        selectedBoard: id,
      };
    });
  };

  const handleClaimMission = (missionId: string) => {
    const def = MISSIONS.find((m) => m.id === missionId);
    if (!def) return;

    updateSave((prev) => {
      const m = prev.missions[missionId];
      if (!m || !m.completed || m.claimed) return prev;
      const nextTokens = prev.totalTokens + def.rewardTokens;
      engineRef.current?.updateSavedTotals(prev.bestScore, nextTokens);
      return {
        ...prev,
        totalTokens: nextTokens,
        missions: {
          ...prev.missions,
          [missionId]: { ...m, claimed: true },
        },
      };
    });
    audioEngine.playTokenCollect();
  };

  const handleUpdateSettings = (nextSettings: GameSettings) => {
    updateSave((prev) => ({ ...prev, settings: nextSettings }));
  };

  const handleToggleSoundQuick = () => {
    updateSave((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        soundEnabled: !prev.settings.soundEnabled,
      },
    }));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09080f]">
      {/* Dedicated WebGL 3D Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Main Menu */}
      {hud.phase === 'menu' && (
        <MainMenu
          saveData={saveData}
          onPlay={handlePlay}
          onOpenGarage={(tab) => setGarageTab(tab)}
          onOpenMissions={() => setMissionsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
          onToggleSoundQuick={handleToggleSoundQuick}
        />
      )}

      {/* Intro Cinematic & Active Gameplay HUD */}
      {(hud.phase === 'intro' || hud.phase === 'playing') && (
        <GameHud
          hud={hud}
          onPause={() => engineRef.current?.pauseGame()}
          onActivateHoverboard={() => engineRef.current?.activateManualHoverboard()}
          onSkipIntro={() => engineRef.current?.skipIntro()}
        />
      )}

      {/* Pause Modal */}
      {hud.phase === 'paused' && (
        <PauseModal
          hud={hud}
          onResume={() => engineRef.current?.resumeGame()}
          onRestart={() => engineRef.current?.startNewRun(false)}
          onOpenSettings={() => setSettingsOpen(true)}
          onMainMenu={() => engineRef.current?.returnToMenu()}
        />
      )}

      {/* Game Over Modal */}
      {hud.phase === 'gameover' && (
        <GameOverModal
          hud={hud}
          onRestart={() => engineRef.current?.startNewRun(false)}
          onMainMenu={() => engineRef.current?.returnToMenu()}
        />
      )}

      {/* Garage / Loadout Modal */}
      {garageTab && (
        <GarageModal
          tab={garageTab}
          saveData={saveData}
          onChangeTab={setGarageTab}
          onSelectOrBuyChar={handleSelectOrBuyChar}
          onSelectOrBuyBoard={handleSelectOrBuyBoard}
          onClose={() => setGarageTab(null)}
        />
      )}

      {/* Missions Modal */}
      {missionsOpen && (
        <MissionsModal
          saveData={saveData}
          onClaimMission={handleClaimMission}
          onClose={() => setMissionsOpen(false)}
        />
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsModal
          settings={saveData.settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

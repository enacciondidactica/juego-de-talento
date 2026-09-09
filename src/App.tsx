import React, { useState, useEffect, useCallback } from 'react';
import { BackgroundOrbs } from './components/common/BackgroundOrbs';
import { Header } from './components/common/Header';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { GameSelector } from './components/games/GameSelector';
import { MazeGame } from './components/games/MazeGame';
import { QuizGame } from './components/games/QuizGame';
import { RouletteGame } from './components/games/RouletteGame';
import { ChestsGame } from './components/games/ChestsGame';
import { MatchPairsGame } from './components/games/MatchPairsGame';
import { SwipeGame } from './components/games/SwipeGame';
import { SkillsCatcherGame } from './components/games/SkillsCatcherGame';
import { ResultScreen } from './components/result/ResultScreen';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { Participant, GameId, GameResult, AppConfig, QuizQuestion, SwipeCard } from './types';
import { DEFAULT_APP_CONFIG, DEFAULT_QUIZ_QUESTIONS, DEFAULT_MAZE_QUESTIONS, DEFAULT_SWIPE_CARDS, GAMES_CATALOG } from './lib/gameData';
import { sounds } from './lib/audio';

type Screen = 'register' | 'selector' | 'game' | 'result';

export default function App() {
  // Navigation & session state
  const [screen, setScreen] = useState<Screen>('register');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [activeGameId, setActiveGameId] = useState<GameId | null>(null);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);

  // App settings & sound
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(DEFAULT_QUIZ_QUESTIONS);
  const [mazeQuestions, setMazeQuestions] = useState<QuizQuestion[]>(DEFAULT_MAZE_QUESTIONS);
  const [swipeCards, setSwipeCards] = useState<SwipeCard[]>(DEFAULT_SWIPE_CARDS);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Admin state
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return sessionStorage.getItem('admin_token');
  });
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState<boolean>(false);

  // Load config on mount
  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        if (data.quizQuestions && data.quizQuestions.length > 0) {
          setQuizQuestions(data.quizQuestions);
        }
        if (data.mazeQuestions && data.mazeQuestions.length > 0) {
          setMazeQuestions(data.mazeQuestions);
        }
        if (data.swipeCards && data.swipeCards.length > 0) {
          setSwipeCards(data.swipeCards);
        }
      }
    } catch (e) {
      console.warn('Using default local configuration', e);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Sound toggle handler
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    sounds.setMuted(!nextState);
    if (nextState) sounds.playClick();
  };

  // Participant registration completion
  const handleRegisterComplete = (p: Participant) => {
    setParticipant(p);
    setScreen('selector');
  };

  // Game selection
  const handleSelectGame = (gameId: GameId) => {
    setActiveGameId(gameId);
    setScreen('game');
  };

  // Game completed by player -> submit to backend
  const handleGameFinish = async (
    won: boolean,
    score: number,
    durationSeconds: number,
    details?: any
  ) => {
    if (!participant || !activeGameId) return;

    const gameInfo = GAMES_CATALOG.find((g) => g.id === activeGameId);
    const gameName = gameInfo ? gameInfo.name : activeGameId;

    try {
      const res = await fetch('/api/submit-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: participant.phone,
          name: participant.name,
          gameId: activeGameId,
          gameName,
          won,
          score,
          durationSeconds,
          details,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setLastResult(data.result);
        if (data.config) setConfig(data.config);
      } else {
        // Fallback local result creation if network error
        const fallbackResult: GameResult = {
          id: `local_${Date.now()}`,
          participantId: participant.id,
          phone: participant.phone,
          name: participant.name,
          gameId: activeGameId,
          gameName,
          won,
          score,
          durationSeconds,
          hasPrize: won && config.prizesAvailable && config.prizesRemaining > 0,
          prizeDelivered: false,
          redeemCode: won ? `BS-${Math.floor(1000 + Math.random() * 9000)}` : undefined,
          createdAt: new Date().toISOString(),
          details,
        };
        setLastResult(fallbackResult);
      }
    } catch (err) {
      console.error('Error submitting game', err);
      // Fallback local result
      const fallbackResult: GameResult = {
        id: `local_${Date.now()}`,
        participantId: participant.id,
        phone: participant.phone,
        name: participant.name,
        gameId: activeGameId,
        gameName,
        won,
        score,
        durationSeconds,
        hasPrize: won && config.prizesAvailable && config.prizesRemaining > 0,
        prizeDelivered: false,
        redeemCode: won ? `BS-${Math.floor(1000 + Math.random() * 9000)}` : undefined,
        createdAt: new Date().toISOString(),
        details,
      };
      setLastResult(fallbackResult);
    }

    setScreen('result');
  };

  // Play another game with same participant
  const handlePlayAgain = () => {
    setActiveGameId(null);
    setLastResult(null);
    setScreen('selector');
  };

  // Reset for next participant
  const handleNewParticipant = () => {
    setParticipant(null);
    setActiveGameId(null);
    setLastResult(null);
    setScreen('register');
  };

  // Admin login handling
  const handleAdminLoginSuccess = (token: string) => {
    setAdminToken(token);
    sessionStorage.setItem('admin_token', token);
    setIsAdminModalOpen(false);
    setIsAdminDashboardOpen(true);
  };

  const handleAdminLogout = () => {
    setAdminToken(null);
    sessionStorage.removeItem('admin_token');
    setIsAdminDashboardOpen(false);
  };

  const handleOpenAdmin = () => {
    if (adminToken) {
      setIsAdminDashboardOpen(true);
    } else {
      setIsAdminModalOpen(true);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 font-sans flex flex-col justify-between overflow-x-hidden selection:bg-orange-500 selection:text-white">
      {/* Ambient background lighting */}
      <BackgroundOrbs />

      {/* Persistent App Header */}
      <Header
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenAdmin={handleOpenAdmin}
        participant={participant}
        onExitParticipant={screen !== 'register' ? handleNewParticipant : undefined}
      />

      {/* Main Dynamic View Router */}
      <main className={`flex-1 w-full mx-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4 flex flex-col justify-center items-center relative z-10 transition-all ${
        screen === 'game' ? 'max-w-[1400px]' : 'max-w-6xl'
      }`}>
        {/* Screen 1: Registration */}
        {screen === 'register' && (
          <RegisterScreen
            config={config}
            onRegister={handleRegisterComplete}
            onComplete={handleRegisterComplete}
          />
        )}

        {/* Screen 2: Game Selector */}
        {screen === 'selector' && participant && (
          <GameSelector
            participant={participant}
            activeGamesConfig={config.activeGames}
            onSelectGame={handleSelectGame}
            prizesRemaining={config.prizesRemaining}
          />
        )}

        {/* Screen 3: Active Minigame */}
        {screen === 'game' && activeGameId && (
          <>
            {activeGameId === 'maze' && (
              <MazeGame
                questions={mazeQuestions}
                onFinish={handleGameFinish}
                onBack={() => setScreen('selector')}
              />
            )}

            {activeGameId === 'quiz' && (
              <QuizGame
                questions={quizQuestions}
                requiredCorrect={config.quizRequiredCorrect || 5}
                onFinish={handleGameFinish}
                onBack={() => setScreen('selector')}
              />
            )}

            {activeGameId === 'roulette' && (
              <RouletteGame
                onFinish={handleGameFinish}
                onBack={() => setScreen('selector')}
              />
            )}

            {activeGameId === 'chests' && (
              <ChestsGame
                onFinish={handleGameFinish}
                onBack={() => setScreen('selector')}
              />
            )}

            {activeGameId === 'pairs' && (
              <MatchPairsGame
                onFinish={handleGameFinish}
                onBack={() => setScreen('selector')}
              />
            )}

            {activeGameId === 'swipe' && (
              <SwipeGame
                cards={swipeCards}
                onFinish={handleGameFinish}
                onBack={() => setScreen('selector')}
              />
            )}

            {activeGameId === 'catcher' && (
              <SkillsCatcherGame
                onFinish={handleGameFinish}
                onBack={() => setScreen('selector')}
              />
            )}
          </>
        )}

        {/* Screen 4: Results & Award Screen */}
        {screen === 'result' && lastResult && participant && (
          <ResultScreen
            result={lastResult}
            participant={participant}
            prizesAvailable={config.prizesAvailable}
            prizesRemaining={config.prizesRemaining}
            autoResetSeconds={25}
            onPlayAgain={handlePlayAgain}
            onNewParticipant={handleNewParticipant}
          />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="w-full py-3 text-center text-[11px] text-slate-500 relative z-10 border-t border-white/5 bg-slate-950/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>BancoSol • Atracción del Talento y Gestión Humana</span>
          <span>Desafío de Talento • Evento Presencial</span>
        </div>
      </footer>

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        onLoginSuccess={handleAdminLoginSuccess}
      />

      {/* Admin Dashboard Overlay */}
      {isAdminDashboardOpen && adminToken && (
        <AdminDashboard
          token={adminToken}
          onLogout={handleAdminLogout}
          onClose={() => setIsAdminDashboardOpen(false)}
        />
      )}
    </div>
  );
}

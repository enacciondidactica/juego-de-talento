import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Trophy, ArrowLeft, RotateCcw, Shield, Sparkles, Zap, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { sounds } from '../../lib/audio';

interface MazeGameProps {
  onFinish: (won: boolean, score: number, durationSeconds: number, details?: any) => void;
  onBack: () => void;
}

// 11x11 Maze Grid layout (1 = Wall, 0 = Path)
const MAZE_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

interface ItemPosition {
  id: string;
  x: number;
  y: number;
  name: string;
  icon: string;
  collected: boolean;
  isPowerup?: boolean;
  powerupType?: 'shield' | 'boost';
}

export const MazeGame: React.FC<MazeGameProps> = ({ onFinish, onBack }) => {
  const [timeLeft, setTimeLeft] = useState(65);
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [ghosts, setGhosts] = useState<{ id: number; x: number; y: number; name: string }[]>([
    { id: 1, x: 9, y: 7, name: 'Burnout' },
    { id: 2, x: 5, y: 9, name: 'Estrés' },
  ]);
  const [hasShield, setHasShield] = useState(false);
  const [isStunned, setIsStunned] = useState(false);
  const [items, setItems] = useState<ItemPosition[]>([
    { id: 'i1', x: 9, y: 1, name: 'Comunicación', icon: '💬', collected: false },
    { id: 'i2', x: 1, y: 9, name: 'Liderazgo', icon: '👑', collected: false },
    { id: 'i3', x: 5, y: 5, name: 'Innovación', icon: '💡', collected: false },
    { id: 'i4', x: 9, y: 9, name: 'Trabajo en Equipo', icon: '🤝', collected: false },
    { id: 'i5', x: 1, y: 5, name: 'Inteligencia Emocional', icon: '❤️', collected: false },
    { id: 'p1', x: 5, y: 1, name: 'Escudo Anti-Burnout', icon: '🛡️', collected: false, isPowerup: true, powerupType: 'shield' },
    { id: 'p2', x: 9, y: 3, name: 'Bonus Energía', icon: '⚡', collected: false, isPowerup: true, powerupType: 'boost' },
  ]);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover' | 'won'>('ready');
  const [score, setScore] = useState(0);
  const [lastNotification, setLastNotification] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const initialTime = 65;

  // Start game
  const handleStart = () => {
    sounds.playCountdown(true);
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  // Move player handler
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameState !== 'playing' || isStunned) return;

    setPlayerPos((prev) => {
      const nextX = prev.x + dx;
      const nextY = prev.y + dy;

      // Check wall bounds
      if (
        nextY >= 0 &&
        nextY < MAZE_GRID.length &&
        nextX >= 0 &&
        nextX < MAZE_GRID[0].length &&
        MAZE_GRID[nextY][nextX] === 0
      ) {
        sounds.playClick();
        return { x: nextX, y: nextY };
      }
      return prev;
    });
  }, [gameState, isStunned]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        movePlayer(0, -1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        movePlayer(0, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        movePlayer(-1, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        movePlayer(1, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, movePlayer]);

  // Touch Swipe navigation
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameState !== 'playing') return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const minDistance = 25;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minDistance) {
        movePlayer(dx > 0 ? 1 : -1, 0);
      }
    } else {
      if (Math.abs(dy) > minDistance) {
        movePlayer(0, dy > 0 ? 1 : -1);
      }
    }
    touchStartRef.current = null;
  };

  // Ghost AI Movement
  useEffect(() => {
    if (gameState !== 'playing') return;

    const ghostInterval = setInterval(() => {
      setGhosts((prevGhosts) =>
        prevGhosts.map((g) => {
          const possibleMoves = [
            { x: g.x + 1, y: g.y },
            { x: g.x - 1, y: g.y },
            { x: g.x, y: g.y + 1 },
            { x: g.x, y: g.y - 1 },
          ].filter(
            (pos) =>
              pos.y >= 0 &&
              pos.y < MAZE_GRID.length &&
              pos.x >= 0 &&
              pos.x < MAZE_GRID[0].length &&
              MAZE_GRID[pos.y][pos.x] === 0
          );

          if (possibleMoves.length === 0) return g;

          // 50% chance move towards player, 50% random
          let chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
          if (Math.random() > 0.45) {
            possibleMoves.sort((a, b) => {
              const distA = Math.hypot(a.x - playerPos.x, a.y - playerPos.y);
              const distB = Math.hypot(b.x - playerPos.x, b.y - playerPos.y);
              return distA - distB;
            });
            chosenMove = possibleMoves[0];
          }

          return { ...g, x: chosenMove.x, y: chosenMove.y };
        })
      );
    }, 650);

    return () => clearInterval(ghostInterval);
  }, [gameState, playerPos]);

  // Check Item Pickup and Ghost Collision
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Check item pickup
    setItems((prevItems) => {
      let scoreIncrement = 0;
      let newNotification: string | null = null;

      const nextItems = prevItems.map((item) => {
        if (!item.collected && item.x === playerPos.x && item.y === playerPos.y) {
          sounds.playStar();
          if (item.isPowerup) {
            if (item.powerupType === 'shield') {
              setHasShield(true);
              newNotification = '🛡️ ¡Escudo activado contra Burnout!';
              scoreIncrement += 15;
            } else {
              newNotification = '⚡ ¡Bonus de Energía (+30 pts)!';
              scoreIncrement += 30;
            }
          } else {
            scoreIncrement += 20;
            newNotification = `✨ ¡Habilidad recolectada: ${item.name}!`;
          }
          return { ...item, collected: true };
        }
        return item;
      });

      if (scoreIncrement > 0) {
        setScore((s) => s + scoreIncrement);
      }
      if (newNotification) {
        setLastNotification(newNotification);
        setTimeout(() => setLastNotification(null), 2500);
      }

      // Check win condition (all 5 core competencies collected)
      const coreRemaining = nextItems.filter((i) => !i.isPowerup && !i.collected);
      if (coreRemaining.length === 0) {
        setGameState('won');
        sounds.playVictory();
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        const finalScore = score + scoreIncrement + Math.max(10, timeLeft * 2);
        setTimeout(() => {
          onFinish(true, finalScore, elapsed, {
            competenciesCollected: 5,
            bonusPoints: timeLeft * 2,
            shieldUsed: hasShield,
          });
        }, 1800);
      }

      return nextItems;
    });

    // Check ghost collision
    const touchedGhost = ghosts.find((g) => g.x === playerPos.x && g.y === playerPos.y);
    if (touchedGhost) {
      if (hasShield) {
        setHasShield(false);
        sounds.playChestOpen();
        setLastNotification('🛡️ ¡Tu escudo absorbió el ataque de Burnout!');
        setTimeout(() => setLastNotification(null), 2500);
        // Teleport ghost back
        setGhosts((prev) =>
          prev.map((g) => (g.id === touchedGhost.id ? { ...g, x: 9, y: 9 } : g))
        );
      } else {
        // Stun and penalize
        sounds.playError();
        setIsStunned(true);
        setScore((s) => Math.max(0, s - 15));
        setLastNotification('⚠️ ¡El Burnout te alcanzó! (-15 pts y aturdido 1.5s)');
        setTimeout(() => setLastNotification(null), 2500);
        setTimeout(() => setIsStunned(false), 1500);
        // Reset player slightly
        setPlayerPos({ x: 1, y: 1 });
      }
    }
  }, [playerPos, ghosts, gameState, hasShield, score, timeLeft, onFinish]);

  // Game Timer Loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState('gameover');
          sounds.playError();
          const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
          setTimeout(() => {
            onFinish(false, score, elapsed, { reason: 'Tiempo agotado' });
          }, 1500);
          return 0;
        }
        if (prev <= 5) sounds.playCountdown(false);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, score, onFinish]);

  const coreCollectedCount = items.filter((i) => !i.isPowerup && i.collected).length;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 py-2 select-none">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 px-6 shadow-xl">
        <button
          onClick={() => {
            sounds.playClick();
            onBack();
          }}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Juegos</span>
        </button>

        {/* Timer */}
        <div className={`flex items-center gap-2 py-2 px-5 rounded-xl font-mono text-sm sm:text-base font-black border transition-all ${
          timeLeft <= 10
            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse ring-2 ring-rose-500/30'
            : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
        }`}>
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>{timeLeft}s</span>
        </div>

        {/* Score & Shield */}
        <div className="flex items-center gap-3">
          {hasShield && (
            <div className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs sm:text-sm font-bold animate-pulse">
              <Shield className="w-4 h-4" />
              <span>Escudo Activo</span>
            </div>
          )}
          <div className="flex items-center gap-2 py-1.5 px-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs sm:text-sm font-extrabold shadow-lg">
            <Trophy className="w-4 h-4" />
            <span>{score} pts</span>
          </div>
        </div>
      </div>

      {/* Main Game Card */}
      <div
        className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Banner notification */}
        {lastNotification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-2 bg-slate-900/95 border border-indigo-400/50 rounded-full text-xs sm:text-sm font-bold text-white shadow-2xl backdrop-blur-md animate-bounce">
            {lastNotification}
          </div>
        )}

        {/* Progress header */}
        <div className="w-full max-w-2xl flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-bold text-slate-300">Competencias:</span>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4].map((idx) => (
                <span
                  key={idx}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs ${
                    idx < coreCollectedCount ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30' : 'bg-white/10 text-slate-500'
                  }`}
                >
                  ✓
                </span>
              ))}
            </div>
          </div>
          <span className="text-xs sm:text-sm font-bold text-emerald-400">
            {coreCollectedCount}/5 recolectadas
          </span>
        </div>

        {/* Labyrinth Grid Container - Scaled for large screen visibility */}
        <div className="relative bg-slate-950/90 p-3 sm:p-5 rounded-3xl border-2 border-white/15 shadow-2xl">
          <div
            className="grid gap-1.5 sm:gap-2"
            style={{
              gridTemplateColumns: `repeat(${MAZE_GRID[0].length}, minmax(0, 1fr))`,
            }}
          >
            {MAZE_GRID.map((row, y) =>
              row.map((cell, x) => {
                const isWall = cell === 1;
                const isPlayer = playerPos.x === x && playerPos.y === y;
                const ghost = ghosts.find((g) => g.x === x && g.y === y);
                const item = items.find((i) => i.x === x && i.y === y && !i.collected);

                let cellContent = null;

                if (isPlayer) {
                  cellContent = (
                    <div className={`w-full h-full rounded-xl flex items-center justify-center text-lg sm:text-2xl font-bold shadow-xl transition-transform ${
                      isStunned ? 'bg-amber-500 animate-spin' : hasShield ? 'bg-emerald-400 ring-4 ring-emerald-300 shadow-emerald-500/50' : 'bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-blue-500/50'
                    }`}>
                      {hasShield ? '🛡️' : '💼'}
                    </div>
                  );
                } else if (ghost) {
                  cellContent = (
                    <div className="w-full h-full rounded-xl bg-rose-600/80 flex items-center justify-center text-lg sm:text-2xl animate-pulse shadow-lg shadow-rose-900/50">
                      👻
                    </div>
                  );
                } else if (item) {
                  cellContent = (
                    <div className={`w-full h-full rounded-xl flex items-center justify-center text-base sm:text-2xl ${
                      item.isPowerup ? 'bg-amber-400/30 animate-bounce' : 'bg-indigo-500/30 animate-pulse'
                    }`}>
                      {item.icon}
                    </div>
                  );
                }

                return (
                  <div
                    key={`${x}-${y}`}
                    className={`w-7 h-7 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors ${
                      isWall
                        ? 'bg-slate-800 border border-slate-700 shadow-inner'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {cellContent}
                  </div>
                );
              })
            )}
          </div>

          {/* Overlays for ready, win, gameover */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-30">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl mb-3 shadow-xl animate-pulse">
                🧭
              </div>
              <h4 className="text-lg font-black text-white mb-1">
                Laberinto del Talento Extendido
              </h4>
              <p className="text-xs text-slate-300 max-w-xs mb-4 leading-relaxed">
                Recorre el laberinto, recolecta las <strong>5 competencias clave</strong> y usa los escudos 🛡️ para protegerte de los fantasmas del Burnout en 65s.
              </p>
              <button
                onClick={handleStart}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-xl shadow-indigo-500/25 transition-all transform hover:scale-105"
              >
                Comenzar Reto (65s)
              </button>
            </div>
          )}

          {gameState === 'won' && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in">
              <Sparkles className="w-12 h-12 text-emerald-400 animate-spin mb-2" />
              <h4 className="text-xl font-black text-white mb-1">
                ¡Laberinto Superado con Éxito!
              </h4>
              <p className="text-xs text-emerald-200">
                Recolectaste todas las competencias a tiempo.
              </p>
            </div>
          )}

          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in">
              <span className="text-4xl mb-2">⏰</span>
              <h4 className="text-xl font-black text-white mb-1">
                ¡Tiempo Agotado!
              </h4>
              <p className="text-xs text-rose-200">
                El reloj llegó a cero antes de completar el laberinto.
              </p>
            </div>
          )}
        </div>

        {/* On-Screen D-Pad Controls for Mobile/Tablet */}
        <div className="w-full mt-4 flex flex-col items-center sm:hidden">
          <div className="flex gap-2 mb-1">
            <button
              onClick={() => movePlayer(0, -1)}
              className="w-12 h-12 rounded-xl bg-white/10 active:bg-indigo-500 text-white flex items-center justify-center text-lg border border-white/15 active:scale-95 transition-all"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => movePlayer(-1, 0)}
              className="w-12 h-12 rounded-xl bg-white/10 active:bg-indigo-500 text-white flex items-center justify-center text-lg border border-white/15 active:scale-95 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => movePlayer(0, 1)}
              className="w-12 h-12 rounded-xl bg-white/10 active:bg-indigo-500 text-white flex items-center justify-center text-lg border border-white/15 active:scale-95 transition-all"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <button
              onClick={() => movePlayer(1, 0)}
              className="w-12 h-12 rounded-xl bg-white/10 active:bg-indigo-500 text-white flex items-center justify-center text-lg border border-white/15 active:scale-95 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span>💼 Jugador</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>💬 Competencias (+20)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🛡️ Escudo</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <span>👻 Burnout (-15)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

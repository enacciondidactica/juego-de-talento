import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, ArrowLeft, Trophy, Sparkles, Zap, Magnet, ChevronLeft, ChevronRight } from 'lucide-react';
import { sounds } from '../../lib/audio';

interface SkillsCatcherGameProps {
  onFinish: (won: boolean, score: number, durationSeconds: number, details?: any) => void;
  onBack: () => void;
}

interface FallingItem {
  id: number;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  label: string;
  icon: string;
  isPositive: boolean;
  isPowerup?: boolean;
  powerupType?: 'magnet' | 'star';
  points: number;
  speed: number;
}

const POSITIVE_ITEMS = [
  { label: 'Empatía', icon: '❤️', points: 10 },
  { label: 'Innovación', icon: '💡', points: 15 },
  { label: 'Liderazgo', icon: '👑', points: 15 },
  { label: 'Puntualidad', icon: '⏰', points: 10 },
  { label: 'Proactividad', icon: '🚀', points: 15 },
  { label: 'Trabajo en Equipo', icon: '🤝', points: 10 },
  { label: 'Análisis de Datos', icon: '📊', points: 15 },
  { label: 'Ciberseguridad', icon: '🔒', points: 15 },
  { label: 'Escucha Activa', icon: '👂', points: 10 },
];

const SPECIAL_ITEMS = [
  { label: 'Estrella BancoSol', icon: '⭐', points: 25, isPowerup: true, powerupType: 'star' as const },
  { label: 'Imán de Talento', icon: '🧲', points: 20, isPowerup: true, powerupType: 'magnet' as const },
];

const NEGATIVE_ITEMS = [
  { label: 'Procrastinar', icon: '📱', points: -10 },
  { label: 'Chismes', icon: '🗣️', points: -10 },
  { label: 'Desorden', icon: '📦', points: -10 },
  { label: 'Apatía', icon: '😴', points: -10 },
  { label: 'Multitasking Tóxico', icon: '🤯', points: -15 },
];

export const SkillsCatcherGame: React.FC<SkillsCatcherGameProps> = ({
  onFinish,
  onBack,
}) => {
  const [basketX, setBasketX] = useState(50); // percentage 0-100
  const [items, setItems] = useState<FallingItem[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(55);
  const [hasMagnet, setHasMagnet] = useState(false);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'won' | 'gameover'>('ready');
  const [notification, setNotification] = useState<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const nextIdRef = useRef<number>(1);
  const targetScore = 120;
  const magnetTimeoutRef = useRef<any>(null);

  const handleStart = () => {
    sounds.playCountdown(true);
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  // Keyboard controls
  const moveBasket = useCallback((delta: number) => {
    setBasketX((prev) => Math.max(10, Math.min(90, prev + delta)));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        moveBasket(-7);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        moveBasket(7);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, moveBasket]);

  // Touch drag on game arena
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (gameState !== 'playing') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const pct = (touchX / rect.width) * 100;
    setBasketX(Math.max(10, Math.min(90, pct)));
  };

  // Timer loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const won = score >= targetScore;
          setGameState(won ? 'won' : 'gameover');

          if (won) sounds.playVictory();
          else sounds.playError();

          const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
          setTimeout(() => {
            onFinish(won, score, elapsed, { targetScore, finalScore: score });
          }, 1500);

          return 0;
        }
        if (prev <= 5) sounds.playCountdown(false);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, score, targetScore, onFinish]);

  // Item Spawning loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Spawn an item every 800ms
    const spawner = setInterval(() => {
      const isSpecial = Math.random() < 0.15;
      const isPositive = isSpecial ? true : Math.random() < 0.7;

      let itemDef: any;
      if (isSpecial) {
        itemDef = SPECIAL_ITEMS[Math.floor(Math.random() * SPECIAL_ITEMS.length)];
      } else if (isPositive) {
        itemDef = POSITIVE_ITEMS[Math.floor(Math.random() * POSITIVE_ITEMS.length)];
      } else {
        itemDef = NEGATIVE_ITEMS[Math.floor(Math.random() * NEGATIVE_ITEMS.length)];
      }

      const newItem: FallingItem = {
        id: nextIdRef.current++,
        x: Math.random() * 80 + 10,
        y: 0,
        label: itemDef.label,
        icon: itemDef.icon,
        isPositive,
        isPowerup: itemDef.isPowerup,
        powerupType: itemDef.powerupType,
        points: itemDef.points,
        speed: Math.random() * 0.8 + 1.2,
      };

      setItems((prev) => [...prev, newItem]);
    }, 850);

    return () => clearInterval(spawner);
  }, [gameState]);

  // Item Falling & Collision physics
  useEffect(() => {
    if (gameState !== 'playing') return;

    const frame = setInterval(() => {
      setItems((prevItems) => {
        const nextItems: FallingItem[] = [];

        for (const item of prevItems) {
          // Magnet attraction effect
          let nextX = item.x;
          if (hasMagnet && item.isPositive && item.y > 20) {
            const diff = basketX - item.x;
            nextX += Math.sign(diff) * Math.min(2.5, Math.abs(diff));
          }

          const nextY = item.y + item.speed;

          // Check Catch (basket is around y=85 to 95, x radius ~15%)
          if (nextY >= 82 && nextY <= 92 && Math.abs(nextX - basketX) < 14) {
            // CAUGHT!
            if (item.isPositive) {
              sounds.playStar();
              if (item.powerupType === 'magnet') {
                setHasMagnet(true);
                setNotification('🧲 ¡Imán de Talento Activado (6s)!');
                if (magnetTimeoutRef.current) clearTimeout(magnetTimeoutRef.current);
                magnetTimeoutRef.current = setTimeout(() => {
                  setHasMagnet(false);
                  setNotification(null);
                }, 6000);
              } else if (item.powerupType === 'star') {
                setNotification('⭐ ¡Super Estrella BancoSol (+25 pts)!');
                setTimeout(() => setNotification(null), 2000);
              }
              setScore((s) => s + item.points);
            } else {
              sounds.playError();
              setNotification(`⚠️ Atrapaste: ${item.label} (${item.points} pts)`);
              setTimeout(() => setNotification(null), 2000);
              setScore((s) => Math.max(0, s + item.points));
            }
            continue; // item consumed
          }

          // Keep in bounds if not off-screen
          if (nextY < 100) {
            nextItems.push({ ...item, x: nextX, y: nextY });
          }
        }

        return nextItems;
      });
    }, 50);

    return () => clearInterval(frame);
  }, [gameState, basketX, hasMagnet]);

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
            : 'bg-violet-500/20 text-violet-300 border-violet-500/30'
        }`}>
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>{timeLeft}s</span>
        </div>

        {/* Magnet & Score */}
        <div className="flex items-center gap-3">
          {hasMagnet && (
            <div className="flex items-center gap-1.5 py-1.5 px-3 bg-yellow-500/20 border border-yellow-500/40 rounded-xl text-yellow-300 text-xs sm:text-sm font-bold animate-pulse">
              <Magnet className="w-4 h-4" />
              <span>Imán Activo</span>
            </div>
          )}
          <div className="flex items-center gap-2 py-1.5 px-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs sm:text-sm font-extrabold shadow-lg">
            <Trophy className="w-4 h-4" />
            <span>{score}/{targetScore} pts</span>
          </div>
        </div>
      </div>

      {/* Main Game Stage */}
      <div
        className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center shadow-2xl relative overflow-hidden h-[540px]"
        onTouchMove={handleTouchMove}
      >
        {/* Banner notification */}
        {notification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-2 bg-slate-900/95 border border-violet-400/50 rounded-full text-xs sm:text-sm font-bold text-white shadow-2xl backdrop-blur-md animate-bounce">
            {notification}
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full flex items-center justify-between text-xs sm:text-sm text-slate-200 mb-2 px-2 z-10 font-bold">
          <span>Meta: {targetScore} pts</span>
          <span className="text-violet-300">Progreso: {Math.min(100, Math.round((score / targetScore) * 100))}%</span>
        </div>
        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-6 z-10">
          <div
            className="h-full bg-gradient-to-r from-violet-500 via-indigo-400 to-cyan-400 transition-all duration-300 shadow-md"
            style={{ width: `${Math.min(100, (score / targetScore) * 100)}%` }}
          />
        </div>

        {/* Arena falling items container */}
        <div className="relative w-full flex-1 bg-slate-950/80 border-2 border-white/15 rounded-3xl overflow-hidden shadow-2xl">
          {/* Falling items */}
          {items.map((item) => (
            <div
              key={item.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 py-1.5 px-3.5 rounded-2xl text-sm sm:text-base font-black shadow-xl transition-transform pointer-events-none ${
                item.isPowerup
                  ? 'bg-amber-400 text-slate-950 ring-4 ring-white animate-bounce'
                  : item.isPositive
                  ? 'bg-emerald-500/90 text-white border border-emerald-300/40 shadow-emerald-500/30'
                  : 'bg-rose-500/90 text-white border border-rose-300/40 shadow-rose-500/30'
              }`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
              }}
            >
              <span className="text-lg sm:text-2xl">{item.icon}</span>
              <span className="text-xs sm:text-sm font-bold tracking-tight">{item.label}</span>
            </div>
          ))}

          {/* Player Catcher Basket */}
          <div
            className={`absolute bottom-4 -translate-x-1/2 h-12 sm:h-14 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-2xl transition-all ${
              hasMagnet
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black ring-4 ring-yellow-300 animate-pulse shadow-yellow-500/50'
                : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-extrabold border-2 border-violet-300/50 shadow-violet-500/40'
            }`}
            style={{
              left: `${basketX}%`,
            }}
          >
            <span className="text-xl sm:text-2xl">{hasMagnet ? '🧲' : '💼'}</span>
            <span className="text-xs sm:text-sm uppercase tracking-wider font-black">BancoSol Talento</span>
          </div>

          {/* Ready Overlay */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-30">
              <div className="w-16 h-16 rounded-3xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-3xl mb-4 shadow-xl animate-pulse">
                🎯
              </div>
              <h4 className="text-2xl sm:text-3xl font-black text-white mb-3">
                Colector de Habilidades (55s)
              </h4>
              <p className="text-sm sm:text-base text-slate-200 max-w-md mb-8 leading-relaxed">
                Mueve el maletín con flechas o deslizando en pantalla. Atrapa competencias (+10/+15), estrellas ⭐ (+25) e imanes 🧲 para alcanzar la meta de <strong>{targetScore} puntos</strong>.
              </p>
              <button
                onClick={handleStart}
                className="py-4 px-10 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 text-white font-black text-sm tracking-wider uppercase shadow-2xl shadow-violet-500/30 transition-all transform hover:scale-105 cursor-pointer"
              >
                Iniciar Arcade (55s)
              </button>
            </div>
          )}

          {/* Won Overlay */}
          {gameState === 'won' && (
            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center z-30 animate-in fade-in">
              <Sparkles className="w-16 h-16 text-emerald-400 animate-spin mb-3" />
              <h4 className="text-2xl sm:text-3xl font-black text-white mb-2">
                ¡Meta de Habilidades Superada!
              </h4>
              <p className="text-sm sm:text-base text-emerald-200 font-medium">
                Puntaje final: <strong>{score} puntos</strong> obtenidos.
              </p>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in">
              <span className="text-4xl mb-2">⏰</span>
              <h4 className="text-xl font-black text-white mb-1">
                ¡Fin de la Jornada!
              </h4>
              <p className="text-xs text-rose-200">
                Obtuviste {score} de los {targetScore} puntos requeridos.
              </p>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="w-full flex items-center justify-between mt-3 px-2 sm:hidden">
          <button
            onClick={() => moveBasket(-15)}
            className="flex-1 py-3 bg-white/10 active:bg-violet-600 text-white rounded-xl font-bold text-xs mr-2 flex items-center justify-center gap-1 border border-white/15"
          >
            <ChevronLeft className="w-4 h-4" /> Izquierda
          </button>
          <button
            onClick={() => moveBasket(15)}
            className="flex-1 py-3 bg-white/10 active:bg-violet-600 text-white rounded-xl font-bold text-xs ml-2 flex items-center justify-center gap-1 border border-white/15"
          >
            Derecha <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

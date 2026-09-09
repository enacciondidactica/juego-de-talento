import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, ArrowLeft, Trophy, Sparkles, Magnet, ChevronLeft, ChevronRight } from 'lucide-react';
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
  powerupType?: 'magnet' | 'star' | 'boost';
  points: number;
  speed: number;
}

// BancoSol Mission, Vision, Centro Digital & Core Competencies
const POSITIVE_ITEMS = [
  { label: 'Centro Digital', icon: '💻', points: 15 },
  { label: 'Inclusión Financiera', icon: '🌱', points: 20 },
  { label: 'SolNet & App', icon: '📱', points: 15 },
  { label: 'Impacto Social', icon: '🤝', points: 15 },
  { label: 'Cultura de Innovación', icon: '💡', points: 15 },
  { label: 'SolPagos QR', icon: '⚡', points: 15 },
  { label: 'Microfinanzas', icon: '🏛️', points: 15 },
  { label: 'Ciberseguridad', icon: '🔒', points: 15 },
  { label: 'Empatía con Clientes', icon: '❤️', points: 15 },
  { label: 'Sostenibilidad ESG', icon: '🌍', points: 15 },
  { label: 'Liderazgo Ágil', icon: '👑', points: 15 },
];

const SPECIAL_ITEMS = [
  { label: 'Estrella BancoSol', icon: '⭐', points: 30, isPowerup: true, powerupType: 'star' as const },
  { label: 'Imán de Talento Digital', icon: '🧲', points: 20, isPowerup: true, powerupType: 'magnet' as const },
  { label: 'Rayo Centro Digital', icon: '⚡', points: 25, isPowerup: true, powerupType: 'boost' as const },
];

// Anti-values / concepts against BancoSol vision
const NEGATIVE_ITEMS = [
  { label: 'Exclusión Financiera', icon: '🚫', points: -15 },
  { label: 'Burocracia Lenta', icon: '⏳', points: -15 },
  { label: 'Resistencia al Cambio', icon: '🛑', points: -15 },
  { label: 'Phishing / Fraude', icon: '🪤', points: -20 },
  { label: 'Atención Indiferente', icon: '💤', points: -15 },
  { label: 'Fuga de Datos', icon: '⚠️', points: -20 },
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
  const targetScore = 140;
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

  // Faster, denser item Spawning loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Spawn an item every 550ms for higher screen density and dynamic pace
    const spawner = setInterval(() => {
      const isSpecial = Math.random() < 0.18;
      const isPositive = isSpecial ? true : Math.random() < 0.72;

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
        speed: Math.random() * 0.9 + 1.3,
      };

      setItems((prev) => [...prev, newItem]);
    }, 550);

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
          if (hasMagnet && item.isPositive && item.y > 15) {
            const diff = basketX - item.x;
            nextX += Math.sign(diff) * Math.min(2.8, Math.abs(diff));
          }

          const nextY = item.y + item.speed;

          // Check Catch (basket is around y=82 to 92, x radius ~14%)
          if (nextY >= 82 && nextY <= 92 && Math.abs(nextX - basketX) < 14) {
            // CAUGHT!
            if (item.isPositive) {
              sounds.playStar();
              if (item.powerupType === 'magnet') {
                setHasMagnet(true);
                setNotification('🧲 ¡Imán de Talento Digital Activado (6s)!');
                if (magnetTimeoutRef.current) clearTimeout(magnetTimeoutRef.current);
                magnetTimeoutRef.current = setTimeout(() => {
                  setHasMagnet(false);
                  setNotification(null);
                }, 6000);
              } else if (item.powerupType === 'star') {
                setNotification('⭐ ¡Super Estrella BancoSol (+30 pts)!');
                setTimeout(() => setNotification(null), 2000);
              } else if (item.powerupType === 'boost') {
                setTimeLeft((t) => t + 5);
                setNotification('⚡ ¡Rayo Centro Digital (+5s y +25 pts)!');
                setTimeout(() => setNotification(null), 2000);
              }
              setScore((s) => s + item.points);
            } else {
              sounds.playError();
              setNotification(`⚠️ Penalización: ${item.label} (${item.points} pts)`);
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
      <div className="w-full flex items-center justify-between bg-[#0e0b16] border border-[#60309B]/40 rounded-2xl p-3 px-4 sm:px-6 shadow-xl">
        <button
          onClick={() => {
            sounds.playClick();
            onBack();
          }}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Juegos</span>
        </button>

        {/* Timer */}
        <div className={`flex items-center gap-2 py-1.5 px-4 rounded-xl font-mono text-sm sm:text-base font-black border transition-all ${
          timeLeft <= 10
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse ring-2 ring-rose-500/30'
            : 'bg-[#60309B]/25 text-white border-[#60309B]/40'
        }`}>
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF7D00]" />
          <span>{timeLeft}s</span>
        </div>

        {/* Magnet & Score */}
        <div className="flex items-center gap-2 sm:gap-3">
          {hasMagnet && (
            <div className="flex items-center gap-1.5 py-1.5 px-3 bg-[#FF7D00]/20 border border-[#FF7D00]/40 rounded-xl text-[#FF7D00] text-xs sm:text-sm font-bold animate-pulse">
              <Magnet className="w-4 h-4" />
              <span className="hidden sm:inline">Imán Activo</span>
            </div>
          )}
          <div className="flex items-center gap-2 py-1.5 px-3 sm:px-4 bg-[#FF7D00]/20 border border-[#FF7D00]/40 rounded-xl text-[#FF7D00] text-xs sm:text-sm font-black shadow-lg">
            <Trophy className="w-4 h-4" />
            <span>{score}/{targetScore} pts</span>
          </div>
        </div>
      </div>

      {/* Main Game Stage */}
      <div
        className="w-full bg-[#0a0710] border border-[#60309B]/30 rounded-3xl p-4 sm:p-7 flex flex-col items-center shadow-2xl relative overflow-hidden h-[540px]"
        onTouchMove={handleTouchMove}
      >
        {/* Banner notification */}
        {notification && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-5 py-2 bg-[#180e29] border border-[#FF7D00]/50 rounded-full text-xs sm:text-sm font-bold text-white shadow-2xl backdrop-blur-md animate-bounce">
            {notification}
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full flex items-center justify-between text-xs sm:text-sm text-slate-300 mb-2 px-2 z-10 font-bold">
          <span>Meta: <strong className="text-white">{targetScore} pts</strong></span>
          <span className="text-[#FF7D00]">Progreso: {Math.min(100, Math.round((score / targetScore) * 100))}%</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-4 z-10">
          <div
            className="h-full bg-gradient-to-r from-[#60309B] to-[#FF7D00] transition-all duration-300 shadow-md"
            style={{ width: `${Math.min(100, (score / targetScore) * 100)}%` }}
          />
        </div>

        {/* Arena falling items container */}
        <div className="relative w-full flex-1 bg-[#050308] border-2 border-[#60309B]/40 rounded-3xl overflow-hidden shadow-2xl">
          {/* Falling items */}
          {items.map((item) => (
            <div
              key={item.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 py-1 px-3 rounded-xl text-xs sm:text-sm font-bold shadow-xl transition-transform pointer-events-none whitespace-nowrap ${
                item.isPowerup
                  ? 'bg-[#FF7D00] text-slate-950 ring-2 ring-white font-black animate-bounce'
                  : item.isPositive
                  ? 'bg-[#60309B]/90 text-white border border-[#FF7D00]/40 shadow-lg'
                  : 'bg-rose-600/90 text-white border border-rose-400/40 shadow-rose-950/50'
              }`}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
              }}
            >
              <span className="text-sm sm:text-base">{item.icon}</span>
              <span className="tracking-tight">{item.label}</span>
            </div>
          ))}

          {/* Player Catcher Basket */}
          <div
            className={`absolute bottom-3 -translate-x-1/2 h-12 sm:h-13 px-5 rounded-2xl flex items-center justify-center gap-2.5 shadow-2xl transition-all ${
              hasMagnet
                ? 'bg-[#FF7D00] text-slate-950 font-black ring-4 ring-[#FF7D00]/50 animate-pulse'
                : 'bg-[#60309B] text-white font-black border-2 border-[#FF7D00]/50 shadow-[#60309B]/50'
            }`}
            style={{
              left: `${basketX}%`,
            }}
          >
            <span className="text-lg sm:text-xl">{hasMagnet ? '🧲' : '💼'}</span>
            <span className="text-xs uppercase tracking-wider font-black">Centro Digital</span>
          </div>

          {/* Ready Overlay */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 bg-[#07050d]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
              <div className="w-14 h-14 rounded-2xl bg-[#60309B]/40 border border-[#FF7D00]/40 flex items-center justify-center text-3xl mb-3 shadow-xl">
                🎯
              </div>
              <h4 className="text-2xl font-black text-white mb-2 tracking-tight">
                Imán del Talento BancoSol
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
                Mueve el maletín de <strong>Centro Digital</strong> para atrapar competencias BancoSol (+15 pts), estrellas ⭐ (+30 pts) e imanes 🧲. Esquiva las malas prácticas y alcanza <strong>{targetScore} puntos</strong> en 55s.
              </p>
              <button
                onClick={handleStart}
                className="py-3.5 px-9 rounded-xl bg-[#60309B] hover:bg-[#7239b5] text-white border border-[#FF7D00]/50 font-black text-xs tracking-wider uppercase shadow-xl shadow-[#60309B]/40 transition-all transform hover:scale-105 cursor-pointer"
              >
                Iniciar Reto (55s)
              </button>
            </div>
          )}

          {/* Won Overlay */}
          {gameState === 'won' && (
            <div className="absolute inset-0 bg-[#07050d]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fadeIn">
              <Sparkles className="w-14 h-14 text-[#FF7D00] animate-spin mb-3" />
              <h4 className="text-2xl font-black text-white mb-2">
                ¡Meta de Habilidades Superada!
              </h4>
              <p className="text-xs sm:text-sm text-slate-300">
                Alcanzaste <strong>{score} puntos</strong> demostrando alineación con la cultura BancoSol.
              </p>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-[#07050d]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 animate-fadeIn">
              <span className="text-4xl mb-2">⏰</span>
              <h4 className="text-2xl font-black text-white mb-1">
                ¡Fin del Tiempo!
              </h4>
              <p className="text-xs sm:text-sm text-slate-400">
                Obtuviste {score} de los {targetScore} puntos requeridos.
              </p>
            </div>
          )}
        </div>

        {/* Mobile controls */}
        <div className="w-full flex items-center justify-between mt-3 px-2 sm:hidden">
          <button
            onClick={() => moveBasket(-15)}
            className="flex-1 py-3 bg-[#60309B]/30 active:bg-[#60309B] text-white rounded-xl font-bold text-xs mr-2 flex items-center justify-center gap-1 border border-[#60309B]/50"
          >
            <ChevronLeft className="w-4 h-4" /> Izquierda
          </button>
          <button
            onClick={() => moveBasket(15)}
            className="flex-1 py-3 bg-[#60309B]/30 active:bg-[#60309B] text-white rounded-xl font-bold text-xs ml-2 flex items-center justify-center gap-1 border border-[#60309B]/50"
          >
            Derecha <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

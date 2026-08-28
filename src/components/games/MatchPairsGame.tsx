import React, { useState, useEffect, useRef } from 'react';
import { Clock, ArrowLeft, Sparkles, Trophy, Flame, HelpCircle } from 'lucide-react';
import { PairCard } from '../../types';
import { DEFAULT_PAIR_CARDS } from '../../lib/gameData';
import { sounds } from '../../lib/audio';

interface MatchPairsGameProps {
  cards?: PairCard[];
  onFinish: (won: boolean, score: number, durationSeconds: number, details?: any) => void;
  onBack: () => void;
}

interface ShuffledCard extends PairCard {
  uniqueId: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export const MatchPairsGame: React.FC<MatchPairsGameProps> = ({
  cards = DEFAULT_PAIR_CARDS,
  onFinish,
  onBack,
}) => {
  const [deck, setDeck] = useState<ShuffledCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<ShuffledCard[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover' | 'won'>('ready');
  const [matchedPairsCount, setMatchedPairsCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const totalPairsNeeded = cards.length / 2;

  // Shuffle deck on mount
  useEffect(() => {
    const prepared: ShuffledCard[] = cards.map((c, idx) => ({
      ...c,
      uniqueId: `${c.id}_${idx}_${Math.random()}`,
      isFlipped: false,
      isMatched: false,
    }));

    // Fisher-Yates shuffle
    for (let i = prepared.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [prepared[i], prepared[j]] = [prepared[j], prepared[i]];
    }

    setDeck(prepared);
  }, [cards]);

  const handleStart = () => {
    sounds.playCountdown(true);
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  // Timer
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
            onFinish(false, score, elapsed, { reason: 'Tiempo agotado', matchedPairsCount });
          }, 1500);
          return 0;
        }
        if (prev <= 5) sounds.playCountdown(false);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, onFinish, score, matchedPairsCount]);

  const handleCardClick = (card: ShuffledCard) => {
    if (gameState !== 'playing' || card.isFlipped || card.isMatched || selectedCards.length >= 2) {
      return;
    }

    sounds.playClick();

    // Flip this card
    const updatedDeck = deck.map((c) =>
      c.uniqueId === card.uniqueId ? { ...c, isFlipped: true } : c
    );
    setDeck(updatedDeck);

    const nextSelected = [...selectedCards, card];
    setSelectedCards(nextSelected);

    // If 2 cards flipped, check match
    if (nextSelected.length === 2) {
      setAttempts((a) => a + 1);
      const [first, second] = nextSelected;
      const isMatch = first.matchId === second.matchId;

      if (isMatch) {
        // MATCH!
        sounds.playStar();
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        const streakBonus = nextStreak * 5;
        setScore((s) => s + 25 + streakBonus);

        setTimeout(() => {
          setDeck((d) =>
            d.map((c) =>
              c.matchId === first.matchId ? { ...c, isMatched: true } : c
            )
          );
          setSelectedCards([]);
          setMatchedPairsCount((count) => {
            const nextCount = count + 1;
            if (nextCount >= totalPairsNeeded) {
              // ALL MATCHED - WON
              setGameState('won');
              sounds.playVictory();
              const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
              const timeBonus = Math.max(10, timeLeft * 2);
              setTimeout(() => {
                onFinish(true, score + 25 + streakBonus + timeBonus, elapsed, {
                  pairsMatched: totalPairsNeeded,
                  attempts: attempts + 1,
                  timeBonus,
                });
              }, 1800);
            }
            return nextCount;
          });
        }, 500);
      } else {
        // NO MATCH
        sounds.playError();
        setStreak(0);
        setTimeout(() => {
          setDeck((d) =>
            d.map((c) =>
              c.uniqueId === first.uniqueId || c.uniqueId === second.uniqueId
                ? { ...c, isFlipped: false }
                : c
            )
          );
          setSelectedCards([]);
        }, 1100);
      }
    }
  };

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
            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
        }`}>
          <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>{timeLeft}s</span>
        </div>

        {/* Streak & Score */}
        <div className="flex items-center gap-3">
          {streak >= 2 && (
            <div className="flex items-center gap-1.5 py-1.5 px-3 bg-orange-500/20 border border-orange-500/40 rounded-xl text-orange-300 text-xs sm:text-sm font-bold animate-pulse">
              <Flame className="w-4 h-4" />
              <span>x{streak} Racha</span>
            </div>
          )}
          <div className="flex items-center gap-2 py-1.5 px-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs sm:text-sm font-extrabold shadow-lg">
            <Trophy className="w-4 h-4" />
            <span>{score} pts</span>
          </div>
        </div>
      </div>

      {/* Main Game Card */}
      <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 flex flex-col items-center shadow-2xl relative">
        {/* Progress Header */}
        <div className="w-full flex items-center justify-between mb-6 px-2">
          <span className="text-sm sm:text-base font-bold text-slate-200">
            Parejas Encontradas: <strong className="text-emerald-400 font-black">{matchedPairsCount}</strong> de {totalPairsNeeded}
          </span>
          <span className="text-xs sm:text-sm text-slate-300 font-semibold">
            Intentos Realizados: <strong>{attempts}</strong>
          </span>
        </div>

        {/* 12 Cards Grid - Larger cards for spectators */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3.5 sm:gap-5 w-full">
          {deck.map((card) => {
            const isRevealed = card.isFlipped || card.isMatched;

            return (
              <div
                key={card.uniqueId}
                id={`pair-card-${card.id}`}
                onClick={() => handleCardClick(card)}
                className={`h-28 sm:h-36 md:h-40 rounded-2xl cursor-pointer perspective-1000 transition-all duration-300 transform ${
                  card.isMatched
                    ? 'scale-95 opacity-85'
                    : 'hover:scale-[1.03] active:scale-95'
                }`}
              >
                <div
                  className={`w-full h-full rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-center text-center transition-all duration-500 border ${
                    isRevealed
                      ? card.isMatched
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/20'
                        : 'bg-indigo-600/50 border-indigo-400 text-white shadow-xl'
                      : 'bg-white/10 hover:bg-white/15 border-white/15 text-slate-400 hover:border-cyan-400/50 shadow-md'
                  }`}
                >
                  {isRevealed ? (
                    <div className="flex flex-col items-center justify-center gap-2 animate-in zoom-in-75">
                      <span className="text-3xl sm:text-4xl">{card.icon}</span>
                      <span className="text-xs sm:text-sm md:text-base font-bold leading-tight px-1 text-white">
                        {card.concept}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/10 flex items-center justify-center text-slate-300 font-black text-base sm:text-lg">
                        ?
                      </div>
                      <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 font-bold">
                        BancoSol
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ready overlay */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-2xl mb-3 shadow-xl animate-pulse">
              🧠
            </div>
            <h4 className="text-xl font-black text-white mb-2">
              Match de Competencias (6 Parejas)
            </h4>
            <p className="text-xs text-slate-300 max-w-md mb-6 leading-relaxed">
              Encuentra las asociaciones correctas entre conceptos y competencias clave de RRHH en <strong>60 segundos</strong>. ¡Rachas consecutivas otorgan puntos extra!
            </p>
            <button
              onClick={handleStart}
              className="py-3 px-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-extrabold text-xs tracking-wider uppercase shadow-xl shadow-cyan-500/25 transition-all transform hover:scale-105"
            >
              Iniciar Desafío (60s)
            </button>
          </div>
        )}

        {/* Won overlay */}
        {gameState === 'won' && (
          <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in">
            <Sparkles className="w-12 h-12 text-emerald-400 animate-spin mb-2" />
            <h4 className="text-xl font-black text-white mb-1">
              ¡Memoria y Conocimiento Impecables!
            </h4>
            <p className="text-xs text-emerald-200">
              Emparejaste todas las competencias a tiempo.
            </p>
          </div>
        )}

        {/* Game over overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-rose-950/90 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center p-6 text-center z-30 animate-in fade-in">
            <span className="text-4xl mb-2">⏰</span>
            <h4 className="text-xl font-black text-white mb-1">
              ¡Tiempo Agotado!
            </h4>
            <p className="text-xs text-rose-200">
              Completaste {matchedPairsCount} de {totalPairsNeeded} parejas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

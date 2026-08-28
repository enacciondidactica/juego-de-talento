import React, { useState, useRef } from 'react';
import { ArrowLeft, Sparkles, X, Check, ThumbsDown, ThumbsUp, Info, Trophy, Flame } from 'lucide-react';
import { SwipeCard } from '../../types';
import { DEFAULT_SWIPE_CARDS } from '../../lib/gameData';
import { sounds } from '../../lib/audio';

interface SwipeGameProps {
  cards?: SwipeCard[];
  onFinish: (won: boolean, score: number, durationSeconds: number, details?: any) => void;
  onBack: () => void;
}

export const SwipeGame: React.FC<SwipeGameProps> = ({
  cards = DEFAULT_SWIPE_CARDS,
  onFinish,
  onBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; text: string; topic: string } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const currentCard = cards[currentIndex];
  const requiredCorrect = Math.max(4, Math.ceil(cards.length * 0.7)); // e.g. 6 of 8

  const handleVote = (userChosenIsReal: boolean) => {
    if (isAnimating || !currentCard) return;

    setIsAnimating(true);
    const direction = userChosenIsReal ? 'right' : 'left';
    setSwipeDirection(direction);
    sounds.playSwipe();

    const isCorrect = userChosenIsReal === currentCard.isReal;
    let earnedPoints = 0;

    if (isCorrect) {
      sounds.playSuccess();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setCorrectCount((c) => c + 1);
      earnedPoints = 20 + nextStreak * 5;
      setScore((s) => s + earnedPoints);
    } else {
      sounds.playError();
      setStreak(0);
    }

    setFeedback({
      isCorrect,
      text: currentCard.feedback,
      topic: currentCard.topic,
    });

    setTimeout(() => {
      setFeedback(null);
      setSwipeDirection(null);
      setIsAnimating(false);

      if (currentIndex + 1 < cards.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        // Game Finished
        const finalCorrect = correctCount + (isCorrect ? 1 : 0);
        const won = finalCorrect >= requiredCorrect;
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);

        if (won) sounds.playVictory();
        else sounds.playError();

        onFinish(won, score + earnedPoints, elapsed, {
          totalCards: cards.length,
          correctDecisions: finalCorrect,
          required: requiredCorrect,
        });
      }
    }, 2000);
  };

  // Touch Swipe on Card
  const touchStartRef = useRef<{ x: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isAnimating) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    if (diffX > 50) {
      handleVote(true); // Swipe Right = Realidad
    } else if (diffX < -50) {
      handleVote(false); // Swipe Left = Mito
    }
    touchStartRef.current = null;
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
          disabled={isAnimating}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Juegos</span>
        </button>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-bold text-slate-300">
            Caso {currentIndex + 1} de {cards.length}
          </span>
          <span className="text-xs sm:text-sm font-bold py-1 px-3 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/30">
            {currentCard?.topic}
          </span>
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

      {/* Main Swipe Arena Card */}
      <div
        className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-12 flex flex-col items-center shadow-2xl relative min-h-[440px] justify-between overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Card Stack / Statement */}
        <div
          className={`w-full max-w-3xl bg-slate-900/95 border border-white/20 rounded-3xl p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-500 transform ${
            swipeDirection === 'left'
              ? '-translate-x-full rotate-[-18deg] opacity-0'
              : swipeDirection === 'right'
              ? 'translate-x-full rotate-[18deg] opacity-0'
              : 'translate-x-0 rotate-0 opacity-100'
          }`}
        >
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-3xl mb-6 border border-white/10 shadow-lg">
            🔥
          </div>

          <p className="text-xl sm:text-3xl font-black text-white leading-snug mb-6 tracking-tight">
            "{currentCard?.statement}"
          </p>

          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 py-1.5 px-4 rounded-full border border-amber-500/30">
            ¿Es un MITO de RRHH o una REALIDAD laboral?
          </span>
        </div>

        {/* Feedback Card Overlay */}
        {feedback && (
          <div className="absolute inset-x-6 inset-y-6 bg-slate-950/95 backdrop-blur-xl border-2 border-white/25 rounded-3xl p-8 flex flex-col items-center justify-center text-center z-20 animate-in zoom-in-95 shadow-2xl">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 text-3xl shadow-xl ${
              feedback.isCorrect
                ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                : 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
            }`}>
              {feedback.isCorrect ? '✓' : '✗'}
            </div>
            <h4 className={`text-xl sm:text-2xl font-black mb-3 ${
              feedback.isCorrect ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {feedback.isCorrect ? '¡Decisión Correcta!' : '¡Oops! Era lo contrario'}
            </h4>
            <p className="text-sm sm:text-base text-slate-100 leading-relaxed max-w-xl font-medium">
              {feedback.text}
            </p>
          </div>
        )}

        {/* Action Decision Buttons */}
        <div className="w-full max-w-2xl flex items-center justify-center gap-6 mt-8">
          {/* Mito (Left / False) */}
          <button
            id="swipe-btn-mito"
            onClick={() => handleVote(false)}
            disabled={isAnimating}
            className="flex-1 py-5 px-6 rounded-2xl bg-gradient-to-r from-rose-600/40 to-pink-600/40 hover:from-rose-600/60 hover:to-pink-600/60 border-2 border-rose-500/50 text-rose-200 font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl shadow-rose-900/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <ThumbsDown className="w-6 h-6 text-rose-400" />
            <span>ES MITO 👈</span>
          </button>

          {/* Realidad (Right / True) */}
          <button
            id="swipe-btn-realidad"
            onClick={() => handleVote(true)}
            disabled={isAnimating}
            className="flex-1 py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600/40 to-teal-600/40 hover:from-emerald-600/60 hover:to-teal-600/60 border-2 border-emerald-500/50 text-emerald-200 font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>👉 REALIDAD</span>
            <ThumbsUp className="w-6 h-6 text-emerald-400" />
          </button>
        </div>

        {/* Footer info */}
        <div className="w-full max-w-3xl mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm text-slate-300">
          <span>Meta: <strong>{requiredCorrect} de {cards.length}</strong> aciertos para ganar</span>
          <span className="font-bold text-rose-300 text-sm sm:text-base">Aciertos: {correctCount}/{cards.length}</span>
        </div>
      </div>
    </div>
  );
};

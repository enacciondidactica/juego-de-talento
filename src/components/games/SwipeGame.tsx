import React, { useState, useRef } from 'react';
import { ArrowLeft, ThumbsDown, ThumbsUp, Trophy, Flame } from 'lucide-react';
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
  const requiredCorrect = Math.max(5, Math.ceil(cards.length * 0.7)); // e.g. 6 of 8

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
    }, 2200);
  };

  // Touch Swipe on Card
  const touchStartRef = useRef<{ x: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isAnimating) return;
    const diffX = e.changedTouches[0].clientX - touchStartRef.current.x;
    if (diffX > 45) {
      handleVote(true); // Swipe Right = Realidad
    } else if (diffX < -45) {
      handleVote(false); // Swipe Left = Mito
    }
    touchStartRef.current = null;
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-4 py-2 select-none">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between bg-[#0e0b16] border border-[#60309B]/40 rounded-2xl p-3 px-4 sm:px-6 shadow-xl">
        <button
          onClick={() => {
            sounds.playClick();
            onBack();
          }}
          disabled={isAnimating}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Juegos</span>
        </button>

        {/* Title & Topic */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xs sm:text-sm font-bold text-slate-300">
            Caso {currentIndex + 1} de {cards.length}
          </span>
          <span className="text-xs sm:text-sm font-bold py-1 px-3 bg-[#60309B]/30 text-white rounded-lg border border-[#60309B]/50">
            {currentCard?.topic}
          </span>
        </div>

        {/* Streak & Score */}
        <div className="flex items-center gap-2 sm:gap-3">
          {streak >= 2 && (
            <div className="flex items-center gap-1.5 py-1.5 px-3 bg-[#FF7D00]/20 border border-[#FF7D00]/40 rounded-xl text-[#FF7D00] text-xs sm:text-sm font-bold animate-pulse">
              <Flame className="w-4 h-4" />
              <span>x{streak} Racha</span>
            </div>
          )}
          <div className="flex items-center gap-2 py-1.5 px-3 sm:px-4 bg-[#FF7D00]/20 border border-[#FF7D00]/40 rounded-xl text-[#FF7D00] text-xs sm:text-sm font-black shadow-lg">
            <Trophy className="w-4 h-4" />
            <span>{score} pts</span>
          </div>
        </div>
      </div>

      {/* Main Swipe Arena Card */}
      <div
        className="w-full bg-[#0a0710] border border-[#60309B]/30 rounded-3xl p-5 sm:p-10 flex flex-col items-center shadow-2xl relative min-h-[460px] justify-between overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Game Title Tag */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
          <span className="text-xs font-black uppercase tracking-wider text-[#FF7D00]">
            Mito o Realidad de Empleabilidad
          </span>
          <span className="text-xs text-slate-400 font-semibold">
            Desliza o haz clic en los botones
          </span>
        </div>

        {/* Card Statement */}
        <div
          className={`w-full max-w-2xl my-4 bg-[#140b24] border border-[#60309B]/40 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center shadow-2xl transition-all duration-500 transform ${
            swipeDirection === 'left'
              ? '-translate-x-full rotate-[-16deg] opacity-0'
              : swipeDirection === 'right'
              ? 'translate-x-full rotate-[16deg] opacity-0'
              : 'translate-x-0 rotate-0 opacity-100'
          }`}
        >
          <div className="w-14 h-14 rounded-2xl bg-[#60309B]/40 border border-[#FF7D00]/40 flex items-center justify-center text-2xl mb-4 shadow-lg text-[#FF7D00]">
            ⚡
          </div>

          <p className="text-lg sm:text-2xl font-black text-white leading-snug mb-5 tracking-tight">
            {currentCard?.statement}
          </p>

          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 bg-white/5 py-1.5 px-4 rounded-full border border-white/10">
            ¿Es un MITO de empleabilidad o una REALIDAD laboral?
          </span>
        </div>

        {/* Feedback Card Overlay */}
        {feedback && (
          <div className="absolute inset-x-4 inset-y-4 sm:inset-x-8 sm:inset-y-8 bg-[#07050d]/95 backdrop-blur-xl border-2 border-[#60309B]/60 rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center text-center z-20 animate-fadeIn shadow-2xl">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 text-2xl shadow-xl ${
              feedback.isCorrect
                ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-400'
                : 'bg-rose-500/20 border border-rose-500/50 text-rose-400'
            }`}>
              {feedback.isCorrect ? '✓' : '✗'}
            </div>
            <h4 className={`text-xl sm:text-2xl font-black mb-2 ${
              feedback.isCorrect ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {feedback.isCorrect ? '¡Decisión Acertada!' : '¡Era lo contrario!'}
            </h4>
            <p className="text-sm sm:text-base text-slate-200 leading-relaxed max-w-lg font-medium">
              {feedback.text}
            </p>
          </div>
        )}

        {/* Action Decision Buttons */}
        <div className="w-full max-w-2xl flex items-center justify-center gap-4 sm:gap-6 mt-4">
          {/* Mito (Left / False) */}
          <button
            id="swipe-btn-mito"
            onClick={() => handleVote(false)}
            disabled={isAnimating}
            className="flex-1 py-4 sm:py-5 px-4 sm:px-6 rounded-2xl bg-[#60309B]/30 hover:bg-[#60309B]/50 border-2 border-[#60309B] text-slate-100 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <ThumbsDown className="w-5 h-5 text-rose-400" />
            <span>ES MITO 👈</span>
          </button>

          {/* Realidad (Right / True) */}
          <button
            id="swipe-btn-realidad"
            onClick={() => handleVote(true)}
            disabled={isAnimating}
            className="flex-1 py-4 sm:py-5 px-4 sm:px-6 rounded-2xl bg-[#FF7D00]/30 hover:bg-[#FF7D00]/50 border-2 border-[#FF7D00] text-slate-100 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <span>👉 ES REALIDAD</span>
            <ThumbsUp className="w-5 h-5 text-[#FF7D00]" />
          </button>
        </div>

        {/* Footer info */}
        <div className="w-full max-w-2xl mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
          <span>Meta: <strong className="text-white">{requiredCorrect} de {cards.length}</strong> aciertos para ganar</span>
          <span className="font-bold text-[#FF7D00] text-xs sm:text-sm">Aciertos: {correctCount}/{cards.length}</span>
        </div>
      </div>
    </div>
  );
};

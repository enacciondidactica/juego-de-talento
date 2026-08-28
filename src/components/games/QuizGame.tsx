import React, { useState, useEffect, useRef } from 'react';
import { Clock, ArrowLeft, CheckCircle2, XCircle, Sparkles, HelpCircle, Trophy, Flame } from 'lucide-react';
import { QuizQuestion } from '../../types';
import { DEFAULT_QUIZ_QUESTIONS } from '../../lib/gameData';
import { sounds } from '../../lib/audio';

interface QuizGameProps {
  questions?: QuizQuestion[];
  requiredCorrect?: number;
  onFinish: (won: boolean, score: number, durationSeconds: number, details?: any) => void;
  onBack: () => void;
}

export const QuizGame: React.FC<QuizGameProps> = ({
  questions = DEFAULT_QUIZ_QUESTIONS,
  requiredCorrect = 5,
  onFinish,
  onBack,
}) => {
  // Use 7 questions
  const activeQuestions = questions.slice(0, 7);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [questionTimer, setQuestionTimer] = useState(18);
  const startTimeRef = useRef<number>(Date.now());

  const currentQ = activeQuestions[currentIndex];

  // 18s timer per question
  useEffect(() => {
    if (isAnswered) return;
    setQuestionTimer(18);

    const timer = setInterval(() => {
      setQuestionTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSelect(-1); // timeout = incorrect
          return 0;
        }
        if (prev <= 4) sounds.playCountdown(false);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentIndex, isAnswered]);

  const handleSelect = (optionIdx: number) => {
    if (isAnswered) return;
    setIsAnswered(true);
    setSelectedOption(optionIdx);

    const isCorrect = optionIdx === currentQ.correctIndex;
    let earnedPoints = 0;

    if (isCorrect) {
      sounds.playSuccess();
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak > maxStreak) setMaxStreak(nextStreak);
      setCorrectCount((c) => c + 1);

      // Points: 20 base + streak bonus
      const streakBonus = Math.min(20, nextStreak * 5);
      earnedPoints = 20 + streakBonus;
      setScore((s) => s + earnedPoints);
    } else {
      sounds.playError();
      setStreak(0);
    }

    // Move to next question or complete
    setTimeout(() => {
      if (currentIndex + 1 < activeQuestions.length) {
        setCurrentIndex((i) => i + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        // Quiz completed
        const finalCorrect = correctCount + (isCorrect ? 1 : 0);
        const won = finalCorrect >= requiredCorrect;
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);

        if (won) sounds.playVictory();
        else sounds.playError();

        onFinish(won, score + earnedPoints, elapsed, {
          totalQuestions: activeQuestions.length,
          correctAnswers: finalCorrect,
          required: requiredCorrect,
          maxStreak: Math.max(maxStreak, streak + (isCorrect ? 1 : 0)),
        });
      }
    }, 2200);
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

        {/* Progress & Category */}
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-bold text-slate-300">
            Pregunta {currentIndex + 1} de {activeQuestions.length}
          </span>
          <span className="text-xs sm:text-sm font-bold py-1 px-3 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30">
            {currentQ.category}
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

      {/* Main Question Card */}
      <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 flex flex-col shadow-2xl relative overflow-hidden">
        {/* Timer Bar */}
        <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden mb-6">
          <div
            className={`h-full transition-all duration-1000 ${
              questionTimer <= 5 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500'
            }`}
            style={{ width: `${(questionTimer / 18) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 font-semibold">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            <span>Selecciona la mejor respuesta:</span>
          </div>
          <div className={`text-sm sm:text-base font-mono font-black flex items-center gap-1.5 ${
            questionTimer <= 5 ? 'text-rose-400 animate-pulse' : 'text-slate-200'
          }`}>
            <Clock className="w-4 h-4" />
            <span>{questionTimer}s</span>
          </div>
        </div>

        {/* Question Text */}
        <h3 className="text-xl sm:text-3xl font-black text-white leading-snug mb-8 tracking-tight">
          {currentQ.question}
        </h3>

        {/* Options */}
        <div className="flex flex-col gap-4 mb-6">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQ.correctIndex;

            let buttonStyle = 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200 hover:border-emerald-400/50';
            if (isAnswered) {
              if (isCorrect) {
                buttonStyle = 'bg-emerald-500/25 border-emerald-400 text-white font-bold ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/20';
              } else if (isSelected) {
                buttonStyle = 'bg-rose-500/25 border-rose-400 text-rose-200 line-through';
              } else {
                buttonStyle = 'bg-white/5 opacity-30 border-transparent text-slate-400';
              }
            }

            return (
              <button
                key={idx}
                id={`quiz-option-${idx}`}
                onClick={() => handleSelect(idx)}
                disabled={isAnswered}
                className={`w-full text-left p-4 sm:p-5 rounded-2xl border text-base sm:text-lg transition-all flex items-center justify-between cursor-pointer ${buttonStyle}`}
              >
                <span className="flex-1 pr-3 leading-relaxed font-medium">{option}</span>
                {isAnswered && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-rose-400 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Explanation Footer when answered */}
        {isAnswered && (
          <div className="mt-2 p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 text-sm sm:text-base text-emerald-200 animate-in fade-in flex items-start gap-3 shadow-xl">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block mb-1">Aprendizaje Clave BancoSol:</span>
              <p className="text-slate-200 leading-relaxed">{currentQ.explanation}</p>
            </div>
          </div>
        )}

        {/* Bottom target indicator */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm text-slate-300">
          <span>Meta para Ganar: <strong>{requiredCorrect} de {activeQuestions.length}</strong> aciertos</span>
          <span className="font-bold text-emerald-400 text-sm sm:text-base">Aciertos: {correctCount}/{activeQuestions.length}</span>
        </div>
      </div>
    </div>
  );
};

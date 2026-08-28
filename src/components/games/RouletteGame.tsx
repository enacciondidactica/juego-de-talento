import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Sparkles, Trophy, RotateCw, CheckCircle2, XCircle, Clock, Gift, Flame } from 'lucide-react';
import { RouletteSlice } from '../../types';
import { DEFAULT_ROULETTE_SLICES } from '../../lib/gameData';
import { sounds } from '../../lib/audio';

interface RouletteGameProps {
  slices?: RouletteSlice[];
  onFinish: (won: boolean, score: number, durationSeconds: number, details?: any) => void;
  onBack: () => void;
}

const MINI_CHALLENGES = [
  {
    question: '¿Cuál es el valor central de BancoSol al brindar microfinanzas en Bolivia?',
    options: [
      'Inclusión social, progreso sostenible y apoyo a emprendedores',
      'Cobrar comisiones ocultas y altas tasas',
      'Atender exclusivamente a grandes corporaciones multinacionales'
    ],
    correctIndex: 0,
    explanation: 'BancoSol es pionero mundial en microfinanzas orientadas a la inclusión y progreso humano.',
  },
  {
    question: 'Para generar un impacto positivo en tus primeros 30 días laborales, ¿qué es clave?',
    options: [
      'Aprender los procesos, escuchar activamente y colaborar con el equipo',
      'Aislarte y evitar hacer preguntas por temor al juicio',
      'Intentar cambiar todos los sistemas internos sin consultar a nadie'
    ],
    correctIndex: 0,
    explanation: 'La escucha activa y la colaboración aceleran la integración y confianza del equipo.',
  },
  {
    question: '¿Qué competencia permite adaptarse rápidamente a nuevos sistemas digitales e IA?',
    options: [
      'Learnability, curiosidad continua y mentalidad de crecimiento',
      'Resistencia al cambio y apego a procesos obsoletos',
      'Desinterés por las herramientas tecnológicas'
    ],
    correctIndex: 0,
    explanation: 'La learnability es la capacidad de desaprender y aprender continuamente en la era digital.',
  },
];

export const RouletteGame: React.FC<RouletteGameProps> = ({
  slices = DEFAULT_ROULETTE_SLICES,
  onFinish,
  onBack,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [selectedSlice, setSelectedSlice] = useState<RouletteSlice | null>(null);
  const [stage, setStage] = useState<'spin' | 'result_pause' | 'challenge' | 'final'>('spin');
  const [challengeIdx, setChallengeIdx] = useState(0);
  const [challengeAnswered, setChallengeAnswered] = useState(false);
  const [selectedChallengeOption, setSelectedChallengeOption] = useState<number | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState(3);
  const startTimeRef = useRef<number>(Date.now());

  const numSlices = slices.length;
  const sliceAngle = 360 / numSlices;
  const currentChallenge = MINI_CHALLENGES[challengeIdx];

  const handleSpin = () => {
    if (isSpinning || stage !== 'spin') return;
    setIsSpinning(true);
    setSelectedSlice(null);
    startTimeRef.current = Date.now();

    // Weighted random selection
    const totalWeight = slices.reduce((acc, s) => acc + s.weight, 0);
    let randomNum = Math.random() * totalWeight;
    let winningIndex = 0;

    for (let i = 0; i < slices.length; i++) {
      if (randomNum < slices[i].weight) {
        winningIndex = i;
        break;
      }
      randomNum -= slices[i].weight;
    }

    const targetSlice = slices[winningIndex];

    // Calculate rotation:
    // Top pointer is at 270 deg (12 o'clock in standard math).
    // Target slice midpoint in standard angles: winningIndex * sliceAngle + sliceAngle / 2
    const targetSliceCenter = winningIndex * sliceAngle + sliceAngle / 2;
    // Rotation required to align targetSliceCenter to top (270 deg)
    const angleOffset = (270 - targetSliceCenter + 360) % 360;
    const finalAngle = 360 * 5 + angleOffset;
    const randomizedFinal = finalAngle + (Math.random() * 6 - 3);

    setRotation(randomizedFinal);

    // Audio ticking sound while spinning
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      sounds.playTick();
      tickCount++;
      if (tickCount > 28) clearInterval(tickInterval);
    }, 130);

    // Stop spin after 4 seconds
    setTimeout(() => {
      clearInterval(tickInterval);
      setIsSpinning(false);
      setSelectedSlice(targetSlice);
      setStage('result_pause');
      setCountdownSeconds(3);

      if (targetSlice.isWinner) {
        sounds.playStar();
        setChallengeIdx(Math.floor(Math.random() * MINI_CHALLENGES.length));

        // Start countdown timer for the extended 3.5s pause
        const cdInterval = setInterval(() => {
          setCountdownSeconds((c) => {
            if (c <= 1) {
              clearInterval(cdInterval);
              return 0;
            }
            return c - 1;
          });
        }, 1000);

        // Keep the result visible for 3.5 seconds before transitioning to the challenge
        setTimeout(() => {
          clearInterval(cdInterval);
          setStage('challenge');
        }, 3500);
      } else {
        // Non-winner: show result for 3.5 seconds before completing
        sounds.playError();
        const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
        setTimeout(() => {
          onFinish(false, 10, elapsed, {
            sliceLabel: targetSlice.label,
            prizeText: targetSlice.prizeText,
          });
        }, 3500);
      }
    }, 4000);
  };

  const handleChallengeAnswer = (optionIdx: number) => {
    if (challengeAnswered) return;
    setChallengeAnswered(true);
    setSelectedChallengeOption(optionIdx);

    const isCorrect = optionIdx === currentChallenge.correctIndex;
    if (isCorrect) {
      sounds.playVictory();
    } else {
      sounds.playError();
    }

    const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
    setTimeout(() => {
      onFinish(isCorrect, isCorrect ? 100 : 30, elapsed, {
        sliceLabel: selectedSlice?.label,
        prizeText: isCorrect ? selectedSlice?.prizeText : 'Reto no completado',
        challengeSolved: isCorrect,
      });
    }, 2400);
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
          disabled={isSpinning}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Juegos</span>
        </button>

        <div className="flex items-center gap-2 py-1.5 px-4 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-300 text-xs sm:text-sm font-extrabold shadow-lg">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Ruleta de la Fortuna BancoSol</span>
        </div>
      </div>

      {/* Main Game Container */}
      <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 flex flex-col items-center shadow-2xl relative overflow-hidden">
        {/* STAGE 1 & RESULT PAUSE: The Wheel View */}
        {(stage === 'spin' || stage === 'result_pause') && (
          <>
            <div className="text-center mb-4">
              <h3 className="text-2xl sm:text-4xl font-black text-white mb-2 tracking-tight">
                Ruleta de Beneficios y Reconocimiento
              </h3>
              <p className="text-sm sm:text-base text-slate-300 max-w-xl">
                Gira la ruleta y responde el micro-desafío para desbloquear tu recompensa de empleabilidad.
              </p>
            </div>

            {/* Roulette Visual Wheel */}
            <div className="relative w-80 h-80 sm:w-[420px] sm:h-[420px] md:w-[460px] md:h-[460px] flex items-center justify-center my-4">
              {/* Pointer indicator at Top */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none drop-shadow-[0_4px_12px_rgba(251,191,36,0.9)]">
                <div className="w-6 h-6 bg-amber-400 rotate-45 rounded-sm shadow-2xl border-2 border-slate-950 ring-4 ring-amber-400/50 -mb-3 z-10" />
                <div className="w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-t-[26px] border-t-amber-400" />
              </div>

              {/* Spinning Wheel SVG */}
              <div
                className="w-full h-full rounded-full border-4 sm:border-8 border-white/25 shadow-2xl overflow-hidden relative transition-transform duration-[4000ms] cubic-bezier(0.12, 0.9, 0.22, 1) bg-slate-900 ring-4 ring-amber-400/20"
                style={{
                  transform: `rotate(${rotation}deg)`,
                }}
              >
                <svg viewBox="0 0 240 240" className="w-full h-full">
                  <defs>
                    <filter id="text-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.9" />
                    </filter>
                  </defs>

                  {/* Slices Background */}
                  {slices.map((slice, idx) => {
                    const startAngle = idx * sliceAngle;
                    const endAngle = (idx + 1) * sliceAngle;

                    const r = 120;
                    const x1 = 120 + r * Math.cos((Math.PI * startAngle) / 180);
                    const y1 = 120 + r * Math.sin((Math.PI * startAngle) / 180);
                    const x2 = 120 + r * Math.cos((Math.PI * endAngle) / 180);
                    const y2 = 120 + r * Math.sin((Math.PI * endAngle) / 180);

                    const pathData = `M 120 120 L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;

                    return (
                      <path
                        key={slice.id}
                        d={pathData}
                        fill={slice.color}
                        stroke="#0f172a"
                        strokeWidth="2.5"
                      />
                    );
                  })}

                  {/* High Contrast Readable Slice Labels & Icons */}
                  {slices.map((slice, idx) => {
                    const midAngle = idx * sliceAngle + sliceAngle / 2;
                    const words = slice.label.split(' ');
                    const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
                    const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');

                    return (
                      <g
                        key={`txt-${slice.id}`}
                        transform={`rotate(${midAngle} 120 120)`}
                      >
                        {/* Icon at outer edge */}
                        <text
                          x="196"
                          y="120"
                          fontSize="13"
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="select-none"
                        >
                          {slice.icon || '🎁'}
                        </text>

                        {/* High readability Text Pill Badge */}
                        <rect
                          x="130"
                          y="108"
                          width="52"
                          height="24"
                          rx="6"
                          fill="rgba(15, 23, 42, 0.65)"
                          stroke="rgba(255, 255, 255, 0.25)"
                          strokeWidth="1"
                        />

                        {/* Text Lines */}
                        {line2 ? (
                          <>
                            <text
                              x="156"
                              y="116"
                              fill="#FFFFFF"
                              fontSize="7.5"
                              fontWeight="900"
                              textAnchor="middle"
                              dominantBaseline="central"
                              filter="url(#text-glow)"
                              letterSpacing="0.3"
                            >
                              {line1}
                            </text>
                            <text
                              x="156"
                              y="125"
                              fill="#FDE047"
                              fontSize="7"
                              fontWeight="900"
                              textAnchor="middle"
                              dominantBaseline="central"
                              filter="url(#text-glow)"
                              letterSpacing="0.3"
                            >
                              {line2}
                            </text>
                          </>
                        ) : (
                          <text
                            x="156"
                            y="120"
                            fill="#FFFFFF"
                            fontSize="8"
                            fontWeight="900"
                            textAnchor="middle"
                            dominantBaseline="central"
                            filter="url(#text-glow)"
                            letterSpacing="0.4"
                          >
                            {slice.label}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Center Metallic Hub */}
                  <circle cx="120" cy="120" r="22" fill="#0f172a" stroke="#ffffff" strokeWidth="2.5" />
                  <circle cx="120" cy="120" r="16" fill="#1e293b" />
                  <text
                    x="120"
                    y="120"
                    fontSize="13"
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    🎡
                  </text>
                </svg>
              </div>
            </div>

            {/* EXTENDED RESULT HIGHLIGHT CARD (Visible for 3.5s after spin) */}
            {stage === 'result_pause' && selectedSlice && (
              <div className="w-full mt-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900/95 via-indigo-950/95 to-slate-900/95 border-2 border-amber-400/80 shadow-2xl text-center animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-2xl">{selectedSlice.icon || '🎁'}</span>
                  <span className="text-sm font-black text-amber-300 uppercase tracking-wider">
                    ¡La Ruleta se detuvo en: {selectedSlice.label}!
                  </span>
                </div>
                <p className="text-xs sm:text-sm font-bold text-white mb-2">
                  {selectedSlice.prizeText}
                </p>

                {selectedSlice.isWinner ? (
                  <div className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-pulse">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Iniciando micro-desafío en {countdownSeconds}s...</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 py-1 px-3 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold">
                    <span>¡No te desanimes! Prueba otro minijuego</span>
                  </div>
                )}
              </div>
            )}

            {/* Spin Button (when idle) */}
            {stage === 'spin' && (
              <button
                id="spin-roulette-btn"
                onClick={handleSpin}
                disabled={isSpinning}
                className="mt-6 py-4 sm:py-5 px-12 sm:px-16 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-base sm:text-lg tracking-wider uppercase shadow-2xl shadow-orange-500/30 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <RotateCw className={`w-6 h-6 ${isSpinning ? 'animate-spin' : ''}`} />
                <span>{isSpinning ? '¡Girando la Ruleta...!' : '¡GIRAR RULETA AHORA!'}</span>
              </button>
            )}

            {/* Visual Slice Legend underneath */}
            <div className="w-full mt-6 pt-4 border-t border-white/10">
              <span className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-wider block mb-3 text-center">
                Sectores y Premios en Juego:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {slices.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm shadow-md"
                  >
                    <span
                      className="w-4 h-4 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-white truncate text-xs sm:text-sm">
                        {s.icon} {s.label}
                      </span>
                      <span className="text-[10px] sm:text-xs text-slate-300 truncate font-medium">
                        {s.prizeText}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* STAGE 2: Micro Challenge Question */}
        {stage === 'challenge' && (
          <div className="w-full max-w-4xl flex flex-col items-center animate-in zoom-in-95 duration-300">
            {/* Header badge */}
            <div className="w-full flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10 text-3xl">
                  {selectedSlice?.icon || '🎁'}
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Confirmación de Premio BancoSol
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black text-white">
                    {selectedSlice?.label}
                  </h4>
                </div>
              </div>
              <div className="py-2 px-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-sm font-bold flex items-center gap-2 shadow-lg">
                <Trophy className="w-4 h-4" />
                <span>100 pts en juego</span>
              </div>
            </div>

            {/* Question Card */}
            <div className="w-full p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-white/15 mb-6 shadow-2xl">
              <span className="text-xs sm:text-sm font-bold text-slate-400 block mb-2 uppercase tracking-wide">
                Responde correctamente para asegurar tu recompensa:
              </span>
              <h4 className="text-lg sm:text-2xl font-black text-white leading-snug">
                {currentChallenge.question}
              </h4>
            </div>

            {/* Options */}
            <div className="w-full flex flex-col gap-3.5 mb-6">
              {currentChallenge.options.map((opt, idx) => {
                const isSelected = selectedChallengeOption === idx;
                const isCorrect = idx === currentChallenge.correctIndex;

                let btnStyle = 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200 hover:border-amber-400/50';
                if (challengeAnswered) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-500/25 border-emerald-400 text-white font-bold ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/20';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-500/25 border-rose-400 text-rose-200 line-through';
                  } else {
                    btnStyle = 'bg-white/5 opacity-30 border-transparent text-slate-400';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleChallengeAnswer(idx)}
                    disabled={challengeAnswered}
                    className={`w-full text-left p-4 sm:p-5 rounded-2xl border text-sm sm:text-base transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                  >
                    <span className="flex-1 pr-3 leading-relaxed font-medium">{opt}</span>
                    {challengeAnswered && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />}
                    {challengeAnswered && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-rose-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Explanation when answered */}
            {challengeAnswered && (
              <div className="w-full p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-sm sm:text-base text-emerald-200 animate-in fade-in flex items-start gap-3 shadow-xl">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block mb-1">¡Aprendizaje y Alineación!</span>
                  <p className="text-slate-200 leading-relaxed">{currentChallenge.explanation}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


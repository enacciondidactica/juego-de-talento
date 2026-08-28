import React, { useState, useRef } from 'react';
import { ArrowLeft, Sparkles, Trophy, Lock, Unlock, HelpCircle, CheckCircle2, XCircle, Key, Award, HeartHandshake, Lightbulb, Leaf, Users } from 'lucide-react';
import { ChestOption } from '../../types';
import { DEFAULT_CHEST_OPTIONS } from '../../lib/gameData';
import { sounds } from '../../lib/audio';

interface ChestsGameProps {
  chests?: ChestOption[];
  onFinish: (won: boolean, score: number, durationSeconds: number, details?: any) => void;
  onBack: () => void;
}

export const ChestsGame: React.FC<ChestsGameProps> = ({
  chests = DEFAULT_CHEST_OPTIONS,
  onFinish,
  onBack,
}) => {
  const [selectedChest, setSelectedChest] = useState<ChestOption | null>(null);
  const [stage, setStage] = useState<'select' | 'challenge' | 'unlock' | 'opened'>('select');
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [challengeAnswered, setChallengeAnswered] = useState(false);
  const [isKeyTurning, setIsKeyTurning] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  // Pillar selection
  const handleSelectPillar = (chest: ChestOption) => {
    if (selectedChest) return;
    sounds.playClick();
    setSelectedChest(chest);
    setStage('challenge');
  };

  // Challenge Decision
  const handleAnswerChallenge = (optionIdx: number) => {
    if (challengeAnswered || !selectedChest) return;
    setChallengeAnswered(true);
    setSelectedOptionIdx(optionIdx);

    const isCorrect = optionIdx === (selectedChest.correctChallengeIndex ?? 0);

    if (isCorrect) {
      sounds.playSuccess();
      setTimeout(() => {
        setStage('unlock');
      }, 1800);
    } else {
      sounds.playError();
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      setTimeout(() => {
        onFinish(false, 30, elapsed, {
          pilar: selectedChest.title,
          reason: 'Respuesta incorrecta en el desafío del pilar',
        });
      }, 2400);
    }
  };

  // Turn key to open chest
  const handleTurnKey = () => {
    if (isKeyTurning || !selectedChest) return;
    setIsKeyTurning(true);
    sounds.playChestOpen();

    setTimeout(() => {
      setStage('opened');
      sounds.playVictory();

      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      setTimeout(() => {
        onFinish(true, 100, elapsed, {
          pilar: selectedChest.title,
          premio: selectedChest.prizeText,
          pilarSubtitle: selectedChest.subtitle,
        });
      }, 2800);
    }, 1500);
  };

  const getPillarIconComponent = (id: string) => {
    switch (id) {
      case 'c1':
        return <HeartHandshake className="w-8 h-8 text-orange-400" />;
      case 'c2':
        return <Lightbulb className="w-8 h-8 text-purple-400" />;
      case 'c3':
        return <Leaf className="w-8 h-8 text-emerald-400" />;
      case 'c4':
        return <Users className="w-8 h-8 text-blue-400" />;
      default:
        return <Sparkles className="w-8 h-8 text-amber-400" />;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-4 py-2 select-none">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-3 px-6 shadow-xl">
        <button
          onClick={() => {
            sounds.playClick();
            onBack();
          }}
          disabled={isKeyTurning}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Juegos</span>
        </button>

        <div className="flex items-center gap-2 py-1.5 px-4 bg-gradient-to-r from-orange-500/20 via-purple-500/20 to-emerald-500/20 border border-white/15 rounded-xl text-white text-xs sm:text-sm font-extrabold shadow-lg">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Los 4 Pilares Estratégicos</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 flex flex-col items-center shadow-2xl relative overflow-hidden">
        {/* STAGE 1: 4 Pillars Quadrant Selection */}
        {stage === 'select' && (
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-6">
              <h3 className="text-2xl sm:text-4xl font-black text-white mb-2 tracking-tight">
                Pilares Estratégicos BancoSol
              </h3>
              <p className="text-sm sm:text-base text-slate-300 max-w-2xl">
                Elige el pilar que deseas potenciar, resuelve su desafío de alineación y desbloquea el cofre con la Llave del Éxito.
              </p>
            </div>

            {/* 4 Pillars Grid (2x2 matching the image layout, high spectator visibility) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full mb-5 relative">
              {chests.map((chest) => {
                let borderTheme = 'hover:border-orange-400 bg-orange-950/20 border-orange-500/30 shadow-orange-950/30';
                let tagColor = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
                let iconColor = 'text-orange-400';

                if (chest.id === 'c2') {
                  borderTheme = 'hover:border-purple-400 bg-purple-950/20 border-purple-500/30 shadow-purple-950/30';
                  tagColor = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
                  iconColor = 'text-purple-400';
                } else if (chest.id === 'c3') {
                  borderTheme = 'hover:border-emerald-400 bg-emerald-950/20 border-emerald-500/30 shadow-emerald-950/30';
                  tagColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                  iconColor = 'text-emerald-400';
                } else if (chest.id === 'c4') {
                  borderTheme = 'hover:border-blue-400 bg-blue-950/20 border-blue-500/30 shadow-blue-950/30';
                  tagColor = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
                  iconColor = 'text-blue-400';
                }

                return (
                  <div
                    key={chest.id}
                    id={`pillar-card-${chest.id}`}
                    onClick={() => handleSelectPillar(chest)}
                    className={`flex flex-col justify-between p-6 sm:p-7 rounded-3xl border backdrop-blur-md transition-all duration-300 cursor-pointer min-h-[200px] sm:min-h-[220px] group hover:scale-[1.02] active:scale-[0.99] shadow-xl ${borderTheme}`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-4">
                        <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 group-hover:scale-110 transition-transform">
                          {getPillarIconComponent(chest.id)}
                        </div>
                        <div>
                          <span className={`text-xs font-black uppercase tracking-wider py-0.5 px-2.5 rounded-md border ${tagColor}`}>
                            Pilar
                          </span>
                          <h4 className="text-xl sm:text-2xl font-black text-white mt-1 group-hover:text-amber-300 transition-colors">
                            {chest.title}
                          </h4>
                        </div>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-white/20 transition-all">
                        <Lock className="w-5 h-5" />
                      </div>
                    </div>

                    <p className="text-sm sm:text-base text-slate-200 leading-relaxed italic mb-4 font-medium">
                      "{chest.subtitle}"
                    </p>

                    <div className="flex items-center justify-between text-xs sm:text-sm text-slate-400 pt-3 border-t border-white/10">
                      <span className="flex items-center gap-2 font-bold group-hover:text-white transition-colors">
                        <Key className="w-4 h-4 text-amber-400" /> Toca para responder y desbloquear
                      </span>
                      <span className="font-mono text-amber-400 font-extrabold text-sm sm:text-base">+100 pts</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom info banner */}
            <div className="w-full p-4 rounded-2xl bg-slate-900/80 border border-white/10 text-xs sm:text-sm text-slate-300 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Cada pilar representa la esencia de nuestro impacto en las microfinanzas y el talento boliviano.</span>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: Interactive Pillar Challenge */}
        {stage === 'challenge' && selectedChest && (
          <div className="w-full max-w-4xl flex flex-col items-center animate-in zoom-in-95 duration-300">
            {/* Header with chosen pillar */}
            <div className="w-full flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-white/10 border border-white/10">
                  {getPillarIconComponent(selectedChest.id)}
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Desafío de Alineación Estratégica
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black text-white">
                    Pilar: {selectedChest.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1.5 px-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 text-xs sm:text-sm font-bold shadow-lg">
                <Trophy className="w-4 h-4" />
                <span>Paso 1 de 2 • +100 pts</span>
              </div>
            </div>

            {/* Mission Statement reminder */}
            <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 mb-5 text-sm sm:text-base text-slate-200 italic font-medium">
              <strong className="text-amber-400 not-italic">Misión del Pilar:</strong> "{selectedChest.subtitle}"
            </div>

            {/* Challenge Question */}
            <div className="w-full p-6 sm:p-7 rounded-3xl bg-slate-900/90 border border-white/15 mb-6 shadow-2xl">
              <span className="text-xs sm:text-sm font-bold text-slate-400 block mb-2 uppercase tracking-wide">
                Pregunta de alineación:
              </span>
              <h4 className="text-lg sm:text-2xl font-black text-white leading-snug">
                {selectedChest.challengeQuestion}
              </h4>
            </div>

            {/* Decision Options */}
            <div className="w-full flex flex-col gap-3.5 mb-6">
              {selectedChest.challengeOptions?.map((opt, idx) => {
                const isSelected = selectedOptionIdx === idx;
                const isCorrect = idx === (selectedChest.correctChallengeIndex ?? 0);

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
                    onClick={() => handleAnswerChallenge(idx)}
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
                  <span className="font-bold text-white block mb-1">¡Alineación Correcta!</span>
                  <p className="text-slate-200 leading-relaxed">{selectedChest.explanation}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAGE 3: Unlock the Chest with Golden Key */}
        {stage === 'unlock' && selectedChest && (
          <div className="w-full max-w-2xl flex flex-col items-center text-center py-6 animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-400/60 flex items-center justify-center text-4xl mb-4 shadow-2xl shadow-amber-500/20 animate-pulse">
              🗝️
            </div>

            <span className="text-xs sm:text-sm font-extrabold text-amber-400 uppercase tracking-wider mb-2">
              ¡Llave del Éxito Forjada!
            </span>
            <h3 className="text-2xl sm:text-4xl font-black text-white mb-3">
              Desbloquear Cofre de {selectedChest.title}
            </h3>
            <p className="text-sm sm:text-base text-slate-300 max-w-lg mb-8 leading-relaxed">
              Has demostrado dominio sobre el pilar estratégico. Gira la llave para abrir el cofre y revelar tu recompensa.
            </p>

            {/* Visual Chest with Keyhole */}
            <div className="w-64 h-52 bg-gradient-to-b from-slate-800 to-slate-950 border-2 border-amber-400/50 rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-2xl mb-8 ring-4 ring-amber-400/20">
              <div className="text-6xl mb-3">📦</div>
              <div className={`w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 ${
                isKeyTurning ? 'animate-spin' : ''
              }`}>
                <Key className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-amber-300 mt-3">
                {isKeyTurning ? 'Abriendo cerradura...' : 'Listo para abrir'}
              </span>
            </div>

            <button
              id="unlock-chest-btn"
              onClick={handleTurnKey}
              disabled={isKeyTurning}
              className="py-4 sm:py-5 px-12 sm:px-16 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-base sm:text-lg tracking-wider uppercase shadow-2xl shadow-amber-500/30 active:scale-95 transition-all flex items-center gap-3 cursor-pointer disabled:opacity-50"
            >
              <Key className={`w-6 h-6 ${isKeyTurning ? 'animate-spin' : ''}`} />
              <span>{isKeyTurning ? 'Desbloqueando Cofre...' : '¡GIRAR LLAVE Y ABRIR!'}</span>
            </button>
          </div>
        )}

        {/* STAGE 4: Opened Chest & Reward */}
        {stage === 'opened' && selectedChest && (
          <div className="w-full max-w-2xl flex flex-col items-center text-center py-8 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-5xl mb-6 shadow-2xl shadow-amber-500/40 ring-4 ring-white/20 animate-bounce">
              🎁
            </div>

            <div className="inline-flex items-center gap-2 py-1.5 px-5 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-300 text-xs sm:text-sm font-bold mb-3">
              <Award className="w-4 h-4" />
              <span>¡Cofre Abierto Exitosamente!</span>
            </div>

            <h3 className="text-2xl sm:text-4xl font-black text-white mb-3">
              {selectedChest.prizeText}
            </h3>

            <p className="text-sm sm:text-base text-slate-300 max-w-lg mb-6 leading-relaxed">
              Has consolidado tu conocimiento sobre el pilar de <strong>{selectedChest.title}</strong>: <em>"{selectedChest.subtitle}"</em>.
            </p>

            <div className="py-2.5 px-8 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-300 font-black text-base sm:text-lg shadow-lg">
              +100 Puntos Obtenidos
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


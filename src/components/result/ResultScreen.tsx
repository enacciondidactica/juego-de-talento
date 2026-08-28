import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, RefreshCw, ArrowRight, ShieldCheck, Clock, CheckCircle2, Award } from 'lucide-react';
import { GameResult, Participant } from '../../types';
import { sounds } from '../../lib/audio';

interface ResultScreenProps {
  result: GameResult;
  participant: Participant;
  prizesAvailable: boolean;
  prizesRemaining: number;
  autoResetSeconds?: number;
  onPlayAgain: () => void;
  onNewParticipant: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  result,
  participant,
  prizesAvailable,
  prizesRemaining,
  autoResetSeconds = 25,
  onPlayAgain,
  onNewParticipant,
}) => {
  const [countdown, setCountdown] = useState(autoResetSeconds);
  const [liveSeconds, setLiveSeconds] = useState(new Date().getSeconds());

  // Confetti effect on mount if won
  useEffect(() => {
    if (result.won) {
      sounds.playVictory();
      
      // Launch dual confetti blast
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f97316', '#6366f1', '#10b981', '#ec4899', '#eab308'],
        });

        const timer = setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#f97316', '#eab308', '#6366f1'],
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#f97316', '#10b981', '#ec4899'],
          });
        }, 400);

        return () => clearTimeout(timer);
      } catch (e) {}
    } else {
      sounds.playError();
    }
  }, [result.won]);

  // Live seconds ticker to prevent screenshot reuse
  useEffect(() => {
    const secTimer = setInterval(() => {
      setLiveSeconds(new Date().getSeconds());
    }, 1000);
    return () => clearInterval(secTimer);
  }, []);

  // Kiosk Auto-Reset Countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onNewParticipant();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onNewParticipant]);

  const hasPrizeAwarded = result.won && result.hasPrize;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-6 py-2 my-auto">
      {/* Main Result Frosted Glass Card */}
      <div className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl ring-1 ring-white/5 relative overflow-hidden">
        {/* Top Glow & Badge */}
        <div className="mb-4">
          {result.won ? (
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-5xl shadow-2xl shadow-orange-500/40 border border-white/30 animate-bounce">
              🏆
            </div>
          ) : (
            <div className="w-20 h-20 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center text-5xl shadow-xl">
              🎯
            </div>
          )}
        </div>

        {/* Dynamic Title based on result and prize stock */}
        {result.won ? (
          <div>
            <div className="inline-flex items-center gap-1.5 py-1 px-3.5 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-black uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              ¡Reto Superado con Éxito!
            </div>

            {hasPrizeAwarded ? (
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
                🎉 ¡Ganaste! Presenta esta pantalla para reclamar tu premio.
              </h2>
            ) : (
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
                ¡Buen juego! Esta vez no hay premio disponible, pero puedes seguir participando.
              </h2>
            )}

            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Excelente desempeño en <strong className="text-orange-400">{result.gameName}</strong>. ¡Tu talento destaca en BancoSol!
            </p>
          </div>
        ) : (
          <div>
            <div className="inline-flex items-center gap-1.5 py-1 px-3.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-300 text-xs font-black uppercase tracking-wider mb-3">
              <RefreshCw className="w-3.5 h-3.5" />
              ¡Estuviste muy cerca!
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight mb-3">
              ¡Gran esfuerzo en el reto!
            </h2>

            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Puedes volver a intentarlo o probar cualquiera de los otros minijuegos para ganar.
            </p>
          </div>
        )}

        {/* Verifiable Live Security Code Badge (If prize won) */}
        {hasPrizeAwarded && result.redeemCode && (
          <div className="my-6 p-4 sm:p-5 w-full bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-2 border-orange-500/50 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="text-left">
              <span className="text-[10px] uppercase font-black tracking-widest text-orange-300 block">
                Código de Canje Oficial
              </span>
              <span className="text-3xl font-black font-mono text-white tracking-wider">
                {result.redeemCode}
              </span>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Participante: <strong className="text-white">{result.name}</strong> ({result.phone})
              </p>
            </div>

            <div className="flex flex-col items-end gap-1 text-right">
              <div className="flex items-center gap-2 py-1 px-3 bg-white/10 rounded-xl text-xs font-mono text-emerald-300 border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Hora en vivo: {new Date().toLocaleTimeString()}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">
                Presenta al reclutador en stand
              </span>
            </div>
          </div>
        )}

        {/* Round Performance Breakdown Grid */}
        <div className="grid grid-cols-3 gap-3 w-full my-4">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-slate-400">Juego</p>
            <p className="text-xs font-black text-white mt-0.5 truncate">{result.gameName}</p>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-slate-400">Tiempo</p>
            <p className="text-xs font-black text-white mt-0.5 font-mono">{result.durationSeconds}s</p>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] uppercase font-bold text-slate-400">Puntaje</p>
            <p className="text-xs font-black text-white mt-0.5">{result.score || (result.won ? 100 : 0)} pts</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-4">
          <button
            id="play-another-game-btn"
            onClick={() => {
              sounds.playClick();
              onPlayAgain();
            }}
            className="py-3.5 px-5 bg-white/10 hover:bg-white/15 active:scale-95 border border-white/20 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg"
          >
            <RefreshCw className="w-4 h-4 text-orange-400" />
            <span>Jugar Otro Minijuego</span>
          </button>

          <button
            id="next-participant-btn"
            onClick={() => {
              sounds.playClick();
              onNewParticipant();
            }}
            className="py-3.5 px-5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-400 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xl shadow-orange-500/25 border border-white/20"
          >
            <span>Siguiente Participante</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Kiosk Auto-return note */}
        <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between w-full text-[10px] font-bold text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Registro guardado automáticamente</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 font-mono">
            <Clock className="w-3 h-3" />
            <span>Reinicio automático en {countdown}s</span>
          </div>
        </div>
      </div>
    </div>
  );
};

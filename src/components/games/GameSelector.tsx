import React from 'react';
import { Sparkles, Trophy, Clock, Play, Flame, Star } from 'lucide-react';
import { GameDefinition, GameId, Participant } from '../../types';
import { GAMES_CATALOG } from '../../lib/gameData';
import { sounds } from '../../lib/audio';

interface GameSelectorProps {
  participant: Participant;
  activeGamesConfig?: Record<GameId, boolean>;
  onSelectGame: (gameId: GameId) => void;
  prizesRemaining: number;
}

export const GameSelector: React.FC<GameSelectorProps> = ({
  participant,
  activeGamesConfig,
  onSelectGame,
  prizesRemaining,
}) => {
  const games = GAMES_CATALOG.filter(game => {
    if (activeGamesConfig && activeGamesConfig[game.id] === false) return false;
    return true;
  });

  return (
    <div className="w-full flex-1 flex flex-col gap-6 py-2">
      {/* Top Banner / Selection Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 px-6 shadow-xl">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>¡Hola, {participant.name.split(' ')[0]}!</span>
            <span className="text-orange-400">Elige tu reto</span>
          </h2>
          <p className="text-xs text-slate-400">
            Selecciona el minijuego que prefieras. Cada partida dura menos de 1 minuto.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="py-1.5 px-3 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-300 text-xs font-bold flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-orange-400" />
            <span>{prizesRemaining} Premios Disponibles</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Game Cards + Aside Ranking/Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Main: Grid of 7 Game Cards */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {games.map((game) => (
            <div
              key={game.id}
              id={`game-card-${game.id}`}
              onClick={() => {
                sounds.playClick();
                onSelectGame(game.id);
              }}
              className="group relative bg-white/5 hover:bg-white/10 active:scale-[0.98] backdrop-blur-xl border border-white/10 hover:border-orange-500/50 rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 cursor-pointer shadow-xl ring-1 ring-white/5 overflow-hidden"
            >
              {/* Top Row: Icon + Badge */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-white/10 group-hover:bg-orange-500/20 rounded-2xl flex items-center justify-center text-2xl border border-white/10 group-hover:border-orange-500/30 transition-colors shadow-inner">
                  {game.icon}
                </div>
                <div className="py-1 px-3 bg-white/10 group-hover:bg-orange-500/20 text-slate-300 group-hover:text-orange-300 text-[10px] font-extrabold uppercase rounded-full tracking-wider transition-colors">
                  {game.durationText}
                </div>
              </div>

              {/* Title & Description */}
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400/90 mb-0.5">
                  {game.subtitle}
                </p>
                <h3 className="text-lg font-black text-white mb-1.5 group-hover:text-orange-300 transition-colors">
                  {game.name}
                </h3>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {game.description}
                </p>
              </div>

              {/* Action Button inside Card */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">
                  Tema: <span className="text-slate-200">{game.hrTopic.split(' ')[0]}</span>
                </span>
                <div className="flex items-center gap-1.5 text-xs font-black text-orange-400 group-hover:translate-x-1 transition-transform">
                  <span>JUGAR</span>
                  <Play className="w-3.5 h-3.5 fill-current" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right / Aside: Event Highlights, Instructions & Quick Tips */}
        <aside className="lg:col-span-4 flex flex-col gap-5">
          {/* Quick Info Box */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-xl ring-1 ring-white/5">
            <h4 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              ¿Cómo Funciona?
            </h4>
            <div className="space-y-3.5">
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-black text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">Juega y diviértete:</strong> Cumple el reto de tu juego seleccionado antes de que expire el cronómetro.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">Gana y reclama:</strong> Si superas el desafío, muestra la pantalla de victoria al reclutador en el stand.
                </p>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  <strong className="text-white">Repite cuantas veces quieras:</strong> ¡Puedes probar todos los minijuegos!
                </p>
              </div>
            </div>
          </div>

          {/* BancoSol Employer Brand Promo Card */}
          <div className="bg-gradient-to-br from-orange-500 via-amber-600 to-red-600 rounded-3xl p-6 relative overflow-hidden shadow-2xl shadow-orange-900/30 border border-white/20">
            <div className="absolute top-0 right-0 p-4 opacity-20 text-7xl pointer-events-none">
              💎
            </div>
            <div className="relative z-10">
              <span className="inline-block py-1 px-3 bg-black/20 backdrop-blur-md rounded-full text-white text-[10px] font-black tracking-wider uppercase mb-2">
                Trabaja con Nosotros
              </span>
              <h4 className="text-white font-black text-xl mb-1">
                Conoce las Oportunidades
              </h4>
              <p className="text-orange-100 text-xs leading-relaxed mb-4">
                En BancoSol impulsamos líderes con propósito, innovación y crecimiento continuo. ¡Súmate a nuestro equipo!
              </p>
              <div className="py-2.5 px-4 bg-white text-orange-700 font-black text-xs uppercase tracking-wider rounded-xl text-center shadow-lg">
                Visita nuestro stand de Talento
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

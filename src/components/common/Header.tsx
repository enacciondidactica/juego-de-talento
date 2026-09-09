import React, { useState } from 'react';
import { Volume2, VolumeX, Shield, User, Sparkles, RefreshCw } from 'lucide-react';
import { sounds } from '../../lib/audio';
import { Participant } from '../../types';

interface HeaderProps {
  participant?: Participant | null;
  eventName?: string;
  onOpenAdmin: () => void;
  onResetToHome?: () => void;
  prizesRemaining?: number;
}

export const Header: React.FC<HeaderProps> = ({
  participant,
  eventName: rawEventName,
  onOpenAdmin,
  onResetToHome,
  prizesRemaining = 42,
}) => {
  const currentYear = new Date().getFullYear();
  // Ensure the display is "Feria de Empleabilidad" or with dynamic current year, replacing any hardcoded 2025
  const sanitizedEventName = rawEventName
    ? rawEventName.replace(/2025/g, String(currentYear))
    : `Feria de Empleabilidad ${currentYear}`;

  const [isMuted, setIsMuted] = useState(sounds.getMuted());

  const handleToggleSound = () => {
    const nextMuted = sounds.toggleMute();
    setIsMuted(nextMuted);
    if (!nextMuted) sounds.playClick();
  };

  const getInitials = (name: string) => {
    if (!name) return 'DS';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
      {/* Brand & Event Title */}
      <div 
        id="app-header-brand"
        onClick={() => {
          sounds.playClick();
          if (onResetToHome) onResetToHome();
        }}
        className="cursor-pointer group flex items-center gap-3"
      >
        <div className="w-11 h-11 rounded-2xl bg-[#60309B] border border-[#FF7D00]/50 flex items-center justify-center text-[#FF7D00] text-xl shadow-lg shadow-[#60309B]/40 group-hover:scale-105 transition-transform">
          ⚡
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-white">
            DESAFÍO DE TALENTO
          </h1>
          <p className="text-slate-300 text-xs font-semibold tracking-widest uppercase flex items-center gap-2">
            <span className="text-[#FF7D00] font-bold">BancoSol</span> • {sanitizedEventName}
          </p>
        </div>
      </div>

      {/* Right Controls: Participant Pill, Prizes Badge, Sound, Admin */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Participant Pill */}
        {participant && (
          <div 
            id="active-participant-pill"
            className="flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl py-1.5 px-3.5 shadow-lg"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[9px] uppercase text-slate-400 font-bold leading-none mb-0.5">
                {participant.isRepeated ? 'Participante Recurrente' : 'Participante'}
              </p>
              <p className="text-xs font-bold text-slate-100 truncate max-w-[140px]">
                {participant.name}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#60309B] border border-[#FF7D00]/40 flex items-center justify-center shadow-md font-bold text-xs text-white">
              {getInitials(participant.name)}
            </div>
          </div>
        )}

        {/* Sound Toggle Button */}
        <button
          id="sound-toggle-btn"
          onClick={handleToggleSound}
          title={isMuted ? 'Activar Sonido' : 'Silenciar Sonido'}
          className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-slate-300 hover:text-white transition-all backdrop-blur-md"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-slate-500" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
        </button>

        {/* Change Participant / Reset Button if active */}
        {participant && (
          <button
            id="reset-participant-btn"
            onClick={() => {
              sounds.playClick();
              if (onResetToHome) onResetToHome();
            }}
            title="Cambiar Participante"
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 text-slate-300 hover:text-[#FF7D00] transition-all backdrop-blur-md hidden md:flex items-center gap-1.5 text-xs font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Nuevo Turno</span>
          </button>
        )}

        {/* Recruiter Admin Modal Trigger */}
        <button
          id="open-admin-btn"
          onClick={() => {
            sounds.playClick();
            onOpenAdmin();
          }}
          className="flex items-center gap-1.5 py-2 px-3 sm:px-3.5 rounded-2xl bg-[#60309B]/20 hover:bg-[#60309B]/40 active:scale-95 border border-[#60309B]/50 text-slate-200 hover:text-white text-xs font-bold tracking-wide transition-all backdrop-blur-md"
        >
          <Shield className="w-4 h-4 text-[#FF7D00]" />
          <span className="hidden sm:inline">Panel Reclutador</span>
        </button>
      </div>
    </header>
  );
};

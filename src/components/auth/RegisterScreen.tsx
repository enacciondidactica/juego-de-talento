import React, { useState, useEffect } from 'react';
import { User, Phone, Sparkles, Trophy, ArrowRight, ShieldCheck, Zap, HeartHandshake } from 'lucide-react';
import { sounds } from '../../lib/audio';
import { Participant } from '../../types';

interface RegisterScreenProps {
  onRegister?: (participant: Participant) => void;
  onComplete?: (participant: Participant) => void;
  config?: any;
  eventName?: string;
  welcomeMessage?: string;
  prizesRemaining?: number;
  prizesAvailable?: boolean;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onRegister,
  onComplete,
  config,
  eventName: propEventName,
  welcomeMessage: propWelcomeMessage,
  prizesRemaining: propPrizesRemaining,
  prizesAvailable: propPrizesAvailable,
}) => {
  const eventName = config?.eventName || propEventName || 'Desafío de Talento BancoSol';
  const welcomeMessage = config?.welcomeMessage || propWelcomeMessage || '¡Bienvenido a la experiencia interactiva de Talento Humano! Participa en nuestros dinámicos minijuegos, pon a prueba tus habilidades y gana premios instantáneos en nuestro stand.';
  const prizesRemaining = config?.prizesRemaining ?? propPrizesRemaining ?? 100;
  const prizesAvailable = config?.prizesAvailable ?? propPrizesAvailable ?? true;

  const notifyComplete = (p: Participant) => {
    if (onComplete) onComplete(p);
    else if (onRegister) onRegister(p);
  };
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [isRepeated, setIsRepeated] = useState(false);
  const [previousPlayCount, setPreviousPlayCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced check for recurring phone number
  useEffect(() => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length >= 7) {
      const timer = setTimeout(async () => {
        setIsCheckingPhone(true);
        try {
          const res = await fetch('/api/check-phone', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: cleanPhone }),
          });
          const data = await res.json();
          if (data.isRepeated) {
            setIsRepeated(true);
            setPreviousPlayCount(data.totalPlays);
            if (!name && data.previousName) {
              setName(data.previousName);
            }
          } else {
            setIsRepeated(false);
            setPreviousPlayCount(0);
          }
        } catch (e) {
          // ignore network glitches
        } finally {
          setIsCheckingPhone(false);
        }
      }, 400);

      return () => clearTimeout(timer);
    } else {
      setIsRepeated(false);
    }
  }, [phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = name.trim();
    const cleanPhone = phone.trim().replace(/\D/g, '');

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Por favor ingresa tu nombre completo.');
      sounds.playError();
      return;
    }

    if (!cleanPhone || cleanPhone.length < 7) {
      setErrorMsg('Por favor ingresa un número de celular válido (mínimo 7 dígitos).');
      sounds.playError();
      return;
    }

    setIsSubmitting(true);
    sounds.playClick();

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, phone: cleanPhone }),
      });

      const data = await res.json();
      if (data.success && data.participant) {
        sounds.playSuccess();
        notifyComplete(data.participant);
      } else {
        setErrorMsg(data.error || 'Ocurrió un error al registrar. Intenta nuevamente.');
        sounds.playError();
      }
    } catch (err) {
      // Fallback offline participant object if network fails
      const fallbackParticipant: Participant = {
        id: 'p_offline_' + Date.now(),
        name: cleanName,
        phone: cleanPhone,
        registeredAt: new Date().toISOString(),
        isRepeated,
        totalPlays: previousPlayCount,
      };
      sounds.playSuccess();
      notifyComplete(fallbackParticipant);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-auto py-4 sm:py-8 flex flex-col md:flex-row gap-6 items-stretch">
      {/* Left Column: Brand Hero & Value Proposition */}
      <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden ring-1 ring-white/5">
        <div className="absolute top-0 right-0 p-6 opacity-10 text-8xl pointer-events-none">
          🏆
        </div>

        <div>
          <div className="inline-flex items-center gap-2 py-1.5 px-3.5 bg-orange-500/20 border border-orange-500/30 rounded-full text-orange-300 text-xs font-black uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Experiencia de Gamificación
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4 tracking-tight">
            Descubre tu Talento en <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400">BancoSol</span>
          </h2>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6 font-normal">
            {welcomeMessage}
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-base">
                🎮
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">7 Minijuegos Interactivos</p>
                <p className="text-[11px] text-slate-400">Laberinto, Quiz express, Ruleta, Swipe de mitos y más.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-base">
                ⏱️
              </div>
              <div>
                <p className="text-xs font-bold text-slate-100">Retos Ágiles de 15 a 45 Segundos</p>
                <p className="text-[11px] text-slate-400">Supera el desafío y gana premios instantáneos.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Prizes Status Banner */}
        <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className={`w-3 h-3 rounded-full ${prizesAvailable && prizesRemaining > 0 ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-ping' : 'bg-orange-500'}`} />
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estado de Premios</p>
              <p className="text-xs font-extrabold text-white">
                {prizesAvailable && prizesRemaining > 0 
                  ? `${prizesRemaining} Premios Disponibles Hoy` 
                  : 'Premios físicos agotados • ¡Sigue jugando por mérito!'}
              </p>
            </div>
          </div>
          <Trophy className="w-6 h-6 text-orange-400 opacity-80" />
        </div>
      </div>

      {/* Right Column: Registration Form */}
      <div className="w-full md:w-[400px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl ring-1 ring-white/5">
        <div>
          <div className="mb-6">
            <h3 className="text-2xl font-black text-white tracking-tight mb-1">
              Registro Rápido
            </h3>
            <p className="text-xs text-slate-400">
              Ingresa tus datos para registrar tu participación.
            </p>
          </div>

          {/* Repeated player alert banner */}
          {isRepeated && (
            <div 
              id="repeated-player-banner"
              className="mb-5 p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-200 text-xs flex items-start gap-2.5 animate-fadeIn"
            >
              <HeartHandshake className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-amber-300">¡Ya has participado anteriormente!</p>
                <p className="text-[11px] text-amber-200/90 mt-0.5">
                  Llevas {previousPlayCount} {previousPlayCount === 1 ? 'partida registrada' : 'partidas registradas'}. ¡Bienvenido de nuevo a jugar!
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div 
              id="register-error-msg"
              className="mb-5 p-3 bg-red-500/20 border border-red-500/30 rounded-2xl text-red-200 text-xs font-semibold"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Input */}
            <div>
              <label htmlFor="reg-name" className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Nombre y Apellido
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="reg-name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Ej: Sofía Mamani"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-orange-500/60 rounded-2xl text-white placeholder-slate-500 text-sm font-medium outline-none transition-all"
                />
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <label htmlFor="reg-phone" className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Número de Celular
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="Ej: 71234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 focus:bg-white/10 border border-white/10 focus:border-orange-500/60 rounded-2xl text-white placeholder-slate-500 text-sm font-medium outline-none transition-all"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1 pl-1">
                Tus datos son privados y se usan exclusivamente para el canje de premios y registro del evento.
              </p>
            </div>

            {/* Start Playing Submit Button */}
            <div className="pt-3">
              <button
                id="start-playing-btn"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:via-amber-400 hover:to-orange-500 active:scale-[0.98] text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-orange-500/30 flex items-center justify-center gap-3 transition-all cursor-pointer border border-white/20"
              >
                {isSubmitting ? (
                  <span>Conectando...</span>
                ) : (
                  <>
                    <span>COMENZAR A JUGAR</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Security & Privacy note */}
        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Feria Presencial • Conexión Segura</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  Shield,
  Users,
  Trophy,
  Gift,
  Clock,
  Download,
  FileSpreadsheet,
  Search,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  X,
  Sparkles,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Sliders,
  ExternalLink,
  Flame,
  Gamepad2,
  Check,
  BarChart3,
  Activity,
  Calendar,
  Zap,
  Target,
  ArrowRight,
} from 'lucide-react';
import { AppConfig, DailyStats, GameResult, GameId, QuizQuestion } from '../../types';
import { GAMES_CATALOG } from '../../lib/gameData';
import { sounds } from '../../lib/audio';

interface AdminDashboardProps {
  token: string;
  onLogout: () => void;
  onClose: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  token,
  onLogout,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'participants' | 'config' | 'questions'>('dashboard');
  const [dashboardRightView, setDashboardRightView] = useState<'conversion' | 'hourly' | 'live'>('conversion');
  const [hourlyViewMode, setHourlyViewMode] = useState<'active' | 'all'>('active');
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [participants, setParticipants] = useState<GameResult[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState('all');
  const [filterPendingPrizes, setFilterPendingPrizes] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Fetch Admin Data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Stats
      const statsRes = await fetch(`/api/admin/stats?date=${selectedDateFilter}`, { headers });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

      // Participants
      const partRes = await fetch('/api/admin/participants', { headers });
      if (partRes.ok) {
        const partData = await partRes.json();
        setParticipants(partData.results || []);
      }

      // Config & Questions
      const cfgRes = await fetch('/api/config');
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setConfig(cfgData.config);
        setQuizQuestions(cfgData.quizQuestions || []);
      }
    } catch (e) {
      console.error('Error fetching admin data', e);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedDateFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle Prize Delivery
  const handleTogglePrizeDelivered = async (resultId: string, currentStatus: boolean) => {
    sounds.playClick();
    try {
      const res = await fetch('/api/admin/deliver-prize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resultId, delivered: !currentStatus }),
      });

      if (res.ok) {
        sounds.playSuccess();
        fetchData();
      }
    } catch (e) {
      sounds.playError();
    }
  };

  // Save Config Changes
  const handleSaveConfig = async (newConfig: Partial<AppConfig>, newQuestions?: QuizQuestion[]) => {
    sounds.playClick();
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          config: newConfig,
          quizQuestions: newQuestions || quizQuestions,
        }),
      });

      if (res.ok) {
        sounds.playSuccess();
        setSaveSuccessNotice(true);
        setTimeout(() => setSaveSuccessNotice(false), 3000);
        fetchData();
      }
    } catch (e) {
      sounds.playError();
    }
  };

  // Trigger Google Sheets Sync
  const handleSyncGoogleSheets = async () => {
    sounds.playClick();
    setSyncStatus('Sincronizando con Google Sheets...');
    try {
      const res = await fetch('/api/admin/sync-sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ webhookUrl: config?.googleSheetsWebhookUrl }),
      });

      const data = await res.json();
      if (res.ok) {
        sounds.playSuccess();
        setSyncStatus(`¡Sincronización exitosa! (${data.syncedCount} registros procesados)`);
      } else {
        sounds.playError();
        setSyncStatus(`Error: ${data.error}`);
      }
    } catch (e: any) {
      sounds.playError();
      setSyncStatus(`Fallo de conexión: ${e.message}`);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    sounds.playClick();
    window.open('/api/admin/export-csv', '_blank');
  };

  // Export Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    sounds.playClick();
    if (!participants.length) return;

    const dataToExport = participants.map((p) => ({
      ID: p.id,
      Nombre: p.name,
      Celular: p.phone,
      Fecha: p.createdAt.split('T')[0],
      Hora: p.createdAt.split('T')[1]?.split('.')[0] || '',
      Juego: p.gameName,
      Resultado: p.won ? 'GANÓ' : 'NO GANÓ',
      '¿Ganó?': p.won ? 'SÍ' : 'NO',
      'Premio Asignado': p.hasPrize ? (p.prizeType || config?.prizeName) : 'Sin premio',
      'Código de Canje': p.redeemCode || '-',
      'Premio Entregado': p.prizeDelivered ? 'SÍ' : 'NO',
      'Hora Entrega': p.deliveredAt ? p.deliveredAt.split('T')[1]?.split('.')[0] : '-',
      'Duración (segundos)': p.durationSeconds,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participantes');

    // Auto-width columns
    const maxCols = Object.keys(dataToExport[0] || {}).map((key) => ({
      wch: Math.max(key.length, 14),
    }));
    worksheet['!cols'] = maxCols;

    XLSX.writeFile(
      workbook,
      `BancoSol_DesafioTalento_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    sounds.playSuccess();
  };

  // Filtered participants
  const filteredList = participants.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matches =
        p.name.toLowerCase().includes(q) ||
        p.phone.includes(q) ||
        (p.redeemCode && p.redeemCode.toLowerCase().includes(q));
      if (!matches) return false;
    }
    if (gameFilter !== 'all' && p.gameId !== gameFilter) {
      return false;
    }
    if (filterPendingPrizes && (!p.hasPrize || p.prizeDelivered)) {
      return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/95 backdrop-blur-xl p-4 sm:p-6 flex flex-col items-center">
      <div className="w-full max-w-7xl bg-slate-900/90 border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl ring-1 ring-white/5 flex flex-col gap-6">
        {/* Top Header of Admin Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center text-xl shadow-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <span>Panel de Reclutamiento y Evento</span>
                <span className="text-xs font-bold py-0.5 px-2.5 bg-orange-500/20 text-orange-300 rounded-full border border-orange-500/30">
                  BancoSol
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Control en tiempo real de participantes, premios, métricas y configuración
              </p>
            </div>
          </div>

          {/* Quick Actions / Close */}
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              title="Refrescar datos"
              className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                onLogout();
              }}
              className="py-2 px-3.5 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition-colors"
            >
              Cerrar Sesión
            </button>
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('dashboard');
            }}
            className={`py-2 px-4 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Dashboard del Día</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('participants');
            }}
            className={`py-2 px-4 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'participants'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Participantes ({participants.length})</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('config');
            }}
            className={`py-2 px-4 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'config'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configuración y Juegos</span>
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              setActiveTab('questions');
            }}
            className={`py-2 px-4 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'questions'
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Preguntas de RRHH</span>
          </button>
        </div>

        {/* TAB 1: DASHBOARD DEL DÍA */}
        {activeTab === 'dashboard' && stats && (
          <div className="space-y-6 animate-fadeIn">
            {/* Date Filter & Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold text-slate-300">Periodo de Análisis:</span>
                <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setSelectedDateFilter(new Date().toISOString().split('T')[0])}
                    className={`text-xs font-bold py-1 px-3 rounded-lg transition-colors ${
                      selectedDateFilter === new Date().toISOString().split('T')[0]
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => setSelectedDateFilter('all')}
                    className={`text-xs font-bold py-1 px-3 rounded-lg transition-colors ${
                      selectedDateFilter === 'all'
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todo el Evento
                  </button>
                </div>

                {selectedDateFilter !== 'all' && (
                  <input
                    type="date"
                    value={selectedDateFilter}
                    onChange={(e) => setSelectedDateFilter(e.target.value)}
                    className="bg-slate-900 border border-white/15 text-white text-xs font-medium py-1 px-2.5 rounded-lg outline-none focus:border-orange-400"
                  />
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  Total registros: <strong className="text-white">{stats.totalPlays}</strong>
                </span>
                <button
                  onClick={() => fetchData()}
                  disabled={isLoading}
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-colors"
                  title="Actualizar datos"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400">Total Partidas</p>
                <p className="text-2xl font-black text-white mt-1">{stats.totalPlays}</p>
                <p className="text-[10px] text-slate-500 mt-1">Registradas</p>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400">Participantes Únicos</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">{stats.uniqueParticipants}</p>
                <p className="text-[10px] text-slate-500 mt-1">{stats.repeatedParticipants} repetidos</p>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400">Ganadores</p>
                <p className="text-2xl font-black text-amber-400 mt-1">{stats.totalWinners}</p>
                <p className="text-[10px] text-slate-500 mt-1">{stats.winRatePercentage}% tasa de victoria</p>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400">No Ganadores</p>
                <p className="text-2xl font-black text-rose-400 mt-1">{stats.totalLosers}</p>
                <p className="text-[10px] text-slate-500 mt-1">Intentos en práctica</p>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400">Premios Entregados</p>
                <p className="text-2xl font-black text-indigo-400 mt-1">{stats.prizesDelivered}</p>
                <p className="text-[10px] text-orange-400 mt-1 font-bold">{stats.prizesPending} pendientes</p>
              </div>

              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-slate-400">Stock Restante</p>
                <p className="text-2xl font-black text-orange-400 mt-1">{stats.prizesStockRemaining}</p>
                <p className="text-[10px] text-slate-500 mt-1">De {config?.prizesTotalStock || 50} total</p>
              </div>
            </div>

            {/* Main Analysis Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Plays by Game Breakdown */}
              <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Gamepad2 className="w-4 h-4 text-orange-400" />
                      <span>Partidas por Minijuego</span>
                    </span>
                    <span className="text-xs font-semibold text-orange-400">
                      Top: <strong>{stats.mostPlayedGame.name}</strong>
                    </span>
                  </h4>

                  <div className="space-y-3.5">
                    {GAMES_CATALOG.map((g) => {
                      const count = stats.playsByGame[g.id] || 0;
                      const pct = stats.totalPlays > 0 ? Math.round((count / stats.totalPlays) * 100) : 0;
                      return (
                        <div key={g.id} className="bg-white/5 p-2.5 rounded-xl border border-white/5">
                          <div className="flex justify-between text-xs font-bold text-slate-200 mb-1.5">
                            <span className="flex items-center gap-2">
                              <span className="text-base">{g.icon}</span>
                              <span>{g.name}</span>
                            </span>
                            <span className="font-mono text-orange-300">
                              {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Engagement Metric Card */}
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Promedio partidas / persona:</span>
                  </div>
                  <span className="font-extrabold text-amber-300 text-sm">
                    {stats.uniqueParticipants > 0
                      ? (stats.totalPlays / stats.uniqueParticipants).toFixed(1)
                      : '0'}{' '}
                    partidas
                  </span>
                </div>
              </div>

              {/* Right Column: Advanced Activity, Conversion & Flow Hub */}
              <div className="lg:col-span-7 bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  {/* Interactive Sub-view Navigation Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 mb-4">
                    <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-white/10">
                      <button
                        onClick={() => {
                          sounds.playClick();
                          setDashboardRightView('conversion');
                        }}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          dashboardRightView === 'conversion'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        <span>Conversión y Premios</span>
                      </button>

                      <button
                        onClick={() => {
                          sounds.playClick();
                          setDashboardRightView('hourly');
                        }}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          dashboardRightView === 'hourly'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Distribución Horaria</span>
                      </button>

                      <button
                        onClick={() => {
                          sounds.playClick();
                          setDashboardRightView('live');
                        }}
                        className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          dashboardRightView === 'live'
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Feed en Vivo</span>
                      </button>
                    </div>

                    {/* Hourly view extra toggle */}
                    {dashboardRightView === 'hourly' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-400 font-medium">Ver:</span>
                        <select
                          value={hourlyViewMode}
                          onChange={(e) => setHourlyViewMode(e.target.value as 'active' | 'all')}
                          className="bg-slate-900 text-white text-xs py-1 px-2.5 rounded-lg border border-white/15 outline-none"
                        >
                          <option value="active">Solo Horas con Actividad</option>
                          <option value="all">24 Horas Completas</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* VIEW 1: CONVERSIÓN Y PREMIOS (EMBUDO COMPLETO) */}
                  {dashboardRightView === 'conversion' && (
                    <div className="space-y-4 animate-fadeIn">
                      {/* Funnel summary tiles */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase font-bold text-slate-400">Total Jugadores</span>
                            <Users className="w-4 h-4 text-cyan-400" />
                          </div>
                          <p className="text-xl font-black text-white mt-1">{stats.uniqueParticipants}</p>
                          <p className="text-[10px] text-cyan-300/80 mt-0.5 font-medium">
                            {stats.totalPlays} partidas jugadas
                          </p>
                        </div>

                        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase font-bold text-emerald-300">Ganaron Premio</span>
                            <Trophy className="w-4 h-4 text-emerald-400" />
                          </div>
                          <p className="text-xl font-black text-emerald-400 mt-1">{stats.totalWinners}</p>
                          <p className="text-[10px] text-emerald-300/80 mt-0.5 font-medium">
                            {stats.winRatePercentage}% tasa de victoria
                          </p>
                        </div>

                        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] uppercase font-bold text-rose-300">No Ganaron</span>
                            <Target className="w-4 h-4 text-rose-400" />
                          </div>
                          <p className="text-xl font-black text-rose-400 mt-1">{stats.totalLosers}</p>
                          <p className="text-[10px] text-rose-300/80 mt-0.5 font-medium">
                            {stats.totalPlays > 0 ? Math.round((stats.totalLosers / stats.totalPlays) * 100) : 0}% en aprendizaje
                          </p>
                        </div>
                      </div>

                      {/* Prize Fulfillment Status alert box */}
                      <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                            <Gift className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">Estado de Entrega de Premios en Stand</p>
                            <p className="text-[11px] text-slate-300">
                              <strong className="text-emerald-400">{stats.prizesDelivered}</strong> entregados físicamente |{' '}
                              <strong className="text-orange-400">{stats.prizesPending}</strong> con código pendientes por reclamar
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            sounds.playClick();
                            setActiveTab('participants');
                            setFilterPendingPrizes(true);
                          }}
                          className="py-1.5 px-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1 cursor-pointer"
                        >
                          <span>Ver Pendientes</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Performance Table per Game */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                          Rendimiento y Tasa de Éxito por Minijuego
                        </p>
                        <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden max-h-[160px] overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-white/5 text-slate-400 font-semibold uppercase text-[10px] border-b border-white/10 sticky top-0">
                              <tr>
                                <th className="py-2 px-3">Minijuego</th>
                                <th className="py-2 px-2 text-center">Partidas</th>
                                <th className="py-2 px-2 text-center">Ganaron</th>
                                <th className="py-2 px-2 text-center">No Ganaron</th>
                                <th className="py-2 px-2 text-center">Efectividad</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium">
                              {stats.gamePerformance && stats.gamePerformance.length > 0 ? (
                                stats.gamePerformance.map((gp) => (
                                  <tr key={gp.gameId} className="hover:bg-white/5 transition-colors">
                                    <td className="py-2 px-3 text-white font-semibold flex items-center gap-1.5">
                                      <span>
                                        {GAMES_CATALOG.find((g) => g.id === gp.gameId)?.icon || '🎮'}
                                      </span>
                                      <span className="truncate max-w-[140px]">{gp.gameName}</span>
                                    </td>
                                    <td className="py-2 px-2 text-center font-bold text-slate-200">{gp.totalPlays}</td>
                                    <td className="py-2 px-2 text-center font-bold text-emerald-400">{gp.winners}</td>
                                    <td className="py-2 px-2 text-center font-bold text-rose-400">{gp.losers}</td>
                                    <td className="py-2 px-2 text-center">
                                      <span
                                        className={`py-0.5 px-2 rounded-md text-[10px] font-extrabold ${
                                          gp.winRate >= 60
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}
                                      >
                                        {gp.winRate}%
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={5} className="py-4 text-center text-slate-400 text-xs">
                                    Aún no hay registros en este periodo
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* VIEW 2: DISTRIBUCIÓN HORARIA DINÁMICA */}
                  {dashboardRightView === 'hourly' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-300">
                          Hora Pico de Afluencia:{' '}
                          <strong className="text-purple-300 bg-purple-500/20 py-0.5 px-2 rounded-md border border-purple-500/30">
                            {stats.peakHour}
                          </strong>
                        </p>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {hourlyViewMode === 'active' ? 'Mostrando horas activas' : 'Mostrando 24 horas'}
                        </span>
                      </div>

                      {/* Hourly Grid with Dynamic Bars */}
                      {(() => {
                        const itemsToRender =
                          hourlyViewMode === 'active'
                            ? stats.hourlyDistribution.filter((item) => item.count > 0)
                            : stats.hourlyDistribution;

                        if (itemsToRender.length === 0) {
                          return (
                            <div className="p-8 bg-slate-900/60 border border-white/10 rounded-2xl text-center">
                              <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                              <p className="text-sm font-bold text-white">Sin partidas registradas para la fecha seleccionada</p>
                              <p className="text-xs text-slate-400 mt-1">
                                Selecciona <strong>"Todo el Evento"</strong> arriba para ver el histórico de afluencia horaria completo.
                              </p>
                            </div>
                          );
                        }

                        const maxCount = Math.max(...itemsToRender.map((i) => i.count), 1);

                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                            {itemsToRender.map((item) => {
                              const isPeak = item.hour === stats.peakHour && item.count > 0;
                              const pctBar = Math.round((item.count / maxCount) * 100);

                              return (
                                <div
                                  key={item.hour}
                                  className={`p-3 rounded-2xl border transition-all ${
                                    isPeak
                                      ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-900/30 ring-1 ring-purple-400/40'
                                      : item.count > 0
                                      ? 'bg-white/5 border-white/15 hover:bg-white/10'
                                      : 'bg-white/[0.02] border-white/5 opacity-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-mono font-bold text-slate-200">{item.hour}</span>
                                    {isPeak && (
                                      <span className="text-[9px] font-black uppercase tracking-wider text-purple-300 bg-purple-500/30 py-0.5 px-1.5 rounded-md border border-purple-400/40 flex items-center gap-0.5">
                                        <Flame className="w-2.5 h-2.5" />
                                        Pico
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-lg font-black text-white">{item.count}</span>
                                    <span className="text-[10px] text-slate-400 font-medium">partidas</span>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden my-1.5">
                                    <div
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        isPeak
                                          ? 'bg-gradient-to-r from-purple-500 to-pink-400'
                                          : 'bg-gradient-to-r from-orange-500 to-amber-400'
                                      }`}
                                      style={{ width: `${pctBar}%` }}
                                    />
                                  </div>

                                  {/* Winners vs Losers breakdown */}
                                  <div className="flex items-center justify-between text-[10px] font-bold">
                                    <span className="text-emerald-400">✓ {item.winners} win</span>
                                    <span className="text-rose-400">✗ {item.losers} drop</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* VIEW 3: FEED EN VIVO DEL STAND */}
                  {dashboardRightView === 'live' && (
                    <div className="space-y-2 animate-fadeIn">
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                        <span>Últimas participaciones en vivo:</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          En directo
                        </span>
                      </div>

                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                        {stats.recentActivity && stats.recentActivity.length > 0 ? (
                          stats.recentActivity.map((r) => (
                            <div
                              key={r.id}
                              className="p-2.5 bg-slate-900/80 border border-white/10 rounded-xl flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-lg">
                                  {GAMES_CATALOG.find((g) => g.id === r.gameId)?.icon || '🎮'}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-bold text-white truncate max-w-[150px]">{r.name}</p>
                                  <p className="text-[10px] text-slate-400">
                                    {r.gameName} • {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {r.won ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-extrabold py-0.5 px-2 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      Ganó
                                    </span>
                                    {r.redeemCode && (
                                      <button
                                        onClick={() => handleTogglePrizeDelivered(r.id, r.prizeDelivered)}
                                        className={`py-1 px-2 rounded-lg text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all ${
                                          r.prizeDelivered
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500 hover:text-white'
                                        }`}
                                        title={r.prizeDelivered ? 'Premio ya entregado' : 'Hacer clic para entregar premio'}
                                      >
                                        <Gift className="w-3 h-3" />
                                        <span>{r.prizeDelivered ? 'Entregado' : 'Canjear'}</span>
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold py-0.5 px-2 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    En práctica
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center text-slate-400 text-xs">
                            No hay actividad reciente en el periodo seleccionado
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Export bar inside dashboard */}
                <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap gap-3 items-center justify-between">
                  <span className="text-xs text-slate-400">Descarga los registros completos:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportCSV}
                      className="py-2 px-3 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV</span>
                    </button>
                    <button
                      onClick={handleExportExcel}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-lg cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PARTICIPANTES TABLE */}
        {activeTab === 'participants' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, celular o código de canje..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs outline-none focus:border-orange-500 font-medium"
                  />
                </div>

                {/* Game selector filter */}
                <select
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  className="py-2 px-3 bg-slate-800 border border-white/10 rounded-xl text-white text-xs outline-none"
                >
                  <option value="all">Todos los Juegos</option>
                  {GAMES_CATALOG.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>

                {/* Pending prizes toggle filter */}
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterPendingPrizes}
                    onChange={(e) => setFilterPendingPrizes(e.target.checked)}
                    className="rounded text-orange-500"
                  />
                  <span>Solo Premios Pendientes</span>
                </label>
              </div>

              {/* Exports */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="py-2 px-3 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-lg"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-white/10 rounded-2xl bg-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5">Participante</th>
                    <th className="p-3.5">Celular</th>
                    <th className="p-3.5">Juego</th>
                    <th className="p-3.5">Resultado</th>
                    <th className="p-3.5">Código Canje</th>
                    <th className="p-3.5">Premio Entregado</th>
                    <th className="p-3.5">Fecha y Hora</th>
                    <th className="p-3.5 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No se encontraron registros con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredList.map((row) => (
                      <tr key={row.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-3.5 font-bold text-white">
                          {row.name}
                        </td>
                        <td className="p-3.5 font-mono text-slate-300">
                          {row.phone}
                        </td>
                        <td className="p-3.5 font-medium text-slate-200">
                          {row.gameName}
                        </td>
                        <td className="p-3.5">
                          {row.won ? (
                            <span className="py-1 px-2.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-full font-bold text-[10px]">
                              GANÓ
                            </span>
                          ) : (
                            <span className="py-1 px-2.5 bg-slate-800 text-slate-400 rounded-full font-bold text-[10px]">
                              NO GANÓ
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 font-mono font-black text-orange-400">
                          {row.redeemCode || '-'}
                        </td>
                        <td className="p-3.5">
                          {row.hasPrize ? (
                            row.prizeDelivered ? (
                              <span className="py-1 px-2.5 bg-emerald-500/20 text-emerald-300 rounded-full font-bold text-[10px] flex items-center gap-1 w-fit">
                                <Check className="w-3 h-3" />
                                Entregado
                              </span>
                            ) : (
                              <span className="py-1 px-2.5 bg-amber-500/20 text-amber-300 rounded-full font-bold text-[10px] w-fit">
                                Pendiente
                              </span>
                            )
                          ) : (
                            <span className="text-slate-500 text-[10px]">Sin premio</span>
                          )}
                        </td>
                        <td className="p-3.5 text-slate-400 text-[11px] font-mono">
                          {row.createdAt.split('T')[0]} {row.createdAt.split('T')[1]?.split('.')[0]}
                        </td>
                        <td className="p-3.5 text-right">
                          {row.hasPrize && (
                            <button
                              onClick={() => handleTogglePrizeDelivered(row.id, row.prizeDelivered)}
                              className={`py-1 px-3 rounded-xl font-bold text-[10px] uppercase transition-colors ${
                                row.prizeDelivered
                                  ? 'bg-white/10 hover:bg-white/20 text-slate-300'
                                  : 'bg-orange-500 hover:bg-orange-400 text-white shadow-md'
                              }`}
                            >
                              {row.prizeDelivered ? 'Desmarcar' : 'Marcar Entregado'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CONFIGURACIÓN GENERAL Y GESTIÓN DE JUEGOS */}
        {activeTab === 'config' && config && (
          <div className="space-y-6 animate-fadeIn">
            {saveSuccessNotice && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>¡Configuración guardada exitosamente!</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Event & Prize Inventory Configuration */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-orange-400" />
                  <span>Configuración del Evento y Premios</span>
                </h4>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nombre del Evento
                  </label>
                  <input
                    type="text"
                    value={config.eventName}
                    onChange={(e) => setConfig({ ...config, eventName: e.target.value })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Mensaje de Bienvenida
                  </label>
                  <input
                    type="text"
                    value={config.welcomeMessage}
                    onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Stock Total de Premios
                    </label>
                    <input
                      type="number"
                      value={config.prizesTotalStock}
                      onChange={(e) => setConfig({ ...config, prizesTotalStock: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Stock Restante Disponible
                    </label>
                    <input
                      type="number"
                      value={config.prizesRemaining}
                      onChange={(e) => setConfig({ ...config, prizesRemaining: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nombre del Premio / Kit
                  </label>
                  <input
                    type="text"
                    value={config.prizeName}
                    onChange={(e) => setConfig({ ...config, prizeName: e.target.value })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-medium"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.prizesAvailable}
                      onChange={(e) => setConfig({ ...config, prizesAvailable: e.target.checked })}
                      className="rounded text-orange-500 w-4 h-4"
                    />
                    <span>Habilitar entrega de premios físicos</span>
                  </label>
                </div>

                <button
                  onClick={() => handleSaveConfig(config)}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg mt-2"
                >
                  GUARDAR CAMBIOS DE EVENTO
                </button>
              </div>

              {/* Minigames Switchboard */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-orange-400" />
                  <span>Interruptores de Juegos Activos</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Activa o desactiva cualquier juego instantáneamente para el público.
                </p>

                <div className="space-y-2.5">
                  {GAMES_CATALOG.map((g) => {
                    const isEnabled = config.activeGames?.[g.id] !== false;
                    return (
                      <div
                        key={g.id}
                        className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{g.icon}</span>
                          <div>
                            <p className="text-xs font-bold text-white">{g.name}</p>
                            <p className="text-[10px] text-slate-400">{g.subtitle}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            const nextActive = {
                              ...config.activeGames,
                              [g.id]: !isEnabled,
                            };
                            setConfig({ ...config, activeGames: nextActive });
                            handleSaveConfig({ activeGames: nextActive });
                          }}
                          className={`py-1 px-3 rounded-full text-xs font-bold uppercase transition-colors ${
                            isEnabled
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}
                        >
                          {isEnabled ? 'ACTIVO' : 'DESACTIVADO'}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Google Sheets Webhook Integration Section */}
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <h5 className="text-xs font-black uppercase text-slate-300">
                    Sincronización con Google Sheets
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Pega la URL de tu Google Apps Script Webhook o servicio para enviar las filas automáticamente:
                  </p>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={config.googleSheetsWebhookUrl || ''}
                    onChange={(e) => setConfig({ ...config, googleSheetsWebhookUrl: e.target.value })}
                    className="w-full p-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono font-medium"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleSaveConfig(config)}
                      className="flex-1 py-2 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold rounded-xl"
                    >
                      Guardar URL
                    </button>
                    <button
                      onClick={handleSyncGoogleSheets}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg"
                    >
                      Sincronizar Todo Ahora
                    </button>
                  </div>
                  {syncStatus && (
                    <p className="text-[11px] text-orange-300 font-semibold mt-1">
                      {syncStatus}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PREGUNTAS DE RRHH */}
        {activeTab === 'questions' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                Preguntas del Quiz Express de Talento Humano ({quizQuestions.length})
              </h4>
              <button
                onClick={() => handleSaveConfig({}, quizQuestions)}
                className="py-2 px-4 bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs rounded-xl shadow-lg"
              >
                GUARDAR PREGUNTAS
              </button>
            </div>

            <div className="space-y-4">
              {quizQuestions.map((q, qIdx) => (
                <div key={q.id || qIdx} className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-orange-400 uppercase">
                      Pregunta #{qIdx + 1} ({q.category})
                    </span>
                  </div>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => {
                      const updated = [...quizQuestions];
                      updated[qIdx].question = e.target.value;
                      setQuizQuestions(updated);
                    }}
                    className="w-full p-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-bold"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name={`correct_${qIdx}`}
                          checked={q.correctIndex === optIdx}
                          onChange={() => {
                            const updated = [...quizQuestions];
                            updated[qIdx].correctIndex = optIdx;
                            setQuizQuestions(updated);
                          }}
                        />
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const updated = [...quizQuestions];
                            updated[qIdx].options[optIdx] = e.target.value;
                            setQuizQuestions(updated);
                          }}
                          className={`w-full p-1.5 rounded-lg text-xs ${
                            q.correctIndex === optIdx
                              ? 'bg-emerald-500/20 border border-emerald-500 text-white font-bold'
                              : 'bg-white/5 border border-white/10 text-slate-300'
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Explicación / Feedback:
                    </label>
                    <input
                      type="text"
                      value={q.explanation}
                      onChange={(e) => {
                        const updated = [...quizQuestions];
                        updated[qIdx].explanation = e.target.value;
                        setQuizQuestions(updated);
                      }}
                      className="w-full p-1.5 bg-white/5 border border-white/10 rounded-lg text-slate-300 text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { DEFAULT_APP_CONFIG, DEFAULT_QUIZ_QUESTIONS, DEFAULT_PAIR_CARDS, DEFAULT_SWIPE_CARDS, DEFAULT_ROULETTE_SLICES, DEFAULT_CHEST_OPTIONS } from './src/lib/gameData';
import { AppConfig, GameResult, Participant, DailyStats } from './src/types';

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface DatabaseSchema {
  config: AppConfig;
  participants: Participant[];
  results: GameResult[];
  quizQuestions: any[];
  pairCards: any[];
  swipeCards: any[];
  rouletteSlices: any[];
  chestOptions: any[];
}

function loadDatabase(): DatabaseSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      return {
        config: { ...DEFAULT_APP_CONFIG, ...(data.config || {}) },
        participants: data.participants || [],
        results: data.results || [],
        quizQuestions: data.quizQuestions || DEFAULT_QUIZ_QUESTIONS,
        pairCards: data.pairCards || DEFAULT_PAIR_CARDS,
        swipeCards: data.swipeCards || DEFAULT_SWIPE_CARDS,
        rouletteSlices: data.rouletteSlices || DEFAULT_ROULETTE_SLICES,
        chestOptions: data.chestOptions || DEFAULT_CHEST_OPTIONS,
      };
    } catch (e) {
      console.error('Error reading db.json, recreating defaults', e);
    }
  }

  const initialDb: DatabaseSchema = {
    config: DEFAULT_APP_CONFIG,
    participants: [],
    results: [],
    quizQuestions: DEFAULT_QUIZ_QUESTIONS,
    pairCards: DEFAULT_PAIR_CARDS,
    swipeCards: DEFAULT_SWIPE_CARDS,
    rouletteSlices: DEFAULT_ROULETTE_SLICES,
    chestOptions: DEFAULT_CHEST_OPTIONS,
  };
  saveDatabase(initialDb);
  return initialDb;
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving db.json', e);
  }
}

let db = loadDatabase();

// Sync to Google Sheets helper
async function syncRecordToGoogleSheets(record: GameResult, webhookUrl?: string) {
  const url = webhookUrl || db.config.googleSheetsWebhookUrl || process.env.GOOGLE_SHEETS_WEBHOOK_URL;
  if (!url || !url.startsWith('http')) return;

  try {
    const payload = {
      id: record.id,
      nombre: record.name,
      celular: record.phone,
      fecha: record.createdAt.split('T')[0],
      hora: record.createdAt.split('T')[1]?.split('.')[0] || '',
      juego: record.gameName,
      resultado: record.won ? 'GANÓ' : 'NO GANÓ',
      gano: record.won ? 'SÍ' : 'NO',
      recibioPremio: record.hasPrize ? 'SÍ' : 'NO',
      premioEntregado: record.prizeDelivered ? 'SÍ' : 'NO',
      codigoCanje: record.redeemCode || '',
      premioTipo: record.prizeType || (record.hasPrize ? db.config.prizeName : 'Sin premio'),
      duracionSegundos: record.durationSeconds,
      timestamp: record.createdAt,
    };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => {
      console.warn('Asynchronous Google Sheets webhook error (ignored to preserve UX):', err.message);
    });
  } catch (e) {
    console.warn('Sheets sync skipped', e);
  }
}

async function startServer() {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // --- PUBLIC API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get public app configuration
  app.get('/api/config', (req, res) => {
    res.json({
      config: db.config,
      quizQuestions: db.quizQuestions,
      pairCards: db.pairCards,
      swipeCards: db.swipeCards,
      rouletteSlices: db.rouletteSlices,
      chestOptions: db.chestOptions,
    });
  });

  // Check phone for repeating participant
  app.post('/api/check-phone', (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Número de celular requerido' });
    }

    const cleanPhone = String(phone).trim().replace(/\D/g, '');
    const userPlays = db.results.filter(r => r.phone.replace(/\D/g, '') === cleanPhone);
    const existingParticipant = db.participants.find(p => p.phone.replace(/\D/g, '') === cleanPhone);

    res.json({
      isRepeated: userPlays.length > 0,
      totalPlays: userPlays.length,
      previousName: existingParticipant?.name || userPlays[0]?.name || '',
      lastPlayDate: userPlays[userPlays.length - 1]?.createdAt || null,
    });
  });

  // Register participant
  app.post('/api/register', (req, res) => {
    const { name, phone } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Nombre y celular son requeridos' });
    }

    const cleanPhone = String(phone).trim().replace(/\D/g, '');
    const cleanName = String(name).trim();

    let participant = db.participants.find(p => p.phone.replace(/\D/g, '') === cleanPhone);
    const isRepeated = !!participant;

    if (!participant) {
      participant = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: cleanName,
        phone: cleanPhone,
        registeredAt: new Date().toISOString(),
        isRepeated: false,
        totalPlays: 0,
      };
      db.participants.push(participant);
    } else {
      participant.name = cleanName; // update name if changed
      participant.isRepeated = true;
    }

    saveDatabase(db);
    res.json({ success: true, participant, isRepeated });
  });

  // Submit Game Result
  app.post('/api/submit-game', (req, res) => {
    const {
      participantId,
      name,
      phone,
      gameId,
      gameName,
      won,
      score,
      maxScore,
      durationSeconds,
      details,
    } = req.body;

    if (!name || !phone || !gameId) {
      return res.status(400).json({ error: 'Datos incompletos de la partida' });
    }

    const cleanPhone = String(phone).trim().replace(/\D/g, '');
    const isWin = Boolean(won);

    // Prize logic on server:
    let hasPrize = false;
    let redeemCode = undefined;
    let prizeType = undefined;

    if (isWin) {
      if (db.config.prizesAvailable && db.config.prizesRemaining > 0) {
        hasPrize = true;
        db.config.prizesRemaining = Math.max(0, db.config.prizesRemaining - 1);
        prizeType = db.config.prizeName;
        // Generate verifiable 4-digit code
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        redeemCode = `BS-${randomNum}`;
      } else {
        hasPrize = false;
        prizeType = 'Sin stock disponible';
      }
    }

    const newResult: GameResult = {
      id: 'res_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      participantId: participantId || 'anon',
      name: String(name).trim(),
      phone: cleanPhone,
      gameId,
      gameName: gameName || gameId,
      won: isWin,
      score: Number(score) || 0,
      maxScore: Number(maxScore) || 0,
      durationSeconds: Number(durationSeconds) || 0,
      hasPrize,
      redeemCode,
      prizeType,
      prizeDelivered: false,
      createdAt: new Date().toISOString(),
      details: details || {},
    };

    db.results.push(newResult);

    // Update participant play count
    const p = db.participants.find(part => part.phone.replace(/\D/g, '') === cleanPhone);
    if (p) {
      p.totalPlays = (p.totalPlays || 0) + 1;
    }

    saveDatabase(db);

    // Asynchronous background sync
    syncRecordToGoogleSheets(newResult);

    res.json({
      success: true,
      result: newResult,
      prizesRemaining: db.config.prizesRemaining,
      prizesAvailable: db.config.prizesAvailable && db.config.prizesRemaining > 0,
    });
  });

  // --- ADMIN AUTH & DASHBOARD ROUTES ---

  // Admin login
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const validUser = process.env.ADMIN_USER || 'reclutador';
    const validPass = process.env.ADMIN_PASS || 'bancosol';

    if (username === validUser && password === validPass) {
      const token = 'dt_admin_' + Buffer.from(`${username}:${Date.now()}`).toString('base64');
      return res.json({ success: true, token, user: username });
    }

    return res.status(401).json({ error: 'Credenciales inválidas' });
  });

  // Admin Auth Middleware
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer dt_admin_')) {
      return next();
    }
    return res.status(403).json({ error: 'Acceso no autorizado' });
  };

  // Get Admin Stats
  app.get('/api/admin/stats', requireAdmin, (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const requestedDate = (req.query.date as string) || today;

    // Filter results for selected date or all if 'all'
    const filteredResults = requestedDate === 'all' 
      ? db.results 
      : db.results.filter(r => r.createdAt.startsWith(requestedDate));

    const totalPlays = filteredResults.length;
    const uniquePhones = new Set(filteredResults.map(r => r.phone.replace(/\D/g, '')));
    const uniqueParticipants = uniquePhones.size;
    const repeatedParticipants = Math.max(0, totalPlays - uniqueParticipants);

    const winners = filteredResults.filter(r => r.won);
    const totalWinners = winners.length;
    const totalLosers = Math.max(0, totalPlays - totalWinners);
    const prizesDelivered = filteredResults.filter(r => r.prizeDelivered).length;
    const prizesPending = filteredResults.filter(r => r.hasPrize && !r.prizeDelivered).length;
    const winRatePercentage = totalPlays > 0 ? Math.round((totalWinners / totalPlays) * 100) : 0;

    // Plays by game & Game Performance breakdown
    const gameStatsMap: Record<string, {
      gameId: string;
      gameName: string;
      totalPlays: number;
      winners: number;
      losers: number;
      prizesWon: number;
      totalDuration: number;
    }> = {};

    const playsByGame: Record<string, number> = {};
    filteredResults.forEach(r => {
      playsByGame[r.gameId] = (playsByGame[r.gameId] || 0) + 1;

      if (!gameStatsMap[r.gameId]) {
        gameStatsMap[r.gameId] = {
          gameId: r.gameId,
          gameName: r.gameName || r.gameId,
          totalPlays: 0,
          winners: 0,
          losers: 0,
          prizesWon: 0,
          totalDuration: 0,
        };
      }

      gameStatsMap[r.gameId].totalPlays += 1;
      if (r.won) {
        gameStatsMap[r.gameId].winners += 1;
      } else {
        gameStatsMap[r.gameId].losers += 1;
      }
      if (r.hasPrize) {
        gameStatsMap[r.gameId].prizesWon += 1;
      }
      gameStatsMap[r.gameId].totalDuration += (r.durationSeconds || 0);
    });

    const gamePerformance = Object.values(gameStatsMap).map(g => ({
      gameId: g.gameId,
      gameName: g.gameName,
      totalPlays: g.totalPlays,
      winners: g.winners,
      losers: g.losers,
      prizesWon: g.prizesWon,
      winRate: g.totalPlays > 0 ? Math.round((g.winners / g.totalPlays) * 100) : 0,
      avgDurationSeconds: g.totalPlays > 0 ? Math.round(g.totalDuration / g.totalPlays) : 0,
    }));

    let mostPlayedGame = { gameId: 'ninguno', name: 'Sin partidas aún', count: 0 };
    Object.entries(playsByGame).forEach(([gameId, count]) => {
      if (count > mostPlayedGame.count) {
        const game = db.results.find(r => r.gameId === gameId)?.gameName || gameId;
        mostPlayedGame = { gameId, name: game, count };
      }
    });

    // 24-hour distribution (00:00 to 23:00)
    const hourMap: Record<number, { count: number; winners: number; losers: number; phones: Set<string> }> = {};
    for (let h = 0; h < 24; h++) {
      hourMap[h] = { count: 0, winners: 0, losers: 0, phones: new Set() };
    }

    filteredResults.forEach(r => {
      const dateObj = new Date(r.createdAt);
      const hourNum = isNaN(dateObj.getTime()) ? 0 : dateObj.getHours();
      if (hourMap[hourNum]) {
        hourMap[hourNum].count += 1;
        if (r.won) {
          hourMap[hourNum].winners += 1;
        } else {
          hourMap[hourNum].losers += 1;
        }
        hourMap[hourNum].phones.add(r.phone.replace(/\D/g, ''));
      }
    });

    let peakHour = 'Sin actividad';
    let maxHourCount = 0;
    for (let h = 0; h < 24; h++) {
      if (hourMap[h].count > maxHourCount) {
        maxHourCount = hourMap[h].count;
        peakHour = `${h.toString().padStart(2, '0')}:00`;
      }
    }

    const hourlyDistribution = [];
    for (let h = 0; h < 24; h++) {
      hourlyDistribution.push({
        hour: `${h.toString().padStart(2, '0')}:00`,
        count: hourMap[h].count,
        winners: hourMap[h].winners,
        losers: hourMap[h].losers,
        uniqueParticipants: hourMap[h].phones.size,
      });
    }

    // Recent 8 activity logs
    const recentActivity = [...filteredResults].reverse().slice(0, 8);

    const stats: DailyStats = {
      totalPlays,
      uniqueParticipants,
      repeatedParticipants,
      totalWinners,
      totalLosers,
      prizesDelivered,
      prizesPending,
      prizesStockRemaining: db.config.prizesRemaining,
      winRatePercentage,
      mostPlayedGame,
      peakHour,
      playsByGame,
      gamePerformance,
      hourlyDistribution,
      recentActivity,
    };

    res.json({ stats, date: requestedDate });
  });

  // Get Participants and Results list
  app.get('/api/admin/participants', requireAdmin, (req, res) => {
    const { search, game, onlyWinners, onlyPendingPrizes, limit } = req.query;

    let items = [...db.results].reverse();

    if (search) {
      const q = String(search).toLowerCase();
      items = items.filter(r => r.name.toLowerCase().includes(q) || r.phone.includes(q) || (r.redeemCode && r.redeemCode.toLowerCase().includes(q)));
    }

    if (game && game !== 'all') {
      items = items.filter(r => r.gameId === game);
    }

    if (onlyWinners === 'true') {
      items = items.filter(r => r.won);
    }

    if (onlyPendingPrizes === 'true') {
      items = items.filter(r => r.hasPrize && !r.prizeDelivered);
    }

    if (limit) {
      items = items.slice(0, Number(limit));
    }

    res.json({ results: items, total: items.length });
  });

  // Toggle Prize Delivery
  app.post('/api/admin/deliver-prize', requireAdmin, (req, res) => {
    const { resultId, delivered } = req.body;
    const result = db.results.find(r => r.id === resultId);

    if (!result) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    result.prizeDelivered = delivered !== undefined ? Boolean(delivered) : !result.prizeDelivered;
    result.deliveredAt = result.prizeDelivered ? new Date().toISOString() : undefined;
    result.deliveredBy = 'reclutador';

    saveDatabase(db);
    syncRecordToGoogleSheets(result);

    res.json({ success: true, result });
  });

  // Update App Config & Content
  app.post('/api/admin/config', requireAdmin, (req, res) => {
    const { config, quizQuestions, pairCards, swipeCards, rouletteSlices, chestOptions } = req.body;

    if (config) {
      db.config = { ...db.config, ...config };
    }
    if (quizQuestions) db.quizQuestions = quizQuestions;
    if (pairCards) db.pairCards = pairCards;
    if (swipeCards) db.swipeCards = swipeCards;
    if (rouletteSlices) db.rouletteSlices = rouletteSlices;
    if (chestOptions) db.chestOptions = chestOptions;

    saveDatabase(db);
    res.json({ success: true, config: db.config });
  });

  // Test / Trigger Google Sheets Sync
  app.post('/api/admin/sync-sheets', requireAdmin, async (req, res) => {
    const { webhookUrl } = req.body;
    const targetUrl = webhookUrl || db.config.googleSheetsWebhookUrl;

    if (!targetUrl) {
      return res.status(400).json({ error: 'URL del Webhook de Google Sheets no configurada' });
    }

    let successCount = 0;
    for (const record of db.results) {
      try {
        await syncRecordToGoogleSheets(record, targetUrl);
        successCount++;
      } catch (e) {}
    }

    res.json({ success: true, syncedCount: successCount, total: db.results.length });
  });

  // Export to CSV
  app.get('/api/admin/export-csv', requireAdmin, (req, res) => {
    const headers = ['ID', 'Nombre', 'Celular', 'Fecha', 'Hora', 'Juego', 'Resultado', 'Ganó', 'Premio Asignado', 'Código Canje', 'Premio Entregado', 'Hora Entrega', 'Duración (s)'];
    
    const rows = db.results.map(r => [
      `"${r.id}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.phone}"`,
      `"${r.createdAt.split('T')[0]}"`,
      `"${r.createdAt.split('T')[1]?.split('.')[0] || ''}"`,
      `"${r.gameName}"`,
      `"${r.won ? 'GANÓ' : 'NO GANÓ'}"`,
      `"${r.won ? 'SÍ' : 'NO'}"`,
      `"${r.hasPrize ? (r.prizeType || db.config.prizeName) : 'Sin premio'}"`,
      `"${r.redeemCode || '-'}"`,
      `"${r.prizeDelivered ? 'SÍ' : 'NO'}"`,
      `"${r.deliveredAt ? r.deliveredAt.split('T')[1]?.split('.')[0] : '-'}"`,
      r.durationSeconds,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="desafio_talento_participantes_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  });

  // Export to Excel JSON format / raw payload
  app.get('/api/admin/export-data', requireAdmin, (req, res) => {
    res.json({
      exportDate: new Date().toISOString(),
      eventName: db.config.eventName,
      totalParticipants: db.participants.length,
      totalPlays: db.results.length,
      results: db.results,
    });
  });

  // --- VITE MIDDLEWARE (Development) & STATIC SERVING (Production) ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Desafío de Talento server running on http://localhost:${PORT}`);
  });
}

startServer();

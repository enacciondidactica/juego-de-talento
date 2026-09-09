export type GameId = 
  | 'maze'
  | 'quiz'
  | 'roulette'
  | 'chests'
  | 'pairs'
  | 'swipe'
  | 'catcher';

export interface Participant {
  id: string;
  name: string;
  phone: string;
  registeredAt: string;
  isRepeated: boolean;
  totalPlays: number;
}

export interface GameResult {
  id: string;
  participantId: string;
  name: string;
  phone: string;
  gameId: GameId;
  gameName: string;
  won: boolean;
  score?: number;
  maxScore?: number;
  durationSeconds: number;
  redeemCode?: string;
  hasPrize: boolean;
  prizeType?: string;
  prizeDelivered: boolean;
  deliveredAt?: string;
  deliveredBy?: string;
  createdAt: string;
  details?: Record<string, any>;
}

export interface GameDefinition {
  id: GameId;
  name: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  accentColor: string;
  durationText: string;
  targetDurationSeconds: number;
  difficulty: 'Fácil' | 'Medio' | 'Ágil' | 'Estratégico' | 'Desafiante' | 'Dinámico' | 'Reflejos' | 'Interactivo' | string;
  hrTopic: string;
  enabled: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  category: string;
}

export interface PairCard {
  id: string;
  concept: string;
  pairConcept: string;
  matchId: string;
  icon: string;
}

export interface SwipeCard {
  id: string;
  statement: string;
  isReal: boolean; // true = Realidad, false = Mito
  feedback: string;
  topic: string;
}

export interface RouletteSlice {
  id: string;
  label: string;
  isWinner: boolean;
  prizeText: string;
  color: string;
  weight: number; // probability weight
  icon?: string;
}

export interface ChestOption {
  id: string;
  title: string;
  subtitle?: string;
  isWinner: boolean;
  prizeText: string;
  icon: string;
  color?: string;
  borderColor?: string;
  bgGradient?: string;
  challengeQuestion?: string;
  challengeOptions?: string[];
  correctChallengeIndex?: number;
  explanation?: string;
}

export interface AppConfig {
  eventName: string;
  eventDate: string;
  welcomeMessage: string;
  prizesAvailable: boolean;
  prizesTotalStock: number;
  prizesRemaining: number;
  prizeName: string;
  autoResetSeconds: number;
  activeGames: Record<GameId, boolean>;
  quizRequiredCorrect: number;
  googleSheetsWebhookUrl?: string;
  mazeQuestions?: QuizQuestion[];
}

export interface GamePerformanceStat {
  gameId: GameId | string;
  gameName: string;
  totalPlays: number;
  winners: number;
  losers: number;
  prizesWon: number;
  winRate: number;
  avgDurationSeconds: number;
}

export interface HourlyStat {
  hour: string;
  count: number;
  winners: number;
  losers: number;
  uniqueParticipants: number;
}

export interface DailyStats {
  totalPlays: number;
  uniqueParticipants: number;
  repeatedParticipants: number;
  totalWinners: number;
  totalLosers: number;
  prizesDelivered: number;
  prizesPending: number;
  prizesStockRemaining: number;
  winRatePercentage: number;
  mostPlayedGame: { gameId: string; name: string; count: number };
  peakHour: string;
  playsByGame: Record<string, number>;
  gamePerformance: GamePerformanceStat[];
  hourlyDistribution: HourlyStat[];
  recentActivity: GameResult[];
}

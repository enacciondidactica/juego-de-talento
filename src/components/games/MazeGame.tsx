import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Trophy, ArrowLeft, Shield, Sparkles, HelpCircle, CheckCircle2, XCircle, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { sounds } from '../../lib/audio';
import { QuizQuestion } from '../../types';
import { DEFAULT_MAZE_QUESTIONS } from '../../lib/gameData';

interface MazeGameProps {
  questions?: QuizQuestion[];
  onFinish: (won: boolean, score: number, durationSeconds: number, details?: any) => void;
  onBack: () => void;
}

// 21 columns x 13 rows expanded Pacman-style labyrinth (1 = Wall, 0 = Path)
const MAZE_GRID = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 0
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], // 1
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1], // 2
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1], // 3 (Q1 at 3,3; Q2 at 17,3)
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1], // 4
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], // 5
  [1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1], // 6
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1], // 7
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1], // 8
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 9 (Q3 at 10,9)
  [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1], // 10
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1], // 11
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 12
];

interface MazeQuestionNode {
  id: string;
  x: number;
  y: number;
  question: QuizQuestion;
  completed: boolean;
}

interface ItemPosition {
  id: string;
  x: number;
  y: number;
  name: string;
  icon: string;
  collected: boolean;
  isPowerup?: boolean;
  powerupType?: 'shield' | 'boost';
  points: number;
}

export const MazeGame: React.FC<MazeGameProps> = ({ questions = DEFAULT_MAZE_QUESTIONS, onFinish, onBack }) => {
  const [timeLeft, setTimeLeft] = useState(65);
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  
  // 3 Faster and smarter ghosts
  const [ghosts, setGhosts] = useState<{ id: number; x: number; y: number; name: string; color: string }[]>([
    { id: 1, x: 9, y: 6, name: 'Burnout', color: 'from-[#FF7D00] to-rose-600' },
    { id: 2, x: 11, y: 6, name: 'Distracción', color: 'from-[#60309B] to-purple-800' },
    { id: 3, x: 10, y: 7, name: 'Inercia', color: 'from-amber-600 to-red-600' },
  ]);

  const [hasShield, setHasShield] = useState(false);
  const [isStunned, setIsStunned] = useState(false);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover' | 'won'>('ready');
  const [score, setScore] = useState(0);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  // 3 Special Question Nodes
  const [questionNodes, setQuestionNodes] = useState<MazeQuestionNode[]>([]);
  const [activeQuestionNode, setActiveQuestionNode] = useState<MazeQuestionNode | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [questionSuccess, setQuestionSuccess] = useState<boolean>(false);

  // Regular items and power-ups
  const [items, setItems] = useState<ItemPosition[]>([
    { id: 'i1', x: 1, y: 5, name: 'Centro Digital', icon: '💻', collected: false, points: 20 },
    { id: 'i2', x: 19, y: 5, name: 'Inclusión Social', icon: '🌱', collected: false, points: 20 },
    { id: 'i3', x: 1, y: 11, name: 'SolNet & App', icon: '📱', collected: false, points: 20 },
    { id: 'i4', x: 19, y: 11, name: 'Microfinanzas', icon: '🤝', collected: false, points: 20 },
    { id: 'p1', x: 10, y: 1, name: 'Escudo BancoSol', icon: '🛡️', collected: false, isPowerup: true, powerupType: 'shield', points: 15 },
    { id: 'p2', x: 10, y: 11, name: 'Bonus Energía', icon: '⚡', collected: false, isPowerup: true, powerupType: 'boost', points: 25 },
  ]);

  const startTimeRef = useRef<number>(Date.now());

  // Initialize 3 Question Nodes from the questions bank
  useEffect(() => {
    const bank = questions && questions.length > 0 ? questions : DEFAULT_MAZE_QUESTIONS;
    // Shuffle and pick 3 questions
    const shuffled = [...bank].sort(() => 0.5 - Math.random());
    const q1 = shuffled[0] || DEFAULT_MAZE_QUESTIONS[0];
    const q2 = shuffled[1] || DEFAULT_MAZE_QUESTIONS[1];
    const q3 = shuffled[2] || DEFAULT_MAZE_QUESTIONS[2];

    setQuestionNodes([
      { id: 'qn1', x: 3, y: 3, question: q1, completed: false },
      { id: 'qn2', x: 17, y: 3, question: q2, completed: false },
      { id: 'qn3', x: 10, y: 9, question: q3, completed: false },
    ]);
  }, [questions]);

  // Start game
  const handleStart = () => {
    sounds.playCountdown(true);
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  // Move player handler (blocked if question modal is open or stunned)
  const movePlayer = useCallback((dx: number, dy: number) => {
    if (gameState !== 'playing' || isStunned || activeQuestionNode !== null) return;

    setPlayerPos((prev) => {
      const nextX = prev.x + dx;
      const nextY = prev.y + dy;

      if (
        nextY >= 0 &&
        nextY < MAZE_GRID.length &&
        nextX >= 0 &&
        nextX < MAZE_GRID[0].length &&
        MAZE_GRID[nextY][nextX] === 0
      ) {
        sounds.playClick();
        return { x: nextX, y: nextY };
      }
      return prev;
    });
  }, [gameState, isStunned, activeQuestionNode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing' || activeQuestionNode !== null) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        movePlayer(0, -1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        movePlayer(0, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        movePlayer(-1, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        movePlayer(1, 0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, activeQuestionNode, movePlayer]);

  // Touch navigation
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || gameState !== 'playing' || activeQuestionNode !== null) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    const minDistance = 20;

    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > minDistance) {
        movePlayer(dx > 0 ? 1 : -1, 0);
      }
    } else {
      if (Math.abs(dy) > minDistance) {
        movePlayer(0, dy > 0 ? 1 : -1);
      }
    }
    touchStartRef.current = null;
  };

  // Faster and more aggressive Ghost AI
  useEffect(() => {
    if (gameState !== 'playing' || activeQuestionNode !== null) return;

    const ghostInterval = setInterval(() => {
      setGhosts((prevGhosts) =>
        prevGhosts.map((g) => {
          const possibleMoves = [
            { x: g.x + 1, y: g.y },
            { x: g.x - 1, y: g.y },
            { x: g.x, y: g.y + 1 },
            { x: g.x, y: g.y - 1 },
          ].filter(
            (pos) =>
              pos.y >= 0 &&
              pos.y < MAZE_GRID.length &&
              pos.x >= 0 &&
              pos.x < MAZE_GRID[0].length &&
              MAZE_GRID[pos.y][pos.x] === 0
          );

          if (possibleMoves.length === 0) return g;

          // 65% chase player, 35% patrol
          let chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
          if (Math.random() < 0.65) {
            possibleMoves.sort((a, b) => {
              const distA = Math.hypot(a.x - playerPos.x, a.y - playerPos.y);
              const distB = Math.hypot(b.x - playerPos.x, b.y - playerPos.y);
              return distA - distB;
            });
            chosenMove = possibleMoves[0];
          }

          return { ...g, x: chosenMove.x, y: chosenMove.y };
        })
      );
    }, 450); // Faster movement (450ms)

    return () => clearInterval(ghostInterval);
  }, [gameState, playerPos, activeQuestionNode]);

  // Check Item Pickup, Question Node Trigger, and Ghost Collision
  useEffect(() => {
    if (gameState !== 'playing' || activeQuestionNode !== null) return;

    // 1. Check if stepping on an active question node
    const steppedQuestionNode = questionNodes.find(
      (qn) => !qn.completed && qn.x === playerPos.x && qn.y === playerPos.y
    );

    if (steppedQuestionNode) {
      sounds.playStar();
      setActiveQuestionNode(steppedQuestionNode);
      setSelectedOption(null);
      setQuestionError(null);
      setQuestionSuccess(false);
      return; // Stop processing moves while answering
    }

    // 2. Check regular item pickup
    setItems((prevItems) => {
      let scoreInc = 0;
      let notificationMsg: string | null = null;

      const nextItems = prevItems.map((item) => {
        if (!item.collected && item.x === playerPos.x && item.y === playerPos.y) {
          sounds.playStar();
          scoreInc += item.points;

          if (item.isPowerup) {
            if (item.powerupType === 'shield') {
              setHasShield(true);
              notificationMsg = '🛡️ ¡Escudo BancoSol activado!';
            } else {
              setTimeLeft((t) => t + 5);
              notificationMsg = '⚡ ¡Bonus de Energía (+5s y +25 pts)!';
            }
          } else {
            notificationMsg = `✨ ¡Concepto adquirido: ${item.name}!`;
          }
          return { ...item, collected: true };
        }
        return item;
      });

      if (scoreInc > 0) {
        setScore((s) => s + scoreInc);
      }
      if (notificationMsg) {
        setLastNotification(notificationMsg);
        setTimeout(() => setLastNotification(null), 2500);
      }

      return nextItems;
    });

    // 3. Check Ghost Collision
    const touchedGhost = ghosts.find((g) => g.x === playerPos.x && g.y === playerPos.y);
    if (touchedGhost) {
      if (hasShield) {
        setHasShield(false);
        sounds.playChestOpen();
        setLastNotification('🛡️ ¡Tu escudo absorbió el ataque del Burnout!');
        setTimeout(() => setLastNotification(null), 2500);
        // Teleport ghost back to chamber
        setGhosts((prev) =>
          prev.map((g) => (g.id === touchedGhost.id ? { ...g, x: 10, y: 6 } : g))
        );
      } else {
        sounds.playError();
        setIsStunned(true);
        setScore((s) => Math.max(0, s - 15));
        setTimeLeft((t) => Math.max(1, t - 3));
        setLastNotification(`⚠️ ¡${touchedGhost.name} te alcanzó! (-15 pts y -3s)`);
        setTimeout(() => setLastNotification(null), 2500);
        setTimeout(() => setIsStunned(false), 1200);
        // Send ghost back slightly
        setGhosts((prev) =>
          prev.map((g) => (g.id === touchedGhost.id ? { ...g, x: 10, y: 6 } : g))
        );
      }
    }
  }, [playerPos, ghosts, gameState, hasShield, questionNodes, activeQuestionNode]);

  // Check overall win condition: all 3 questions answered + at least 3 items collected
  useEffect(() => {
    if (gameState !== 'playing' || activeQuestionNode !== null) return;

    const completedQuestions = questionNodes.filter((qn) => qn.completed).length;
    const collectedCore = items.filter((i) => !i.isPowerup && i.collected).length;

    if (completedQuestions === 3 && collectedCore >= 3) {
      setGameState('won');
      sounds.playVictory();
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      const finalScore = score + Math.max(15, timeLeft * 2);

      setTimeout(() => {
        onFinish(true, finalScore, elapsed, {
          questionsAnswered: 3,
          itemsCollected: collectedCore,
          timeBonus: timeLeft * 2,
        });
      }, 1600);
    }
  }, [questionNodes, items, gameState, score, timeLeft, onFinish, activeQuestionNode]);

  // Timer loop
  useEffect(() => {
    if (gameState !== 'playing' || activeQuestionNode !== null) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState('gameover');
          sounds.playError();
          const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
          setTimeout(() => {
            onFinish(false, score, elapsed, { reason: 'Tiempo agotado' });
          }, 1500);
          return 0;
        }
        if (prev <= 5) sounds.playCountdown(false);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, activeQuestionNode, score, onFinish]);

  // Handle Question Answer Submission
  const handleAnswerQuestion = (optIdx: number) => {
    if (!activeQuestionNode) return;
    setSelectedOption(optIdx);

    const isCorrect = optIdx === activeQuestionNode.question.correctIndex;

    if (isCorrect) {
      sounds.playSuccess();
      setQuestionError(null);
      setQuestionSuccess(true);
      setScore((s) => s + 35);

      // Mark node as completed and resume after brief success display
      setTimeout(() => {
        setQuestionNodes((prev) =>
          prev.map((qn) =>
            qn.id === activeQuestionNode.id ? { ...qn, completed: true } : qn
          )
        );
        setActiveQuestionNode(null);
        setQuestionSuccess(false);
        setSelectedOption(null);
        setLastNotification('✅ ¡Pregunta BancoSol superada! (+35 pts)');
        setTimeout(() => setLastNotification(null), 2500);
      }, 1400);
    } else {
      sounds.playError();
      setQuestionError(
        '⚠️ Respuesta incorrecta. Para desbloquear el camino y avanzar debes seleccionar la opción correcta sobre BancoSol.'
      );
    }
  };

  const completedQuestionsCount = questionNodes.filter((q) => q.completed).length;
  const collectedCoreCount = items.filter((i) => !i.isPowerup && i.collected).length;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col items-center gap-3 py-2 select-none">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between bg-[#0e0b16] border border-[#60309B]/40 rounded-2xl p-3 px-4 sm:px-6 shadow-xl">
        <button
          onClick={() => {
            sounds.playClick();
            onBack();
          }}
          className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-300 hover:text-white py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Juegos</span>
        </button>

        {/* Timer */}
        <div className={`flex items-center gap-2 py-1.5 px-4 rounded-xl font-mono text-sm sm:text-base font-black border transition-all ${
          timeLeft <= 10
            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse ring-2 ring-rose-500/30'
            : 'bg-[#60309B]/25 text-white border-[#60309B]/40'
        }`}>
          <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF7D00]" />
          <span>{timeLeft}s</span>
        </div>

        {/* Score & Shield */}
        <div className="flex items-center gap-2 sm:gap-3">
          {hasShield && (
            <div className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs sm:text-sm font-bold animate-pulse">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Escudo</span>
            </div>
          )}
          <div className="flex items-center gap-2 py-1.5 px-3 sm:px-4 bg-[#FF7D00]/20 border border-[#FF7D00]/40 rounded-xl text-[#FF7D00] text-xs sm:text-sm font-black shadow-lg">
            <Trophy className="w-4 h-4" />
            <span>{score} pts</span>
          </div>
        </div>
      </div>

      {/* Main Game Container */}
      <div
        className="w-full bg-[#0a0710] border border-[#60309B]/30 rounded-3xl p-3 sm:p-6 flex flex-col items-center shadow-2xl relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Banner notification */}
        {lastNotification && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-5 py-2 bg-[#180e29] border border-[#FF7D00]/50 rounded-full text-xs sm:text-sm font-bold text-white shadow-2xl backdrop-blur-md animate-bounce">
            {lastNotification}
          </div>
        )}

        {/* Progress Tracker: 3 BancoSol Question Nodes + Competencies */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 px-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span>Preguntas BancoSol:</span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((idx) => (
                <span
                  key={idx}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    idx < completedQuestionsCount
                      ? 'bg-[#FF7D00] text-slate-950 font-black shadow-md shadow-[#FF7D00]/40'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {idx < completedQuestionsCount ? '✓' : idx + 1}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <span>Conceptos Clave:</span>
            <span className="text-[#FF7D00] font-black">{collectedCoreCount}/4</span>
          </div>
        </div>

        {/* 21x13 Labyrinth Canvas Grid */}
        <div className="relative bg-[#050308] p-2 sm:p-4 rounded-2xl border-2 border-[#60309B]/40 shadow-2xl w-full flex justify-center overflow-x-auto">
          <div
            className="grid gap-1 sm:gap-1.5 min-w-[320px] max-w-full"
            style={{
              gridTemplateColumns: `repeat(${MAZE_GRID[0].length}, minmax(0, 1fr))`,
            }}
          >
            {MAZE_GRID.map((row, y) =>
              row.map((cell, x) => {
                const isWall = cell === 1;
                const isPlayer = playerPos.x === x && playerPos.y === y;
                const ghost = ghosts.find((g) => g.x === x && g.y === y);
                const questionNode = questionNodes.find((qn) => qn.x === x && qn.y === y && !qn.completed);
                const item = items.find((i) => i.x === x && i.y === y && !i.collected);

                let cellContent = null;

                if (isPlayer) {
                  cellContent = (
                    <div className={`w-full h-full rounded-md sm:rounded-lg flex items-center justify-center text-xs sm:text-base font-black shadow-xl transition-transform ${
                      isStunned
                        ? 'bg-[#FF7D00] animate-spin'
                        : hasShield
                        ? 'bg-emerald-400 ring-2 ring-emerald-300'
                        : 'bg-gradient-to-tr from-[#60309B] to-[#FF7D00] text-white'
                    }`}>
                      {hasShield ? '🛡️' : '💼'}
                    </div>
                  );
                } else if (ghost) {
                  cellContent = (
                    <div className={`w-full h-full rounded-md sm:rounded-lg bg-gradient-to-br ${ghost.color} flex items-center justify-center text-xs sm:text-base shadow-lg animate-pulse`}>
                      👻
                    </div>
                  );
                } else if (questionNode) {
                  // Special Question Node (Golden glowing star/question)
                  cellContent = (
                    <div className="w-full h-full rounded-md sm:rounded-lg bg-[#FF7D00]/25 border border-[#FF7D00] flex items-center justify-center text-xs sm:text-sm animate-bounce shadow-lg shadow-[#FF7D00]/30 font-black text-[#FF7D00]">
                      ⭐
                    </div>
                  );
                } else if (item) {
                  cellContent = (
                    <div className={`w-full h-full rounded-md sm:rounded-lg flex items-center justify-center text-[10px] sm:text-xs ${
                      item.isPowerup ? 'bg-[#FF7D00]/30 animate-pulse' : 'bg-[#60309B]/30'
                    }`}>
                      {item.icon}
                    </div>
                  );
                }

                return (
                  <div
                    key={`${x}-${y}`}
                    className={`w-4 h-4 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-md flex items-center justify-center transition-colors ${
                      isWall
                        ? 'bg-[#180e2b] border border-[#60309B]/30 shadow-inner'
                        : 'bg-white/[0.02]'
                    }`}
                  >
                    {cellContent}
                  </div>
                );
              })
            )}
          </div>

          {/* QUESTION POPUP MODAL (When player steps on a question node) */}
          {activeQuestionNode && (
            <div className="absolute inset-0 bg-[#07050d]/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 sm:p-6 z-40 animate-fadeIn">
              <div className="w-full max-w-lg bg-[#140b24] border-2 border-[#FF7D00]/50 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col gap-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-[#FF7D00] text-slate-950 font-black flex items-center justify-center text-sm">
                    ⭐
                  </span>
                  <span className="text-xs font-black tracking-wider uppercase text-[#FF7D00]">
                    Desafío BancoSol Desbloqueado
                  </span>
                </div>

                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {activeQuestionNode.question.category || 'Cultura Institucional'}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white mt-1 leading-snug">
                    {activeQuestionNode.question.question}
                  </h3>
                </div>

                {/* Question Options */}
                <div className="flex flex-col gap-2.5">
                  {activeQuestionNode.question.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === activeQuestionNode.question.correctIndex;
                    const showSuccess = questionSuccess && isCorrect;
                    const showError = isSelected && !isCorrect && questionError;

                    return (
                      <button
                        key={idx}
                        disabled={questionSuccess}
                        onClick={() => handleAnswerQuestion(idx)}
                        className={`w-full text-left p-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border cursor-pointer ${
                          showSuccess
                            ? 'bg-emerald-500/25 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/40'
                            : showError
                            ? 'bg-rose-500/25 border-rose-500 text-rose-200'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{opt}</span>
                          {showSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                          {showError && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Error Banner: Must answer correctly to proceed */}
                {questionError && (
                  <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 font-bold text-left flex items-start gap-2 animate-shake">
                    <XCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{questionError}</span>
                  </div>
                )}

                {/* Success Banner */}
                {questionSuccess && (
                  <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 font-bold text-left flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <span>{activeQuestionNode.question.explanation || '¡Excelente respuesta! Camino desbloqueado.'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ready Overlay */}
          {gameState === 'ready' && (
            <div className="absolute inset-0 bg-[#07050d]/90 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center z-30">
              <div className="w-14 h-14 rounded-2xl bg-[#60309B]/40 border border-[#FF7D00]/40 flex items-center justify-center text-3xl mb-3 shadow-xl">
                🧭
              </div>
              <h4 className="text-xl font-black text-white mb-2 tracking-tight">
                Laberinto del Talento BancoSol
              </h4>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-5 leading-relaxed">
                Recorre el laberinto ampliado, supera las <strong>3 preguntas de los Nodos Estrella ⭐</strong> y esquiva los fantasmas del Burnout en 65s.
              </p>
              <button
                onClick={handleStart}
                className="py-3 px-8 rounded-xl bg-[#60309B] hover:bg-[#7239b5] text-white border border-[#FF7D00]/50 font-black text-xs uppercase tracking-wider shadow-xl shadow-[#60309B]/40 transition-all transform hover:scale-105"
              >
                Comenzar Reto (65s)
              </button>
            </div>
          )}

          {/* Won Overlay */}
          {gameState === 'won' && (
            <div className="absolute inset-0 bg-[#07050d]/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center z-30 animate-fadeIn">
              <Sparkles className="w-12 h-12 text-[#FF7D00] animate-spin mb-2" />
              <h4 className="text-2xl font-black text-white mb-1">
                ¡Laberinto Superado con Éxito!
              </h4>
              <p className="text-xs text-slate-300">
                Respondiste las 3 preguntas BancoSol y completaste el recorrido a tiempo.
              </p>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState === 'gameover' && (
            <div className="absolute inset-0 bg-[#07050d]/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-6 text-center z-30 animate-fadeIn">
              <span className="text-4xl mb-2">⏰</span>
              <h4 className="text-2xl font-black text-white mb-1">
                ¡Tiempo Agotado!
              </h4>
              <p className="text-xs text-slate-400">
                El reloj llegó a cero antes de responder las 3 preguntas BancoSol.
              </p>
            </div>
          )}
        </div>

        {/* Mobile On-Screen D-Pad */}
        <div className="w-full mt-3 flex flex-col items-center sm:hidden">
          <div className="flex gap-2 mb-1">
            <button
              onClick={() => movePlayer(0, -1)}
              className="w-11 h-11 rounded-xl bg-[#60309B]/30 active:bg-[#60309B] text-white flex items-center justify-center border border-[#60309B]/50"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => movePlayer(-1, 0)}
              className="w-11 h-11 rounded-xl bg-[#60309B]/30 active:bg-[#60309B] text-white flex items-center justify-center border border-[#60309B]/50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => movePlayer(0, 1)}
              className="w-11 h-11 rounded-xl bg-[#60309B]/30 active:bg-[#60309B] text-white flex items-center justify-center border border-[#60309B]/50"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <button
              onClick={() => movePlayer(1, 0)}
              className="w-11 h-11 rounded-xl bg-[#60309B]/30 active:bg-[#60309B] text-white flex items-center justify-center border border-[#60309B]/50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="w-full mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5">
            <span>💼 Jugador</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#FF7D00] font-bold">
            <span>⭐ Nodo Pregunta (3 Obligatorias)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>🛡️ Escudo</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <span>👻 Fantasmas (Burnout, Distracción, Inercia)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

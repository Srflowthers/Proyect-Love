import React, { useState, useEffect, useRef } from 'react';
import { GlitterWarp, PALETTES } from '@/components/ui/glitter-warp';
import ArcadeFrame from './games/ArcadeFrame';
import { GameIcons, ARCADE_ICONS_RAW, ARCADE_SCENES } from './games/gameIcons';
import RankSpriteSvg from './games/RankSpriteSvg';
import ArcadeProfileView, { getRankData } from './games/ArcadeProfileView';
import ArcadeShopView from './games/ArcadeShopView';
import { DEMO_IMAGES } from '@/data/demoImages';
import './games/arcadeCards.css';

const ALL_GAMES = [
  {
    id: 'gomi',
    sceneKey: 'gominola',
    name: 'Gominola',
    tag: 'Match-3',
    desc: 'Match-3',
    c: '#ff5aaa'
  },
  {
    id: 'tetris',
    sceneKey: 'tetris',
    name: 'Tetris Pareja',
    tag: 'Cooperativo',
    desc: 'Cooperativo',
    c: '#ff7ac8'
  },
  {
    id: 'sudoku',
    sceneKey: 'sudoku',
    name: 'Sudoku Pareja',
    tag: 'Lógica',
    desc: 'Lógica',
    c: '#4aa8ff'
  },
  {
    id: 'puzzle',
    sceneKey: 'puzzle',
    name: 'Rompecabezas',
    tag: 'Recuerdos',
    desc: 'Recuerdos',
    c: '#3ddc97'
  },
  {
    id: 'pool',
    sceneKey: 'pool',
    name: 'Pool 3D',
    tag: '2v2 Pareja vrs Pareja',
    desc: '2v2 Pareja vrs Pareja',
    c: '#a77bff'
  },
  {
    id: 'test',
    sceneKey: 'test',
    name: '🧪 Test LP y Oro',
    tag: 'Prueba +1/+1',
    desc: 'Presiona para ganar +1 LP y +1 Oro',
    c: '#ec4899'
  },
  {
    id: 'airhockey',
    sceneKey: 'airhockey',
    name: 'Air Hockey',
    tag: 'Duelo',
    desc: 'Duelo 1v1',
    c: '#ff8a3d',
    comingSoon: true
  },
];

// Precomputar escenas en memoria una sola vez para 60 FPS garantizados
const GAME_SCENES_STATIC = ALL_GAMES.reduce((acc, game) => {
  acc[game.id] = (ARCADE_SCENES[game.sceneKey] ? ARCADE_SCENES[game.sceneKey]() : '') +
    `<div class="fg">${ARCADE_ICONS_RAW[game.sceneKey] || ''}</div>`;
  return acc;
}, {});

export const PUZZLE_DIFFICULTIES = {
  30: { label: 'Muy fácil', short: 'Muy fácil', color: 'teal', badgeBg: 'bg-teal-500/85 border-teal-300/50 text-white' },
  60: { label: 'Fácil', short: 'Fácil', color: 'emerald', badgeBg: 'bg-emerald-500/85 border-emerald-300/50 text-white' },
  120: { label: 'Media', short: 'Media', color: 'sky', badgeBg: 'bg-sky-500/85 border-sky-300/50 text-white' },
  240: { label: 'Difícil', short: 'Difícil', color: 'pink', badgeBg: 'bg-pink-500/85 border-pink-300/50 text-white' },
  500: { label: 'Imposible', short: 'Imposible', color: 'purple', badgeBg: 'bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 border-amber-300/70 text-white shadow-[0_0_10px_rgba(168,85,247,0.8)]' }
};

export const getPuzzleDifficultyInfo = (pieces) => {
  const n = Number(pieces) || 30;
  if (n >= 500) return PUZZLE_DIFFICULTIES[500];
  if (n >= 240) return PUZZLE_DIFFICULTIES[240];
  if (n >= 120) return PUZZLE_DIFFICULTIES[120];
  if (n >= 60) return PUZZLE_DIFFICULTIES[60];
  return PUZZLE_DIFFICULTIES[30];
};

// Extrae un identificador estable de una foto sin parámetros firmados temporales (?X-Amz-Signature=...)
export const getCleanPhotoKey = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  if (rawUrl.startsWith('data:')) {
    return 'portrait_' + rawUrl.slice(-28).replace(/[^\w]/g, '');
  }
  let decoded = rawUrl;
  try {
    decoded = decodeURIComponent(rawUrl);
  } catch (e) { }
  const cleanPath = decoded.split('?')[0].split('#')[0];
  let fileName = cleanPath.split('/').pop() || '';
  fileName = fileName.replace(/\.thumb\.webp$/i, '').replace(/_thumb_webp$/i, '');
  // Si ya era una clave antigua que tenía pegado _X-Amz-Algorithm..., recortarla antes del parámetro firmado
  const amzIdx = fileName.indexOf('_X-Amz-');
  if (amzIdx > 0) {
    fileName = fileName.slice(0, amzIdx);
  }
  return fileName.replace(/[^\w.-]/g, '_').replace(/\./g, '_') || 'custom_photo';
};

export default function GamesView({
  user,
  onBack,
  globalUserData,
  setGlobalUserData,
  globalImages,
  setGlobalImages,
  globalNextCursor,
  setGlobalNextCursor
}) {
  const [userData, setUserData] = useState(globalUserData || null);
  // Persiste el juego o sección activa en sessionStorage para no perder la vista al recargar (F5)
  const [activeGame, setActiveGame] = useState(() => {
    try {
      const saved = sessionStorage.getItem('love_active_game');
      // Restaurar juegos individuales al recargar; los multijugador en vivo vuelven al catálogo
      return (saved && ['gomi', 'sudoku', 'puzzle', 'test'].includes(saved)) ? saved : null;
    } catch (e) {
      return null;
    }
  });
  // Vista: 'catalog' | 'profile' | 'puzzle_hub' | 'shop'
  const [currentSection, setCurrentSection] = useState(() => {
    try {
      const savedSec = sessionStorage.getItem('love_games_section');
      return (savedSec && ['catalog', 'profile', 'puzzle_hub', 'shop'].includes(savedSec)) ? savedSec : 'catalog';
    } catch (e) {
      return 'catalog';
    }
  });
  const [activeParams, setActiveParams] = useState(() => {
    try {
      return sessionStorage.getItem('love_active_game_params') || '';
    } catch (e) {
      return '';
    }
  });

  useEffect(() => {
    try {
      if (activeGame) sessionStorage.setItem('love_active_game', activeGame);
      else sessionStorage.removeItem('love_active_game');
    } catch (e) { }
  }, [activeGame]);

  useEffect(() => {
    try {
      if (currentSection) sessionStorage.setItem('love_games_section', currentSection);
    } catch (e) { }
  }, [currentSection]);

  useEffect(() => {
    try {
      if (activeParams) sessionStorage.setItem('love_active_game_params', activeParams);
      else sessionStorage.removeItem('love_active_game_params');
    } catch (e) { }
  }, [activeParams]);
  const [sudokuModalOpen, setSudokuModalOpen] = useState(false);
  const [puzzleModalOpen, setPuzzleModalOpen] = useState(false);
  const [puzzleSelectedPhoto, setPuzzleSelectedPhoto] = useState(null); // Foto elegida para jugar
  const [puzzleTab, setPuzzleTab] = useState('random'); // 'random' | 'gallery'
  const [tetrisModalOpen, setTetrisModalOpen] = useState(false);
  const [tetrisQueueState, setTetrisQueueState] = useState(null); // null | 'searching' | 'matched'
  const tetrisWsRef = useRef(null);
  const [coinBurst, setCoinBurst] = useState(null);
  const [coinPulseActive, setCoinPulseActive] = useState(false);
  const [displayedCoins, setDisplayedCoins] = useState(userData?.coins ?? 0);
  const [lpBurst, setLpBurst] = useState(null);
  const [lpPulseActive, setLpPulseActive] = useState(false);
  const [displayedLp, setDisplayedLp] = useState(userData?.lp ?? 0);
  const [roundRewardNotice, setRoundRewardNotice] = useState(null);
  const rewardTimerRef = useRef(null);

  // Mantener displayedCoins y displayedLp sincronizados cuando no hay animación en curso
  useEffect(() => {
    if (userData?.coins !== undefined && !coinAnimTimerRef.current) {
      setDisplayedCoins(userData.coins);
    }
  }, [userData?.coins]);

  useEffect(() => {
    if (userData?.lp !== undefined && !lpAnimTimerRef.current) {
      setDisplayedLp(userData.lp);
    }
  }, [userData?.lp]);

  const userDataRef = useRef(userData);
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  const coinBtnRef = useRef(null);
  const lpBtnRef = useRef(null);
  const coinAnimTimerRef = useRef(null);
  const lpAnimTimerRef = useRef(null);
  const lpStageTimeoutRef = useRef(null);
  const rankUpStageTimeoutRef = useRef(null);
  const audioCtxRef = useRef(null);

  const getAudioCtx = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  };

  // 1. Sonido exclusivo de Monedas de Oro (tintineo metálico agudo B5 -> E6)
  const playCoinSound = (coins = 0) => {
    try {
      const ctx = getAudioCtx();
      if (!ctx || coins <= 0) return;
      const now = ctx.currentTime;
      const coinChimes = Math.min(8, Math.max(3, Number(coins)));
      for (let i = 0; i < coinChimes; i++) {
        const t = now + i * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, t); // B5
        osc.frequency.setValueAtTime(1318.51, t + 0.04); // E6
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.13, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.23);
      }
    } catch (e) { }
  };

  // 2. Sonido exclusivo de Subida de Puntos de Elo (barrido de energía cósmica sintetizada, timbre triangle + armónico)
  const playLpSound = (lpDelta = 0) => {
    try {
      const ctx = getAudioCtx();
      if (!ctx || !lpDelta) return;
      const now = ctx.currentTime;

      if (lpDelta < 0) {
        // Sonido descendente grave si perdió LP por penalización
        const notes = [392.0, 349.23, 293.66, 220.0];
        notes.forEach((freq, i) => {
          const t = now + i * 0.11;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.08, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.25);
        });
        return;
      }

      // Barrido ascendente de Elo (escala pentatónica futurista con timbre cálido triangle, muy distinto a las monedas)
      const scale = [329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
      const steps = Math.min(scale.length, Math.max(4, Math.ceil(lpDelta / 8)));
      for (let i = 0; i < steps; i++) {
        const t = now + i * 0.085;
        const freq = scale[i % scale.length] * (1 + Math.floor(i / scale.length) * 0.5);
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        subOsc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.06, t + 0.07);
        subOsc.frequency.setValueAtTime(freq * 0.5, t); // Sub-octava para cuerpo de "Elo"

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.14, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(gain);
        subOsc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        subOsc.start(t);
        osc.stop(t + 0.17);
        subOsc.stop(t + 0.17);
      }
    } catch (e) { }
  };

  // 3. Fanfarria Épica exclusiva al Subir de División / Liga (Rank Up) — suena al terminar de subir el LP
  const playRankUpFanfare = () => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      // Acorde heroico de ascenso: C5 -> E5 -> G5 -> B5 -> C6 (con coro brillante)
      const chord = [
        { freq: 523.25, delay: 0.0, dur: 0.35 },
        { freq: 659.25, delay: 0.09, dur: 0.35 },
        { freq: 783.99, delay: 0.18, dur: 0.35 },
        { freq: 1046.50, delay: 0.28, dur: 0.65 },
        { freq: 1318.51, delay: 0.36, dur: 0.75 }
      ];
      chord.forEach(({ freq, delay, dur }) => {
        const t = now + delay;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, t);
        osc2.frequency.setValueAtTime(freq * 1.004, t); // Ligero detune para efecto coral épico

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.15, t + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(t);
        osc2.start(t);
        osc1.stop(t + dur + 0.02);
        osc2.stop(t + dur + 0.02);
      });
    } catch (e) { }
  };

  const currentGame = ALL_GAMES.find(g => g.id === activeGame) || null;
  const CurrentGameIcon = currentGame ? (GameIcons[currentGame.id] || GameIcons.pool) : null;

  // Escuchar eventos de rondas completadas de los minijuegos (monedas y récords)
  useEffect(() => {
    const handleArcadeMessage = async (e) => {
      if (e.data?.type === 'POOL_SHOP_UPDATE') {
        const cost = Math.max(0, Number(e.data?.cost) || 0);
        const incomingPoolShop = e.data?.poolShop;
        const currentUserData = userDataRef.current || {};
        const startAmount = Number(currentUserData?.coins) || 0;
        if (cost > startAmount) return;
        const finalCoins = cost > 0 ? Math.max(0, startAmount - cost) : startAmount;
        const updatedPoolShop = incomingPoolShop && typeof incomingPoolShop === 'object'
          ? incomingPoolShop
          : (currentUserData?.poolShop || {});

        if (cost > 0) {
          playCoinSound(1);
          setDisplayedCoins(finalCoins);
          setCoinPulseActive(true);
          setTimeout(() => setCoinPulseActive(false), 550);
        }

        setUserData(prev => ({
          ...prev,
          coins: finalCoins,
          poolShop: updatedPoolShop
        }));

        if (setGlobalUserData) {
          setGlobalUserData(prev => ({
            ...prev,
            coins: finalCoins,
            poolShop: updatedPoolShop
          }));
        }

        try {
          localStorage.setItem('pool_shop_state_v1', JSON.stringify(updatedPoolShop));
        } catch (err) { }

        if (user) {
          try {
            const token = await user.getIdToken();
            const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
            await fetch(`${apiUrl}/api/users/me`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                coins: finalCoins,
                poolShop: updatedPoolShop
              })
            });
          } catch (err) {
            console.error('[GamesView] Error sincronizando compra de tienda Pool:', err);
          }
        }
        return;
      }

      if (e.data?.type === 'ARCADE_ROUND_COMPLETE') {
        const { game, coins: addedCoins, score, lpDelta } = e.data;
        if (!addedCoins && !score && !lpDelta) return;

        const currentUserData = userDataRef.current || {};
        const startAmount = Number(currentUserData?.coins) || 0;
        const finalCoins = startAmount + (Number(addedCoins) || 0);

        // Actualizar LP (Puntos de Liga para ranking y ascensos)
        const currentLp = Math.max(0, Number(currentUserData?.lp) || 0);
        const finalLp = Math.max(0, currentLp + (Number(lpDelta) || 0));

        // Detección épica de ascenso de Elo / División
        const prevRank = getRankData(currentLp);
        const nextRank = getRankData(finalLp);
        const didRankUp = finalLp > currentLp && (
          nextRank.leagueIndex > prevRank.leagueIndex ||
          (nextRank.leagueIndex === prevRank.leagueIndex && nextRank.pipsCount > prevRank.pipsCount)
        );

        if (rewardTimerRef.current) clearTimeout(rewardTimerRef.current);
        if (lpStageTimeoutRef.current) clearTimeout(lpStageTimeoutRef.current);
        if (rankUpStageTimeoutRef.current) clearTimeout(rankUpStageTimeoutRef.current);

        // Mantener los marcadores en su valor inicial antes de que arranquen sus etapas secuenciales
        setDisplayedCoins(startAmount);
        setDisplayedLp(currentLp);

        if (didRankUp || (lpDelta > 0 && !e.data?.stageClear)) {
          const puzzlePiecesNum = game === 'puzzle' ? (Number(e.data?.puzzlePieces || score) || 30) : 0;
          const puzzleDiff = game === 'puzzle' ? getPuzzleDifficultyInfo(puzzlePiecesNum) : null;
          setRoundRewardNotice({
            game: game || 'arcade',
            win: e.data?.win,
            score: score || 0,
            lpEarned: lpDelta || 0,
            coins: addedCoins || 0,
            rank: nextRank,
            didRankUp: didRankUp,
            prevRank: prevRank,
            isPenalty: false,
            puzzlePortrait: e.data?.puzzlePortrait || '',
            puzzlePieces: puzzlePiecesNum,
            puzzleDifficultyLabel: puzzleDiff?.label || ''
          });
          rewardTimerRef.current = setTimeout(() => setRoundRewardNotice(null), 5000);
        } else if (lpDelta < 0) {
          // Penalización visual por abandono / derrota
          setRoundRewardNotice({
            game: game || 'arcade',
            win: false,
            score: score || 0,
            lpEarned: lpDelta,
            coins: addedCoins || 0,
            rank: nextRank,
            didRankUp: false,
            prevRank: prevRank,
            isPenalty: true
          });
          rewardTimerRef.current = setTimeout(() => setRoundRewardNotice(null), 5000);
        }

        // ==================== ETAPA 1: MONEDAS (t = 0ms) ====================
        const coinStageDuration = addedCoins > 0 ? Math.min(950, Math.max(500, addedCoins * 60)) : 0;

        if (addedCoins > 0) {
          // Sonido exclusivo de monedas
          playCoinSound(addedCoins);

          let targetX = window.innerWidth - 65;
          let targetY = 28;
          if (coinBtnRef.current) {
            const rect = coinBtnRef.current.getBoundingClientRect();
            targetX = rect.left + rect.width / 2;
            targetY = rect.top + rect.height / 2;
          }

          const startX = window.innerWidth / 2 + 95;
          const startY = window.innerHeight / 2 + 20;

          const count = Math.min(8, Math.max(3, Number(addedCoins)));
          const particles = Array.from({ length: count }, (_, idx) => ({
            id: Date.now() + idx + Math.random(),
            startX: startX,
            startY: startY,
            dx1: (Math.random() - 0.5) * 80,
            dy1: -30 - Math.random() * 40,
            targetX: targetX,
            targetY: targetY,
            delay: idx * 50
          }));

          setCoinBurst({ added: addedCoins, particles });

          if (coinAnimTimerRef.current) cancelAnimationFrame(coinAnimTimerRef.current);
          const animStartTime = performance.now();
          const stepCount = (time) => {
            const elapsed = time - animStartTime;
            const progress = Math.min(1, elapsed / coinStageDuration);
            const currentVal = Math.round(startAmount + (addedCoins * progress));
            setDisplayedCoins(currentVal);
            if (progress < 1) {
              coinAnimTimerRef.current = requestAnimationFrame(stepCount);
            } else {
              coinAnimTimerRef.current = null;
              setDisplayedCoins(finalCoins);
              setCoinPulseActive(true);
              setTimeout(() => setCoinPulseActive(false), 550);
              setTimeout(() => setCoinBurst(null), 700);
            }
          };
          coinAnimTimerRef.current = requestAnimationFrame(stepCount);
        }

        // ==================== ETAPA 2: PUNTOS DE ELO / LP (inicia cuando terminan las monedas) ====================
        if (lpDelta && lpDelta !== 0) {
          const lpStartDelay = addedCoins > 0 ? (coinStageDuration + 220) : 80;
          const lpDuration = Math.min(950, Math.max(550, Math.abs(lpDelta) * 14));

          lpStageTimeoutRef.current = setTimeout(() => {
            // Sonido exclusivo de subida (o bajada) de Elo, distinto al de monedas
            playLpSound(lpDelta);

            let lpTargetX = window.innerWidth - 175;
            let lpTargetY = 28;
            if (lpBtnRef.current) {
              const rect = lpBtnRef.current.getBoundingClientRect();
              lpTargetX = rect.left + rect.width / 2;
              lpTargetY = rect.top + rect.height / 2;
            }

            if (lpDelta > 0) {
              const startX = window.innerWidth / 2;
              const startY = window.innerHeight / 2 + 20;
              const lpCount = Math.min(7, Math.max(3, Math.ceil(lpDelta / 12)));
              const lpParticles = Array.from({ length: lpCount }, (_, idx) => ({
                id: Date.now() + idx + Math.random(),
                startX,
                startY,
                dx1: (Math.random() - 0.5) * 70,
                dy1: -25 - Math.random() * 35,
                targetX: lpTargetX,
                targetY: lpTargetY,
                delay: idx * 50
              }));
              setLpBurst({ added: lpDelta, particles: lpParticles });
            }

            if (lpAnimTimerRef.current) cancelAnimationFrame(lpAnimTimerRef.current);
            const lpStartTime = performance.now();
            const stepLpCount = (time) => {
              const elapsed = time - lpStartTime;
              const progress = Math.min(1, elapsed / lpDuration);
              const currentVal = Math.max(0, Math.round(currentLp + (lpDelta * progress)));
              setDisplayedLp(currentVal);
              if (progress < 1) {
                lpAnimTimerRef.current = requestAnimationFrame(stepLpCount);
              } else {
                lpAnimTimerRef.current = null;
                setDisplayedLp(finalLp);
                setLpPulseActive(true);
                setTimeout(() => setLpPulseActive(false), 600);
                setTimeout(() => setLpBurst(null), 700);

                // ==================== ETAPA 3: FANFARRIA DE ASCENSO DE ELO (si subió de rango/división) ====================
                if (didRankUp) {
                  rankUpStageTimeoutRef.current = setTimeout(() => {
                    playRankUpFanfare();
                  }, 150);
                }
              }
            };
            lpAnimTimerRef.current = requestAnimationFrame(stepLpCount);
          }, lpStartDelay);
        }

        // Cálculo de puntuaciones: en Gominola no existen rondas, solo se suma (+ puntaje) al superar cada etapa
        const currentBest = currentUserData?.best || {};
        const prevGameScore = Number(currentBest[game]) || 0;
        const newBestScore = game === 'gomi'
          ? (e.data?.stageClear ? prevGameScore + (Number(e.data?.scoreDelta ?? score) || 0) : prevGameScore)
          : Math.max(prevGameScore, Number(score) || 0);
        const updatedBest = { ...currentBest, [game]: newBestScore };
        const currentRound = game === 'gomi' ? undefined : e.data?.round;

        // Registro de rompecabezas completados por foto, dificultad máxima y retrato permanente
        let updatedCompletedPuzzles = { ...(currentUserData?.completedPuzzles || {}) };
        if (game === 'puzzle' && (e.data?.puzzlePieces || e.data?.score)) {
          const piecesCompleted = Number(e.data?.puzzlePieces || e.data?.score) || 30;
          const pUrl = e.data?.puzzleImg || sessionStorage.getItem('puzzle_random_photo') || '';
          const pPortrait = e.data?.puzzlePortrait || '';
          const durationMs = Number(e.data?.durationMs) || 0;
          const photoKey = getCleanPhotoKey(pUrl || pPortrait);

          if (photoKey) {
            // Buscar entrada existente (compatible con claves antiguas que incluían query params)
            let prevPhotoEntry = updatedCompletedPuzzles[photoKey];
            if (!prevPhotoEntry) {
              const legacyKey = Object.keys(updatedCompletedPuzzles).find(k => k.startsWith(photoKey));
              if (legacyKey) {
                prevPhotoEntry = updatedCompletedPuzzles[legacyKey];
                if (legacyKey !== photoKey) delete updatedCompletedPuzzles[legacyKey];
              }
            }
            prevPhotoEntry = prevPhotoEntry || { levels: [] };

            const existingLevels = Array.isArray(prevPhotoEntry.levels) ? prevPhotoEntry.levels.map(Number) : [];
            const newLevels = Array.from(new Set([...existingLevels, piecesCompleted])).sort((a, b) => a - b);
            const maxPieces = Math.max(...newLevels, piecesCompleted);
            const diffInfo = getPuzzleDifficultyInfo(maxPieces);
            const prevBestTimes = prevPhotoEntry.bestTimes || {};
            const prevLevelBest = prevBestTimes[piecesCompleted] || Infinity;
            const updatedBestTimes = durationMs > 0
              ? { ...prevBestTimes, [piecesCompleted]: Math.min(prevLevelBest, durationMs) }
              : prevBestTimes;

            const isRealUrl = pUrl && (/^https?:\/\//i.test(pUrl) || pUrl.startsWith('/'));
            const cleanUrlRef = isRealUrl ? pUrl.split('?')[0] : (prevPhotoEntry.url || '');
            const livePlayableUrl = isRealUrl ? pUrl : (prevPhotoEntry.liveUrl || '');

            updatedCompletedPuzzles = {
              ...updatedCompletedPuzzles,
              [photoKey]: {
                key: photoKey,
                url: cleanUrlRef,
                liveUrl: livePlayableUrl,
                portrait: pPortrait || prevPhotoEntry.portrait || (pUrl.startsWith('data:') ? pUrl : ''),
                levels: newLevels,
                maxPieces,
                maxDifficultyLabel: diffInfo.label,
                bestTimes: updatedBestTimes,
                timesCompleted: (Number(prevPhotoEntry.timesCompleted) || 0) + 1,
                firstCompletedAt: prevPhotoEntry.firstCompletedAt || Date.now(),
                lastCompletedAt: Date.now()
              }
            };
          }
        }

        // Actualizar estado local inmediatamente con actualización funcional segura
        setUserData(prev => ({
          ...prev,
          coins: finalCoins,
          lp: finalLp,
          best: updatedBest,
          completedPuzzles: updatedCompletedPuzzles,
          ...(currentRound !== undefined ? { round: currentRound } : {})
        }));

        if (setGlobalUserData) {
          setGlobalUserData(prev => ({
            ...prev,
            coins: finalCoins,
            lp: finalLp,
            best: updatedBest,
            completedPuzzles: updatedCompletedPuzzles,
            ...(currentRound !== undefined ? { round: currentRound } : {})
          }));
        }

        // Sincronizar con el backend
        if (user) {
          try {
            const token = await user.getIdToken();
            const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
            console.log('[GamesView] Enviando PATCH a', `${apiUrl}/api/users/me`, { coins: finalCoins, lp: finalLp, round: currentRound, best: updatedBest, completedPuzzles: updatedCompletedPuzzles });
            const patchRes = await fetch(`${apiUrl}/api/users/me`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                coins: finalCoins,
                lp: finalLp,
                best: updatedBest,
                completedPuzzles: updatedCompletedPuzzles,
                ...(currentRound !== undefined ? { round: currentRound } : {})
              })
            });
            console.log('[GamesView] Respuesta PATCH status:', patchRes.status);
            if (!patchRes.ok) {
              const errBody = await patchRes.text();
              console.error('[GamesView] Error al persistir en backend:', patchRes.status, errBody);
            } else {
              const resJson = await patchRes.json().catch(() => null);
              console.log('[GamesView] Persistencia exitosa en backend:', resJson?.data ? { lp: resJson.data.lp, coins: resJson.data.coins, round: resJson.data.round } : resJson);
            }
          } catch (err) {
            console.error('[GamesView] Excepción sincronizando LP y monedas:', err);
          }
        }
      }
    };

    window.addEventListener('message', handleArcadeMessage);
    return () => window.removeEventListener('message', handleArcadeMessage);
  }, [userData, user, setGlobalUserData]);

  // Fetch real user data si aún no está en caché
  useEffect(() => {
    if (globalUserData) {
      setUserData(globalUserData);
      return;
    }
    if (!user) return;

    const fetchUserData = async () => {
      try {
        const token = await user.getIdToken();
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
        const res = await fetch(`${apiUrl}/api/users/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const snap = await res.json();
          if (snap.exists && snap.data) {
            setUserData(snap.data);
            if (setGlobalUserData) setGlobalUserData(snap.data);
          }
        }
      } catch (err) {
        console.error('Error cargando datos de usuario en GamesView:', err);
      }
    };

    fetchUserData();
  }, [user, globalUserData, setGlobalUserData]);

  // Mantener token de sesión en storage para los iframes de la zona arcade
  useEffect(() => {
    if (user?.uid) {
      sessionStorage.setItem('arcade_session_auth', user.uid);
    } else {
      sessionStorage.removeItem('arcade_session_auth');
    }
  }, [user]);

  const [galleryNextCursor, setGalleryNextCursor] = useState(globalNextCursor || null);
  const [isLoadingMoreGallery, setIsLoadingMoreGallery] = useState(false);
  const puzzleGallerySentinelRef = useRef(null);

  useEffect(() => {
    if (globalNextCursor !== undefined) {
      setGalleryNextCursor(globalNextCursor);
    }
  }, [globalNextCursor]);

  // Carga inicial: 24 imágenes (si aún no están en globalImages)
  useEffect(() => {
    if (globalImages && globalImages.length > 0) return;
    if (!user) return;

    const fetchUserImages = async () => {
      try {
        const token = await user.getIdToken();
        const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
        const res = await fetch(`${apiUrl}/api/images?limit=24`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            if (setGlobalImages) setGlobalImages(data.items);
          }
          const fetchedCursor = data.nextCursor || null;
          setGalleryNextCursor(fetchedCursor);
          if (setGlobalNextCursor) setGlobalNextCursor(fetchedCursor);
        }
      } catch (e) {
        console.error('Error precargando imágenes en GamesView:', e);
      }
    };

    fetchUserImages();
  }, [user, globalImages, setGlobalImages, setGlobalNextCursor]);

  // Siguientes cargas bajo demanda: lotes de 25 en 25 mediante cursor de paginación
  const loadMoreGalleryImages = async () => {
    if (isLoadingMoreGallery || !user) return;
    const totalAvailablePhotos = userData?.onlyImageCount ?? userData?.imageCount ?? 0;
    const currentCount = Array.isArray(globalImages) ? globalImages.length : 0;
    if (!galleryNextCursor && totalAvailablePhotos <= currentCount) return;

    setIsLoadingMoreGallery(true);
    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
      const cursorToUse = galleryNextCursor || btoa(JSON.stringify({ c: 0, i: String(currentCount || 24) }));
      const res = await fetch(`${apiUrl}/api/images?limit=25&cursor=${encodeURIComponent(cursorToUse)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const incoming = data.items || [];
        if (incoming.length > 0 && setGlobalImages) {
          setGlobalImages(prev => {
            const list = Array.isArray(prev) ? prev : [];
            const seen = new Set(list.map(p => getCleanPhotoKey(p?.public_id || p?.src || p)));
            const fresh = incoming.filter(item => {
              const k = getCleanPhotoKey(item?.public_id || item?.src || item);
              if (!k || seen.has(k)) return false;
              seen.add(k);
              return true;
            });
            return fresh.length > 0 ? [...list, ...fresh] : list;
          });
        }
        const nextCur = data.nextCursor || null;
        setGalleryNextCursor(nextCur);
        if (setGlobalNextCursor) setGlobalNextCursor(nextCur);
      }
    } catch (e) {
      console.error('Error cargando lote de 25 imágenes en GamesView:', e);
    } finally {
      setIsLoadingMoreGallery(false);
    }
  };

  // Cargar automáticamente el siguiente lote de 25 fotos al hacer scroll al final de las primeras 24 en el selector de Rompecabezas
  useEffect(() => {
    if (currentSection !== 'puzzle_hub') return;
    const sentinel = puzzleGallerySentinelRef.current;
    if (!sentinel) return;
    const totalAvailablePhotos = userData?.onlyImageCount ?? userData?.imageCount ?? 0;
    const currentCount = Array.isArray(globalImages) ? globalImages.length : 0;
    const hasMore = Boolean(galleryNextCursor) || totalAvailablePhotos > currentCount;
    if (!hasMore || isLoadingMoreGallery) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreGalleryImages();
        }
      },
      { rootMargin: '220px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentSection, galleryNextCursor, isLoadingMoreGallery, globalImages?.length, userData?.onlyImageCount, userData?.imageCount]);

  // Cargar automáticamente el siguiente lote de 50 fotos al hacer scroll al final de las primeras 24 en el selector de Rompecabezas
  useEffect(() => {
    if (currentSection !== 'puzzle_hub') return;
    const sentinel = puzzleGallerySentinelRef.current;
    if (!sentinel) return;
    const totalAvailablePhotos = userData?.onlyImageCount ?? userData?.imageCount ?? 0;
    const currentCount = Array.isArray(globalImages) ? globalImages.length : 0;
    const hasMore = Boolean(galleryNextCursor) || totalAvailablePhotos > currentCount;
    if (!hasMore || isLoadingMoreGallery) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMoreGalleryImages();
        }
      },
      { rootMargin: '220px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [currentSection, galleryNextCursor, isLoadingMoreGallery, globalImages?.length, userData?.onlyImageCount, userData?.imageCount]);

  // Guardar compras y selección de objetos 3D desde la Tienda General de Arcade (en el Lobby)
  const handlePoolShopPurchaseOrEquip = async ({ cost = 0, poolShop }) => {
    const cleanCost = Math.max(0, Number(cost) || 0);
    const currentUserData = userDataRef.current || userData || {};
    const startAmount = Number(currentUserData?.coins) || 0;
    if (cleanCost > startAmount) return;

    const finalCoins = cleanCost > 0 ? Math.max(0, startAmount - cleanCost) : startAmount;
    const updatedPoolShop = poolShop && typeof poolShop === 'object'
      ? poolShop
      : (currentUserData?.poolShop || {});

    if (cleanCost > 0) {
      playCoinSound(1);
      setDisplayedCoins(finalCoins);
      setCoinPulseActive(true);
      setTimeout(() => setCoinPulseActive(false), 550);
    }

    try {
      localStorage.setItem('pool_shop_state_v1', JSON.stringify(updatedPoolShop));
    } catch (err) { }

    setUserData(prev => ({
      ...prev,
      coins: finalCoins,
      poolShop: updatedPoolShop
    }));
    if (setGlobalUserData) {
      setGlobalUserData(prev => ({
        ...prev,
        coins: finalCoins,
        poolShop: updatedPoolShop
      }));
    }

    if (!user) return;
    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
      await fetch(`${apiUrl}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          coins: finalCoins,
          poolShop: updatedPoolShop
        })
      });
    } catch (e) {
      console.error('Error guardando compra en Tienda General de Arcade:', e);
    }
  };

  // Guardar cambios del Perfil Arcade (Nombre de Dupla y Retrato 100% Completado para el Fondo de Rango)
  const handleUpdateArcadeProfile = async ({ arcadeName, arcadeBannerKey }) => {
    const nextData = {
      ...(arcadeName !== undefined ? { arcadeName } : {}),
      ...(arcadeBannerKey !== undefined ? { arcadeBannerKey } : {})
    };
    setUserData(prev => ({ ...prev, ...nextData }));
    if (setGlobalUserData) {
      setGlobalUserData(prev => ({ ...prev, ...nextData }));
    }
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
      await fetch(`${apiUrl}/api/users/me`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(nextData)
      });
    } catch (e) {
      console.error('Error guardando perfil arcade:', e);
    }
  };

  // Construye URL segura hacia el proxy de imágenes del backend para URLs de R2 sin firma o expiradas
  const resolveStoredPuzzleUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    if (rawUrl.startsWith('data:') || rawUrl.startsWith('/')) return rawUrl;
    if (rawUrl.includes('/api/images/proxy?')) return rawUrl;
    const isR2 = rawUrl.includes('Produccion/users/') || (rawUrl.includes('users/') && rawUrl.includes('/gallery/')) || rawUrl.includes('r2.cloudflarestorage.com');
    if (isR2 && !rawUrl.includes('X-Amz-Signature=')) {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
      return `${apiUrl}/api/images/proxy?url=${encodeURIComponent(rawUrl)}`;
    }
    return /^https?:\/\//i.test(rawUrl) ? rawUrl : '';
  };

  const getProxyFallbackUrl = (rawUrl) => {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    if (rawUrl.includes('/api/images/proxy?')) return '';
    const isR2 = rawUrl.includes('Produccion/users/') || (rawUrl.includes('users/') && rawUrl.includes('/gallery/')) || rawUrl.includes('r2.cloudflarestorage.com');
    if (isR2) {
      const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
      return `${apiUrl}/api/images/proxy?url=${encodeURIComponent(rawUrl)}`;
    }
    return '';
  };

  // Helper para extraer URL limpia de una foto descartando videos
  const extractPhotoUrl = (img) => {
    if (!img) return null;
    if (typeof img === 'string') {
      if (img.match(/\.(mp4|webm|mov)$/i)) return null;
      return img;
    }
    if (img.isVideo) return null;
    const u = img.src || img.url || img.original_url || img.thumbnailUrl;
    if (typeof u === 'string' && !u.match(/\.(mp4|webm|mov)$/i)) return u;
    return null;
  };

  // Lanzar Sudoku directamente con la dificultad seleccionada
  const launchSudoku = (size) => {
    setSudokuModalOpen(false);
    setActiveParams(`size=${size}`);
    setActiveGame('sudoku');
  };

  // Lanzar Rompecabezas con una foto al azar o una foto elegida y cantidad de piezas
  const launchRandomPuzzle = (level = 60, specificPhoto = null) => {
    setPuzzleModalOpen(false);
    let pool = (globalImages || []).map(extractPhotoUrl).filter(Boolean);

    // Fallback si aún no hay fotos en memoria: localStorage o DEMO_IMAGES
    if (pool.length === 0) {
      try {
        const cached = localStorage.getItem('demo-images-v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.images) {
            pool = parsed.images.map(extractPhotoUrl).filter(Boolean);
          }
        }
      } catch (e) { }
    }

    if (pool.length === 0 && Array.isArray(DEMO_IMAGES)) {
      pool = DEMO_IMAGES.map(extractPhotoUrl).filter(Boolean);
    }

    // Guardar la lista para que dentro del juego puedan pedir "otra foto al azar"
    try {
      sessionStorage.setItem('couple_photos', JSON.stringify(pool));
    } catch (e) { }

    let chosenPhoto = specificPhoto;
    let referenceId = '';
    if (specificPhoto && typeof specificPhoto === 'object') {
      chosenPhoto = specificPhoto.playUrl || specificPhoto.displayUrl || specificPhoto.portrait || '';
      const candRef = specificPhoto.referenceUrl || '';
      referenceId = (candRef && (/^https?:\/\//i.test(candRef) || candRef.startsWith('/'))) ? candRef : '';
    }

    if (!chosenPhoto) {
      chosenPhoto = pool.length > 0
        ? pool[Math.floor(Math.random() * pool.length)]
        : '/fotos/Imagenes-amor/Foto0144.jpg';
      referenceId = chosenPhoto;
    }

    try {
      sessionStorage.setItem('puzzle_random_photo', referenceId || chosenPhoto);
    } catch (e) { }

    // Si es un retrato en base64 (de una foto eliminada de la galería), pasar por sessionStorage para evitar URLs enormes
    if (chosenPhoto.startsWith('data:')) {
      try {
        sessionStorage.setItem('puzzle_portrait_override', chosenPhoto);
      } catch (e) { }
      setActiveParams(`img=__portrait__&level=${level}`);
    } else {
      try {
        sessionStorage.removeItem('puzzle_portrait_override');
      } catch (e) { }
      setActiveParams(`img=${encodeURIComponent(chosenPhoto)}&level=${level}`);
    }
    setActiveGame('puzzle');
    setPuzzleSelectedPhoto(null);
  };

  // Cancelar búsqueda de matchmaking de Tetris
  const cancelTetrisQueue = () => {
    if (tetrisWsRef.current) {
      try { tetrisWsRef.current.close(); } catch (e) { }
      tetrisWsRef.current = null;
    }
    setTetrisQueueState(null);
  };

  // Iniciar búsqueda online de Tetris desde el modal
  const startTetrisOnlineQueue = () => {
    setTetrisQueueState('searching');

    const authKey = sessionStorage.getItem('arcade_session_auth') || 'guest_' + Math.random().toString(36).substring(2, 6);
    const playerName = userData?.user1Name || 'Jugador';
    const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const apiHost = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'localhost:8787'
      : window.location.host;

    const wsUrl = `${wsProtocol}//${apiHost}/api/tetris/ws?room=global_tetris_1v1&uid=${encodeURIComponent(authKey)}&name=${encodeURIComponent(playerName)}&device=${deviceType}`;

    const ws = new WebSocket(wsUrl);
    tetrisWsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Cuando hay 2 jugadores conectados en la sala global
        if ((data.t === 'welcome' && data.players && data.players.length === 2) ||
          (data.t === 'player_joined' && data.players && data.players.length === 2)) {
          setTetrisQueueState('matched');
          // Pequeño delay de 800ms para mostrar la animación de éxito y lanzar el juego
          setTimeout(() => {
            try { ws.close(); } catch (e) { }
            tetrisWsRef.current = null;
            setTetrisQueueState(null);
            setTetrisModalOpen(false);
            setActiveParams('mode=1v1_online');
            setActiveGame('tetris');
          }, 800);
        }
      } catch (e) {
        console.warn('[TetrisQueue] Error parseando mensaje:', e);
      }
    };

    ws.onerror = (e) => {
      console.warn('[TetrisQueue] WS Error:', e);
    };
  };

  // Manejador centralizado para iniciar cualquier juego
  const handlePlayGame = (gameId) => {
    if (gameId === 'tetris') {
      setTetrisModalOpen(true);
      return;
    }
    if (gameId === 'sudoku') {
      setSudokuModalOpen(true);
      return;
    }
    if (gameId === 'puzzle') {
      setPuzzleSelectedPhoto(null);
      setCurrentSection('puzzle_hub');
      return;
    }
    if (gameId === 'gomi') {
      const savedRound = Number(userData?.round) || 0;
      setActiveParams(savedRound > 0 ? `round=${savedRound}` : '');
      setActiveGame(gameId);
      return;
    }
    setActiveParams('');
    setActiveGame(gameId);
  };

  // Fondos idénticos al universo
  const getUniverseBgClass = () => {
    const color = userData?.universeColor || 'purple';
    if (color === 'space') return 'bg-black';
    if (color === 'blue') return 'bg-gradient-to-br from-blue-950 via-cyan-900 to-black';
    if (color === 'red') return 'bg-gradient-to-br from-red-950 via-rose-900 to-black';
    if (color === 'gold') return 'bg-gradient-to-br from-yellow-950 via-amber-900 to-black';
    if (color === 'black') return 'bg-gradient-to-br from-gray-900 via-[#111] to-black';
    return 'bg-gradient-to-br from-purple-950 via-pink-900 to-black';
  };

  const getAuraColor = () => {
    const color = userData?.universeColor || 'purple';
    if (color === 'space') return 'rgba(59,130,246,0.15)';
    if (color === 'blue') return 'rgba(6,182,212,0.18)';
    if (color === 'red') return 'rgba(239,68,68,0.15)';
    if (color === 'gold') return 'rgba(245,158,11,0.15)';
    if (color === 'black') return 'rgba(156,163,175,0.12)';
    return 'rgba(131,24,67,0.18)';
  };

  // Protección de ruta: Solo usuarios autenticados con al menos Plan Free
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none relative z-50">
        <div className="w-20 h-20 rounded-3xl bg-pink-500/15 border border-pink-500/40 flex items-center justify-center text-4xl mb-5 shadow-[0_0_35px_rgba(236,72,153,0.35)] animate-pulse">
          🔒
        </div>
        <span className="text-xs font-mono uppercase tracking-widest text-pink-400 mb-2">
          Ruta Protegida
        </span>
        <h2 className="text-3xl font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-purple-200 to-indigo-200 mb-3">
          Zona Arcade de Parejas
        </h2>
        <p className="text-sm text-gray-300 max-w-md mb-8 leading-relaxed">
          Los minijuegos están disponibles únicamente para usuarios registrados (Plan Free o superior) y requieren pasar por la verificación de seguridad anti-bot con Cloudflare Turnstile.
        </p>
        <button
          onClick={() => {
            window.location.replace('/?auth_required=arcade');
          }}
          className="px-8 py-4 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-full font-bold shadow-[0_0_25px_rgba(236,72,153,0.5)] transition-all border border-pink-400 flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <span>Acceder con Google</span>
          <span className="text-xs opacity-75">(Plan Free mínimo) →</span>
        </button>
      </div>
    );
  }

  const coupleNames = userData?.user1Name && userData?.user2Name
    ? `${userData.user1Name} & ${userData.user2Name}`
    : 'Nuestro Universo';

  return (
    <div
      className={`min-h-screen text-white flex flex-col relative overflow-x-hidden ${currentSection === 'catalog' ? 'pb-24 md:pb-12' : 'pb-2'}`}
      style={{
        background: 'radial-gradient(ellipse 90% 55% at 50% 0%, rgba(130,45,185,0.32), transparent 75%), #07050c'
      }}
    >

      {/* 1. Fondo de Partículas 3D Optimizado a 60 FPS */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-35" style={{ contain: 'strict', transform: 'translateZ(0)' }}>
        <GlitterWarp
          variant={userData?.universeVariant || 'tunnel'}
          colors={PALETTES[userData?.universePalette || 'Cósmico']}
          sizeMult={(userData?.universeParticleSize || 1) * 0.8}
          speedMult={(userData?.universeParticleSpeed || 1) * 0.7}
          count={20}
          background="transparent"
        />
      </div>

      {/* 2. Resplandor de Aura Cósmico */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] pointer-events-none opacity-60"
          style={{ background: `radial-gradient(circle, ${getAuraColor()} 0%, transparent 70%)` }}
        />
      </div>

      {/* 3. Header de Navegación Permanente */}
      {!activeGame && (
        <header className="sticky top-0 z-[100] w-full px-3 sm:px-6 lg:px-10 pt-2.5 pb-2 flex items-center justify-between gap-2 sm:gap-4 border-b border-white/10 backdrop-blur-md bg-[#0c0716]/95 shadow-lg">
          {/* Lado izquierdo: Único botón volver y Título Arcade */}
            <div className="flex items-center gap-2 sm:gap-3 flex-none">
              {currentSection === 'profile' || currentSection === 'puzzle_hub' || currentSection === 'shop' ? (
                <button
                  onClick={() => {
                    setPuzzleSelectedPhoto(null);
                    setCurrentSection('catalog');
                  }}
                  className="px-3.5 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 rounded-full text-xs font-bold text-pink-200 hover:text-white transition-all backdrop-blur-md flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                >
                  ← Volver a los Juegos
                </button>
              ) : onBack ? (
                <button
                  onClick={onBack}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-full text-xs font-bold text-gray-200 hover:text-white transition-all backdrop-blur-md flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                >
                  ← Galería
                </button>
              ) : null}

              <div className="hidden sm:block">
                <h1 className="text-base md:text-xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 leading-tight">
                  Arcade del Amor
                </h1>
                <p className="text-[10px] text-gray-400">
                  6 Minijuegos de Pareja
                </p>
              </div>
            </div>

            {/* Centro: Tu Nombre y Pareja Centrado y Adaptable */}
            <div className="flex-1 text-center px-2 min-w-0 max-w-md mx-auto">
              <span className="text-[9px] sm:text-[10px] font-mono uppercase tracking-widest text-pink-400/90 font-bold block truncate">
                {currentSection === 'profile'
                  ? 'PERFIL ARCADE DE PAREJA'
                  : currentSection === 'shop'
                    ? 'TIENDA DE ACCESORIOS ARCADE'
                    : currentSection === 'puzzle_hub'
                      ? 'COLECCIÓN Y RETRATOS DE ROMPECABEZAS'
                      : 'DUPLA ARCADE'}
              </span>
              <h2 className="text-sm sm:text-lg md:text-xl font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-rose-100 to-amber-200 truncate leading-tight">
                {userData?.arcadeName || coupleNames}
              </h2>
            </div>

            {/* Lado derecho: Marcador de Monedas y Perfil de Pareja con Insignia de Rango */}
            <div className="flex items-center gap-2 sm:gap-3 flex-none">
              {/* Botón de Perfil Arcade & Insignia de Rango */}
              {(() => {
                const rankInfo = getRankData(displayedLp);
                return (
                  <button
                    ref={lpBtnRef}
                    onClick={() => setCurrentSection(currentSection === 'profile' ? 'catalog' : 'profile')}
                    title={`Ver Perfil Arcade: ${rankInfo.fullName} (${displayedLp} LP)`}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold shadow-[0_0_20px_rgba(168,85,247,0.3)] backdrop-blur-md hover:scale-105 active:scale-95 transition-all cursor-pointer group ${lpPulseActive ? 'coin-counter-pulse ring-2 ring-purple-400 scale-110 ' : ''
                      }${currentSection === 'profile'
                        ? 'bg-pink-500/30 border-pink-500 text-white'
                        : 'bg-gradient-to-r from-purple-950/80 via-indigo-950/60 to-black/80 border-purple-500/40 text-purple-200'
                      }`}
                  >
                    {/* Mini insignia SVG animada del rango actual */}
                    <span
                      className={`rk ${rankInfo.league.hi ? 'hi' : ''}`}
                      style={{ '--s': '22px', '--c': rankInfo.league.color }}
                    >
                      <svg viewBox="0 0 120 120" role="img">
                        <use href={`#${rankInfo.league.key}`} />
                      </svg>
                    </span>

                    <div className="flex items-center gap-1.5 text-left">
                      <span className="text-white font-medium group-hover:text-pink-300 transition-colors hidden md:inline">
                        {rankInfo.league.name}
                      </span>
                      {rankInfo.divisionName && (
                        <span className="text-[10px] text-pink-300 font-mono font-bold">
                          {rankInfo.divisionName}
                        </span>
                      )}
                      <span className="font-mono text-purple-300">{displayedLp} LP</span>
                    </div>

                    <span className="text-[10px] text-purple-400 group-hover:translate-x-0.5 transition-transform flex items-center">
                      {currentSection === 'profile' ? (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })()}

              {/* Botón de Tienda General de Arcade (Solo disponible en el Lobby) */}
              <button
                onClick={() => setCurrentSection(currentSection === 'shop' ? 'catalog' : 'shop')}
                title="Abrir Tienda General de Arcade (Varas 3D, Mesas 3D y Tierra y Sol)"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold shadow-[0_0_18px_rgba(236,72,153,0.28)] backdrop-blur-md hover:scale-105 active:scale-95 transition-all cursor-pointer ${currentSection === 'shop'
                  ? 'bg-amber-500/30 border-amber-400 text-white'
                  : 'bg-gradient-to-r from-pink-950/80 via-purple-950/70 to-black/80 border-pink-500/40 text-pink-200'
                  }`}
              >
                <svg className="w-3.5 h-3.5 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <span>Tienda</span>
              </button>

              {/* Monedas del Arcade (Indicador visual limpio sin marco de botón) */}
              <div
                ref={coinBtnRef}
                title="Monedas acumuladas"
                className={`flex items-center gap-1.5 px-1 py-1 text-xs font-bold select-none cursor-default transition-transform ${coinPulseActive ? 'scale-110 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]' : ''
                  }`}
              >
                {/* Icono de Moneda Dorada SVG */}
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 flex items-center justify-center shadow-[0_0_10px_rgba(250,204,21,0.6)] border border-yellow-200/80 flex-none">
                  <svg className="w-3 h-3 text-amber-950" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="6" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.8" />
                  </svg>
                </div>
                <span className="font-mono tracking-tight text-amber-300 text-sm font-extrabold">
                  {(displayedCoins).toLocaleString()}
                </span>
                <span className="text-[11px] text-amber-400/90 font-medium hidden sm:inline">monedas</span>
              </div>
            </div>
          </header>
      )}

          {/* Floating HUD during gameplay (top-right) - Siempre por encima del modal (z-[90]) para ver cómo suben el LP y las Monedas en vivo */}
          {activeGame && (activeGame !== 'pool' || coinBurst || coinPulseActive || lpBurst || lpPulseActive || roundRewardNotice) && (
            <div
              className="fixed top-[5px] right-3 h-7 lg:top-2 lg:right-5 lg:h-8 z-[90] flex items-center gap-1.5 sm:gap-2 pointer-events-auto animate-in fade-in zoom-in-95 duration-300"
            >
              {/* Rank / LP indicator in game */}
              {(() => {
                const rankInfo = getRankData(displayedLp);
                return (
                  <div
                    ref={lpBtnRef}
                    className={`h-7 lg:h-8 flex items-center gap-1.5 px-2.5 sm:px-3 lg:px-3.5 rounded-full border border-purple-500/50 bg-[#0d0818]/90 backdrop-blur-md shadow-[0_0_20px_rgba(168,85,247,0.35)] text-[11px] sm:text-xs font-bold text-purple-200 transition-transform ${lpPulseActive ? 'coin-counter-pulse ring-2 ring-purple-400 scale-110' : ''
                      }`}
                    title={`Rango: ${rankInfo.fullName}`}
                  >
                    <span
                      className={`rk ${rankInfo.league.hi ? 'hi' : ''}`}
                      style={{ '--s': '15px', '--c': rankInfo.league.color }}
                    >
                      <svg viewBox="0 0 120 120" role="img">
                        <use href={`#${rankInfo.league.key}`} />
                      </svg>
                    </span>
                    <span className="font-mono text-purple-300 leading-none">{displayedLp} LP</span>
                  </div>
                );
              })()}

              {/* Persistent Coin Pill in game */}
              <div
                ref={coinBtnRef}
                className={`h-7 lg:h-8 flex items-center gap-1.5 px-2.5 sm:px-3 lg:px-3.5 rounded-full bg-gradient-to-r from-amber-950/95 via-yellow-950/85 to-[#0d0818]/95 border border-amber-500/60 text-amber-200 text-[11px] sm:text-xs font-bold shadow-[0_0_22px_rgba(245,158,11,0.45)] backdrop-blur-md transition-transform ${coinPulseActive ? 'coin-counter-pulse ring-2 ring-yellow-400 scale-110' : ''
                  }`}
              >
                <div className="w-3.5 h-3.5 lg:w-4 lg:h-4 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 flex items-center justify-center shadow-[0_0_8px_rgba(250,204,21,0.8)] border border-yellow-200/60 flex-none">
                  <svg className="w-2.5 h-2.5 text-amber-950" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="6" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.8" />
                  </svg>
                </div>
                <span className="font-mono tracking-tight text-amber-300 text-xs sm:text-sm leading-none">
                  {(displayedCoins).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Partículas de Puntos de Liga (LP) Viajando hacia el marcador de Elo */}
          {lpBurst && (
            <div className="fixed inset-0 pointer-events-none z-[95]">
              {lpBurst.particles.map((p) => (
                <div
                  key={p.id}
                  className="fly-coin-particle"
                  style={{
                    top: `${p.startY}px`,
                    left: `${p.startX}px`,
                    '--dx1': `${p.dx1}px`,
                    '--dy1': `${p.dy1}px`,
                    '--target-x': `${p.targetX - p.startX}px`,
                    '--target-y': `${p.targetY - p.startY}px`,
                    animationDelay: `${p.delay}ms`
                  }}
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-400 via-purple-500 to-indigo-600 border border-pink-200 flex items-center justify-center shadow-[0_0_15px_rgba(192,132,252,1)]">
                    <span className="text-[8px] font-mono font-black text-white">LP</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Partículas de Monedas Épicas Viajando hacia el marcador */}
          {coinBurst && (
            <div className="fixed inset-0 pointer-events-none z-[95]">
              {/* Monedas voladoras dinámicas viajando directamente hacia el botón del contador */}
              {coinBurst.particles.map((p) => (
                <div
                  key={p.id}
                  className="fly-coin-particle"
                  style={{
                    top: `${p.startY}px`,
                    left: `${p.startX}px`,
                    '--dx1': `${p.dx1}px`,
                    '--dy1': `${p.dy1}px`,
                    '--target-x': `${p.targetX - p.startX}px`,
                    '--target-y': `${p.targetY - p.startY}px`,
                    animationDelay: `${p.delay}ms`
                  }}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-yellow-600 border border-yellow-100 flex items-center justify-center shadow-[0_0_15px_rgba(250,204,21,1)]">
                    <svg className="w-4 h-4 text-amber-950" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity="0.8" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modal Universal de Recompensa / Victoria / Ascenso de Elo */}
          {roundRewardNotice && (() => {
            const isRankUp = Boolean(roundRewardNotice.didRankUp);
            const isPenalty = Boolean(roundRewardNotice.isPenalty);
            const isDuelWin = roundRewardNotice.win === true;
            const leagueColor = roundRewardNotice.rank?.league?.color || '#ec4899';

            const gameNamesMap = {
              tetris: 'Tetris Pareja',
              pool: 'Pool 3D',
              puzzle: 'Rompecabezas',
              sudoku: 'Sudoku Pareja',
              gomi: 'Gominola',
              test: 'Modo Prueba'
            };
            const gameLabel = gameNamesMap[roundRewardNotice.game] || 'Arcade del Amor';

            const scoreLabelMap = {
              puzzle: 'Piezas',
              sudoku: 'Casillas',
              pool: 'Resultado'
            };
            const scoreLabel = scoreLabelMap[roundRewardNotice.game] || 'Puntaje';
            const formattedScore = roundRewardNotice.game === 'pool'
              ? (roundRewardNotice.win ? 'VICTORIA' : 'FIN')
              : (roundRewardNotice.score || 0).toLocaleString();

            const closeRewardModal = () => {
              if (rewardTimerRef.current) clearTimeout(rewardTimerRef.current);
              setRoundRewardNotice(null);
            };

            return (
              <div
                className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-3 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
                onClick={closeRewardModal}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    borderColor: isPenalty
                      ? 'rgba(244, 63, 94, 0.45)'
                      : isRankUp
                        ? 'rgba(244, 114, 182, 0.65)'
                        : `color-mix(in srgb, ${leagueColor} 50%, rgba(255,255,255,0.18))`,
                    boxShadow: isPenalty
                      ? '0 16px 45px rgba(225, 29, 72, 0.35), inset 0 1px 0 rgba(255,255,255,0.1)'
                      : isRankUp
                        ? '0 16px 50px rgba(236, 72, 153, 0.45), inset 0 1px 0 rgba(255,255,255,0.2)'
                        : `0 16px 45px color-mix(in srgb, ${leagueColor} 28%, rgba(0,0,0,0.85)), inset 0 1px 0 rgba(255,255,255,0.12)`
                  }}
                  className="relative max-w-[330px] sm:max-w-[350px] w-full max-h-[calc(100vh-24px)] overflow-y-auto rounded-[24px] px-4 py-3.5 sm:px-5 sm:py-4 text-center border bg-gradient-to-b from-[#171126]/98 via-[#0e0a18]/98 to-[#07050c]/98 animate-in zoom-in-95 duration-200 select-none"
                >
                  {/* Destello ambiental superior dinámico */}
                  <div
                    className="absolute -top-16 left-1/2 -translate-x-1/2 w-56 h-32 rounded-full blur-3xl pointer-events-none opacity-40"
                    style={{
                      background: isPenalty
                        ? 'radial-gradient(circle, #f43f5e, transparent 70%)'
                        : isRankUp
                          ? 'radial-gradient(circle, #ec4899, #f59e0b, transparent 70%)'
                          : `radial-gradient(circle, ${leagueColor}, transparent 70%)`
                    }}
                  />

                  {/* Botón discreto esquina superior derecha */}
                  <button
                    onClick={closeRewardModal}
                    aria-label="Cerrar"
                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs text-gray-400 hover:text-white transition-colors cursor-pointer z-10"
                  >
                    ✕
                  </button>

                  {/* Cabecera: Etiqueta de estado + Nombre del juego */}
                  <div className="relative z-10 flex flex-col items-center">
                    <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-extrabold uppercase tracking-wider border mb-1 ${isPenalty
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                      : isRankUp
                        ? 'bg-gradient-to-r from-pink-500/25 via-rose-500/25 to-amber-500/25 border-pink-400/50 text-pink-200 shadow-[0_0_15px_rgba(236,72,153,0.35)]'
                        : isDuelWin
                          ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          : 'bg-purple-500/15 border-purple-400/35 text-purple-200'
                      }`}>
                      <span>{isPenalty ? '⚠️' : isRankUp ? '👑' : isDuelWin ? '⚔️' : '✨'}</span>
                      <span>
                        {isPenalty
                          ? 'Penalización por Abandono'
                          : isRankUp
                            ? '¡Ascenso de Elo!'
                            : isDuelWin
                              ? '¡Victoria en Duelo!'
                              : '¡Partida Completada!'}
                      </span>
                    </div>

                    {/* Pedestal Central con Emblema Oficial de Liga */}
                    <div className="relative my-1 flex items-center justify-center">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center relative"
                        style={{
                          background: `radial-gradient(circle, color-mix(in srgb, ${leagueColor} 28%, transparent) 0%, rgba(10,7,18,0.6) 72%)`,
                          boxShadow: `0 0 22px color-mix(in srgb, ${leagueColor} 30%, transparent)`
                        }}
                      >
                        <span
                          className={`rk ${roundRewardNotice.rank.league.hi ? 'hi' : ''} transition-transform duration-300 hover:scale-105`}
                          style={{ '--s': '54px', '--c': leagueColor }}
                        >
                          <svg viewBox="0 0 120 120" role="img">
                            <use href={`#${roundRewardNotice.rank.league.key}`} />
                          </svg>
                        </span>
                      </div>
                    </div>

                    {/* Nombre de la Liga / División Actual */}
                    <span className="text-[9px] font-mono uppercase tracking-widest text-gray-400 leading-none">
                      {gameLabel}
                    </span>
                    <h3 className="text-lg sm:text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-100 to-amber-100 leading-tight mt-0.5">
                      {roundRewardNotice.rank.fullName}
                    </h3>

                    {/* Transición de Rango si subió de división */}
                    {isRankUp && roundRewardNotice.prevRank && (
                      <div className="mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] font-mono text-gray-300">
                        <span className="opacity-70">{roundRewardNotice.prevRank.fullName}</span>
                        <span className="text-pink-400 font-bold">→</span>
                        <span className="text-amber-300 font-bold">{roundRewardNotice.rank.fullName}</span>
                      </div>
                    )}

                    {/* Indicador visual de Pips de División (IV, III, II, I) */}
                    {roundRewardNotice.rank.league.hasPips && (
                      <div className="flex items-center gap-1 mt-1.5">
                        {[1, 2, 3, 4].map((pip) => {
                          const active = pip <= roundRewardNotice.rank.pipsCount;
                          return (
                            <span
                              key={pip}
                              className="h-1 rounded-full transition-all duration-300"
                              style={{
                                width: active ? '16px' : '7px',
                                backgroundColor: active ? leagueColor : 'rgba(255,255,255,0.12)',
                                boxShadow: active ? `0 0 6px ${leagueColor}` : 'none'
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Tarjetas de Estadísticas de la Partida (3 Columnas Nítidas) */}
                  <div className="relative z-10 grid grid-cols-3 gap-1.5 my-2">
                    {/* Columna 1: Puntaje / Piezas */}
                    <div className="flex flex-col items-center justify-center py-1.5 px-1.5 rounded-xl bg-[#120d20]/90 border border-blue-500/25 shadow-[inset_0_1px_0_rgba(96,165,250,0.15)]">
                      <span className="text-[8px] font-mono uppercase tracking-wider text-blue-300/80 font-semibold">
                        {scoreLabel}
                      </span>
                      <b className="text-xs sm:text-sm font-mono font-extrabold text-blue-400 mt-0.5 truncate max-w-full">
                        {formattedScore}
                      </b>
                    </div>

                    {/* Columna 2: Puntos de Liga (LP) */}
                    <div className={`flex flex-col items-center justify-center py-1.5 px-1.5 rounded-xl bg-[#120d20]/90 border ${isPenalty
                      ? 'border-rose-500/35 shadow-[inset_0_1px_0_rgba(244,63,94,0.2)]'
                      : 'border-purple-500/30 shadow-[inset_0_1px_0_rgba(192,132,252,0.18)]'
                      }`}>
                      <span className={`text-[8px] font-mono uppercase tracking-wider font-semibold ${isPenalty ? 'text-rose-300/90' : 'text-purple-300/90'
                        }`}>
                        Liga Elo
                      </span>
                      <b className={`text-xs sm:text-sm font-mono font-extrabold mt-0.5 ${isPenalty ? 'text-rose-400' : 'text-purple-300'
                        }`}>
                        {roundRewardNotice.lpEarned > 0 ? `+${roundRewardNotice.lpEarned}` : roundRewardNotice.lpEarned} LP
                      </b>
                    </div>

                    {/* Columna 3: Monedas de Oro */}
                    <div className="flex flex-col items-center justify-center py-1.5 px-1.5 rounded-xl bg-[#120d20]/90 border border-amber-500/30 shadow-[inset_0_1px_0_rgba(251,191,36,0.18)]">
                      <span className="text-[8px] font-mono uppercase tracking-wider text-amber-300/85 font-semibold">
                        Monedas
                      </span>
                      <b className="text-xs sm:text-sm font-mono font-extrabold text-amber-400 mt-0.5 flex items-center gap-1">
                        <span>+{roundRewardNotice.coins}</span>
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border border-yellow-100 shadow-[0_0_5px_rgba(251,191,36,0.8)]" />
                      </b>
                    </div>
                  </div>

                  {/* Mini-retrato registrado cuando se completa un Rompecabezas */}
                  {roundRewardNotice.game === 'puzzle' && roundRewardNotice.puzzlePortrait && (
                    <div className="relative z-10 flex items-center gap-2.5 p-1.5 mb-2 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-left">
                      <img
                        src={roundRewardNotice.puzzlePortrait}
                        alt="Retrato guardado"
                        className="w-9 h-9 rounded-lg object-cover border border-emerald-300/50 flex-none"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-300 font-bold block">
                          🖼️ Retrato Guardado en Historial
                        </span>
                        <span className="text-[10px] text-gray-200 block truncate">
                          Dificultad superada: <b className="text-white">{roundRewardNotice.puzzleDifficultyLabel} ({roundRewardNotice.puzzlePieces}p)</b>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Barra de Progreso de División Compacta */}
                  {roundRewardNotice.rank.league.hasPips && (
                    <div className="relative z-10 w-full bg-black/45 border border-white/10 rounded-xl px-2.5 py-2 mb-2.5 text-left">
                      <div className="flex items-center justify-between text-[10px] font-mono mb-1">
                        <span className="text-gray-300 font-medium">Progreso de División</span>
                        <span className="text-pink-300 font-bold">
                          {roundRewardNotice.rank.lpInDivision} <span className="text-gray-500">/ 100 LP</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/80 border border-white/10 overflow-hidden p-[1px]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-700"
                          style={{
                            width: `${Math.max(4, roundRewardNotice.rank.progressPercent)}%`,
                            boxShadow: '0 0 8px rgba(236, 72, 153, 0.6)'
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-gray-400 mt-1">
                        <span>Total: <b className="text-gray-200 font-mono">{roundRewardNotice.rank.lp} LP</b></span>
                        <span>
                          Faltan <b className="text-pink-300 font-mono">+{roundRewardNotice.rank.lpNeededNext} LP</b> → <b className="text-amber-200">{roundRewardNotice.rank.nextRankName}</b>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Botón de Acción Principal */}
                  <button
                    onClick={closeRewardModal}
                    className="relative z-10 w-full py-2 px-4 rounded-xl font-bold text-xs tracking-wide uppercase text-white transition-all duration-200 cursor-pointer active:scale-95 shadow-lg border border-white/20"
                    style={{
                      background: isPenalty
                        ? 'linear-gradient(135deg, #e11d48, #881337)'
                        : 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                      boxShadow: isPenalty
                        ? '0 4px 16px rgba(225, 29, 72, 0.35)'
                        : '0 4px 16px rgba(236, 72, 153, 0.35)'
                    }}
                  >
                    Continuar Jugando
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 4. Área Principal: Juego Activo O Perfil Completo O Vista Completa de Rompecabezas O Catálogo */}
          {activeGame ? (
            <ArcadeFrame
              gameKey={activeGame}
              gameParams={activeParams}
              userData={userData}
              user={user}
              universeBgClass={getUniverseBgClass()}
              auraColor={getAuraColor()}
              onBackToCatalog={() => {
                const wasPuzzle = activeGame === 'puzzle';
                setActiveGame(null);
                setActiveParams('');
                if (wasPuzzle) {
                  setCurrentSection('puzzle_hub');
                }
              }}
            />
          ) : currentSection === 'profile' ? (
            (() => {
              let photoPool = (globalImages || []).map(extractPhotoUrl).filter(Boolean);
              if (photoPool.length === 0 && Array.isArray(DEMO_IMAGES)) {
                photoPool = DEMO_IMAGES.map(extractPhotoUrl).filter(Boolean);
              }
              const liveGalleryByKey = {};
              (globalImages || []).forEach((img) => {
                const u = extractPhotoUrl(img);
                if (!u) return;
                const k1 = getCleanPhotoKey(u);
                if (k1) liveGalleryByKey[k1] = u;
                if (img && typeof img === 'object') {
                  [img.src, img.original_url, img.thumb_url, img.public_id, img.thumb_public_id].forEach((cand) => {
                    const ck = getCleanPhotoKey(cand);
                    if (ck) liveGalleryByKey[ck] = u;
                  });
                }
              });
              photoPool.forEach((u) => {
                const k = getCleanPhotoKey(u);
                if (k && !liveGalleryByKey[k]) liveGalleryByKey[k] = u;
              });

              const rawCompleted = userData?.completedPuzzles || {};
              const normalizedMap = {};
              let fbIdx = 0;
              Object.entries(rawCompleted).forEach(([rawKey, val]) => {
                if (!val) return;
                const cleanKey = getCleanPhotoKey(val.url || val.key || rawKey) || rawKey;
                const existing = normalizedMap[cleanKey];
                const mergedLevels = Array.from(
                  new Set([...(existing?.levels || []), ...(val.levels || [])].map(Number).filter(Boolean))
                ).sort((a, b) => a - b);
                const maxP = mergedLevels.length > 0 ? Math.max(...mergedLevels) : (val.maxPieces || 30);

                let matchedLiveUrl = liveGalleryByKey[cleanKey]
                  || liveGalleryByKey[getCleanPhotoKey(val.key)]
                  || liveGalleryByKey[getCleanPhotoKey(rawKey)];
                if (!matchedLiveUrl) {
                  const prefixMatchKey = Object.keys(liveGalleryByKey).find(
                    k => cleanKey.startsWith(k) || k.startsWith(cleanKey)
                  );
                  if (prefixMatchKey) matchedLiveUrl = liveGalleryByKey[prefixMatchKey];
                }
                if (!matchedLiveUrl && val.liveUrl && /^https?:\/\//i.test(val.liveUrl)) {
                  matchedLiveUrl = resolveStoredPuzzleUrl(val.liveUrl);
                }

                const resolvedUrl = resolveStoredPuzzleUrl(val.url || existing?.url || '');
                const resolvedPortrait = val.portrait || existing?.portrait || '';
                const fallbackUrl = photoPool[fbIdx % Math.max(1, photoPool.length)] || '/fotos/Imagenes-amor/Foto0144.jpg';
                if (!matchedLiveUrl && !resolvedPortrait && !resolvedUrl && photoPool.length > 0) {
                  matchedLiveUrl = fallbackUrl;
                  fbIdx++;
                }

                const displaySrc = matchedLiveUrl || resolvedPortrait || resolvedUrl || fallbackUrl;
                normalizedMap[cleanKey] = {
                  ...existing,
                  ...val,
                  key: cleanKey,
                  levels: mergedLevels,
                  maxPieces: maxP,
                  liveUrl: matchedLiveUrl || existing?.liveUrl || '',
                  portrait: resolvedPortrait,
                  url: resolvedUrl || val.url || existing?.url || '',
                  displaySrc,
                  fallbackUrl,
                  lastCompletedAt: Math.max(existing?.lastCompletedAt || 0, val.lastCompletedAt || 0)
                };
              });

              const profileCompletedPortraits = Object.values(normalizedMap)
                .filter(item => item.levels && item.levels.length > 0)
                .sort((a, b) => (b.maxPieces - a.maxPieces) || ((b.lastCompletedAt || 0) - (a.lastCompletedAt || 0)));

              return (
                <ArcadeProfileView
                  userData={userData}
                  user={user}
                  completedPortraits={profileCompletedPortraits}
                  onUpdateArcadeProfile={handleUpdateArcadeProfile}
                  onGoToPuzzle={() => setCurrentSection('puzzle_hub')}
                  onBack={() => setCurrentSection('catalog')}
                />
              );
            })()
          ) : currentSection === 'shop' ? (
            <ArcadeShopView
              userData={userData}
              coins={displayedCoins}
              onPurchaseOrEquip={handlePoolShopPurchaseOrEquip}
              onBack={() => setCurrentSection('catalog')}
            />
          ) : currentSection === 'puzzle_hub' ? (
            <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-5 flex flex-col gap-6 animate-in fade-in duration-300">
              {(() => {
                let photoPool = (globalImages || []).map(extractPhotoUrl).filter(Boolean);
                if (photoPool.length === 0) {
                  try {
                    const cached = JSON.parse(localStorage.getItem('demo-images-v1') || '{}');
                    if (cached.images) photoPool = cached.images.map(extractPhotoUrl).filter(Boolean);
                  } catch (e) { }
                }
                if (photoPool.length === 0 && Array.isArray(DEMO_IMAGES)) {
                  photoPool = DEMO_IMAGES.map(extractPhotoUrl).filter(Boolean);
                }

                // Mapa de fotos actuales en la galería por su clave limpia (incluyendo src, original_url y public_id)
                const liveGalleryByKey = {};
                (globalImages || []).forEach((img) => {
                  const u = extractPhotoUrl(img);
                  if (!u) return;
                  const k1 = getCleanPhotoKey(u);
                  if (k1) liveGalleryByKey[k1] = u;
                  if (img && typeof img === 'object') {
                    [img.src, img.original_url, img.thumb_url, img.public_id, img.thumb_public_id].forEach((cand) => {
                      const ck = getCleanPhotoKey(cand);
                      if (ck) liveGalleryByKey[ck] = u;
                    });
                  }
                });
                photoPool.forEach((u) => {
                  const k = getCleanPhotoKey(u);
                  if (k && !liveGalleryByKey[k]) liveGalleryByKey[k] = u;
                });

                // Consolidar entradas de completedPuzzles (fusionando posibles claves antiguas con query params)
                const rawCompleted = userData?.completedPuzzles || {};
                const normalizedCompletedMap = {};
                let fallbackIdx = 0;
                Object.entries(rawCompleted).forEach(([rawKey, val]) => {
                  if (!val) return;
                  const cleanKey = getCleanPhotoKey(val.url || val.key || rawKey) || rawKey;
                  const existing = normalizedCompletedMap[cleanKey];
                  const mergedLevels = Array.from(
                    new Set([...(existing?.levels || []), ...(val.levels || [])].map(Number).filter(Boolean))
                  ).sort((a, b) => a - b);
                  const maxP = mergedLevels.length > 0 ? Math.max(...mergedLevels) : (val.maxPieces || 30);

                  // Buscar si alguna foto viva de la galería coincide con esta clave
                  let matchedLiveUrl = liveGalleryByKey[cleanKey]
                    || liveGalleryByKey[getCleanPhotoKey(val.key)]
                    || liveGalleryByKey[getCleanPhotoKey(rawKey)];
                  if (!matchedLiveUrl) {
                    const prefixMatchKey = Object.keys(liveGalleryByKey).find(
                      k => cleanKey.startsWith(k) || k.startsWith(cleanKey)
                    );
                    if (prefixMatchKey) matchedLiveUrl = liveGalleryByKey[prefixMatchKey];
                  }
                  if (!matchedLiveUrl && val.liveUrl && /^https?:\/\//i.test(val.liveUrl)) {
                    matchedLiveUrl = resolveStoredPuzzleUrl(val.liveUrl);
                  }

                  const resolvedUrl = resolveStoredPuzzleUrl(val.url || existing?.url || '');
                  const resolvedPortrait = val.portrait || existing?.portrait || '';

                  if (!matchedLiveUrl && !resolvedPortrait && !resolvedUrl && photoPool.length > 0) {
                    matchedLiveUrl = photoPool[fallbackIdx % photoPool.length];
                    fallbackIdx++;
                  }

                  normalizedCompletedMap[cleanKey] = {
                    ...existing,
                    ...val,
                    key: cleanKey,
                    levels: mergedLevels,
                    maxPieces: maxP,
                    liveUrl: matchedLiveUrl || existing?.liveUrl || '',
                    portrait: resolvedPortrait,
                    url: resolvedUrl || val.url || existing?.url || '',
                    rawUrl: val.url || existing?.rawUrl || '',
                    lastCompletedAt: Math.max(existing?.lastCompletedAt || 0, val.lastCompletedAt || 0)
                  };
                });

                const completedPortraits = Object.values(normalizedCompletedMap)
                  .filter(item => item.levels && item.levels.length > 0)
                  .sort((a, b) => (b.maxPieces - a.maxPieces) || ((b.lastCompletedAt || 0) - (a.lastCompletedAt || 0)));

                const completedLiveKeys = new Set();
                completedPortraits.forEach(item => {
                  completedLiveKeys.add(item.key);
                  if (item.liveUrl) completedLiveKeys.add(getCleanPhotoKey(item.liveUrl));
                });

                const uncompletedGalleryPhotos = photoPool.filter((u) => {
                  const k = getCleanPhotoKey(u);
                  return !completedLiveKeys.has(k);
                });

                const selObj = puzzleSelectedPhoto
                  ? (typeof puzzleSelectedPhoto === 'object'
                    ? puzzleSelectedPhoto
                    : {
                      photoKey: getCleanPhotoKey(puzzleSelectedPhoto),
                      displayUrl: puzzleSelectedPhoto,
                      playUrl: puzzleSelectedPhoto,
                      referenceUrl: puzzleSelectedPhoto
                    })
                  : null;
                const selEntry = selObj ? normalizedCompletedMap[selObj.photoKey] : null;
                const selLevels = selObj?.levels?.length ? selObj.levels : (selEntry?.levels || []);
                const selMaxP = selLevels.length > 0 ? Math.max(...selLevels) : 0;
                const selMaxDiff = selMaxP > 0 ? getPuzzleDifficultyInfo(selMaxP) : null;

                return (
                  <>
                    {/* 1. CABECERA HERO DE ROMPECABEZAS DE AMOR */}
                    <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-[#132226]/90 via-[#1a132b]/95 to-[#120c1e]/95 border border-emerald-500/35 shadow-[0_0_40px_rgba(16,185,129,0.18)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-pink-500/25 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-inner flex-none">
                          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.315 8.685a.98.98 0 0 1 .837-.276c.47.07.802.48.968.925a2.501 2.501 0 1 0 3.214-3.214c-.446-.166-.855-.497-.925-.968a.979.979 0 0 1 .276-.837l1.61-1.61a2.404 2.404 0 0 1 1.705-.707c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z" />
                          </svg>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold">
                              Rompecabezas de Recuerdos
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-mono text-purple-200 font-bold">
                              {completedPortraits.length} {completedPortraits.length === 1 ? 'Retrato Completado' : 'Retratos Completados'}
                            </span>
                          </div>
                          <h2 className="text-xl sm:text-3xl font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-pink-200 to-amber-200 mt-1">
                            Álbum de Retratos y Dificultades
                          </h2>
                          <p className="text-xs sm:text-sm text-gray-300 mt-0.5">
                            Elige una foto de su galería, desafía una dificultad mayor o juega al azar. Cada imagen completada guarda su retrato e historial para siempre.
                          </p>
                        </div>
                      </div>

                      {/* Estadística rápida de máximo logro */}
                      <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end bg-black/40 border border-white/10 rounded-2xl px-4 py-3 flex-none">
                        <div className="text-left">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block">
                            Récord Máximo
                          </span>
                          <b className="text-base sm:text-lg font-mono text-emerald-300">
                            {userData?.best?.puzzle ? `${userData.best.puzzle} piezas` : 'Sin récord aún'}
                          </b>
                          <span className="text-[10px] text-gray-400 block">
                            {userData?.best?.puzzle ? getPuzzleDifficultyInfo(userData.best.puzzle).label : 'Completa tu primer puzzle'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 2. GRID PRINCIPAL DE VISTA COMPLETA: PANEL DE JUEGO / DIFICULTAD (IZQUIERDA) + ÁLBUM DE RETRATOS Y GALERÍA (DERECHA) */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* COLUMNA IZQUIERDA (4 cols en desktop): Selector de Foto Activa y 5 Dificultades */}
                      <div className="lg:col-span-5 xl:col-span-4 rounded-3xl p-5 bg-gradient-to-b from-[#1b1429]/95 to-[#0d0917]/95 border border-emerald-500/30 shadow-xl flex flex-col gap-4 lg:sticky lg:top-4">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                          <div className="text-left">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block">
                              Paso 1 · Modo de Imagen
                            </span>
                            <h3 className="text-base sm:text-lg font-serif font-bold text-white">
                              {selObj ? 'Retrato Seleccionado' : 'Foto al Azar de Ustedes'}
                            </h3>
                          </div>
                          {selObj && (
                            <button
                              onClick={() => setPuzzleSelectedPhoto(null)}
                              className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-gray-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="16 3 21 3 21 8" />
                                <line x1="4" y1="20" x2="21" y2="3" />
                                <polyline points="21 16 21 21 16 21" />
                                <line x1="15" y1="15" x2="21" y2="21" />
                                <line x1="4" y1="4" x2="9" y2="9" />
                              </svg>
                              <span>Cambiar a Azar</span>
                            </button>
                          )}
                        </div>

                        {/* Tarjeta de vista previa de la foto seleccionada o modo azar */}
                        {selObj ? (
                          <div className="rounded-2xl overflow-hidden border border-emerald-400/40 bg-black/50 flex flex-col shadow-lg">
                            <div className="relative aspect-[16/10] w-full bg-[#120d1d] overflow-hidden">
                              <img
                                src={selObj.displayUrl || selObj.portrait || photoPool[0] || '/fotos/Imagenes-amor/Foto0144.jpg'}
                                alt="Foto seleccionada"
                                onError={(e) => {
                                  const proxyTry = getProxyFallbackUrl(selObj.referenceUrl || selObj.displayUrl);
                                  const galleryFallback = photoPool[0] || '/fotos/Imagenes-amor/Foto0144.jpg';
                                  if (selObj.portrait && e.currentTarget.src !== selObj.portrait) {
                                    e.currentTarget.src = selObj.portrait;
                                  } else if (proxyTry && e.currentTarget.src !== proxyTry && !e.currentTarget.dataset.triedProxy) {
                                    e.currentTarget.dataset.triedProxy = '1';
                                    e.currentTarget.src = proxyTry;
                                  } else if (galleryFallback && e.currentTarget.src !== galleryFallback && !e.currentTarget.dataset.triedFallback) {
                                    e.currentTarget.dataset.triedFallback = '1';
                                    e.currentTarget.src = galleryFallback;
                                  }
                                }}
                                className="w-full h-full object-cover"
                              />
                              {selMaxDiff && (
                                <span className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold ${selMaxDiff.badgeBg}`}>
                                  Máx: {selMaxP} piezas
                                </span>
                              )}
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-3 pt-6 text-left">
                                <span className="text-xs text-gray-200 font-semibold block">
                                  {selMaxDiff
                                    ? <>Esta imagen llegó hasta: <b className="text-emerald-300">{selMaxDiff.label} ({selMaxP} piezas)</b></>
                                    : 'Aún no han completado esta foto ¡Elige una dificultad!'}
                                </span>
                              </div>
                            </div>

                            <div className="p-2.5 bg-[#150f24] border-t border-white/10 flex flex-wrap gap-1.5 items-center justify-center">
                              {[30, 60, 120, 240, 500].map(lv => {
                                const isDone = selLevels.includes(lv);
                                return (
                                  <span
                                    key={lv}
                                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${isDone
                                      ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50 font-bold shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                      : 'bg-white/5 text-gray-400 border-white/10'
                                      }`}
                                  >
                                    {lv}p {isDone ? '✓' : ''}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-pink-500/10 to-purple-500/10 border border-white/15 flex items-center gap-3.5 text-left">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-emerald-300 flex-none">
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="3" />
                                <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
                                <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" />
                                <circle cx="12" cy="12" r="1.2" fill="currentColor" />
                                <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" />
                                <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" />
                              </svg>
                            </div>
                            <div>
                              <b className="text-sm text-white block">Modo Sorpresa al Azar</b>
                              <p className="text-xs text-gray-300 leading-relaxed mt-0.5">
                                Toca cualquier dificultad abajo para armar una foto sorpresa, o selecciona un retrato a la derecha.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Botones de Dificultad (30, 60, 120, 240, 500 piezas) */}
                        <div className="flex flex-col gap-2">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-pink-400 font-bold text-left">
                            Paso 2 · Elige las Piezas para Jugar Ahora
                          </span>

                          {[
                            { n: 30, name: 'Muy fácil', lp: 15, dot: 'bg-teal-400 shadow-[0_0_8px_#2dd4bf]', btn: 'border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/25 text-teal-100', pill: 'bg-teal-500/20 border-teal-400/30 text-teal-200' },
                            { n: 60, name: 'Fácil', lp: 40, dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]', btn: 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-100', pill: 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200' },
                            { n: 120, name: 'Media', lp: 80, dot: 'bg-sky-400 shadow-[0_0_8px_#38bdf8]', btn: 'border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25 text-sky-100', pill: 'bg-sky-500/20 border-sky-400/30 text-sky-200' },
                            { n: 240, name: 'Difícil', lp: 250, dot: 'bg-pink-400 shadow-[0_0_8px_#f472b6]', btn: 'border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/25 text-pink-100', pill: 'bg-pink-500/20 border-pink-400/30 text-pink-200' },
                            { n: 500, name: 'Imposible', lp: 350, dot: 'bg-purple-400 shadow-[0_0_8px_#c084fc]', btn: 'border-purple-500/45 bg-purple-500/15 hover:bg-purple-500/30 text-purple-100', pill: 'bg-purple-500/20 border-purple-400/30 text-purple-200' }
                          ].map((lvl) => {
                            const isLevelCompleted = selLevels.includes(lvl.n);
                            return (
                              <button
                                key={lvl.n}
                                onClick={() => launchRandomPuzzle(lvl.n, puzzleSelectedPhoto)}
                                className={`w-full py-2.5 px-3.5 rounded-2xl font-bold text-xs tracking-wide flex items-center justify-between border transition-all active:scale-95 cursor-pointer group ${lvl.btn}`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className={`w-2.5 h-2.5 rounded-full group-hover:scale-125 transition-transform ${lvl.dot}`} />
                                  <span className="text-xs sm:text-sm font-semibold">{lvl.name}</span>
                                  {isLevelCompleted && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/80 text-[9px] font-mono text-white font-bold">
                                      ✓ Superado
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono ${lvl.pill}`}>
                                    {lvl.n} piezas
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-purple-500/25 border border-purple-400/30 text-[10px] font-mono text-purple-200 font-bold">
                                    +{lvl.lp} LP
                                  </span>
                                  <span className="text-xs opacity-80 group-hover:translate-x-0.5 transition-transform">→</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* COLUMNA DERECHA (8 cols en desktop): ÁLBUM DE RETRATOS COMPLETADOS + GALERÍA COMPLETA */}
                      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                        {/* SECCIÓN A: ÁLBUM DE RETRATOS COMPLETADOS (HISTORIAL PERMANENTE) */}
                        <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-[#181226]/95 to-[#0c0914]/95 border border-emerald-500/30 shadow-xl flex flex-col gap-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                            <div className="text-left">
                              <h3 className="text-base sm:text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-200">
                                Retratos de Imágenes Completadas ({completedPortraits.length})
                              </h3>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Historial permanente: toca cualquier retrato para ver en qué piezas lo completaron o jugarlo en mayor dificultad.
                              </p>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[11px] font-mono text-emerald-300 font-bold">
                              Guardado anti-borrado
                            </span>
                          </div>

                          {completedPortraits.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                              {completedPortraits.map((item, idx) => {
                                const liveUrl = item.liveUrl || liveGalleryByKey[item.key];
                                const isDeletedFromGallery = !liveUrl;
                                // Priorizar la foto viva de la galería, el retrato base64 o la URL resuelta/respaldo
                                const fallbackGalleryImg = photoPool[idx % Math.max(1, photoPool.length)] || '/fotos/Imagenes-amor/Foto0144.jpg';
                                const displaySrc = liveUrl || item.portrait || resolveStoredPuzzleUrl(item.url) || fallbackGalleryImg;
                                const playSrc = liveUrl || item.portrait || resolveStoredPuzzleUrl(item.url) || fallbackGalleryImg;
                                const maxP = item.maxPieces || Math.max(...(item.levels || [30]));
                                const diffInfo = getPuzzleDifficultyInfo(maxP);
                                const isSelected = selObj && selObj.photoKey === item.key;

                                return (
                                  <div
                                    key={item.key || idx}
                                    onClick={() => setPuzzleSelectedPhoto({
                                      photoKey: item.key,
                                      displayUrl: displaySrc,
                                      playUrl: playSrc,
                                      referenceUrl: liveUrl || resolveStoredPuzzleUrl(item.url) || displaySrc,
                                      portrait: item.portrait,
                                      levels: item.levels || [],
                                      maxPieces: maxP,
                                      isDeletedFromGallery
                                    })}
                                    className={`group relative rounded-2xl overflow-hidden border transition-all cursor-pointer shadow-lg hover:scale-[1.02] flex flex-col bg-[#120d1d] ${isSelected
                                      ? 'border-emerald-400 ring-2 ring-emerald-400/50 shadow-[0_0_25px_rgba(16,185,129,0.35)]'
                                      : 'border-emerald-500/30 hover:border-emerald-400/70'
                                      }`}
                                  >
                                    {/* Marco del Retrato sin badges encimados */}
                                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-emerald-950/50 via-[#150f24] to-pink-950/40">
                                      {displaySrc ? (
                                        <img
                                          src={displaySrc}
                                          alt="Retrato completado"
                                          onError={(e) => {
                                            const proxyTry = getProxyFallbackUrl(item.rawUrl || item.url);
                                            if (item.portrait && e.currentTarget.src !== item.portrait) {
                                              e.currentTarget.src = item.portrait;
                                            } else if (proxyTry && e.currentTarget.src !== proxyTry && !e.currentTarget.dataset.triedProxy) {
                                              e.currentTarget.dataset.triedProxy = '1';
                                              e.currentTarget.src = proxyTry;
                                            } else if (fallbackGalleryImg && e.currentTarget.src !== fallbackGalleryImg && !e.currentTarget.dataset.triedFallback) {
                                              e.currentTarget.dataset.triedFallback = '1';
                                              e.currentTarget.src = fallbackGalleryImg;
                                            }
                                          }}
                                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-emerald-300/70 p-4 text-center">
                                          <span className="text-3xl mb-1">🖼️</span>
                                          <span className="text-[10px] font-mono">Retrato registrado</span>
                                        </div>
                                      )}

                                      {/* Esquina superior izquierda: estado del recuerdo (separado de la esquina derecha) */}
                                      <span
                                        className={`absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[9px] font-mono font-semibold backdrop-blur-md border ${isDeletedFromGallery
                                          ? 'bg-black/80 border-amber-400/40 text-amber-200'
                                          : 'bg-black/75 border-emerald-400/40 text-emerald-200'
                                          }`}
                                      >
                                        {isDeletedFromGallery ? 'En recuerdo' : 'Retrato'}
                                      </span>

                                      {/* Esquina superior derecha: Máximo de piezas alcanzado */}
                                      <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg border text-[10px] font-mono font-bold ${diffInfo.badgeBg}`}>
                                        Máx: {maxP}p
                                      </span>

                                      {/* Franja inferior nítida: hasta qué dificultad llegó esta imagen */}
                                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent p-2.5 pt-6 text-left">
                                        <span className="text-[11px] text-gray-200 font-medium block leading-snug">
                                          Llegó hasta: <b className="text-emerald-300">{diffInfo.label} ({maxP} piezas)</b>
                                        </span>
                                      </div>
                                    </div>

                                    {/* Historial de las 5 dificultades en una sola fila limpia */}
                                    <div className="p-2.5 bg-[#150f24] border-t border-white/10 flex flex-col gap-1.5">
                                      <div className="grid grid-cols-5 gap-1">
                                        {[30, 60, 120, 240, 500].map((lv) => {
                                          const done = (item.levels || []).includes(lv);
                                          return (
                                            <span
                                              key={lv}
                                              className={`text-[9px] font-mono py-1 rounded-md text-center transition-all ${done
                                                ? 'bg-emerald-500/85 text-white font-bold shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                                : 'bg-white/5 text-gray-500 border border-white/5'
                                                }`}
                                            >
                                              {lv}p{done ? '✓' : ''}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 text-center flex flex-col items-center">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300 mb-2">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z" />
                                </svg>
                              </div>
                              <p className="text-sm text-gray-200 font-semibold">
                                Aún no tienen retratos en su historial
                              </p>
                              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                                Completen cualquier imagen en 30, 60, 120, 240 o 500 piezas y aparecerá aquí como retrato con la dificultad máxima alcanzada.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* SECCIÓN B: GALERÍA DE FOTOS DISPONIBLES PARA ARMAR */}
                        <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-b from-[#181226]/95 to-[#0c0914]/95 border border-white/10 shadow-xl flex flex-col gap-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                            <div className="text-left">
                              <h3 className="text-base sm:text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200">
                                Fotos de la Galería para Armar ({uncompletedGalleryPhotos.length})
                              </h3>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Selecciona cualquier foto de su galería para elegir la cantidad de piezas a la izquierda y desbloquear su retrato para el fondo de tu perfil.
                              </p>
                            </div>
                          </div>

                          {uncompletedGalleryPhotos.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                              {uncompletedGalleryPhotos.map((url, idx) => {
                                const photoKey = getCleanPhotoKey(url) || `foto_${idx}`;
                                const isSelected = selObj && selObj.photoKey === photoKey;
                                return (
                                  <div
                                    key={url + idx}
                                    onClick={() => setPuzzleSelectedPhoto({
                                      photoKey,
                                      displayUrl: url,
                                      playUrl: url,
                                      referenceUrl: url,
                                      levels: [],
                                      maxPieces: 0,
                                      isDeletedFromGallery: false
                                    })}
                                    className={`group relative aspect-square rounded-2xl overflow-hidden border transition-all cursor-pointer shadow-md hover:scale-[1.03] ${isSelected
                                      ? 'border-pink-400 ring-2 ring-pink-400/50 shadow-[0_0_20px_rgba(236,72,153,0.4)]'
                                      : 'border-white/10 hover:border-pink-400/60'
                                      }`}
                                  >
                                    <img
                                      src={url}
                                      alt="Foto de galería"
                                      loading="lazy"
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-2 text-center">
                                      <span className="text-[10px] font-medium text-gray-200 group-hover:text-pink-200">
                                        {isSelected ? '✓ Seleccionada para jugar' : 'Tocar para elegir'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              {isLoadingMoreGallery && Array.from({ length: 4 }).map((_, skIdx) => (
                                <div
                                  key={`sk-${skIdx}`}
                                  className="aspect-square rounded-2xl bg-white/[0.04] border border-white/10 animate-pulse flex items-center justify-center"
                                >
                                  <span className="w-5 h-5 rounded-full border-2 border-pink-400/60 border-t-transparent animate-spin" />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-emerald-300 text-center py-4">
                              ¡Increíble! Ya han armado todas las fotos actuales de su galería al menos una vez.
                            </p>
                          )}
                          <div ref={puzzleGallerySentinelRef} className="h-2 w-full pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </main>
          ) : (
            <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-4 flex flex-col justify-center items-center">
              {/* ================= CATÁLOGO CENTRADO CON FONDOS DE ICONOS-ARCADE ================= */}
              <div className="w-full max-w-5xl flex flex-col items-center justify-center my-auto animate-in fade-in duration-300">
                {/* Cuadrícula de Tarjetas con Fondos Animados y SVGs de iconos-arcade.html */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6 w-full justify-center">
                  {ALL_GAMES.map((game) => (
                    <div
                      key={game.id}
                      className={`arcade-card group ${game.comingSoon ? 'opacity-90 hover:opacity-100 cursor-default' : ''}`}
                      style={{ '--c': game.c }}
                      onClick={() => {
                        if (!game.comingSoon) handlePlayGame(game.id);
                      }}
                    >
                      {/* Fondo animado del juego con su icono en primer plano */}
                      <div
                        className={`arcade-scene s-${game.sceneKey}`}
                        dangerouslySetInnerHTML={{ __html: GAME_SCENES_STATIC[game.id] || '' }}
                      />

                      {/* Información y Botón JUGAR o PRÓXIMAMENTE */}
                      <div className="arcade-card-body">
                        <div>
                          <b className="text-base md:text-lg font-bold text-white group-hover:text-pink-200 transition-colors block">
                            {game.name}
                          </b>
                          <small className="text-xs text-gray-400 font-medium block mt-0.5">
                            {game.desc}
                          </small>
                        </div>

                        {game.comingSoon ? (
                          <button
                            disabled
                            className="w-full mt-3 py-2.5 px-4 rounded-xl font-bold text-xs md:text-sm tracking-wider uppercase flex items-center justify-center gap-2 border border-amber-500/40 bg-amber-500/15 text-amber-300 opacity-90 cursor-not-allowed shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                          >
                            <svg className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>PRÓXIMAMENTE</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayGame(game.id);
                            }}
                            className="w-full mt-3 py-2.5 px-4 rounded-xl font-bold text-xs md:text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg transition-all duration-200 active:scale-95 cursor-pointer text-white"
                            style={{
                              background: `linear-gradient(135deg, ${game.c}, color-mix(in srgb, ${game.c} 65%, #000))`,
                              boxShadow: `0 4px 15px color-mix(in srgb, ${game.c} 40%, transparent)`
                            }}
                          >
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            <span>JUGAR</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </main>
          )}

          {/* Modal interactivo de selección de dificultad para Sudoku */}
          {sudokuModalOpen && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setSudokuModalOpen(false)}
            >
              <div
                className="relative w-full max-w-[340px] max-h-[calc(100vh-24px)] overflow-y-auto rounded-3xl px-5 py-4 bg-gradient-to-b from-[#1b152b] to-[#0c0915] border border-pink-500/30 shadow-[0_0_50px_rgba(236,72,153,0.3)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Botón cerrar */}
                <button
                  onClick={() => setSudokuModalOpen(false)}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  ✕
                </button>

                {/* Icono decorativo */}
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500/20 to-pink-500/20 border border-blue-400/30 flex items-center justify-center text-xl shadow-inner mb-2">
                  🔢
                </div>

                <h3 className="text-lg font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-sky-200 to-indigo-200">
                  Sudoku Pareja
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 mb-3.5">
                  Elige la dificultad para comenzar a jugar:
                </p>

                {/* Opciones de Dificultad (SIN dimensiones numéricas 6x6, 9x9, 12x12) */}
                <div className="w-full flex flex-col gap-2">
                  <button
                    onClick={() => launchSudoku(6)}
                    className="w-full py-2.5 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-200 hover:text-white shadow-[0_0_15px_rgba(16,185,129,0.15)] transition-all active:scale-95 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#34d399]" />
                      <span className="text-sm font-semibold">Fácil</span>
                    </div>
                    <span className="text-xs text-emerald-400/80 group-hover:text-emerald-200">Jugar →</span>
                  </button>

                  <button
                    onClick={() => launchSudoku(9)}
                    className="w-full py-2.5 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25 text-sky-200 hover:text-white shadow-[0_0_15px_rgba(14,165,233,0.15)] transition-all active:scale-95 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#38bdf8]" />
                      <span className="text-sm font-semibold">Normal</span>
                    </div>
                    <span className="text-xs text-sky-400/80 group-hover:text-sky-200">Jugar →</span>
                  </button>

                  <button
                    onClick={() => launchSudoku(12)}
                    className="w-full py-2.5 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/25 text-pink-200 hover:text-white shadow-[0_0_15px_rgba(236,72,153,0.15)] transition-all active:scale-95 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#f472b6]" />
                      <span className="text-sm font-semibold">Difícil</span>
                    </div>
                    <span className="text-xs text-pink-400/80 group-hover:text-pink-200">Jugar →</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal interactivo de selección de piezas/dificultad y Galería de Rompecabezas */}
          {puzzleModalOpen && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => {
                setPuzzleModalOpen(false);
                setPuzzleSelectedPhoto(null);
              }}
            >
              <div
                className="relative w-full max-w-[390px] rounded-3xl px-5 py-4 bg-gradient-to-b from-[#1c1427] to-[#0c0915] border border-emerald-500/30 shadow-[0_0_50px_rgba(16,185,129,0.25)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200 max-h-[calc(100vh-24px)] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Botón cerrar */}
                <button
                  onClick={() => {
                    setPuzzleModalOpen(false);
                    setPuzzleSelectedPhoto(null);
                  }}
                  className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  ✕
                </button>

                {/* Icono decorativo */}
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-pink-500/20 border border-emerald-400/30 flex items-center justify-center text-xl shadow-inner mb-1.5">
                  🧩
                </div>

                <h3 className="text-lg font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-pink-200 to-amber-200">
                  Rompecabezas de Amor
                </h3>

                {/* Selector de Pestañas: Aleatorio vs Retratos / Historial */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 my-2 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPuzzleTab('random');
                      setPuzzleSelectedPhoto(null);
                    }}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${puzzleTab === 'random' && !puzzleSelectedPhoto
                      ? 'bg-gradient-to-r from-emerald-500/30 to-pink-500/30 text-white border border-emerald-400/30 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                      }`}
                  >
                    🎲 Foto al Azar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPuzzleTab('gallery')}
                    className={`flex-1 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${puzzleTab === 'gallery'
                      ? 'bg-gradient-to-r from-emerald-500/30 to-pink-500/30 text-white border border-emerald-400/30 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200'
                      }`}
                  >
                    <span>🖼️ Retratos / Historial</span>
                    {Object.keys(userData?.completedPuzzles || {}).length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 border border-emerald-400/40 text-[9px] font-mono text-emerald-200">
                        {Object.keys(userData?.completedPuzzles || {}).length}
                      </span>
                    )}
                  </button>
                </div>

                {/* VISTA 1: Álbum de Retratos Completados (Historial permanente) + Galería */}
                {puzzleTab === 'gallery' && !puzzleSelectedPhoto && (
                  <div className="w-full flex flex-col gap-2.5 text-left">
                    {(() => {
                      let photoPool = (globalImages || []).map(extractPhotoUrl).filter(Boolean);
                      if (photoPool.length === 0) {
                        try {
                          const cached = JSON.parse(localStorage.getItem('demo-images-v1') || '{}');
                          if (cached.images) photoPool = cached.images.map(extractPhotoUrl).filter(Boolean);
                        } catch (e) { }
                      }
                      if (photoPool.length === 0 && Array.isArray(DEMO_IMAGES)) {
                        photoPool = DEMO_IMAGES.map(extractPhotoUrl).filter(Boolean);
                      }

                      // Mapa de fotos actuales en la galería por su clave limpia
                      const liveGalleryByKey = {};
                      photoPool.forEach((u) => {
                        const k = getCleanPhotoKey(u);
                        if (k) liveGalleryByKey[k] = u;
                      });

                      // Consolidar entradas de completedPuzzles (fusionando posibles claves antiguas con query params)
                      const rawCompleted = userData?.completedPuzzles || {};
                      const normalizedCompletedMap = {};
                      Object.entries(rawCompleted).forEach(([rawKey, val]) => {
                        if (!val) return;
                        const cleanKey = getCleanPhotoKey(val.url || val.key || rawKey) || rawKey;
                        const existing = normalizedCompletedMap[cleanKey];
                        const mergedLevels = Array.from(
                          new Set([...(existing?.levels || []), ...(val.levels || [])].map(Number).filter(Boolean))
                        ).sort((a, b) => a - b);
                        const maxP = mergedLevels.length > 0 ? Math.max(...mergedLevels) : (val.maxPieces || 30);

                        normalizedCompletedMap[cleanKey] = {
                          ...existing,
                          ...val,
                          key: cleanKey,
                          levels: mergedLevels,
                          maxPieces: maxP,
                          portrait: val.portrait || existing?.portrait || '',
                          url: val.url || existing?.url || '',
                          lastCompletedAt: Math.max(existing?.lastCompletedAt || 0, val.lastCompletedAt || 0)
                        };
                      });

                      const completedPortraits = Object.values(normalizedCompletedMap)
                        .filter(item => item.levels && item.levels.length > 0)
                        .sort((a, b) => (b.maxPieces - a.maxPieces) || ((b.lastCompletedAt || 0) - (a.lastCompletedAt || 0)));

                      const uncompletedGalleryPhotos = photoPool.filter((u) => {
                        const k = getCleanPhotoKey(u);
                        return !normalizedCompletedMap[k] || (normalizedCompletedMap[k].levels || []).length === 0;
                      });

                      return (
                        <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                          {/* SECCIÓN A: RETRATOS COMPLETADOS (CONSERVADOS AUNQUE SE BORREN DE LA GALERÍA) */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                                🏆 Álbum de Retratos Completados ({completedPortraits.length})
                              </span>
                              <span className="text-[9px] text-gray-400 font-mono">
                                Guardado permanente
                              </span>
                            </div>

                            {completedPortraits.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2">
                                {completedPortraits.map((item, idx) => {
                                  const liveUrl = liveGalleryByKey[item.key];
                                  const isDeletedFromGallery = !liveUrl;
                                  // Priorizar el retrato en base64 o la foto viva de la galería
                                  const displaySrc = item.portrait || liveUrl || item.url;
                                  const playSrc = liveUrl || item.portrait || item.url;
                                  const maxP = item.maxPieces || Math.max(...(item.levels || [30]));
                                  const diffInfo = getPuzzleDifficultyInfo(maxP);

                                  return (
                                    <div
                                      key={item.key || idx}
                                      onClick={() => setPuzzleSelectedPhoto({
                                        photoKey: item.key,
                                        displayUrl: displaySrc,
                                        playUrl: playSrc,
                                        referenceUrl: liveUrl || item.url || item.key,
                                        portrait: item.portrait,
                                        levels: item.levels || [],
                                        maxPieces: maxP,
                                        isDeletedFromGallery
                                      })}
                                      className="group relative rounded-2xl overflow-hidden border border-emerald-400/35 bg-black/50 hover:border-emerald-300 transition-all cursor-pointer shadow-lg hover:scale-[1.02] flex flex-col"
                                    >
                                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#120d1d]">
                                        {displaySrc ? (
                                          <img
                                            src={displaySrc}
                                            alt="Retrato completado"
                                            onError={(e) => {
                                              if (item.portrait && e.currentTarget.src !== item.portrait) {
                                                e.currentTarget.src = item.portrait;
                                              }
                                            }}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
                                        )}

                                        {/* Etiqueta superior: si fue borrada de la galería pero sigue viva en el recuerdo */}
                                        {isDeletedFromGallery && (
                                          <span
                                            title="Esta foto ya no está en la galería, pero su retrato e historial siguen guardados"
                                            className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/75 border border-amber-400/40 text-[8px] font-mono text-amber-200 backdrop-blur-xs"
                                          >
                                            📌 Retrato guardado
                                          </span>
                                        )}

                                        {/* Medalla de piezas máximas en la esquina superior derecha */}
                                        <span className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-md border text-[8px] font-mono font-bold ${diffInfo.badgeBg}`}>
                                          Máx: {maxP}p
                                        </span>

                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-1.5 pt-4 text-left">
                                          <span className="text-[9px] text-gray-200 font-semibold block leading-tight">
                                            Llegó hasta: <b className="text-emerald-300">{diffInfo.label}</b>
                                          </span>
                                        </div>
                                      </div>

                                      {/* Historial de piezas completadas en esta imagen */}
                                      <div className="p-1.5 bg-[#150f24] border-t border-white/10 flex flex-wrap gap-1 items-center justify-center">
                                        {[30, 60, 120, 240, 500].map((lv) => {
                                          const done = (item.levels || []).includes(lv);
                                          return (
                                            <span
                                              key={lv}
                                              className={`text-[8px] font-mono px-1 py-0.2 rounded transition-all ${done
                                                ? 'bg-emerald-500/85 text-white font-bold shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                                                : 'bg-white/5 text-gray-500 border border-white/5'
                                                }`}
                                            >
                                              {lv}p{done ? ' ✓' : ''}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-center">
                                <p className="text-[11px] text-gray-300 font-medium">
                                  Aún no tienen retratos en su historial 🧩
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  Completen cualquier foto en 30, 60 o hasta 500 piezas y quedará guardada aquí como retrato con su récord aunque mañana la borren de la galería.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* SECCIÓN B: FOTOS DE LA GALERÍA DISPONIBLES PARA ARMAR */}
                          {uncompletedGalleryPhotos.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5 pt-1 border-t border-white/10">
                                <span className="text-[11px] font-bold text-pink-300">
                                  📸 Fotos de la Galería por Armar ({uncompletedGalleryPhotos.length})
                                </span>
                                <span className="text-[9px] text-gray-400">
                                  Toca una para jugarla
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {uncompletedGalleryPhotos.map((url, idx) => {
                                  const photoKey = getCleanPhotoKey(url) || `foto_${idx}`;
                                  return (
                                    <div
                                      key={url + idx}
                                      onClick={() => setPuzzleSelectedPhoto({
                                        photoKey,
                                        displayUrl: url,
                                        playUrl: url,
                                        referenceUrl: url,
                                        levels: [],
                                        maxPieces: 0,
                                        isDeletedFromGallery: false
                                      })}
                                      className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-pink-400/60 transition-all cursor-pointer shadow-md hover:scale-[1.03]"
                                    >
                                      <img src={url} alt="Foto" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-1 text-center">
                                        <span className="text-[8px] text-gray-300 font-sans">Sin armar</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* VISTA 2: Selección de Dificultad (para Foto/Retrato Elegido o Foto al Azar) */}
                {(puzzleTab === 'random' || puzzleSelectedPhoto) && (
                  <div className="w-full flex flex-col gap-1.5">
                    {puzzleSelectedPhoto ? (
                      (() => {
                        const selObj = typeof puzzleSelectedPhoto === 'object'
                          ? puzzleSelectedPhoto
                          : {
                            photoKey: getCleanPhotoKey(puzzleSelectedPhoto),
                            displayUrl: puzzleSelectedPhoto,
                            playUrl: puzzleSelectedPhoto,
                            referenceUrl: puzzleSelectedPhoto
                          };
                        const rawEntry = userData?.completedPuzzles?.[selObj.photoKey];
                        const levels = selObj.levels?.length ? selObj.levels : (rawEntry?.levels || []);
                        const maxP = levels.length > 0 ? Math.max(...levels) : 0;
                        const maxDiff = maxP > 0 ? getPuzzleDifficultyInfo(maxP) : null;

                        return (
                          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/5 border border-emerald-500/35 mb-0.5">
                            <img
                              src={selObj.displayUrl || selObj.portrait}
                              alt="Retrato seleccionado"
                              className="w-12 h-12 rounded-lg object-cover border border-emerald-400/40 shadow-sm flex-none"
                            />
                            <div className="text-left flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-emerald-300 truncate">
                                  {maxDiff ? `Llegó hasta: ${maxDiff.label} (${maxP}p)` : 'Nuevo Retrato por Armar'}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {[30, 60, 120, 240, 500].map(lv => {
                                  const isDone = levels.includes(lv);
                                  return (
                                    <span
                                      key={lv}
                                      className={`text-[8px] font-mono px-1.5 py-0.2 rounded-full border ${isDone
                                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50 font-bold'
                                        : 'bg-white/5 text-gray-500 border-white/10'
                                        }`}
                                    >
                                      {lv}p {isDone ? '✓' : ''}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                            <button
                              onClick={() => setPuzzleSelectedPhoto(null)}
                              className="text-[10px] font-semibold text-gray-300 hover:text-white px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
                            >
                              Cambiar
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-[11px] text-gray-400 mb-1">
                        Elige cuántas piezas armar con una foto al azar de ustedes:
                      </p>
                    )}

                    {/* 30 piezas */}
                    <button
                      onClick={() => launchRandomPuzzle(30, puzzleSelectedPhoto)}
                      className="w-full py-2 px-3.5 rounded-xl font-bold text-xs tracking-wide flex items-center justify-between border border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/25 text-teal-200 hover:text-white shadow-[0_0_12px_rgba(20,184,166,0.15)] transition-all active:scale-95 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#2dd4bf]" />
                        <span className="text-xs font-semibold">Muy fácil</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-400/30 text-[10px] font-mono text-teal-300">30 piezas</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-mono text-purple-300 font-bold">+15 LP</span>
                        <span className="text-xs text-teal-400/80 group-hover:text-teal-200">→</span>
                      </div>
                    </button>

                    {/* 60 piezas */}
                    <button
                      onClick={() => launchRandomPuzzle(60, puzzleSelectedPhoto)}
                      className="w-full py-2 px-3.5 rounded-xl font-bold text-xs tracking-wide flex items-center justify-between border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-200 hover:text-white shadow-[0_0_12px_rgba(168,85,247,0.15)] transition-all active:scale-95 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#34d399]" />
                        <span className="text-xs font-semibold">Fácil</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-mono text-emerald-300">60 piezas</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-mono text-purple-300 font-bold">+40 LP</span>
                        <span className="text-xs text-emerald-400/80 group-hover:text-emerald-200">→</span>
                      </div>
                    </button>

                    {/* 120 piezas */}
                    <button
                      onClick={() => launchRandomPuzzle(120, puzzleSelectedPhoto)}
                      className="w-full py-2 px-3.5 rounded-xl font-bold text-xs tracking-wide flex items-center justify-between border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25 text-sky-200 hover:text-white shadow-[0_0_12px_rgba(14,165,233,0.15)] transition-all active:scale-95 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-sky-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#38bdf8]" />
                        <span className="text-xs font-semibold">Media</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-[10px] font-mono text-sky-300">120 piezas</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-mono text-purple-300 font-bold">+80 LP</span>
                        <span className="text-xs text-sky-400/80 group-hover:text-sky-200">→</span>
                      </div>
                    </button>

                    {/* 240 piezas */}
                    <button
                      onClick={() => launchRandomPuzzle(240, puzzleSelectedPhoto)}
                      className="w-full py-2 px-3.5 rounded-xl font-bold text-xs tracking-wide flex items-center justify-between border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/25 text-pink-200 hover:text-white shadow-[0_0_12px_rgba(236,72,153,0.15)] transition-all active:scale-95 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-pink-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#f472b6]" />
                        <span className="text-xs font-semibold">Difícil</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-400/30 text-[10px] font-mono text-pink-300">240 piezas</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-mono text-purple-300 font-bold">+250 LP</span>
                        <span className="text-xs text-pink-400/80 group-hover:text-pink-200">→</span>
                      </div>
                    </button>

                    {/* 500 piezas */}
                    <button
                      onClick={() => launchRandomPuzzle(500, puzzleSelectedPhoto)}
                      className="w-full py-2 px-3.5 rounded-xl font-bold text-xs tracking-wide flex items-center justify-between border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/25 text-purple-200 hover:text-white shadow-[0_0_12px_rgba(168,85,247,0.15)] transition-all active:scale-95 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#c084fc]" />
                        <span className="text-xs font-semibold">¡Imposible! 💀</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-mono text-purple-300">500 piezas</span>
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-[10px] font-mono text-purple-300 font-bold">+350 LP</span>
                        <span className="text-xs text-purple-400/80 group-hover:text-purple-200">→</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal interactivo de selección de modo para Tetris */}
          {tetrisModalOpen && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
              onClick={() => setTetrisModalOpen(false)}
            >
              <div
                className="relative w-full max-w-[395px] sm:max-w-[420px] max-h-[calc(100vh-32px)] overflow-y-auto rounded-3xl px-5 py-5 sm:px-6 sm:py-6 bg-gradient-to-b from-[#1c1427] to-[#0c0915] border border-pink-500/35 shadow-[0_20px_60px_rgba(236,72,153,0.35)] flex flex-col items-center text-center animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Botón cerrar */}
                <button
                  onClick={() => {
                    cancelTetrisQueue();
                    setTetrisModalOpen(false);
                  }}
                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  ✕
                </button>

                {/* Icono decorativo */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500/20 to-sky-500/20 border border-pink-400/30 flex items-center justify-center text-xl shadow-inner mb-2.5">
                  ⚔️
                </div>

                <h3 className="text-xl font-serif italic font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-sky-200 to-indigo-200">
                  Tetris Pareja
                </h3>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  Elige el modo para comenzar a jugar:
                </p>

                <div className="w-full flex flex-col gap-2.5">
                  <button
                    onClick={() => {
                      setTetrisModalOpen(false);
                      setActiveParams('mode=solo');
                      setActiveGame('tetris');
                    }}
                    className="w-full py-3 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between gap-3 border border-pink-500/40 bg-pink-500/10 hover:bg-pink-500/25 text-pink-200 hover:text-white shadow-[0_0_15px_rgba(236,72,153,0.15)] transition-all active:scale-95 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#f472b6] shrink-0" />
                      <div className="text-left min-w-0">
                        <span className="text-sm font-semibold block truncate">1 Jugador (Clásico)</span>
                        <span className="text-[11px] text-gray-400 font-normal block">Individual / Cooperativo</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-pink-300 group-hover:text-white whitespace-nowrap shrink-0">Jugar →</span>
                  </button>

                  <button
                    onClick={() => {
                      setTetrisModalOpen(false);
                      setActiveParams('mode=1v1');
                      setActiveGame('tetris');
                    }}
                    className="w-full py-3 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between gap-3 border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/25 text-sky-200 hover:text-white shadow-[0_0_15px_rgba(14,165,233,0.2)] transition-all active:scale-95 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#38bdf8] shrink-0" />
                      <div className="text-left min-w-0">
                        <span className="text-sm font-semibold block truncate">1v1 Local (2 Tableros)</span>
                        <span className="text-[11px] text-gray-400 font-normal block">P1: WASD vs P2: Flechas</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-sky-300 group-hover:text-white whitespace-nowrap shrink-0">Duelo →</span>
                  </button>

                  {/* Opción 3: 1v1 Online */}
                  {tetrisQueueState === 'searching' ? (
                    <div className="w-full py-3 px-4 rounded-2xl border border-purple-500/50 bg-gradient-to-r from-purple-950/70 via-pink-950/40 to-purple-950/70 flex flex-col items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(168,85,247,0.2)] animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-purple-400 border-t-transparent animate-spin shrink-0" />
                        <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-pink-200">
                          Buscando rival en el cosmos...
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-300">
                        En cola de espera · Aguardando oponente
                      </span>
                      <button
                        onClick={cancelTetrisQueue}
                        className="mt-1 px-4 py-1 rounded-full bg-red-500/20 hover:bg-red-500/35 border border-red-500/50 text-[11px] font-bold text-red-200 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm flex items-center gap-1"
                      >
                        <span>✕</span>
                        <span>Cancelar Búsqueda</span>
                      </button>
                    </div>
                  ) : tetrisQueueState === 'matched' ? (
                    <div className="w-full py-3 px-4 rounded-2xl border border-emerald-500/50 bg-emerald-950/60 flex flex-col items-center justify-center gap-1 animate-in zoom-in-95 duration-200 shadow-[0_0_25px_rgba(16,185,129,0.3)]">
                      <span className="text-xl animate-bounce">⚡</span>
                      <span className="text-xs font-bold text-emerald-300">¡Rival Encontrado!</span>
                      <span className="text-[10px] text-emerald-200/80">Iniciando partida en tiempo real...</span>
                    </div>
                  ) : (
                    <button
                      onClick={startTetrisOnlineQueue}
                      className="w-full py-3 px-4 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-between gap-3 border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/25 text-purple-200 hover:text-white shadow-[0_0_15px_rgba(168,85,247,0.2)] transition-all active:scale-95 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-400 group-hover:scale-125 transition-transform shadow-[0_0_8px_#c084fc] animate-pulse shrink-0" />
                        <div className="text-left min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">1v1 Online (Duelo en Red)</span>
                            <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded-md bg-purple-500/40 text-purple-200 border border-purple-400/40 whitespace-nowrap">Multiplayer</span>
                          </div>
                          <span className="text-[11px] text-gray-400 font-normal block mt-0.5">Buscar partida rápida en red</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-purple-300 group-hover:text-white whitespace-nowrap shrink-0 flex items-center gap-1">
                        <span>Buscar</span>
                        <span>🔍</span>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Inyector del Sprite SVG con los 10 Emblemas de Ligas (#rk0 a #rk9) */}
          <RankSpriteSvg />
        </div>
      );
}

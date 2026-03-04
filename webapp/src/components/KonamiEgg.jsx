import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

const FLAG = 'flag{DistractionsAreBetterthanIOCS!}';

const GROUND_Y = 150;
const DINO_W = 40;
const DINO_H = 44;
const CACTUS_W = 20;
const CACTUS_H = 40;
const GRAVITY = 0.6;
const JUMP_VEL = -12;

export default function KonamiEgg() {
  const [active, setActive] = useState(false);
  const bufferRef = useRef([]);

  // Konami code listener
  useEffect(() => {
    const handler = (e) => {
      bufferRef.current.push(e.key);
      bufferRef.current = bufferRef.current.slice(-KONAMI.length);
      if (bufferRef.current.join(',') === KONAMI.join(',')) {
        setActive(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!active) return null;
  return <DinoGame onClose={() => setActive(false)} />;
}

function DinoGame({ onClose }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    dino: { y: GROUND_Y - DINO_H, vy: 0, jumping: false },
    cacti: [],
    frame: 0,
    speed: 4,
    score: 0,
    gameOver: false,
    gameOverHandled: false,
  });

  const [phase, setPhase] = useState('playing');
  const [nickname, setNickname] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const phaseRef = useRef('playing');

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Pre-fetch leaderboard on mount
  useEffect(() => {
    api.get('/api/leaderboard/scores')
      .then((res) => setLeaderboard(res.data))
      .catch(() => {});
  }, []);

  const reset = useCallback(() => {
    stateRef.current = {
      dino: { y: GROUND_Y - DINO_H, vy: 0, jumping: false },
      cacti: [],
      frame: 0,
      speed: 4,
      score: 0,
      gameOver: false,
      gameOverHandled: false,
    };
  }, []);

  const startNewGame = useCallback(() => {
    reset();
    setPhase('playing');
    setNickname('');
    setFinalScore(0);
  }, [reset]);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.gameOver) return;
    if (!s.dino.jumping) {
      s.dino.vy = JUMP_VEL;
      s.dino.jumping = true;
    }
  }, []);

  const handleSubmitScore = useCallback(async () => {
    if (!nickname || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/api/leaderboard/scores', {
        nickname,
        score: finalScore,
      });
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
    try {
      const res = await api.get('/api/leaderboard/scores');
      setLeaderboard(res.data);
    } catch (_) {}
    setSubmitting(false);
    setPhase('leaderboard');
  }, [nickname, submitting, finalScore]);

  // Key handlers
  useEffect(() => {
    const keyHandler = (e) => {
      if (phaseRef.current === 'playing') {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          e.preventDefault();
          jump();
        }
      } else if (phaseRef.current === 'leaderboard') {
        if (e.code === 'Space') {
          e.preventDefault();
          startNewGame();
        }
      }
      if (e.code === 'Escape') onClose();
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [jump, startNewGame, onClose]);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let raf;

    const loop = () => {
      const s = stateRef.current;
      const W = canvas.width;

      if (!s.gameOver) {
        // Dino physics
        s.dino.vy += GRAVITY;
        s.dino.y += s.dino.vy;
        if (s.dino.y >= GROUND_Y - DINO_H) {
          s.dino.y = GROUND_Y - DINO_H;
          s.dino.vy = 0;
          s.dino.jumping = false;
        }

        // Spawn cacti
        s.frame++;
        if (s.frame % Math.max(60, 120 - s.score) === 0) {
          s.cacti.push({ x: W, w: CACTUS_W, h: CACTUS_H });
        }

        // Move cacti
        for (const c of s.cacti) c.x -= s.speed;
        s.cacti = s.cacti.filter((c) => c.x + c.w > 0);

        // Collision
        const dx = 50;
        for (const c of s.cacti) {
          if (
            dx + DINO_W - 8 > c.x &&
            dx + 8 < c.x + c.w &&
            s.dino.y + DINO_H - 4 > GROUND_Y - c.h
          ) {
            s.gameOver = true;
          }
        }

        // Score & speed
        if (s.frame % 6 === 0) s.score++;
        s.speed = 4 + Math.floor(s.score / 50) * 0.5;
      }

      // Trigger name entry on first game-over frame
      if (s.gameOver && !s.gameOverHandled) {
        s.gameOverHandled = true;
        setFinalScore(s.score);
        setPhase('entering');
      }

      // Draw
      ctx.fillStyle = '#0f1117';
      ctx.fillRect(0, 0, W, canvas.height);

      // Ground
      ctx.strokeStyle = '#2e3140';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(W, GROUND_Y);
      ctx.stroke();

      // Dino
      ctx.fillStyle = '#22c55e';
      const dy = s.dino.y;
      ctx.fillRect(50, dy, 30, 34);
      ctx.fillRect(60, dy - 12, 22, 16);
      ctx.fillStyle = '#0f1117';
      ctx.fillRect(72, dy - 8, 4, 4);
      ctx.fillStyle = '#22c55e';
      const legOffset = s.gameOver ? 0 : (s.frame % 12 < 6 ? 0 : 6);
      ctx.fillRect(54, dy + 34, 6, 10 + legOffset);
      ctx.fillRect(68, dy + 34, 6, 10 + (legOffset ? 0 : 6));
      ctx.fillRect(42, dy + 10, 10, 6);

      // Cacti
      ctx.fillStyle = '#ef4444';
      for (const c of s.cacti) {
        ctx.fillRect(c.x, GROUND_Y - c.h, c.w, c.h);
        ctx.fillRect(c.x - 6, GROUND_Y - c.h + 8, 6, 4);
        ctx.fillRect(c.x + c.w, GROUND_Y - c.h + 16, 6, 4);
      }

      // Score
      ctx.fillStyle = '#8b8fa3';
      ctx.font = '16px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`Score: ${s.score}`, W - 20, 30);

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="konami-overlay" onClick={phase === 'playing' ? jump : undefined}>
      <div className="konami-modal" onClick={(e) => e.stopPropagation()}>
        <div className="konami-header">
          <span className="konami-title">ACCESS GRANTED</span>
          <button onClick={onClose} className="btn-close">&times;</button>
        </div>
        <div className="dino-game-area">
          <canvas
            ref={canvasRef}
            width={600}
            height={180}
            className="dino-canvas"
          />

          {phase === 'entering' && (
            <div className="arcade-gameover">
              <div className="arcade-gameover-title">GAME OVER</div>
              <div className="arcade-score">SCORE: {finalScore}</div>
              <div className="arcade-enter-name">
                <div className="arcade-prompt">ENTER YOUR NICKNAME</div>
                <input
                  className="arcade-nickname-input"
                  type="text"
                  maxLength={16}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && nickname.trim().length > 0) {
                      handleSubmitScore();
                    }
                  }}
                  autoFocus
                  placeholder="Player1"
                />
                <button
                  className="btn btn-primary btn-sm arcade-submit-btn"
                  onClick={handleSubmitScore}
                  disabled={!nickname.trim() || submitting}
                >
                  {submitting ? 'SAVING...' : 'OK'}
                </button>
              </div>
            </div>
          )}

          {phase === 'leaderboard' && (
            <div className="arcade-leaderboard">
              <div className="arcade-leaderboard-title">HIGH SCORES</div>
              <table className="arcade-scores-table">
                <thead>
                  <tr>
                    <th>RANK</th>
                    <th>NAME</th>
                    <th>SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry) => (
                    <tr
                      key={entry.rank}
                      className={entry.score === finalScore && entry.nickname === nickname ? 'arcade-highlight' : ''}
                    >
                      <td>{entry.rank}.</td>
                      <td>{entry.nickname}</td>
                      <td>{entry.score}</td>
                    </tr>
                  ))}
                  {leaderboard.length === 0 && (
                    <tr>
                      <td colSpan={3} className="arcade-empty">NO SCORES YET</td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="arcade-play-again">PRESS SPACE TO PLAY AGAIN</div>
              <button className="btn btn-primary btn-sm" onClick={startNewGame} style={{ marginTop: '0.5rem' }}>
                PLAY AGAIN
              </button>
            </div>
          )}
        </div>
        <div className="konami-flag">
          <code>{FLAG}</code>
        </div>
        <p className="konami-hint">
          {phase === 'playing' && 'SPACE to jump \u00b7 ESC to close'}
          {phase === 'entering' && 'Enter your nickname \u00b7 ESC to close'}
          {phase === 'leaderboard' && 'SPACE to play again \u00b7 ESC to close'}
        </p>
      </div>
    </div>
  );
}

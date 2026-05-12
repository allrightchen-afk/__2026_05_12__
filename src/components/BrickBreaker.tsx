import React, { useEffect, useRef, useState, useCallback } from "react";
import { MoveLeft, MoveRight, RotateCcw, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Ball, Brick, GameStatus } from "../types";

// Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const BALL_RADIUS = 8;
const BRICK_ROWS = 5;
const BRICK_COLS = 8;
const BRICK_HEIGHT = 25;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = 35;

const NEON_COLORS = [
  "#f472b6", // Fuchsia-400 approximation for game logic
  "#22d3ee", // Cyan-400
  "#34d399", // Emerald-400
  "#fbbf24", // Amber-400
  "#a78bfa", // Violet-400
];

const BRICK_GRADIENTS = [
  ["#f472b6", "#c026d3"], // Fuchsia
  ["#22d3ee", "#0891b2"], // Cyan
  ["#34d399", "#059669"], // Emerald
  ["#fbbf24", "#d97706"], // Amber
  ["#a78bfa", "#7c3aed"], // Violet
];

export default function BrickBreaker() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<GameStatus>("START");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [highScore, setHighScore] = useState(12800);

  // Game state refs (to avoid re-renders)
  const paddleRef = useRef({ x: (CANVAS_WIDTH - PADDLE_WIDTH) / 2 });
  const ballRef = useRef<Ball>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 30,
    dx: 4,
    dy: -4,
    radius: BALL_RADIUS,
  });
  const bricksRef = useRef<Brick[]>([]);
  const requestRef = useRef<number>(null);
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Initialize Bricks
  const initBricks = useCallback(() => {
    const newBricks: Brick[] = [];
    const brickWidth = (CANVAS_WIDTH - BRICK_OFFSET_LEFT * 2 - (BRICK_COLS - 1) * BRICK_PADDING) / BRICK_COLS;
    
    for (let c = 0; c < BRICK_COLS; c++) {
      for (let r = 0; r < BRICK_ROWS; r++) {
        newBricks.push({
          x: c * (brickWidth + BRICK_PADDING) + BRICK_OFFSET_LEFT,
          y: r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
          width: brickWidth,
          height: BRICK_HEIGHT,
          visible: true,
          color: NEON_COLORS[r % NEON_COLORS.length],
          points: (BRICK_ROWS - r) * 10,
        });
      }
    }
    bricksRef.current = newBricks;
  }, []);

  const resetBallAndPaddle = () => {
    paddleRef.current.x = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
    ballRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 40,
      dx: 4 * (Math.random() > 0.5 ? 1 : -1),
      dy: -4,
      radius: BALL_RADIUS,
    };
  };

  const startGame = () => {
    setScore(0);
    setLives(3);
    initBricks();
    resetBallAndPaddle();
    setStatus("PLAYING");
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background grid (matching theme)
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = "#94a3b8";
    ctx.globalAlpha = 0.1;
    for (let x = 0; x < CANVAS_WIDTH; x += 30) {
      for (let y = 0; y < CANVAS_HEIGHT; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;

    // Draw Bricks
    bricksRef.current.forEach((brick, index) => {
      if (brick.visible) {
        const row = Math.floor(index % BRICK_ROWS);
        const [c1, c2] = BRICK_GRADIENTS[row % BRICK_GRADIENTS.length];
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(0,0,0,0.3)";
        
        const grad = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(brick.x, brick.y, brick.width, brick.height, 2);
        ctx.fill();
        
        // Specular highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fillRect(brick.x, brick.y, brick.width, 2);
        
        ctx.shadowBlur = 0;
      }
    });

    // Draw Paddle (Full-rounded pill)
    const px = paddleRef.current.x;
    const py = CANVAS_HEIGHT - PADDLE_HEIGHT - 15;
    
    ctx.shadowBlur = 25;
    ctx.shadowColor = "rgba(6, 182, 212, 0.5)";
    
    const paddleGrad = ctx.createLinearGradient(px, py, px + PADDLE_WIDTH, py);
    paddleGrad.addColorStop(0, "#06b6d4");
    paddleGrad.addColorStop(0.5, "#3b82f6");
    paddleGrad.addColorStop(1, "#06b6d4");
    
    ctx.fillStyle = paddleGrad;
    ctx.beginPath();
    ctx.roundRect(px, py, PADDLE_WIDTH, PADDLE_HEIGHT, 10);
    ctx.fill();
    
    // Paddle Top Glow Line
    ctx.strokeStyle = "#67e8f9";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 10, py + 2);
    ctx.lineTo(px + PADDLE_WIDTH - 10, py + 2);
    ctx.stroke();
    
    ctx.shadowBlur = 0;

    // Draw Ball
    ctx.shadowBlur = 20;
    ctx.shadowColor = "rgba(255, 255, 255, 0.8)";
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ballRef.current.x, ballRef.current.y, ballRef.current.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const update = useCallback(() => {
    if (status !== "PLAYING") return;

    const ball = ballRef.current;
    const paddle = paddleRef.current;

    // Move Paddle
    if (keysRef.current["ArrowLeft"] || keysRef.current["a"]) {
      paddle.x = Math.max(0, paddle.x - 7);
    }
    if (keysRef.current["ArrowRight"] || keysRef.current["d"]) {
      paddle.x = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, paddle.x + 7);
    }

    // Move Ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall Collision
    if (ball.x + ball.dx > CANVAS_WIDTH - ball.radius || ball.x + ball.dx < ball.radius) {
      ball.dx = -ball.dx;
    }
    if (ball.y + ball.dy < ball.radius) {
      ball.dy = -ball.dy;
    } else if (ball.y + ball.dy > CANVAS_HEIGHT - ball.radius - 15) {
      // Paddle Collision (Adjusted Y for rounded visuals)
      if (ball.x > paddle.x && ball.x < paddle.x + PADDLE_WIDTH) {
        const relativeHit = (ball.x - (paddle.x + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
        ball.dx = relativeHit * 6;
        ball.dy = -Math.abs(ball.dy);
      } else if (ball.y + ball.dy > CANVAS_HEIGHT - ball.radius) {
        setLives((prev) => {
          const next = prev - 1;
          if (next <= 0) {
            setStatus("GAMEOVER");
            if (score > highScore) setHighScore(score);
          } else {
            resetBallAndPaddle();
          }
          return next;
        });
      }
    }

    // Brick Collision
    let activeBricks = 0;
    bricksRef.current.forEach((brick) => {
      if (brick.visible) {
        activeBricks++;
        if (
          ball.x > brick.x &&
          ball.x < brick.x + brick.width &&
          ball.y > brick.y &&
          ball.y < brick.y + brick.height
        ) {
          ball.dy = -ball.dy;
          brick.visible = false;
          setScore((s) => s + brick.points);
          activeBricks--;
        }
      }
    });

    if (activeBricks === 0 && bricksRef.current.length > 0) {
      setStatus("WON");
    }
  }, [status, score, highScore]);

  useEffect(() => {
    const loop = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          update();
          draw(ctx);
        }
      }
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update, draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const relativeX = e.clientX - rect.left;
        if (relativeX > 0 && relativeX < CANVAS_WIDTH) {
          paddleRef.current.x = Math.min(CANVAS_WIDTH - PADDLE_WIDTH, Math.max(0, relativeX - PADDLE_WIDTH / 2));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-[#0f172a] text-slate-100 font-sans p-8 overflow-hidden">
      {/* Header Section */}
      <header className="w-full max-w-[1024px] flex justify-between items-end mb-4">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
            NEON BREAKOUT
          </h1>
          <p className="text-xs font-mono text-cyan-400/70 mt-1 uppercase tracking-widest">v1.0.4 // React TypeScript Edition</p>
        </div>
        
        <div className="flex gap-12 text-right">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Current Score</span>
            <span className="text-4xl font-mono font-bold text-white">{score.toLocaleString().padStart(6, "0")}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">High Score</span>
            <span className="text-4xl font-mono font-bold text-fuchsia-400">{highScore.toLocaleString().padStart(6, "0")}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Integrity</span>
            <div className="flex gap-1 mt-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-sm transition-all duration-300 ${
                    i < lives 
                      ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]" 
                      : "bg-slate-700"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <div className="relative group w-[840px] h-[612px]">
        <div className="absolute inset-x-0 inset-y-0 bg-[#334155] rounded-2xl -m-[6px] shadow-2xl"></div>
        <div className="relative w-full h-[600px] bg-[#1e293b] rounded-xl overflow-hidden shadow-inner isolate">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="cursor-none"
            id="game-canvas"
          />

          {/* Overlay Screens */}
          <AnimatePresence>
            {status !== "PLAYING" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
              >
                <div className="text-center p-12">
                  {status === "START" && (
                    <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="space-y-8">
                      <div className="space-y-4">
                        <h2 className="text-6xl font-black italic tracking-tighter text-white">READY?</h2>
                        <div className="h-1 w-24 bg-gradient-to-r from-cyan-400 to-fuchsia-500 mx-auto" />
                        <p className="text-cyan-400 font-mono text-sm uppercase tracking-[0.3em]">System Initialization OK</p>
                      </div>
                      <button
                        onClick={startGame}
                        className="group relative px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold uppercase tracking-[0.2em] rounded-full overflow-hidden transition-all hover:scale-105 shadow-[0_0_30px_rgba(6,182,212,0.4)]"
                      >
                        <span className="relative z-10 flex items-center gap-3">
                          <Play size={24} fill="currentColor" /> Initialize Game
                        </span>
                      </button>
                    </motion.div>
                  )}

                  {status === "GAMEOVER" && (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-8">
                      <div className="space-y-2">
                        <h2 className="text-7xl font-black italic tracking-tighter text-rose-500">SYSTEM FAILURE</h2>
                        <p className="text-slate-400 font-mono text-sm uppercase tracking-[0.4em]">Critical Integrity Lost</p>
                      </div>
                      <div className="inline-block p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl backdrop-blur-sm">
                        <p className="text-xs uppercase text-rose-400 mb-2 font-bold tracking-widest">Final Tally</p>
                        <p className="text-5xl font-mono font-black text-white">{score.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={startGame}
                        className="flex items-center gap-3 mx-auto px-10 py-4 bg-white text-slate-950 font-black uppercase tracking-widest hover:bg-slate-100 transition-transform hover:scale-105 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                      >
                        <RotateCcw size={22} /> Reload Protocol
                      </button>
                    </motion.div>
                  )}

                  {status === "WON" && (
                    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="space-y-8">
                      <div className="space-y-2">
                        <h2 className="text-7xl font-black italic tracking-tighter text-emerald-400">DATA SECURED</h2>
                        <p className="text-slate-400 font-mono text-sm uppercase tracking-[0.4em]">Core Decryption Complete</p>
                      </div>
                      <div className="inline-block p-6 bg-emerald-400/10 border border-emerald-400/20 rounded-2xl backdrop-blur-sm">
                        <p className="text-xs uppercase text-emerald-400 mb-2 font-bold tracking-widest">Achievement Rating</p>
                        <p className="text-5xl font-mono font-black text-white">{score.toLocaleString()}</p>
                      </div>
                      <button
                        onClick={startGame}
                        className="flex items-center gap-3 mx-auto px-10 py-4 bg-emerald-400 text-slate-950 font-black uppercase tracking-widest hover:bg-emerald-300 transition-transform hover:scale-105 rounded-full shadow-[0_0_40px_rgba(52,211,153,0.3)]"
                      >
                        <Play size={22} fill="currentColor" /> Next Sector
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Controls Guide */}
      <footer className="w-full max-w-[1024px] flex justify-between items-center text-slate-500 px-4 pt-4 border-t border-slate-800">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="flex gap-1">
              <span className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-300 font-mono uppercase border border-slate-700">A</span>
              <span className="px-2 py-1 bg-slate-800 rounded text-[10px] text-slate-300 font-mono uppercase border border-slate-700">D</span>
            </div>
            <span className="text-[10px] uppercase tracking-widest font-bold">Vector Shift</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 bg-slate-800 rounded text-[10px] text-slate-300 font-mono uppercase border border-slate-700">Mouse</span>
            <span className="text-[10px] uppercase tracking-widest font-bold">Fluid Input</span>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <span className="text-[10px] uppercase font-bold text-slate-600">Engine: React + Canvas API</span>
          <div className="h-4 w-[1px] bg-slate-800"></div>
          <div className="flex items-center gap-2 text-cyan-500">
            <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.8)]"></div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Signal Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


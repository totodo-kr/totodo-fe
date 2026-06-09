"use client";

import { useEffect, useState } from "react";

interface Props {
  onComplete: () => void;
}

const FULL_TEXT = "너는 이제 이 세계의 일부야";

const STARS = [
  { x: 8,  y: 12, s: 1.5, d: 0    },
  { x: 22, y: 6,  s: 1,   d: 0.5  },
  { x: 43, y: 18, s: 2,   d: 1.1  },
  { x: 63, y: 4,  s: 1.5, d: 0.3  },
  { x: 78, y: 15, s: 1,   d: 1.4  },
  { x: 91, y: 9,  s: 2,   d: 0.7  },
  { x: 14, y: 38, s: 1,   d: 1.8  },
  { x: 87, y: 33, s: 1.5, d: 0.9  },
  { x: 4,  y: 58, s: 1,   d: 0.2  },
  { x: 96, y: 52, s: 1.5, d: 2.1  },
  { x: 18, y: 72, s: 1,   d: 0.6  },
  { x: 84, y: 68, s: 2,   d: 1.3  },
  { x: 33, y: 86, s: 1,   d: 0.4  },
  { x: 71, y: 80, s: 1.5, d: 1.6  },
  { x: 52, y: 92, s: 1,   d: 0.8  },
  { x: 60, y: 28, s: 1,   d: 2.4  },
  { x: 37, y: 46, s: 1.5, d: 1.9  },
];

function ToriiIllust() {
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" fill="none" aria-hidden>
      {/* outer glow */}
      <circle cx="90" cy="82" r="56" fill="#cc785c" opacity="0.06" />
      <circle cx="90" cy="82" r="44" fill="#cc785c" opacity="0.07" />

      {/* moon ring */}
      <circle cx="90" cy="64" r="28" fill="none" stroke="#cc785c" strokeWidth="1.2" opacity="0.5" />
      <circle cx="90" cy="64" r="22" fill="#cc785c" opacity="0.1" />

      {/* torii posts */}
      <rect x="50" y="82" width="7" height="70" rx="1.5" fill="#cc785c" opacity="0.85" />
      <rect x="123" y="82" width="7" height="70" rx="1.5" fill="#cc785c" opacity="0.85" />

      {/* kasagi (top beam) — with curled ends */}
      <path d="M34 76 Q36 70 44 72 L136 72 Q144 70 146 76 L144 84 Q136 82 90 82 Q44 82 36 84 Z"
        fill="#cc785c" opacity="0.9" />

      {/* nuki (lower beam) */}
      <rect x="50" y="98" width="80" height="6" rx="1.5" fill="#cc785c" opacity="0.65" />

      {/* ground shimmer */}
      <line x1="30" y1="153" x2="150" y2="153" stroke="#cc785c" strokeWidth="0.8" opacity="0.2" />
      <ellipse cx="90" cy="153" rx="50" ry="3" fill="#cc785c" opacity="0.07" />

      {/* stars */}
      <circle cx="34" cy="28" r="1.5" fill="white" opacity="0.7" />
      <circle cx="62" cy="18" r="1"   fill="white" opacity="0.45" />
      <circle cx="128" cy="22" r="1.5" fill="white" opacity="0.6" />
      <circle cx="152" cy="38" r="1"  fill="white" opacity="0.4" />
      <circle cx="20" cy="55" r="1"   fill="white" opacity="0.5" />
      <circle cx="158" cy="60" r="1.5" fill="white" opacity="0.6" />
      <circle cx="110" cy="40" r="1"  fill="white" opacity="0.35" />
    </svg>
  );
}

export default function EnrollSuccessOverlay({ onComplete }: Props) {
  const [phase, setPhase] = useState<"enter" | "typing" | "exit">("enter");
  const [typed, setTyped] = useState("");
  const [showCursor, setShowCursor] = useState(false);

  // enter → typing
  useEffect(() => {
    const t = setTimeout(() => { setPhase("typing"); setShowCursor(true); }, 700);
    return () => clearTimeout(t);
  }, []);

  // typing animation
  useEffect(() => {
    if (phase !== "typing") return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(FULL_TEXT.slice(0, i));
      if (i >= FULL_TEXT.length) {
        clearInterval(iv);
        setShowCursor(false);
        setTimeout(() => setPhase("exit"), 1800);
      }
    }, 72);
    return () => clearInterval(iv);
  }, [phase]);

  // exit → onComplete
  useEffect(() => {
    if (phase !== "exit") return;
    const t = setTimeout(onComplete, 750);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  const isExit = phase === "exit";

  return (
    <>
      <style>{`
        @keyframes overlayIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes overlayOut { from { opacity:1 } to { opacity:0 } }
        @keyframes cardIn  {
          from { opacity:0; transform: translateY(44px) scale(0.94) }
          to   { opacity:1; transform: translateY(0)   scale(1)    }
        }
        @keyframes cardOut {
          from { opacity:1; transform: translateY(0)    scale(1)    }
          to   { opacity:0; transform: translateY(-32px) scale(1.03) }
        }
        @keyframes illustFloat {
          0%,100% { transform: translateY(0) }
          50%     { transform: translateY(-9px) }
        }
        @keyframes glowPulse {
          0%,100% { opacity:.4 } 50% { opacity:.9 }
        }
        @keyframes starTwinkle {
          0%,100% { opacity:.25 } 50% { opacity:.9 }
        }
        @keyframes cursorBlink {
          0%,100% { opacity:1 } 50% { opacity:0 }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center }
          100% { background-position:  200% center }
        }
        .eso-overlay-enter { animation: overlayIn  .55s ease forwards }
        .eso-overlay-exit  { animation: overlayOut .7s  ease forwards }
        .eso-card-enter    { animation: cardIn  .65s cubic-bezier(.34,1.56,.64,1) .18s both }
        .eso-card-exit     { animation: cardOut .65s ease              forwards }
        .eso-float         { animation: illustFloat 3.2s ease-in-out infinite }
        .eso-glow          { animation: glowPulse   2.4s ease-in-out infinite }
        .eso-cursor        { animation: cursorBlink  .7s step-end      infinite }
        .eso-shimmer-text  {
          background: linear-gradient(90deg, #cc785c 0%, #f5c9a8 45%, #cc785c 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 2.8s linear infinite;
        }
      `}</style>

      {/* backdrop */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center ${isExit ? "eso-overlay-exit" : "eso-overlay-enter"}`}
        style={{ background: "rgba(8,4,2,0.93)", backdropFilter: "blur(10px)" }}
      >
        {/* background stars */}
        {STARS.map((st, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${st.x}%`, top: `${st.y}%`,
              width: st.s * 2, height: st.s * 2,
              background: "white",
              animation: `starTwinkle ${1.8 + st.d}s ease-in-out ${st.d}s infinite`,
              opacity: 0.4,
            }}
          />
        ))}

        {/* card */}
        <div
          className={`relative flex flex-col items-center gap-7 px-10 py-12 rounded-3xl max-w-[360px] w-full mx-4 ${isExit ? "eso-card-exit" : "eso-card-enter"}`}
          style={{
            background: "linear-gradient(160deg, #1c0e08 0%, #0a0503 100%)",
            border: "1px solid rgba(204,120,92,0.28)",
            boxShadow: "0 0 80px rgba(204,120,92,0.12), 0 24px 80px rgba(0,0,0,0.9)",
          }}
        >
          {/* corner glow */}
          <div
            className="eso-glow absolute inset-0 rounded-3xl pointer-events-none"
            style={{ boxShadow: "inset 0 0 40px rgba(204,120,92,0.08)" }}
          />

          {/* illustration */}
          <div className="eso-float">
            <ToriiIllust />
          </div>

          {/* text block */}
          <div className="text-center space-y-3 relative z-10">
            <p
              className="text-xs tracking-[0.35em] uppercase font-medium"
              style={{ color: "rgba(204,120,92,0.7)" }}
            >
              enrollment complete
            </p>

            <h2 className="text-white text-[1.45rem] font-bold leading-snug min-h-[2.2rem]">
              {typed}
              {showCursor && (
                <span className="eso-cursor ml-0.5 inline-block w-[2px] h-[1.3em] align-middle bg-[#cc785c]" />
              )}
            </h2>

            <p className="text-xs tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>
              受講開始
            </p>
          </div>

          {/* bottom shimmer line */}
          <div
            className="absolute bottom-0 left-10 right-10 h-[1px] rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, rgba(204,120,92,0.4), transparent)" }}
          />
        </div>
      </div>
    </>
  );
}

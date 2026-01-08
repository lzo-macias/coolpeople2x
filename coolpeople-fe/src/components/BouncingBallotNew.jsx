import React, { useState, useEffect, useMemo } from 'react';

const BallotIntro = () => {
  const [phase, setPhase] = useState('balls'); // 'balls' -> 'text' -> 'done'

  useEffect(() => {
    // Transition from balls to text
    const timer1 = setTimeout(() => setPhase('text'), 2000);
    // Transition to done (ready to navigate)
    const timer2 = setTimeout(() => setPhase('done'), 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Pre-generate confetti data so it doesn't shift on re-render
  const confettiData = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      left: Math.random() * 100,
      width: 6 + Math.random() * 8,
      height: 6 + Math.random() * 8,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 2,
      isGold: i % 2 === 0,
      isCircle: i % 3 === 0,
    }));
  }, []);

  const ballColors = [
    '#c9a227', // gold
    '#1a1a2e', // navy
    '#b8860b', // dark gold
    '#2d2d44', // light navy
    '#d4af37', // bright gold
    '#c9a227',
    '#1a1a2e',
    '#b8860b',
    '#d4af37',
    '#2d2d44',
    '#c9a227',
    '#1a1a2e',
  ];

  // Pre-generate ball data so positions are consistent between phases
  const ballData = useMemo(() => {
    return ballColors.map((color, i) => ({
      color,
      size: 40 + Math.random() * 40,
      left: 10 + (i % 4) * 22 + Math.random() * 10,
      top: 10 + Math.floor(i / 4) * 25 + Math.random() * 10,
      delay: i * 0.08,
      floatDelay: Math.random() * 2,
      scatterX: (Math.random() - 0.5) * 300,
    }));
  }, []);


  return (
    <div style={{
      height: '100vh',
      width: '100%',
      background: 'linear-gradient(165deg, #faf8f5 0%, #f5f0e8 50%, #ebe4d8 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      position: 'relative',
      fontFamily: "'Cormorant Garamond', Georgia, serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Libre+Baskerville:wght@400;700&display=swap');
        
        @keyframes throwUp {
          0% {
            transform: translateY(100vh) scale(0.5);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          50% {
            transform: translateY(-20vh) scale(1);
          }
          70% {
            transform: translateY(10vh) scale(0.95);
          }
          85% {
            transform: translateY(-5vh) scale(1);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-15px) rotate(5deg);
          }
          75% {
            transform: translateY(-10px) rotate(-5deg);
          }
        }
        
        @keyframes scatter {
          0% {
            transform: translateY(0) translateX(0) scale(1);
            opacity: 1;
          }
          100% {
            transform: translateY(-150vh) translateX(var(--scatter-x)) scale(0.3) rotate(720deg);
            opacity: 0;
          }
        }
        
        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes scaleIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .ball {
          position: absolute;
          border-radius: 50%;
          animation: throwUp 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     float 3s ease-in-out infinite;
          box-shadow: 
            inset -8px -8px 20px rgba(0,0,0,0.2),
            inset 8px 8px 20px rgba(255,255,255,0.3),
            0 10px 30px rgba(0,0,0,0.15);
        }
        
        .ball.scatter {
          animation: scatter 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        }
        
        .ball::after {
          content: '';
          position: absolute;
          top: 15%;
          left: 20%;
          width: 30%;
          height: 20%;
          background: rgba(255,255,255,0.4);
          border-radius: 50%;
          filter: blur(2px);
        }
        
        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: confetti 3s linear forwards;
        }
        
        .text-container {
          text-align: center;
          z-index: 10;
        }
        
        .main-text {
          font-size: 42px;
          font-weight: 700;
          color: #1a1a2e;
          margin: 0;
          animation: fadeInUp 0.8s ease-out forwards;
          letter-spacing: -1px;
        }
        
        .sub-text {
          font-family: 'Libre Baskerville', serif;
          font-size: 16px;
          color: #888;
          margin-top: 12px;
          animation: fadeInUp 0.8s ease-out 0.2s forwards;
          opacity: 0;
        }
        
        .gold-line {
          width: 60px;
          height: 4px;
          background: linear-gradient(90deg, transparent, #c9a227, transparent);
          margin: 24px auto;
          border-radius: 2px;
          animation: scaleIn 0.6s ease-out 0.4s forwards;
          opacity: 0;
        }
        
        .start-btn {
          margin-top: 32px;
          padding: 16px 48px;
          background: linear-gradient(145deg, #1a1a2e 0%, #2d2d44 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-family: 'Cormorant Garamond', serif;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          animation: fadeInUp 0.8s ease-out 0.6s forwards;
          opacity: 0;
          box-shadow: 0 8px 24px rgba(26, 26, 46, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .start-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(26, 26, 46, 0.4);
        }
        
        .envelope-icon {
          font-size: 64px;
          margin-bottom: 24px;
          animation: scaleIn 0.6s ease-out forwards, pulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* Confetti pieces */}
      {phase === 'text' && confettiData.map((confetti, i) => (
        <div
          key={`confetti-${i}`}
          className="confetti-piece"
          style={{
            left: `${confetti.left}%`,
            top: '-20px',
            background: confetti.isGold ? '#c9a227' : '#1a1a2e',
            borderRadius: confetti.isCircle ? '50%' : '2px',
            width: `${confetti.width}px`,
            height: `${confetti.height}px`,
            animationDelay: `${confetti.delay}s`,
            animationDuration: `${confetti.duration}s`,
          }}
        />
      ))}

      {/* Balls Phase */}
      {phase === 'balls' && ballData.map((ball, i) => (
        <div
          key={i}
          className="ball"
          style={{
            width: `${ball.size}px`,
            height: `${ball.size}px`,
            background: `radial-gradient(circle at 30% 30%, ${ball.color}dd, ${ball.color})`,
            left: `${ball.left}%`,
            top: `${ball.top}%`,
            animationDelay: `${ball.delay}s, ${ball.floatDelay + 1.2}s`,
            '--scatter-x': `${ball.scatterX}px`,
          }}
        />
      ))}

      {/* Scattering balls transition */}
      {phase === 'text' && ballData.map((ball, i) => (
        <div
          key={`scatter-${i}`}
          className="ball scatter"
          style={{
            width: `${ball.size}px`,
            height: `${ball.size}px`,
            background: `radial-gradient(circle at 30% 30%, ${ball.color}dd, ${ball.color})`,
            left: `${ball.left}%`,
            top: `${ball.top}%`,
            animationDelay: `${i * 0.03}s`,
            '--scatter-x': `${ball.scatterX}px`,
          }}
        />
      ))}

      {/* Text Phase */}
      {(phase === 'text' || phase === 'done') && (
        <div className="text-container">
          <div className="envelope-icon">✉️</div>
          <h1 className="main-text">Voting Has Started</h1>
          <p className="sub-text">Your voice matters. Make it count.</p>
          <div className="gold-line" />
        </div>
      )}
    </div>
  );
};

export default BallotIntro;
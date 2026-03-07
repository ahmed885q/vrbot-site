'use client';
import { useState, useEffect } from 'react';

export default function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  const handleClick = () => {
    setFadeOut(true);
    setTimeout(() => onEnter(), 700);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#090200', cursor: 'pointer',
        transition: 'opacity 0.7s ease', opacity: fadeOut ? 0 : 1,
        pointerEvents: fadeOut ? 'none' : 'auto',
        fontFamily: "'Orbitron', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @keyframes gridMove { to { background-position: 42px 42px; } }
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes glowPulse {
          0%,100% { filter: drop-shadow(0 0 10px #ff4500) drop-shadow(0 0 28px rgba(255,80,0,0.6)) drop-shadow(0 0 55px rgba(255,140,0,0.35)); }
          50% { filter: drop-shadow(0 0 20px #ff6600) drop-shadow(0 0 50px rgba(255,80,0,1)) drop-shadow(0 0 90px rgba(255,140,0,0.7)); }
        }
        @keyframes eyeBlink { 0%,45%,55%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.08); } }
        @keyframes signalPulse { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
        @keyframes vrPulse {
          0%,100% { text-shadow: 0 0 10px rgba(255,255,255,0.8), 0 0 30px #ff4500, 0 0 65px rgba(255,69,0,0.4); }
          50% { text-shadow: 0 0 18px #fff, 0 0 48px #ff4500, 0 0 95px rgba(255,69,0,0.7); }
        }
        @keyframes botPulse { 0%,100% { filter: drop-shadow(0 0 16px rgba(255,100,0,0.6)); } 50% { filter: drop-shadow(0 0 30px rgba(255,100,0,1)); } }
        @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes clickPulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        .splash-grid::before {
          content: ''; position: fixed; inset: 0;
          background-image: linear-gradient(rgba(255,60,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,60,0,0.05) 1px, transparent 1px);
          background-size: 42px 42px; animation: gridMove 15s linear infinite;
        }
        .splash-grid::after {
          content: ''; position: fixed; inset: 0;
          background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(200,40,0,0.2) 0%, transparent 70%);
          pointer-events: none;
        }
        .splash-robot { animation: floatY 3.5s ease-in-out infinite; }
        .splash-robot svg { filter: drop-shadow(0 0 10px #ff4500) drop-shadow(0 0 28px rgba(255,80,0,0.6)) drop-shadow(0 0 55px rgba(255,140,0,0.35)); animation: glowPulse 2.5s ease-in-out infinite; }
        .splash-eye { animation: eyeBlink 4s ease-in-out infinite; transform-origin: center; }
        .splash-vr { font-size: 60px; font-weight: 900; color: #fff; animation: vrPulse 3s ease-in-out infinite; }
        .splash-bot { font-size: 60px; font-weight: 900; background: linear-gradient(135deg, #ff2200 0%, #ff6600 45%, #ffbb00 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 0 16px rgba(255,100,0,0.8)); animation: botPulse 3s ease-in-out infinite 0.6s; }
        .splash-click { animation: clickPulse 2s ease-in-out infinite; }
      `}</style>

      <div className="splash-grid" style={{ position: 'fixed', inset: 0 }} />

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 1 }}>
        {/* Robot */}
        <div className="splash-robot">
          <svg width="130" height="150" viewBox="0 0 130 150" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="bodyG" x1="0" y1="0" x2="130" y2="150" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ff3300"/>
                <stop offset="55%" stopColor="#ff6600"/>
                <stop offset="100%" stopColor="#ffaa00"/>
              </linearGradient>
              <linearGradient id="faceG" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
                <stop offset="0%" stopColor="#1a0500"/>
                <stop offset="100%" stopColor="#0d0200"/>
              </linearGradient>
            </defs>
            {/* Antenna */}
            <line x1="65" y1="8" x2="65" y2="22" stroke="url(#bodyG)" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="65" cy="6" r="4" fill="#ff4500" opacity="0.8">
              <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
            </circle>
            {/* Head */}
            <rect x="28" y="22" width="74" height="54" rx="10" fill="#0d0200" stroke="url(#bodyG)" strokeWidth="2"/>
            <rect x="30" y="24" width="70" height="18" rx="8" fill="rgba(255,100,0,0.07)"/>
            {/* Eyes */}
            <g className="splash-eye">
              <rect x="38" y="36" width="20" height="14" rx="4" fill="#0d0200" stroke="#ff6600" strokeWidth="1.5"/>
              <rect x="72" y="36" width="20" height="14" rx="4" fill="#0d0200" stroke="#ff6600" strokeWidth="1.5"/>
              <circle cx="48" cy="43" r="5" fill="#ff4400" opacity="0.9"/>
              <circle cx="82" cy="43" r="5" fill="#ff4400" opacity="0.9"/>
              <circle cx="48" cy="43" r="2.5" fill="#ffaa00"/>
              <circle cx="82" cy="43" r="2.5" fill="#ffaa00"/>
              <circle cx="47" cy="42" r="1" fill="#fff" opacity="0.9"/>
              <circle cx="81" cy="42" r="1" fill="#fff" opacity="0.9"/>
            </g>
            {/* Mouth LEDs */}
            <rect x="45" y="61" width="5" height="4" rx="1" fill="#ff5500" opacity="0.8"/>
            <rect x="53" y="61" width="5" height="4" rx="1" fill="#ff7700" opacity="0.8"/>
            <rect x="63" y="61" width="5" height="4" rx="1" fill="#ff5500" opacity="0.8"/>
            <rect x="71" y="61" width="5" height="4" rx="1" fill="#ff7700" opacity="0.8"/>
            <rect x="79" y="61" width="5" height="4" rx="1" fill="#ff5500" opacity="0.8"/>
            {/* Ears */}
            <rect x="14" y="32" width="12" height="22" rx="5" fill="#0d0200" stroke="url(#bodyG)" strokeWidth="1.5"/>
            <rect x="104" y="32" width="12" height="22" rx="5" fill="#0d0200" stroke="url(#bodyG)" strokeWidth="1.5"/>
            <circle cx="20" cy="43" r="3" fill="#ff5500" opacity="0.7">
              <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="110" cy="43" r="3" fill="#ff5500" opacity="0.7">
              <animate attributeName="opacity" values="0.2;0.7;0.2" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            {/* Neck */}
            <rect x="55" y="76" width="20" height="10" rx="3" fill="#0d0200" stroke="url(#bodyG)" strokeWidth="1"/>
            {/* Body */}
            <rect x="22" y="86" width="86" height="56" rx="12" fill="#0d0200" stroke="url(#bodyG)" strokeWidth="2"/>
            <rect x="24" y="88" width="82" height="10" rx="5" fill="rgba(255,100,0,0.05)" stroke="rgba(255,100,0,0.3)" strokeWidth="1"/>
            {/* Chest */}
            <circle cx="65" cy="112" r="11" fill="none" stroke="url(#bodyG)" strokeWidth="1.5"/>
            <circle cx="65" cy="112" r="7" fill="#1a0400"/>
            <circle cx="65" cy="112" r="4" fill="#ff5500" opacity="0.9">
              <animate attributeName="opacity" values="0.9;0.3;0.9" dur="2s" repeatCount="indefinite"/>
            </circle>
            {/* Side lights */}
            <circle cx="42" cy="104" r="4" fill="#ff4400" opacity="0.7">
              <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.2s" repeatCount="indefinite"/>
            </circle>
            <circle cx="88" cy="104" r="4" fill="#ff8800" opacity="0.7">
              <animate attributeName="opacity" values="0.2;0.7;0.2" dur="1.2s" repeatCount="indefinite"/>
            </circle>
            {/* Arms */}
            <rect x="2" y="88" width="18" height="44" rx="8" fill="#0d0200" stroke="url(#bodyG)" strokeWidth="1.8"/>
            <rect x="110" y="88" width="18" height="44" rx="8" fill="#0d0200" stroke="url(#bodyG)" strokeWidth="1.8"/>
          </svg>
        </div>

        {/* Logo Text */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'baseline', letterSpacing: '0.24em', padding: '10px 32px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: 18, height: 18, borderColor: 'rgba(255,130,0,0.5)', borderStyle: 'solid', borderWidth: '2px 0 0 2px' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 18, height: 18, borderColor: 'rgba(255,130,0,0.5)', borderStyle: 'solid', borderWidth: '2px 2px 0 0' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: 18, height: 18, borderColor: 'rgba(255,130,0,0.5)', borderStyle: 'solid', borderWidth: '0 0 2px 2px' }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 18, height: 18, borderColor: 'rgba(255,130,0,0.5)', borderStyle: 'solid', borderWidth: '0 2px 2px 0' }} />
          <span className="splash-vr">VR</span>
          <span className="splash-bot">BOT</span>
        </div>

        {/* Divider */}
        <div style={{ width: 340, display: 'flex', alignItems: 'center', gap: 10, opacity: 0.55 }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #ff4500, #ffaa00, transparent)' }} />
          <div style={{ width: 7, height: 7, background: 'linear-gradient(135deg,#ff2200,#ffaa00)', transform: 'rotate(45deg)', boxShadow: '0 0 8px #ff4500' }} />
          <div style={{ width: 7, height: 7, background: 'linear-gradient(135deg,#ff2200,#ffaa00)', transform: 'rotate(45deg)', boxShadow: '0 0 8px #ff4500' }} />
          <div style={{ width: 7, height: 7, background: 'linear-gradient(135deg,#ff2200,#ffaa00)', transform: 'rotate(45deg)', boxShadow: '0 0 8px #ff4500' }} />
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #ffaa00, #ff4500, transparent)' }} />
        </div>

        <div style={{ fontSize: 10, letterSpacing: '0.44em', color: 'rgba(255,140,0,0.45)', textTransform: 'uppercase' }}>
          Virtual Reality &middot; AI Powered
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 9, letterSpacing: '0.3em', color: 'rgba(255,80,0,0.4)', marginTop: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff8c00', boxShadow: '0 0 8px #ff8c00', animation: 'blink 2s ease-in-out infinite' }} />
          ROBOT SYSTEM ONLINE
        </div>

        {/* Click prompt */}
        <div className="splash-click" style={{ marginTop: 30, fontSize: 12, letterSpacing: '0.3em', color: 'rgba(255,140,0,0.5)', textTransform: 'uppercase' }}>
          Click to Enter
        </div>
      </div>
    </div>
  );
}

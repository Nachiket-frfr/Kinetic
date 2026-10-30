import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export default function LevelUpModal({ level = 1, triggerAnim = false, onComplete }) {
  const containerRef = useRef(null);

  useGSAP(
    () => {
      if (!containerRef.current) return;

      const root = containerRef.current;
      const flash = root.querySelector('.impact-flash');
      const lines = root.querySelectorAll('.draw-line');
      const slicePetals = root.querySelectorAll('.slice-petal');
      const oldBadge = root.querySelector('.old-badge');
      const bgPanels = root.querySelectorAll('.bg-panel');
      const energySphere = root.querySelector('.energy-sphere');
      const shockwave = root.querySelector('.shockwave');
      const rays = root.querySelectorAll('.energy-ray');
      const explosionPetals = root.querySelectorAll('.explosion-petal');
      const dashedRing = root.querySelector('.sphere-ring-dashed');
      const solidRing = root.querySelector('.sphere-ring-solid');

      // Stop any lingering animations on re-trigger
      gsap.killTweensOf([
        root, flash, lines, slicePetals, oldBadge, bgPanels, 
        energySphere, shockwave, rays, explosionPetals, dashedRing, solidRing
      ]);

      // Ambient idle ring rotations
      gsap.to(dashedRing, { rotation: 360, transformOrigin: '250px 145px', duration: 12, repeat: -1, ease: 'none' });
      gsap.to(solidRing, { rotation: -360, transformOrigin: '250px 145px', duration: 8, repeat: -1, ease: 'none' });

      gsap.set(energySphere, { transformOrigin: '250px 145px' });

      if (!triggerAnim) {
        gsap.set([flash, lines, slicePetals, oldBadge, bgPanels, shockwave, rays, explosionPetals], { opacity: 0 });
        gsap.set(energySphere, { opacity: 1, scale: 1, rotation: 0 });
        return;
      }

      // Initial state reset before starting the timeline
      gsap.set(flash, { opacity: 0 });
      gsap.set(shockwave, { opacity: 0, scale: 0.1, transformOrigin: '250px 145px' });

      lines.forEach((line) => {
        const length = line.getTotalLength();
        gsap.set(line, { strokeDasharray: length, strokeDashoffset: length, opacity: 1 });
      });

      gsap.set(slicePetals, { opacity: 0, scale: 0, transformOrigin: '250px 145px' });
      gsap.set(oldBadge, { opacity: 1, scale: 1, transformOrigin: '250px 145px' });
      gsap.set(bgPanels, { opacity: 1, scale: 1, x: 0, y: 0, rotation: 0, transformOrigin: '250px 145px' });
      gsap.set(energySphere, { opacity: 0, scale: 0, rotation: 0 });
      gsap.set(rays, { opacity: 0, scale: 0.1, transformOrigin: '250px 145px' });

      const numPetals = explosionPetals.length;
      explosionPetals.forEach((petal, i) => {
        const angle = (i / numPetals) * Math.PI * 2;
        const radius = 45;
        const startX = Math.cos(angle) * radius;
        const startY = Math.sin(angle) * radius;
        const angleDeg = (angle * 180) / Math.PI + 90;

        gsap.set(petal, {
          opacity: 0,
          scale: 0,
          x: startX,
          y: startY,
          rotation: angleDeg,
          transformOrigin: 'center center',
        });
      });

      const tl = gsap.timeline({
        onComplete: () => {
          if (onComplete) onComplete();
        },
      });

      tl.to(root, { scale: 1.04, duration: 0.12, ease: 'power4.out' })
        .to(lines, { strokeDashoffset: 0, duration: 0.22, stagger: 0.04, ease: 'expo.inOut' }, '<')
        .to(slicePetals, {
          opacity: 1,
          scale: () => gsap.utils.random(0.8, 1.4),
          x: () => gsap.utils.random(-120, 120),
          y: () => gsap.utils.random(-80, 80),
          rotation: () => gsap.utils.random(-360, 360),
          duration: 0.25,
          stagger: 0.02,
          ease: 'power3.out',
        }, '-=0.15')
        .to(flash, { opacity: 0.9, duration: 0.04, yoyo: true, repeat: 1 })
        .to(root, {
          x: () => gsap.utils.random(-16, 16),
          y: () => gsap.utils.random(-16, 16),
          duration: 0.03,
          repeat: 5,
          yoyo: true,
          ease: 'none',
        }, '<')
        .to(oldBadge, { scale: 1.5, opacity: 0, duration: 0.15, ease: 'power4.out' }, '<')
        .to(bgPanels, {
          x: () => gsap.utils.random(-260, 260),
          y: () => gsap.utils.random(-220, 220),
          rotation: () => gsap.utils.random(-720, 720),
          opacity: 0,
          scale: 0.1,
          duration: 0.45,
          stagger: 0.01,
          ease: 'expo.out',
        }, '<')
        .to(slicePetals, { opacity: 0, scale: 2, duration: 0.2, ease: 'power2.in' }, '<')
        .to(lines, { opacity: 0, duration: 0.1 }, '-=0.1')
        .to(energySphere, { opacity: 0.5, scale: 0.4, duration: 0.1, ease: 'power2.in' })
        .to(flash, { opacity: 1, duration: 0.05, yoyo: true, repeat: 1 })
        .to(root, {
          x: () => gsap.utils.random(-22, 22),
          y: () => gsap.utils.random(-22, 22),
          scale: 1.08,
          duration: 0.02,
          repeat: 8,
          yoyo: true,
          ease: 'none',
        }, '<')
        .to(shockwave, { opacity: 1, scale: 3.8, strokeWidth: 1, duration: 0.4, ease: 'expo.out' }, '<')
        .to(shockwave, { opacity: 0, duration: 0.2 }, '-=0.2')
        .to(rays, { opacity: 1, scale: 2.4, duration: 0.25, ease: 'power4.out', stagger: 0.01 }, '<')
        .to(energySphere, { rotation: 720, opacity: 1, scale: 1.35, duration: 0.5, ease: 'power4.out' }, '-=0.25')
        .to(explosionPetals, {
          opacity: 1,
          scale: () => gsap.utils.random(1.2, 2),
          x: (i) => Math.cos((i / numPetals) * Math.PI * 2 + Math.PI / 2) * gsap.utils.random(160, 280),
          y: (i) => Math.sin((i / numPetals) * Math.PI * 2 + Math.PI / 2) * gsap.utils.random(140, 240),
          rotation: '+=360',
          duration: 0.9,
          stagger: 0.015,
          ease: 'power3.out',
        }, '-=0.45')
        .to(root, { x: 0, y: 0, scale: 1, duration: 0.35, ease: 'elastic.out(1, 0.3)' })
        .to(energySphere, { scale: 1, duration: 0.25, ease: 'power2.out' }, '<')
        .to(rays, { opacity: 0, duration: 0.3 }, '-=0.1')
        .to(explosionPetals, { opacity: 0, duration: 0.4 }, '-=0.2');
    },
    { scope: containerRef, dependencies: [level, triggerAnim] }
  );

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '240px',
        backgroundColor: '#000000',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 12px 36px rgba(0,0,0,0.95)',
        marginBottom: '20px',
        willChange: 'transform',
      }}
    >
      <div
        className="impact-flash"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#ffffff',
          pointerEvents: 'none',
          zIndex: 10,
          opacity: 0,
        }}
      />

      <svg width="100%" height="100%" viewBox="0 0 500 300">
        <defs>
          <radialGradient id="whiteSphereGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="35%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          <filter id="whiteGlow">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="old-badge">
          <polygon points="250,105 285,125 285,165 250,185 215,165 215,125" fill="#111111" stroke="#444444" strokeWidth="3" />
          <text x="250" y="138" fill="#888888" fontSize="11" fontWeight="bold" textAnchor="middle">LEVEL</text>
          <text x="250" y="165" fill="#ffffff" fontSize="24" fontWeight="900" textAnchor="middle">{level > 1 ? level - 1 : 1}</text>
        </g>

        <g className="bg-panels-group">
          <polygon className="bg-panel" points="250,145 200,50 300,50" fill="#1e1e1e" />
          <polygon className="bg-panel" points="250,145 300,50 380,145" fill="#0d0d0d" />
          <polygon className="bg-panel" points="250,145 380,145 300,240" fill="#252525" />
          <polygon className="bg-panel" points="250,145 300,240 200,240" fill="#141414" />
          <polygon className="bg-panel" points="250,145 200,240 120,145" fill="#0d0d0d" />
          <polygon className="bg-panel" points="250,145 120,145 200,50" fill="#1e1e1e" />
        </g>

        <g className="slice-lines-group">
          <path className="draw-line" d="M -100 -50 L 600 340" stroke="#ffffff" strokeWidth="5" fill="none" filter="url(#whiteGlow)" />
          <path className="draw-line" d="M 600 -50 L -100 340" stroke="#ffffff" strokeWidth="5" fill="none" filter="url(#whiteGlow)" />
          <path className="draw-line" d="M -50 145 L 550 145" stroke="#ffffff" strokeWidth="6" fill="none" filter="url(#whiteGlow)" />

          <g className="slice-petals-group" filter="url(#whiteGlow)">
            <path className="slice-petal" d="M 180,90 C 175,80 170,75 180,65 C 190,75 185,80 180,90 Z" fill="#ffffff" />
            <path className="slice-petal" d="M 320,90 C 315,80 310,75 320,65 C 330,75 325,80 320,90 Z" fill="#ffffff" />
            <path className="slice-petal" d="M 250,145 C 245,135 240,130 250,120 C 260,130 255,135 250,145 Z" fill="#ffffff" />
            <path className="slice-petal" d="M 150,145 C 145,135 140,130 150,120 C 160,130 155,135 150,145 Z" fill="#ffffff" />
            <path className="slice-petal" d="M 350,145 C 345,135 340,130 350,120 C 360,130 355,135 350,145 Z" fill="#ffffff" />
            <path className="slice-petal" d="M 200,200 C 195,190 190,185 200,175 C 210,185 205,190 200,200 Z" fill="#ffffff" />
            <path className="slice-petal" d="M 300,200 C 295,190 290,185 300,175 C 310,185 305,190 300,200 Z" fill="#ffffff" />
          </g>
        </g>

        <circle className="shockwave" cx="250" cy="145" r="45" fill="none" stroke="#ffffff" strokeWidth="12" filter="url(#whiteGlow)" />

        <g className="energy-rays-group" filter="url(#whiteGlow)">
          <line className="energy-ray" x1="250" y1="145" x2="250" y2="10" stroke="#ffffff" strokeWidth="5" />
          <line className="energy-ray" x1="250" y1="145" x2="400" y2="30" stroke="#ffffff" strokeWidth="4" />
          <line className="energy-ray" x1="250" y1="145" x2="440" y2="145" stroke="#ffffff" strokeWidth="5" />
          <line className="energy-ray" x1="250" y1="145" x2="400" y2="260" stroke="#ffffff" strokeWidth="4" />
          <line className="energy-ray" x1="250" y1="145" x2="250" y2="280" stroke="#ffffff" strokeWidth="5" />
          <line className="energy-ray" x1="250" y1="145" x2="100" y2="260" stroke="#ffffff" strokeWidth="4" />
          <line className="energy-ray" x1="250" y1="145" x2="60" y2="145" stroke="#ffffff" strokeWidth="5" />
          <line className="energy-ray" x1="250" y1="145" x2="100" y2="30" stroke="#ffffff" strokeWidth="4" />
        </g>

        <g className="energy-sphere">
          <circle cx="250" cy="145" r="82" fill="url(#whiteSphereGlow)" />
          
          <circle 
            className="sphere-ring-dashed" 
            cx="250" 
            cy="145" 
            r="60" 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="3" 
            strokeDasharray="14 7" 
            filter="url(#whiteGlow)" 
          />
          
          <circle 
            className="sphere-ring-solid" 
            cx="250" 
            cy="145" 
            r="50" 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="2" 
            strokeDasharray="30 15 10 15" 
            opacity="0.9" 
          />

          <circle cx="250" cy="145" r="42" fill="#000000" stroke="#ffffff" strokeWidth="3.5" filter="url(#whiteGlow)" />

          <text x="250" y="135" fill="#aaaaaa" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="2">
            LEVEL
          </text>
          <text x="250" y="166" fill="#ffffff" fontSize="30" fontWeight="900" textAnchor="middle">
            {level}
          </text>
        </g>

        <g className="explosion-petals-group" filter="url(#whiteGlow)">
          {[...Array(16)].map((_, i) => (
            <path
              key={i}
              className="explosion-petal"
              d="M 250,145 C 243,132 238,125 250,112 C 262,125 257,132 250,145 Z"
              fill="#ffffff"
              opacity="0.95"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
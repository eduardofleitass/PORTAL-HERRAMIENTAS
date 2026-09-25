function AnimatedLogo() {
  return (
    <div style={{ width: "140px", height: "140px", margin: "0 auto" }}>
      <style>{`
        @keyframes spin{ to{ transform:rotate(360deg);} }
        @keyframes torque{ 0%,100%{ transform:rotate(-7deg); } 50%{ transform:rotate(7deg); } }
        @keyframes torque2{ 0%,100%{ transform:rotate(6deg); } 50%{ transform:rotate(-6deg); } }
        @keyframes type{ 0%{ transform:scaleX(0); } 30%,60%{ transform:scaleX(1); } 85%,100%{ transform:scaleX(0); } }
        @keyframes breathe{ 0%,100%{ transform:scale(1); opacity:.9; } 50%{ transform:scale(1.12); opacity:1; } }
        @keyframes bobA{ 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
        @keyframes bobB{ 0%,100%{transform:translateY(0);} 50%{transform:translateY(5px);} }
        @keyframes bobC{ 0%,100%{transform:translateY(0);} 50%{transform:translateY(-5px);} }
        @media (prefers-reduced-motion: reduce){
          .orbit,.gear,.wrenchAnim,.screwdriverAnim,.line,.codeText,.floatA,.floatB,.floatC{
            animation:none !important;
          }
        }
      `}</style>
      <svg viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", filter: "drop-shadow(0 0 18px rgba(255,120,20,.3))" }}>
        <defs>
          <linearGradient id="amberGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff3b0"/>
            <stop offset="30%" stopColor="#ffb020"/>
            <stop offset="65%" stopColor="#ff7a1a"/>
            <stop offset="100%" stopColor="#ff4400"/>
          </linearGradient>
          <linearGradient id="panelGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2b1608"/>
            <stop offset="100%" stopColor="#140a03"/>
          </linearGradient>
        </defs>

        {/* orbit ribbon */}
        <g style={{ transformOrigin: "400px 380px", animation: "spin 11s linear infinite" }}>
          <ellipse cx="400" cy="380" rx="370" ry="150" transform="rotate(-16 400 380)"
            fill="none" stroke="url(#amberGrad)" strokeWidth="24" strokeLinecap="round"
            strokeDasharray="640 480"/>
        </g>

        {/* code panel */}
        <g style={{ animation: "bobA 4.2s ease-in-out infinite" }}>
          <rect x="36" y="290" width="168" height="168" rx="30" fill="url(#panelGrad)" stroke="url(#amberGrad)" strokeWidth="6"/>
          <text x="120" y="395" fontFamily="Menlo, Consolas, monospace" fontSize="62"
            fill="url(#amberGrad)" textAnchor="middle" style={{ transformOrigin: "120px 375px", animation: "breathe 3.2s ease-in-out infinite" }}>{"</>"}</text>
        </g>

        {/* chat panel */}
        <g style={{ animation: "bobB 5s ease-in-out infinite" }}>
          <rect x="556" y="46" width="224" height="150" rx="30" fill="url(#panelGrad)" stroke="url(#amberGrad)" strokeWidth="6"/>
          <rect x="590" y="86" width="156" height="13" rx="6.5" fill="url(#amberGrad)"
            style={{ transformOrigin: "center", animation: "type 3.6s ease-in-out infinite", animationDelay: "0s" }} />
          <rect x="590" y="116" width="156" height="13" rx="6.5" fill="url(#amberGrad)"
            style={{ transformOrigin: "center", animation: "type 3.6s ease-in-out infinite", animationDelay: "0.35s" }} />
          <rect x="590" y="146" width="104" height="13" rx="6.5" fill="url(#amberGrad)"
            style={{ transformOrigin: "center", animation: "type 3.6s ease-in-out infinite", animationDelay: "0.7s" }} />
        </g>

        {/* gear panel */}
        <g style={{ animation: "bobC 4.6s ease-in-out infinite" }}>
          <rect x="596" y="556" width="168" height="168" rx="30" fill="url(#panelGrad)" stroke="url(#amberGrad)" strokeWidth="6"/>
          <g style={{ transformOrigin: "680px 640px", animation: "spin 6s linear infinite" }}>
            <g fill="url(#amberGrad)">
              <rect x="673" y="592" width="14" height="24" rx="4" transform="rotate(0 680 640)"/>
              <rect x="673" y="592" width="14" height="24" rx="4" transform="rotate(45 680 640)"/>
              <rect x="673" y="592" width="14" height="24" rx="4" transform="rotate(90 680 640)"/>
              <rect x="673" y="592" width="14" height="24" rx="4" transform="rotate(135 680 640)"/>
              <rect x="673" y="592" width="14" height="24" rx="4" transform="rotate(180 680 640)"/>
              <rect x="673" y="592" width="14" height="24" rx="4" transform="rotate(225 680 640)"/>
              <rect x="673" y="592" width="14" height="24" rx="4" transform="rotate(270 680 640)"/>
              <rect x="673" y="592" width="14" height="24" rx="4" transform="rotate(315 680 640)"/>
            </g>
            <circle cx="680" cy="640" r="30" fill="url(#amberGrad)"/>
            <circle cx="680" cy="640" r="13" fill="#140a03"/>
          </g>
        </g>

        {/* main window */}
        <g>
          <rect x="196" y="150" width="408" height="408" rx="46" fill="url(#panelGrad)" stroke="url(#amberGrad)" strokeWidth="8"/>
          <circle cx="248" cy="196" r="9" fill="url(#amberGrad)"/>
          <circle cx="279" cy="196" r="9" fill="url(#amberGrad)"/>
          <circle cx="310" cy="196" r="9" fill="url(#amberGrad)"/>

          {/* wrench */}
          <g transform="translate(470,300) rotate(-45)">
            <g style={{ transformOrigin: "0px 0px", animation: "torque 2.6s ease-in-out infinite" }}>
              <rect x="-190" y="-15" width="190" height="30" rx="15" fill="url(#amberGrad)"/>
              <rect x="-70" y="-7" width="26" height="14" rx="4" fill="#140a03" opacity=".55"/>
              <rect x="-110" y="-7" width="26" height="14" rx="4" fill="#140a03" opacity=".55"/>
              <circle cx="0" cy="0" r="32" fill="none" stroke="url(#amberGrad)" strokeWidth="16"/>
            </g>
          </g>

          {/* screwdriver */}
          <g transform="translate(330,300) rotate(45)">
            <g style={{ transformOrigin: "0px 0px", animation: "torque2 2.6s ease-in-out infinite" }}>
              <rect x="-92" y="-26" width="92" height="52" rx="18" fill="url(#amberGrad)"/>
              <rect x="-66" y="-14" width="6" height="28" rx="3" fill="#140a03" opacity=".5"/>
              <rect x="-46" y="-14" width="6" height="28" rx="3" fill="#140a03" opacity=".5"/>
              <rect x="0" y="-8" width="188" height="16" rx="8" fill="url(#amberGrad)"/>
              <rect x="186" y="-11" width="26" height="22" rx="4" fill="url(#amberGrad)"/>
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}

export default AnimatedLogo;
